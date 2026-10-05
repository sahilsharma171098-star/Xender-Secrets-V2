// /api/reader/* — the Cloudflare replacement for the Render reader service.
//
// Gutenberg chapters and the catalog are static files under /novel-data and never reach this
// code. Only the XH partner source needs a runtime fetch; results are cached at the edge
// (Cache API) so each chapter is fetched from the partner at most once per day per location.
// Dependencies are injected so the same handler runs in the Worker and in Node tests.
import { createXhSource, xhNovelMeta } from "./xh.mjs";
import { XH_COMPLETED } from "./catalog.mjs";

const CACHE_ORIGIN = "https://reader-cache.xendersecrets.internal/v1/";
const json = (data, status = 200, maxAge = 0) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": maxAge ? "public, max-age=" + maxAge : "no-store",
    "x-reader-backend": "cloudflare-worker",
  },
});

export async function handleReaderApi(request, { assets = null, cache = null, ctx = null, fetchImpl = fetch } = {}) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method !== "GET") return json({ ok: false, error: "Method not allowed." }, 405);
  if (path === "/api/reader/health") return json({ ok: true, service: "Xender Reader API (Cloudflare Worker)", sources: { gutenberg: "static", xh: "edge" } });

  const edgeGet = async (key) => {
    if (!cache) return null;
    try { const r = await cache.match(new Request(CACHE_ORIGIN + key)); return r ? await r.json() : null; } catch { return null; }
  };
  const edgePut = (key, value, ttl) => {
    if (!cache) return;
    const p = cache.put(new Request(CACHE_ORIGIN + key), new Response(JSON.stringify(value), { headers: { "content-type": "application/json", "cache-control": "public, max-age=" + ttl } })).catch(() => {});
    ctx?.waitUntil ? ctx.waitUntil(p) : null;
    return p;
  };
  const xh = createXhSource({ fetchImpl });

  async function indexFor(slug) {
    // 1) prebuilt metadata committed by scripts/build-novel-data.mjs (ranges only, no prose)
    if (assets) {
      try {
        const r = await assets.fetch(new Request("https://assets.invalid/novel-data/xh/" + slug + "/index.json"));
        if (r.ok) { const j = await r.json(); if (Array.isArray(j.ranges) && j.ranges.length) return j; }
      } catch {}
    }
    // 2) live-built index, cached at the edge for 6 hours
    const key = "xh-index/" + slug;
    const hit = await edgeGet(key);
    if (hit) return hit;
    const idx = await xh.buildIndex(slug);
    edgePut(key, idx, 21600);
    return idx;
  }

  if (path === "/api/reader/xh/novel" || path === "/api/reader/xh/chapter") {
    const slug = String(url.searchParams.get("slug") || "");
    if (!Object.prototype.hasOwnProperty.call(XH_COMPLETED, slug)) return json({ ok: false, error: "Novel not found" }, 404);
    if (path === "/api/reader/xh/chapter") {
      const n0 = Number(url.searchParams.get("n") || "1");
      if (!Number.isInteger(n0) || n0 < 1) return json({ ok: false, error: "Chapter out of range" }, 404);
    }
    try {
      const idx = await indexFor(slug);
      if (path === "/api/reader/xh/novel") return json(xhNovelMeta(idx), 200, 3600);
      const n = Number(url.searchParams.get("n") || "1");
      if (!Number.isInteger(n) || n < 1 || n > idx.finalChapter) return json({ ok: false, error: "Chapter out of range" }, 404);
      const ckey = "xh-ch/" + slug + "/" + n;
      const cached = await edgeGet(ckey);
      if (cached) return json(cached, 200, 3600);
      const pageCache = { get: (k) => edgeGet("xh-page/" + encodeURIComponent(k)), put: (k, v) => edgePut("xh-page/" + encodeURIComponent(k), v, 86400) };
      const data = await xh.getChapter(idx, n, { pageCache });
      edgePut(ckey, data, 86400);
      return json(data, 200, 3600);
    } catch (e) {
      return json({ ok: false, error: String(e?.message || e) }, e?.status === 404 ? 404 : 502);
    }
  }
  return json({ ok: false, error: "Route not found." }, 404);
}
