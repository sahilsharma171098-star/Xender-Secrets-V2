// GET /api/youtube/videos — the Xender YouTube channel's public videos, for the free course page.
//
// Source: YouTube's public channel feed (no API key, no cost). It lists the latest 15 public
// uploads, so the page also links to the channel for everything older. Results are cached at the
// edge for an hour, so YouTube is asked at most once an hour per location.

export const CHANNEL_ID = "UCsPuN94qsA9m_4sajdB56DQ";
export const CHANNEL_URL = "https://www.youtube.com/@Xender-s7y";
const FEED_URL = "https://www.youtube.com/feeds/videos.xml?channel_id=" + CHANNEL_ID;
const CACHE_KEY = "https://xender-cache.invalid/youtube/videos-v1";
const TTL = 3600;

// Uploads that shouldn't be shown (e.g. a 2-second test Short titled only with a date).
export const HIDDEN = new Set(["F8Na0s-2Q5Q"]);
const DATE_ONLY = /^\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}\s*$/;

const unescapeXml = (s) => String(s || "")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&amp;/g, "&");

export function parseFeed(xml) {
  const out = [];
  for (const m of String(xml || "").matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1];
    const pick = (re) => unescapeXml((e.match(re) || [])[1] || "").trim();
    const id = pick(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const title = pick(/<title>([^<]*)<\/title>/);
    const link = pick(/<link rel="alternate" href="([^"]+)"/);
    const published = pick(/<published>([^<]+)<\/published>/);
    if (!/^[A-Za-z0-9_-]{11}$/.test(id) || !title) continue;
    if (HIDDEN.has(id) || DATE_ONLY.test(title)) continue;
    const kind = link.includes("/shorts/") ? "short" : "video";
    out.push({ id, title: title.slice(0, 200), url: kind === "short" ? "https://www.youtube.com/shorts/" + id : "https://www.youtube.com/watch?v=" + id, published, kind });
  }
  return out;
}

const json = (body, status = 200, maxAge = 0) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": maxAge ? "public, max-age=" + maxAge : "no-store" },
});

export async function handleYouTubeVideos(request, { cache = null, ctx = null, fetchImpl = fetch } = {}) {
  if (request.method !== "GET") return json({ ok: false, error: "Method not allowed." }, 405);
  if (cache) {
    try { const hit = await cache.match(new Request(CACHE_KEY)); if (hit) return json(await hit.json(), 200, 600); } catch {}
  }
  let videos;
  try {
    const r = await fetchImpl(FEED_URL, { headers: { accept: "application/atom+xml, text/xml" } });
    if (!r.ok) throw new Error("feed " + r.status);
    videos = parseFeed(await r.text());
  } catch {
    return json({ ok: false, error: "Videos are temporarily unavailable.", channelUrl: CHANNEL_URL }, 502);
  }
  const body = { ok: true, channelUrl: CHANNEL_URL, videos, updatedAt: new Date().toISOString() };
  if (cache && videos.length) {
    const p = cache.put(new Request(CACHE_KEY), new Response(JSON.stringify(body), { headers: { "content-type": "application/json", "cache-control": "public, max-age=" + TTL } })).catch(() => {});
    if (ctx?.waitUntil) ctx.waitUntil(p);
  }
  return json(body, 200, 600);
}
