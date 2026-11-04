// GridSnip — the only network code in the extension. Requests go from the user's browser
// straight to Google's Gemini API with the user's own key (sent as a header, never in the URL).
// Nothing is sent to Xender Secrets.

export const GEMINI_ORIGIN = "https://generativelanguage.googleapis.com";

export const PROMPT = [
  "You extract tables from screenshots.",
  "The image is a crop that should contain one table. Return ONLY that table as tab-separated values:",
  "one row per line, cells separated by a single TAB character, header row first if there is one.",
  "Copy text and numbers exactly as shown, including currency symbols, %, minus signs and separators.",
  "Use an empty cell for a blank cell. For a merged cell, put the text in its first column.",
  "No markdown, no code fences, no notes. If the image has no table, return exactly: NO_TABLE",
].join("\n");

const MESSAGES = {
  "key-missing": "Add your free Gemini API key first.",
  "key-format": "That doesn't look like a Gemini API key. Copy it again from Google AI Studio.",
  "key-invalid": "Google rejected this API key. Check it in Google AI Studio and paste it again.",
  "key-denied": "This key isn't allowed to use the Gemini API. It may be restricted, or the API is off for its Google Cloud project.",
  quota: "Your Gemini quota is used up for now. Wait a minute (on the free tier, possibly until tomorrow) and try again.",
  "model-missing": "That Gemini model is no longer available. GridSnip will switch to a current one — try again.",
  "no-model": "No Gemini model that can read images is available for this key.",
  unavailable: "Gemini is busy or temporarily unavailable. Try again in a moment.",
  blocked: "Gemini declined to read this image.",
  empty: "Gemini returned nothing for this area. Try a tighter box around the table.",
  network: "Couldn't reach Google. Check your internet connection and try again.",
  cancelled: "Cancelled.",
  failed: "Something went wrong while reading the table. Try again.",
};

export class GeminiError extends Error {
  constructor(code, detail = "") {
    super(MESSAGES[code] || MESSAGES.failed);
    this.code = MESSAGES[code] ? code : "failed";
    this.detail = String(detail).slice(0, 300);
  }
}

/** Light format check only; Google decides whether a key is valid. */
export function checkKeyFormat(key) {
  const k = String(key ?? "").trim();
  if (!/^[A-Za-z0-9._-]{20,200}$/.test(k)) throw new GeminiError("key-format");
  return k;
}

async function errorFromResponse(response) {
  let body = {};
  try { body = await response.json(); } catch (e) { body = {}; }
  const err = body && body.error ? body.error : {};
  const text = JSON.stringify(err);
  const s = response.status;
  if (s === 400 && /API_KEY_INVALID|API key not valid|API key expired/i.test(text)) return new GeminiError("key-invalid", text);
  if (s === 401) return new GeminiError("key-invalid", text);
  if (s === 403) return new GeminiError("key-denied", text);
  if (s === 404) return new GeminiError("model-missing", text);
  if (s === 429) return new GeminiError("quota", text);
  if (s >= 500) return new GeminiError("unavailable", text);
  return new GeminiError("failed", s + " " + text);
}

async function call(url, init, fetchImpl) {
  let response;
  try { response = await fetchImpl(url, init); }
  catch (e) {
    if (e && e.name === "AbortError") throw new GeminiError("cancelled");
    throw new GeminiError("network", e && e.message);
  }
  if (!response.ok) throw await errorFromResponse(response);
  try { return await response.json(); } catch (e) { throw new GeminiError("failed", "invalid JSON"); }
}

export async function listModels(key, fetchImpl = fetch) {
  const data = await call(`${GEMINI_ORIGIN}/v1beta/models?pageSize=200`, { headers: { "x-goog-api-key": key } }, fetchImpl);
  return Array.isArray(data.models) ? data.models : [];
}

/**
 * Picks the model to use from models.list, so GridSnip keeps working as Google retires models.
 * Order: newest stable "gemini-X-flash" → "gemini-flash-latest" → newest preview flash →
 * newest flash-lite → any other generateContent model with "flash" in its name.
 */
export function pickModel(models) {
  const ids = (Array.isArray(models) ? models : [])
    .filter((m) => m && Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
    .map((m) => String(m.name || "").replace(/^models\//, ""))
    .filter((id) => /^gemini-/.test(id) && !/(image|tts|audio|live|embedding|vision-only|robotics|computer-use)/.test(id));
  const parsed = ids.map((id) => {
    const m = /^gemini-(\d+(?:\.\d+)?)-flash(-lite)?(?:-(\d{3}))?(?:-(preview|exp)[\w-]*)?$/.exec(id);
    if (!m) return { id, rank: id === "gemini-flash-latest" ? 2 : /flash/.test(id) ? 6 : 99, version: 0 };
    const lite = Boolean(m[2]), preview = Boolean(m[4]);
    return { id, version: Number(m[1]), rank: lite ? (preview ? 5 : 4) : preview ? 3 : 1 };
  }).filter((p) => p.rank < 99);
  parsed.sort((a, b) => a.rank - b.rank || b.version - a.version || a.id.localeCompare(b.id));
  return parsed.length ? parsed[0].id : "";
}

/** Sends one PNG crop; returns { text, truncated }. */
export async function readTable({ key, model, pngBase64, fetchImpl = fetch, signal }) {
  const data = await call(`${GEMINI_ORIGIN}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: PROMPT }, { inline_data: { mime_type: "image/png", data: pngBase64 } }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 16384 },
    }),
  }, fetchImpl);
  const candidate = data && Array.isArray(data.candidates) ? data.candidates[0] : null;
  if (!candidate) {
    if (data && data.promptFeedback && data.promptFeedback.blockReason) throw new GeminiError("blocked", data.promptFeedback.blockReason);
    throw new GeminiError("empty");
  }
  const parts = candidate.content && Array.isArray(candidate.content.parts) ? candidate.content.parts : [];
  const text = parts.filter((p) => !p.thought).map((p) => p.text || "").join("");
  if (!text.trim()) throw new GeminiError(/SAFETY|BLOCK|PROHIBITED|RECITATION/.test(candidate.finishReason || "") ? "blocked" : "empty", candidate.finishReason);
  return { text, truncated: candidate.finishReason === "MAX_TOKENS" };
}
