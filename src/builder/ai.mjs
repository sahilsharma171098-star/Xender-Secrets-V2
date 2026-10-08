// XEND-BUILDER-001 — provider-agnostic AI adapter for the website builder.
//
// Free-first: every provider listed here is either covered by the Cloudflare Workers AI free
// daily allocation (10,000 neurons/day, resets 00:00 UTC) or is opt-in behind a secret.
// Nothing here can turn on billing. The *spend* guard lives in store.mjs (daily neuron budget,
// reserved before every call and settled with the real token usage afterwards); this module
// reports the usage so that guard is accurate.
//
// Provider order (first that is configured and healthy wins, the rest are fallbacks):
//   1. workers-ai  @cf/zai-org/glm-4.7-flash        (primary, 5,500 in / 36,400 out neurons per M tokens)
//   2. zai         glm-4.7-flash via api.z.ai        (only if the ZAI_API_KEY secret exists; listed free by Z.ai)
//   3. workers-ai  @cf/qwen/qwen3-30b-a3b-fp8        (fallback, 4,625 in / 30,475 out neurons per M tokens)
// Rates verified against developers.cloudflare.com/workers-ai/platform/pricing on 2026-10-08.
//
// The mock provider exists for automated tests only and refuses to run on production hosts.

export const NEURON_RATES = {
  "@cf/zai-org/glm-4.7-flash": { in: 5500, out: 36400 },
  "@cf/qwen/qwen3-30b-a3b-fp8": { in: 4625, out: 30475 },
};
// Unknown models are costed pessimistically so the budget guard errs on the safe side.
const FALLBACK_RATE = { in: 60000, out: 210000 };

export function neuronsFor(model, usage) {
  if (!usage) return 0;
  const r = NEURON_RATES[model] || FALLBACK_RATE;
  return (Number(usage.input || 0) * r.in + Number(usage.output || 0) * r.out) / 1e6;
}

export const DEFAULT_MAX_OUTPUT_TOKENS = 12000;

export class ProviderError extends Error {
  constructor(message, { provider = "", status = 0, retryable = false, code = "" } = {}) {
    super(message);
    this.provider = provider;
    this.status = status;
    this.retryable = retryable;
    this.code = code;
  }
}

const PRODUCTION_HOSTS = new Set(["xendersecrets.com", "www.xendersecrets.com"]);

/** Providers that are actually usable with this environment, in fallback order. */
export function configuredProviders(env = {}, { host = "" } = {}) {
  if (env.BUILDER_AI_MOCK === "1" && !PRODUCTION_HOSTS.has(host)) return [mockProvider(env)];
  const list = [];
  if (env.AI) list.push(workersAiProvider(env.AI, env.BUILDER_PRIMARY_MODEL || "@cf/zai-org/glm-4.7-flash"));
  if (env.ZAI_API_KEY) list.push(zaiProvider(env.ZAI_API_KEY, env.ZAI_MODEL || "glm-4.7-flash"));
  if (env.AI && env.BUILDER_FALLBACK_MODEL !== "none") list.push(workersAiProvider(env.AI, env.BUILDER_FALLBACK_MODEL || "@cf/qwen/qwen3-30b-a3b-fp8"));
  return list;
}

/** Public, secret-free description for /api/builder/status. */
export function describeProviders(env = {}, opts = {}) {
  return configuredProviders(env, opts).map((p) => ({ id: p.id, model: p.model }));
}

// ---------- SSE / chunk parsing (shared by Workers AI streaming and OpenAI-compatible APIs) ----------

/** Pull the content / reasoning deltas and usage out of one parsed stream chunk, any known shape. */
export function chunkParts(obj) {
  if (!obj || typeof obj !== "object") return {};
  const choice = Array.isArray(obj.choices) ? obj.choices[0] : null;
  const delta = choice?.delta || choice?.message || {};
  const content = typeof obj.response === "string" ? obj.response : (typeof delta.content === "string" ? delta.content : "");
  const reasoning = typeof delta.reasoning_content === "string" ? delta.reasoning_content : (typeof delta.reasoning === "string" ? delta.reasoning : "");
  const u = obj.usage;
  const usage = u && (u.prompt_tokens != null || u.completion_tokens != null)
    ? { input: Number(u.prompt_tokens || 0), output: Number(u.completion_tokens || 0) }
    : null;
  return { content, reasoning, usage, finish: choice?.finish_reason || null };
}

/** Read an SSE byte stream, calling onEvent(parsedJson) for every `data:` line. */
export async function readSse(stream, onEvent, { signal } = {}) {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      if (signal?.aborted) throw new ProviderError("Timed out", { retryable: true, code: "timeout" });
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try { onEvent(JSON.parse(data)); } catch { /* ignore keep-alives / partial junk */ }
      }
    }
  } finally {
    try { reader.releaseLock(); } catch {}
  }
}

const estimateTokens = (s) => Math.ceil(String(s || "").length / 3.2);

// ---------- providers ----------

export function workersAiProvider(ai, model) {
  return {
    id: "workers-ai",
    model,
    async generate({ messages, maxTokens = DEFAULT_MAX_OUTPUT_TOKENS, signal, onDelta = () => {} }) {
      const base = { messages, max_completion_tokens: maxTokens, temperature: 0.4, stream: true };
      // GLM / Qwen3 think before answering; for code output that mostly burns neurons and time.
      // chat_template_kwargs is in the GLM-4.7-Flash schema; if a model rejects it we retry without.
      const attempts = [{ ...base, chat_template_kwargs: { enable_thinking: false } }, base];
      let lastErr;
      for (const input of attempts) {
        let text = "", reasoning = "", usage = null, finish = null;
        try {
          const out = await ai.run(model, input, signal ? { signal } : undefined);
          if (out && typeof out.getReader === "function") {
            await readSse(out, (obj) => {
              const p = chunkParts(obj);
              if (p.content) { text += p.content; onDelta(p.content.length, "content"); }
              if (p.reasoning) { reasoning += p.reasoning; onDelta(p.reasoning.length, "reasoning"); }
              if (p.usage) usage = p.usage;
              if (p.finish) finish = p.finish;
            }, { signal });
          } else {
            const p = chunkParts(out);
            text = p.content || String(out?.response || "");
            usage = p.usage;
            finish = p.finish;
            onDelta(text.length, "content");
          }
          const measured = !!usage;
          usage = usage || { input: estimateTokens(JSON.stringify(messages)), output: estimateTokens(text + reasoning) };
          return { text, usage, measured, finish, provider: "workers-ai", model };
        } catch (e) {
          lastErr = e;
          const msg = String(e?.message || e);
          // Only the "unknown parameter" style failure is worth a second, plain attempt.
          if (input.chat_template_kwargs && /chat_template_kwargs|additional propert|unknown|invalid input|schema/i.test(msg)) continue;
          break;
        }
      }
      throw toProviderError(lastErr, "workers-ai");
    },
  };
}

function toProviderError(e, provider) {
  if (e instanceof ProviderError) return e;
  const msg = String(e?.message || e || "AI provider failed");
  // Workers AI raises 3036 / "daily free allocation" style errors once neurons run out.
  if (/3036|allocation|quota|neurons|capacity|rate limit|429|Too many/i.test(msg)) return new ProviderError(msg, { provider, retryable: false, code: "quota" });
  if (/abort|timeout|timed out/i.test(msg)) return new ProviderError(msg, { provider, retryable: true, code: "timeout" });
  return new ProviderError(msg, { provider, retryable: true, code: "upstream" });
}

export function zaiProvider(apiKey, model, fetchImpl = fetch) {
  return {
    id: "zai",
    model,
    async generate({ messages, maxTokens = DEFAULT_MAX_OUTPUT_TOKENS, signal, onDelta = () => {} }) {
      let r;
      try {
        r = await fetchImpl("https://api.z.ai/api/paas/v4/chat/completions", {
          method: "POST",
          headers: { authorization: "Bearer " + apiKey, "content-type": "application/json" },
          body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.4, stream: true, thinking: { type: "disabled" } }),
          signal,
        });
      } catch (e) { throw toProviderError(e, "zai"); }
      if (!r.ok) {
        const body = (await r.text().catch(() => "")).slice(0, 300);
        throw new ProviderError("Z.ai HTTP " + r.status + " " + body, { provider: "zai", status: r.status, retryable: r.status >= 500, code: r.status === 429 || r.status === 402 ? "quota" : "upstream" });
      }
      let text = "", usage = null, finish = null;
      await readSse(r.body, (obj) => {
        const p = chunkParts(obj);
        if (p.content) { text += p.content; onDelta(p.content.length, "content"); }
        if (p.reasoning) onDelta(p.reasoning.length, "reasoning");
        if (p.usage) usage = p.usage;
        if (p.finish) finish = p.finish;
      }, { signal });
      const measured = !!usage;
      return { text, usage: usage || { input: estimateTokens(JSON.stringify(messages)), output: estimateTokens(text) }, measured, finish, provider: "zai", model };
    },
  };
}

/**
 * Deterministic provider for automated tests (BUILDER_AI_MOCK=1, never on production hosts).
 * It echoes the request into a small but real multi-file site so tests can check parsing,
 * merging, preview rendering and export without network access.
 */
export function mockProvider(env = {}) {
  return {
    id: "mock",
    model: "mock-site-v1",
    async generate({ messages, onDelta = () => {} }) {
      const last = String(messages[messages.length - 1]?.content || "");
      if (env.BUILDER_AI_MOCK_FAIL === "1") throw new ProviderError("mock failure", { provider: "mock", retryable: false, code: "upstream" });
      const isEdit = /CURRENT FILES/.test(last);
      const ask = (last.match(/REQUEST:\s*([\s\S]*?)(?:\n\n|$)/) || [])[1] || "A website";
      const safe = ask.replace(/[<>&"]/g, "").slice(0, 80);
      let text;
      if (isEdit) {
        text = `=== EDIT: index.html ===\n<<<<<<< SEARCH\n<button id="cta">Book now</button>\n=======\n<button id="cta">Book now</button><p id="edited">Edited: ${safe}</p>\n>>>>>>> REPLACE\n=== END EDIT ===\n=== FILE: styles.css ===\n:root{--brand:#7c3aed}body{font-family:system-ui;margin:0;color:#111}header{background:var(--brand);color:#fff;padding:24px}.edit-note::after{content:"${safe}"}\n=== END FILE ===\n=== SUMMARY ===\nUpdated the colour scheme (mock edit).\n=== END SUMMARY ===`;
      } else {
        text = `=== FILE: index.html ===\n<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe}</title><link rel="stylesheet" href="styles.css"></head>\n<body><header><h1 id="title">${safe}</h1><nav><a href="about.html">About</a></nav></header><main><p class="edit-note">Generated by the mock provider.</p><button id="cta">Book now</button><p id="out"></p></main><script src="script.js"></script></body>\n</html>\n=== END FILE ===\n=== FILE: styles.css ===\nbody{font-family:system-ui;margin:0;color:#111}header{background:#0f766e;color:#fff;padding:24px}\n=== END FILE ===\n=== FILE: script.js ===\ndocument.getElementById("cta").addEventListener("click",()=>{document.getElementById("out").textContent="Thanks!"});\n=== END FILE ===\n=== FILE: about.html ===\n<!doctype html><html><head><meta charset="utf-8"><title>About</title><link rel="stylesheet" href="styles.css"></head><body><h1>About us</h1><a href="index.html">Home</a></body></html>\n=== END FILE ===\n=== SUMMARY ===\nCreated a 2-page site (mock).\n=== END SUMMARY ===`;
      }
      onDelta(text.length, "content");
      return { text, usage: { input: estimateTokens(last), output: estimateTokens(text) }, measured: false, finish: "stop", provider: "mock", model: "mock-site-v1" };
    },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Run the request against each configured provider in order with timeout, retry-with-backoff
 * and validation. `validate(text)` returns { ok, value, error }; an invalid answer counts as a
 * failure for that attempt (one repair retry per provider). Usage from EVERY attempt (including
 * failed ones) is accumulated so the budget guard charges what was really spent.
 */
export async function runWithFallback(providers, { messages, validate, maxTokens = DEFAULT_MAX_OUTPUT_TOKENS, timeoutMs = 150000, deadlineMs = Infinity, minAttemptMs = 30000, retries = 1, backoffMs = 1200, onProgress = () => {}, sleepImpl = sleep, budgetLeft = () => Infinity, now = Date.now } = {}) {
  if (!providers.length) throw new ProviderError("No AI provider is configured.", { code: "unconfigured" });
  const spent = [];
  const errors = [];
  const t0 = now();
  for (const p of providers) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (budgetLeft(spent) <= 0) throw Object.assign(new ProviderError("Daily free AI budget reached.", { code: "budget" }), { spent, errors });
      // A whole request has a wall-clock deadline; don't start an attempt that can't finish in it.
      const left = deadlineMs - (now() - t0);
      if (left < minAttemptMs) { errors.push({ provider: p.id, model: p.model, code: "deadline", message: "Out of time for another attempt." }); break; }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, left));
      let chars = 0;
      onProgress({ stage: "provider", provider: p.id, model: p.model, attempt });
      try {
        const res = await p.generate({ messages, maxTokens, signal: controller.signal, onDelta: (n, kind) => { chars += n; onProgress({ stage: "delta", kind, chars }); } });
        spent.push({ provider: res.provider, model: res.model, usage: res.usage, measured: res.measured, neurons: neuronsFor(res.model, res.usage) });
        const v = validate(res.text, res);
        if (v.ok) return { ...res, value: v.value, spent, errors };
        errors.push({ provider: p.id, model: p.model, code: "invalid_output", message: v.error });
        onProgress({ stage: "retry", reason: "invalid_output", detail: String(v.error || "").slice(0, 160) });
      } catch (e) {
        const err = toProviderError(e, p.id);
        // A timed-out stream still consumed neurons for what it produced: charge an estimate.
        if (err.code === "timeout" && chars) {
          const usage = { input: estimateTokens(JSON.stringify(messages)), output: Math.ceil(chars / 3.2) };
          spent.push({ provider: p.id, model: p.model, usage, measured: false, neurons: neuronsFor(p.model, usage) });
        }
        errors.push({ provider: p.id, model: p.model, code: err.code, message: String(err.message).slice(0, 200) });
        onProgress({ stage: "retry", reason: err.code });
        // Quota / config problems, and a model too slow to answer in time: go straight to the next provider.
        if (!err.retryable || err.code === "timeout") break;
        if (attempt < retries) await sleepImpl(backoffMs * 2 ** attempt);
      } finally {
        clearTimeout(timer);
      }
    }
  }
  throw Object.assign(new ProviderError("All AI providers failed: " + errors.map((e) => `${e.model}:${e.code}`).join(", "), { code: errors.some((e) => e.code === "quota") ? "quota" : "upstream" }), { spent, errors });
}
