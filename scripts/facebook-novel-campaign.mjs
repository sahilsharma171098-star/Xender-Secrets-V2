#!/usr/bin/env node
// Xender Secrets Facebook Page novel traffic campaign.
// Only CC BY 4.0 works with complete source attribution have chapter text redistributed.
// XperimentalHamid has website-only republication permission: promote by original synopsis only.
// Gutenberg Chinese-source classics are promoted with original English synopsis only.
// Facebook Page publishing requires FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN, pages_manage_posts,
// pages_read_engagement and Page task access. No profile/group spam or scraping.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logPath = path.join(root, "marketing/novels/facebook-publish-log.json");
const maxChars = 45000;
const MAX_SERIAL_CHAPTERS = 10;
const adTags = "\n\n#XenderSecrets #WebNovels #ReadOnline";
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const normalize = s => String(s || "").replace(/\r\n/g, "\n").trim();
const excerpt = (text, max) => {
  if (text.length <= max) return { text, complete: true };
  const limit = text.lastIndexOf("\n\n", max);
  return { text: text.slice(0, limit > max / 2 ? limit : max).trimEnd() + "\n\n[Chapter continues online]", complete: false };
};
const urlFor = (kind, slug, chapter, source) => {
  const u = new URL("https://www.xendersecrets.com/reader");
  u.searchParams.set(kind, slug);
  u.searchParams.set("chapter", String(chapter));
  u.searchParams.set("utm_source", "facebook");
  u.searchParams.set("utm_medium", "organic");
  u.searchParams.set("utm_campaign", "novel_series");
  u.searchParams.set("utm_content", source);
  return u.toString();
};
const markerFor = s => "XS-NOVEL-" + crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);
const makePost = (id, title, body, link, details) => {
  const marker = markerFor(id);
  return { id, title, body: body + "\n\nContinue reading on Xender Secrets → " + link + adTags + "\nSeries ID: " + marker, marker, url: link, ...details };
};

export function buildQueue() {
  const catalog = readJson("public/novel-data/catalog.json");
  const raw = fs.readFileSync(path.join(root, "public/licensed-novels.js"), "utf8").trim();
  const licensed = JSON.parse(raw.replace(/^window\.XENDER_LICENSED_FICTION\s*=\s*/, "").replace(/;\s*$/, ""));
  const queue = [];
  // XH permissions in scripts/build-novel-data.mjs are for xendersecrets.com only.
  // Never include chapter prose from that source in a Facebook post.
  for (const item of catalog.xh || []) {
    const genres = (item.genres || []).slice(0, 3).join(" • ");
    const link = urlFor("xh", item.slug, 1, item.slug + "-teaser");
    queue.push(makePost("xh:" + item.slug, item.title,
      "📖 " + item.title + "\n\n" + normalize(item.summary) +
      "\n\nGenre: " + genres + "\n\nStart this completed series — Chapter 1 is free.",
      link, { category: "original_teaser", source: "XperimentalHamid", chapter: null }));
  }
  for (const [slug, book] of Object.entries(licensed)) {
    if (book.license !== "CC BY 4.0" || !book.author || !book.sourceUrl ||
        !book.licenseUrl || !Array.isArray(book.chapters)) continue;
    const upto = Math.min(MAX_SERIAL_CHAPTERS, book.chapters.length);
    for (let idx = 0; idx < upto; idx++) {
      const ch = book.chapters[idx];
      if (typeof ch.body !== "string" || !ch.body.trim()) continue;
      const header = "📖 " + book.title + "\nChapter " + (idx + 1) + " of " + book.chapters.length +
        "\n\n";
      const credit = "\n\nBy " + book.author +
        "\nOriginal: " + (ch.sourceUrl || book.sourceUrl) +
        "\nLicense: CC BY 4.0 (" + book.licenseUrl + ")" +
        "\nEdited for Facebook layout; original text credited.";
      const allowance = maxChars - header.length - credit.length - adTags.length - 450;
      const slice = excerpt(normalize(ch.body), allowance);
      const next = slice.complete ? Math.min(idx + 2, book.chapters.length) : idx + 1;
      const suffix = slice.complete && idx + 1 === book.chapters.length ?
        "\n\nThe story concludes here. Explore more free novels online." :
        "\n\n" + (slice.complete ? "Next chapter:" : "Continue this chapter:");
      const link = urlFor("licensed", slug, next, slug + "-chapter-" + (idx + 1));
      queue.push(makePost("licensed:" + slug + ":" + (idx + 1), book.title + " — Chapter " + (idx + 1),
        header + slice.text + credit + suffix,
        link, { category: "cc_by_chapter", chapter: idx + 1, source: "CC BY 4.0", complete: slice.complete }));
    }
  }
  for (const item of catalog.gutenberg || []) {
    const link = urlFor("gutenberg", item.slug, 1, item.slug + "-teaser");
    queue.push(makePost("gutenberg:" + item.slug, item.title,
      "📚 " + item.title + "\n\n" + normalize(item.summary) +
      "\n\nExplore the original Chinese-language classic on Xender. Translation options are available in the reader.",
      link, { category: "original_teaser", source: "Project Gutenberg", chapter: null }));
  }
  if (!queue.length || new Set(queue.map(p => p.id)).size !== queue.length) throw new Error("Empty or duplicate queue");
  for (const p of queue) {
    if (p.body.length > 63200) throw new Error("Facebook text too long: " + p.id);
    if (!p.body.includes("www.xendersecrets.com/reader")) throw new Error("Direct reader link missing: " + p.id);
  }
  return queue;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function graph(route, opts = {}) {
  const endpoint = "https://graph.facebook.com/v26.0/" + route.replace(/^\//, "");
  let response, data;
  for (let attempt = 1; attempt <= 3; attempt++) {
    response = await fetch(endpoint, {
      ...opts, headers: { Authorization: "Bearer " + process.env.FB_PAGE_ACCESS_TOKEN,
        ...(opts.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) }
    });
    data = await response.json().catch(() => ({}));
    if (response.ok) return data;
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 3) break;
    await sleep(1000 * attempt);
  }
  throw new Error("Facebook Graph request failed (" + response.status + "): " + (data.error?.message || "Unknown error"));
}

async function publish() {
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) throw new Error("FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN secrets are required; nothing published");
  const page = await graph(pageId + "?fields=id,name");
  if (String(page.id) !== String(pageId)) throw new Error("Page identity mismatch");
  const records = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, "utf8")) : { version: 1, posts: [] };
  const queue = buildQueue();
  const next = queue.find(p => !records.posts.some(r => r.id === p.id));
  if (!next) { console.log("Campaign complete; no repeats."); return; }

  // Remote dedupe: guards a successful publish followed by a failed local log commit.
  // Stop if Page post read permission is missing rather than risk a duplicate.
  const recent = await graph(pageId + "/posts?fields=id,message&limit=100");
  const found = (recent.data || []).find(p => String(p.message || "").includes(next.marker));
  let publishedId = found?.id;
  if (!publishedId) {
    const result = await graph(pageId + "/feed", {
      method: "POST", body: new URLSearchParams({ message: next.body })
    });
    publishedId = result.id;
    if (!publishedId) throw new Error("Facebook returned no post id. Inspect Page before retry.");
  }
  records.posts.push({ id: next.id, postId: publishedId, publishedAt: new Date().toISOString(),
    title: next.title, category: next.category, readerUrl: next.url });
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, JSON.stringify(records, null, 2) + "\n");
  console.log(JSON.stringify({ published: next.id, facebookPostId: publishedId,
    pageName: page.name, nextReaderUrl: next.url, remaining: queue.length - records.posts.length }));
}

const args = process.argv.slice(2);
if (args.includes("--dry-run")) {
  const all = buildQueue();
  console.log(JSON.stringify({ count: all.length, posts: all.map(p =>
    ({ id: p.id, title: p.title, category: p.category, length: p.body.length,
      complete: p.complete ?? null, nextReaderUrl: p.url })) }, null, 2));
} else if (args.includes("--publish")) {
  publish().catch(e => { console.error(e.message); process.exitCode = 1; });
} else {
  console.error("Usage: node scripts/facebook-novel-campaign.mjs --dry-run | --publish");
  process.exitCode = 2;
}
