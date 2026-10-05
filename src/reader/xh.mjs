// XperimentalHamid (authorized partner) source, shared by the Worker and the build script.
// Logic is ported from reader-server.js; network access is injected so it can run on
// Cloudflare Workers (fetch + Cache API) or in Node during builds and tests.
//
// Content policy: we only fetch the partner's public pages/WordPress REST endpoints with an
// identifying User-Agent. If the source blocks or rate-limits us we surface the error; there is
// no proxying, header spoofing or any other attempt to get around access controls.
import { XH_COMPLETED } from "./catalog.mjs";
import { extractLinks, chapterRange, safeUrl, stripTags, buildCoverage, splitChapterPage } from "./text.mjs";

const UA = "XenderSecretsReader/4.0 (+https://www.xendersecrets.com)";

export function createXhSource({ fetchImpl = fetch, timeoutMs = 15000 } = {}) {
  async function get(url, accept) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const r = await fetchImpl(url, { redirect: "follow", headers: { "user-agent": UA, accept }, signal: controller.signal });
      if (!r.ok) {
        const err = new Error("Upstream " + r.status + " for " + url);
        err.status = r.status;
        throw err;
      }
      return r;
    } finally {
      clearTimeout(timer);
    }
  }
  async function fetchHtml(url) {
    const r = await get(url, "text/html,application/xhtml+xml");
    return { html: await r.text(), finalUrl: r.url || url };
  }
  async function fetchJson(url) {
    const r = await get(url, "application/json");
    return r.json();
  }
  async function fetchWpPost(postId, site = "https://xperimentalhamid.com") {
    const id = Number(postId);
    if (!Number.isInteger(id) || id < 1) throw new Error("Invalid WordPress post id");
    const post = await fetchJson(site + "/wp-json/wp/v2/posts/" + id);
    const html = post?.content?.rendered || "";
    if (!html) throw new Error("WordPress post " + id + " has no rendered content");
    return { html, finalUrl: post?.link || site + "/?p=" + id, postId: id };
  }
  function novelSearchTokens(title = "") {
    return String(title).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/)
      .filter((x) => x.length >= 3 && !["the", "and", "novel", "chapter", "online", "free"].includes(x));
  }
  function resultMatchesNovel(resultTitle, novelTitle) {
    const t = String(resultTitle || "").toLowerCase();
    const tokens = novelSearchTokens(novelTitle);
    if (!tokens.length) return false;
    const hit = tokens.filter((x) => t.includes(x)).length;
    return hit >= Math.max(2, Math.ceil(tokens.length * 0.65));
  }
  async function findWpChapterPost(novel, chapter) {
    const site = new URL(novel.indexUrl).origin;
    for (const q of [novel.title + " " + chapter, "Chapter " + chapter + " " + novel.title]) {
      let rows = [];
      try { rows = await fetchJson(site + "/wp-json/wp/v2/search?search=" + encodeURIComponent(q) + "&per_page=20&page=1"); } catch { continue; }
      for (const x of Array.isArray(rows) ? rows : []) {
        const title = stripTags(x.title || "");
        if (!resultMatchesNovel(title, novel.title)) continue;
        const cr = chapterRange(title + " " + (x.url || ""));
        if (!cr || chapter < cr[0] || chapter > cr[1]) continue;
        return { postId: Number(x.id), start: cr[0], end: cr[1], url: safeUrl(x.url) || x.url, title };
      }
    }
    return null;
  }

  /** Build the chapter-range index for a completed XH novel (metadata only, no prose). */
  async function buildIndex(slug) {
    const novel = XH_COMPLETED[slug];
    if (!novel) throw Object.assign(new Error("Unknown completed novel"), { status: 404 });
    const { html, finalUrl } = await fetchHtml(novel.indexUrl);
    const raw = extractLinks(html)
      .filter((a) => /chapter/i.test((a.text || "") + " " + (a.url || "")))
      .filter((a) => !/#comment-|\/comments?\//i.test(a.url || ""));
    const byRange = new Map();
    for (const a of raw) {
      const u = safeUrl(a.url); if (!u) continue;
      const cr = chapterRange((a.text || "") + " " + u); if (!cr) continue;
      let [start, end] = cr;
      if (start < 1 || start > novel.finalChapter || end < start) continue;
      end = Math.min(end, novel.finalChapter);
      const key = start + "-" + end;
      if (!byRange.has(key)) byRange.set(key, { start, end, url: u, label: a.text || "Chapter " + start + (end > start ? "-" + end : "") });
    }
    for (const x of novel.supplementalRanges || []) {
      const u = safeUrl(x.url); if (!u) continue;
      const start = Math.max(1, Number(x.start) || 0), end = Math.min(novel.finalChapter, Number(x.end) || 0);
      if (start > 0 && end >= start) byRange.set(start + "-" + end, { start, end, url: u, label: "Recovered source range " + start + "-" + end, postId: x.postId || null });
    }
    const ranges = [...byRange.values()].sort((a, b) => a.start - b.start || a.end - b.end);
    const gaps = buildCoverage(ranges, novel.finalChapter);
    return { slug, ...novel, indexUrl: finalUrl || novel.indexUrl, ranges, gaps, rangeCount: ranges.length, generatedAt: new Date().toISOString() };
  }

  async function loadGroupHtml(idx, group, chapter) {
    const site = new URL(idx.indexUrl).origin;
    if (group.postId) { try { return await fetchWpPost(group.postId, site); } catch {} }
    try {
      const page = await fetchHtml(group.url);
      const parsed = splitChapterPage(page.html, chapter, group);
      if (parsed.paragraphs.length) return { ...page, preParsed: parsed };
    } catch {}
    const found = await findWpChapterPost(idx, chapter);
    if (found) {
      const page = await fetchWpPost(found.postId, site);
      return { ...page, resolvedGroup: { ...found } };
    }
    throw new Error("No usable source post found for chapter " + chapter);
  }

  /**
   * Fetch + isolate one chapter. `idx` is a prebuilt index (static JSON) or the result of buildIndex.
   * `pageCache` (optional) is {get(key), put(key, value)} for group HTML so neighbouring chapters
   * in the same source post don't refetch.
   */
  async function getChapter(idx, chapter, { pageCache = null } = {}) {
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > idx.finalChapter) throw Object.assign(new Error("Chapter out of range"), { status: 404 });
    let group = idx.ranges.find((r) => chapter >= r.start && chapter <= r.end);
    if (!group) {
      const found = await findWpChapterPost(idx, chapter);
      if (!found) throw Object.assign(new Error("Chapter " + chapter + " is missing from source index"), { status: 404 });
      group = { ...found, label: found.title };
    }
    const cacheKey = group.postId ? "wp:" + group.postId : group.url;
    let page = pageCache ? await pageCache.get(cacheKey) : null;
    if (!page) {
      const loaded = await loadGroupHtml(idx, group, chapter);
      page = { html: loaded.html, finalUrl: loaded.finalUrl, resolvedGroup: loaded.resolvedGroup || null };
      if (pageCache) await pageCache.put(cacheKey, page);
    }
    const effectiveGroup = page.resolvedGroup ? { ...group, ...page.resolvedGroup } : group;
    let parsed = splitChapterPage(page.html, chapter, effectiveGroup);
    if (!parsed.paragraphs.length) {
      const found = await findWpChapterPost(idx, chapter);
      if (found && found.postId !== effectiveGroup.postId) {
        const wp = await fetchWpPost(found.postId, new URL(idx.indexUrl).origin);
        parsed = splitChapterPage(wp.html, chapter, found);
        if (parsed.paragraphs.length) page = { ...page, html: wp.html, finalUrl: wp.finalUrl };
      }
    }
    if (!parsed.paragraphs.length) throw new Error("Could not isolate chapter " + chapter + " from source post");
    const paragraphs = parsed.paragraphs
      .map((x) => String(x).replace(/\s+/g, " ").trim())
      .filter((x) => x && !/^Read Chapter\b/i.test(x) && !/^Join Our official Youtube Channel$/i.test(x));
    if (!paragraphs.length) throw new Error("Chapter " + chapter + " contained no readable prose");
    return {
      ok: true, slug: idx.slug, title: idx.title, chapter, finalChapter: idx.finalChapter,
      chapterTitle: "Chapter " + chapter, paragraphs,
      sourceSite: idx.sourceSite, sourceUrl: page.finalUrl || group.url,
      attribution: "Republished on Xender with permission from XperimentalHamid.",
      gaps: idx.gaps,
    };
  }

  return { buildIndex, getChapter, fetchHtml };
}

/** Public metadata for a novel (what /xh/novel returned on Render). */
export function xhNovelMeta(idx) {
  return { ok: true, slug: idx.slug, title: idx.title, finalChapter: idx.finalChapter, genres: idx.genres, summary: idx.summary, rangeCount: idx.rangeCount, gaps: idx.gaps, sourceSite: idx.sourceSite };
}
