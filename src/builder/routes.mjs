// XEND-BUILDER-001 — Worker-side builder API.
//
// AI calls run in the stateless Worker (never inside the Durable Object, so a slow model can't
// block auth or leads). Every call is bracketed by a reservation in the AppState DO:
//   reserve (quota + budget + ownership)  →  AI with fallback  →  commit (save version) | release
// Generation responses stream NDJSON progress lines so the browser can show live progress and
// no proxy idle-timeout can cut a long generation. All other /api/builder/* routes (projects,
// versions, export, status) are plain JSON served by the DO via store.mjs.
//
// Generated code is never executed here: it is parsed as text, sanitised and stored.

import { configuredProviders, runWithFallback, DEFAULT_MAX_OUTPUT_TOKENS } from "./ai.mjs";
import { newSiteMessages, editMessages, validateGenerated } from "./output.mjs";

const enc = new TextEncoder();
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
});

async function callDo(stub, path, request, body) {
  const headers = new Headers({ "content-type": "application/json" });
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  headers.set("x-xs-ip", request.headers.get("cf-connecting-ip") || "");
  const r = await stub.fetch(new Request("https://builder.internal" + path, { method: "POST", headers, body: JSON.stringify(body) }));
  const j = await r.json().catch(() => ({ ok: false, error: "Storage error." }));
  return { status: r.status, body: j, setCookie: r.headers.get("x-xs-set-cookie") };
}

/**
 * Returns a Response for the two generation routes, or null to let the caller forward the
 * request to the AppState DO. `stub` is the AppState stub; `deps` lets tests inject providers.
 */
export async function handleBuilderGenerate(request, env, ctx, stub, deps = {}) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  let mode = null, projectId = null;
  if (url.pathname === "/api/builder/generate" && method === "POST") mode = "new";
  const em = url.pathname.match(/^\/api\/builder\/projects\/(bp_[a-z2-9]{9})\/edit$/);
  if (em && method === "POST") { mode = "edit"; projectId = em[1]; }
  if (!mode) return null;

  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return json({ ok: false, error: "Invalid request origin." }, 403);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ ok: false, error: "Invalid request." }, 400);

  const providers = deps.providers || configuredProviders(env, { host: url.hostname });
  if (!providers.length) return json({ ok: false, code: "unconfigured", error: "The AI builder isn't connected to a model yet." }, 503);

  const rsv = await callDo(stub, "/__builder/reserve", request, { prompt: body.prompt, mode, projectId });
  const cookieHeaders = rsv.setCookie ? { "set-cookie": rsv.setCookie } : {};
  if (!rsv.body.ok) return json(rsv.body, rsv.status, cookieHeaders);
  const { reservation, neuronAllowance, prompt, files: current } = rsv.body;

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  let open = true;
  const send = async (obj) => { if (!open) return; try { await writer.write(enc.encode(JSON.stringify(obj) + "\n")); } catch { open = false; } };

  const started = Date.now();
  const work = (async () => {
    let lastSent = 0;
    const heartbeat = setInterval(() => { send({ type: "progress", stage: "waiting", ms: Date.now() - started }); }, 8000);
    try {
      await send({ type: "start", mode, reservation: reservation.slice(0, 8) });
      const messages = mode === "edit" ? editMessages(prompt, current) : newSiteMessages(prompt);
      const maxTokens = Number(env.BUILDER_MAX_OUTPUT_TOKENS) || DEFAULT_MAX_OUTPUT_TOKENS;
      // Worst case for one more attempt at the most expensive configured Workers AI rate.
      const inTokens = Math.ceil(JSON.stringify(messages).length / 3);
      const worstAttempt = (inTokens * 5500 + maxTokens * 36400) / 1e6;
      const result = await runWithFallback(providers, {
        messages,
        maxTokens,
        timeoutMs: Number(env.BUILDER_TIMEOUT_MS) || 150000,
        deadlineMs: Number(env.BUILDER_DEADLINE_MS) || 270000,
        validate: (text) => validateGenerated(text, { mode, current }),
        // Stop before an attempt that could push this request past its reserved allowance.
        budgetLeft: (spent) => (spent.length ? neuronAllowance - spent.reduce((n, s) => n + s.neurons, 0) - worstAttempt : 1),
        sleepImpl: deps.sleep,
        onProgress: (p) => {
          const now = Date.now();
          if (p.stage === "delta" && now - lastSent < 700) return;
          lastSent = now;
          send({ type: "progress", ...p, ms: now - started });
        },
      });
      send({ type: "progress", stage: "saving", ms: Date.now() - started });
      const saved = await callDo(stub, "/__builder/commit", request, {
        reservation, files: result.value.files, summary: result.value.summary, provider: result.provider, model: result.model, spent: result.spent, ms: Date.now() - started,
      });
      if (!saved.body.ok) throw Object.assign(new Error(saved.body.error || "Could not save the project."), { saveFailed: true });
      await send({ type: "done", project: saved.body.project, version: saved.body.version, summary: result.value.summary, changed: result.value.changed || Object.keys(result.value.files), warnings: result.value.warnings, provider: result.provider, model: result.model, ms: Date.now() - started });
    } catch (e) {
      if (!e.saveFailed) await callDo(stub, "/__builder/release", request, { reservation, spent: e.spent || [], error: (e.errors || []).map((x) => `${x.provider}:${x.code}`).join(",") || String(e.message), ms: Date.now() - started });
      const code = e.code === "budget" || e.code === "quota" ? "capacity" : "failed";
      await send({ type: "error", code, error: code === "capacity" ? "Free AI capacity ran out during this request. Your free generation was not used. Try again after 00:00 UTC, or ask our team to build it." : "The AI couldn't produce a usable website this time. Your free generation was not used — please try again, maybe with a simpler request." });
    } finally {
      clearInterval(heartbeat);
      open && (await writer.close().catch(() => {}));
    }
  })();
  if (ctx?.waitUntil) ctx.waitUntil(work);
  return new Response(readable, { status: 200, headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...cookieHeaders } });
}

// ---------- security headers for the /builder pages ----------

const PREVIEW_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com https://cdn.tailwindcss.com",
  "style-src 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com",
  "font-src data: https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com",
  "img-src data: blob: https:",
  "media-src data: blob: https:",
  "connect-src 'none'",
  "frame-src https://www.google.com https://maps.google.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-ancestors 'self'",
].join("; ");

const APP_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'self'",
  "form-action 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
].join("; ");

export const BUILDER_CSP = { preview: PREVIEW_CSP, app: APP_CSP };

/** Adds CSP + isolation headers to /builder pages served from static assets. */
export function withBuilderHeaders(path, response) {
  if (!(path === "/builder" || path.startsWith("/builder/"))) return response;
  const ct = response.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return response;
  const res = new Response(response.body, response);
  const isFrame = path === "/builder/frame";
  res.headers.set("content-security-policy", isFrame ? PREVIEW_CSP : APP_CSP);
  res.headers.set("x-content-type-options", "nosniff");
  res.headers.set("referrer-policy", isFrame ? "no-referrer" : "strict-origin-when-cross-origin");
  res.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  if (isFrame) {
    res.headers.set("x-robots-tag", "noindex, nofollow");
    res.headers.set("cache-control", "public, max-age=300");
  } else {
    res.headers.set("x-frame-options", "DENY");
    if (path !== "/builder" && path !== "/builder/pricing") res.headers.set("x-robots-tag", "noindex, nofollow");
  }
  return res;
}
