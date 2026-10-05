#!/usr/bin/env node
// Pre-generates reader data so readers never wait on a runtime backend.
//
//   node scripts/build-novel-data.mjs --gutenberg            # public-domain chapters -> static JSON
//   node scripts/build-novel-data.mjs --xh-index             # partner chapter-range index (metadata only)
//   node scripts/build-novel-data.mjs --all
//   node scripts/build-novel-data.mjs --check                # offline: validate what is committed
//   node scripts/build-novel-data.mjs --parity https://xender-reader-stable.onrender.com --samples 3
//
// Output (served as static assets by Cloudflare, no Worker invocation):
//   public/novel-data/catalog.json
//   public/novel-data/gutenberg/<slug>/manifest.json
//   public/novel-data/gutenberg/<slug>/00001-00010.json      ({chapters:[{n,title,paragraphs}]})
//   public/novel-data/xh/<slug>/index.json                    (chapter ranges + source URLs, no prose)
//   reports/novel-data-build.json                              (not deployed)
//
// Partner (XH) prose is deliberately NOT committed: this repository is public and the documented
// permission is to republish on xendersecrets.com, so XH chapters are fetched on demand by the
// Worker and cached at the edge. Only public-domain text is stored here.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { GUTENBERG_SERIALS, XH_COMPLETED } from "../src/reader/catalog.mjs";
import { splitGutenbergChineseChapters, splitGutenbergRomanChapters } from "../src/reader/text.mjs";
import { createXhSource } from "../src/reader/xh.mjs";

const UA = "XenderSecretsReaderBuild/1.0 (+https://www.xendersecrets.com)";
const args = process.argv.slice(2);
const flag = (n) => args.includes("--" + n);
const opt = (n, d) => { const i = args.indexOf("--" + n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d; };

const OUT = path.resolve(opt("out", "public/novel-data"));
const CHUNK = Math.max(1, Number(opt("chunk", 10)));
const ONLY = opt("only", null);
const DELAY = Number(opt("delay", 1500));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const writeJson = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v)); };
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const pad = (n) => String(n).padStart(5, "0");

/** Polite fetch: identifying UA, retry 429/5xx with backoff, stop on 401/403 (never bypass). */
export async function politeFetch(url, { fetchImpl = fetch, attempts = 4, accept = "text/plain" } = {}) {
  let last;
  for (let a = 1; a <= attempts; a++) {
    try {
      const r = await fetchImpl(url, { headers: { "user-agent": UA, accept } });
      if (r.ok) return r;
      if (r.status === 401 || r.status === 403) throw Object.assign(new Error(`Access denied (${r.status}) by ${new URL(url).host}; not retrying`), { fatal: true });
      last = new Error(`HTTP ${r.status} for ${url}`);
      if (r.status !== 429 && r.status < 500) throw Object.assign(last, { fatal: true });
      const ra = Number(r.headers.get("retry-after"));
      await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra, 120) * 1000 : 2000 * 2 ** (a - 1));
    } catch (e) {
      if (e.fatal || a === attempts) throw e;
      last = e;
      await sleep(2000 * 2 ** (a - 1));
    }
  }
  throw last;
}

/** Turn a full Gutenberg text into chunk files + manifest. Pure: easy to unit test. */
export function buildGutenbergNovel(slug, novel, text, { chunk = CHUNK } = {}) {
  const src = novel.sources[0];
  const map = src.mode === "chinese" ? splitGutenbergChineseChapters(text, novel.finalChapter) : splitGutenbergRomanChapters(text);
  const chapters = [];
  const missing = [];
  for (let n = 1; n <= novel.finalChapter; n++) {
    const ch = map.get(n);
    if (ch && ch.paragraphs.length) chapters.push({ n, title: ch.title, paragraphs: ch.paragraphs });
    else missing.push(n);
  }
  const files = [];
  for (let i = 0; i < chapters.length; i += chunk) {
    const part = chapters.slice(i, i + chunk);
    const from = part[0].n, to = part[part.length - 1].n;
    files.push({ file: `${pad(from)}-${pad(to)}.json`, body: { slug, from, to, chapters: part } });
  }
  const gaps = [];
  for (const n of missing) { const g = gaps[gaps.length - 1]; if (g && g[1] === n - 1) g[1] = n; else gaps.push([n, n]); }
  const manifest = {
    slug, title: novel.title, author: novel.author, finalChapter: novel.finalChapter, genres: novel.genres,
    summary: novel.summary, language: novel.language || "en", sourceSite: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/" + src.bookId,
    attribution: "Public-domain edition sourced from Project Gutenberg.",
    gaps, chapterCount: chapters.length, sourceSha256: sha(text), generatedAt: new Date().toISOString(),
    chunks: files.map((f) => ({ from: f.body.from, to: f.body.to, file: f.file })),
  };
  return { manifest, files };
}

/** For each missing chapter, show the source lines that mention it so a parser fix can be targeted. */
const ZH_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
export function zhNumeral(n) {
  if (n < 10) return ZH_DIGITS[n];
  if (n < 20) return "十" + (n % 10 ? ZH_DIGITS[n % 10] : "");
  if (n < 100) return ZH_DIGITS[Math.floor(n / 10)] + "十" + (n % 10 ? ZH_DIGITS[n % 10] : "");
  return "一百" + (n % 100 ? (n % 100 < 10 ? "零" : "") + zhNumeral(n % 100).replace(/^一十/, "一十") : "");
}
export function gapHints(text, gaps) {
  const lines = text.split(/\r?\n/);
  const out = {};
  for (const [a, b] of gaps) for (let n = a; n <= Math.min(b, a + 4); n++) {
    const z = zhNumeral(n);
    out[n] = lines.map((l, i) => ({ i, l })).filter(({ l }) => l.includes(z + "回") || l.includes("第" + z) || new RegExp("CHAPTER\\s+" + n + "\\b", "i").test(l)).slice(0, 4).map(({ i, l }) => `L${i}: ${JSON.stringify(l.slice(0, 80))}`);
  }
  return out;
}

function writeNovel(dir, { manifest, files }) {
  fs.rmSync(dir, { recursive: true, force: true });
  for (const f of files) writeJson(path.join(dir, f.file), f.body);
  writeJson(path.join(dir, "manifest.json"), manifest);
}

function gutenbergCatalogItem(slug, n, manifest) {
  return { slug, title: n.title, author: n.author, finalChapter: n.finalChapter, genres: n.genres, summary: n.summary, language: n.language || "en", sourceSite: "Project Gutenberg", indexStatus: { gaps: manifest?.gaps || [] }, static: Boolean(manifest) };
}
function xhCatalogItem(slug, n, idx) {
  const { supplementalRanges, ...meta } = n;
  return { slug, ...meta, indexStatus: idx ? { rangeCount: idx.rangeCount, gaps: idx.gaps } : null };
}

export function writeCatalog(out = OUT) {
  const g = Object.entries(GUTENBERG_SERIALS).map(([slug, n]) => {
    const p = path.join(out, "gutenberg", slug, "manifest.json");
    return gutenbergCatalogItem(slug, n, fs.existsSync(p) ? readJson(p) : null);
  });
  const x = Object.entries(XH_COMPLETED).map(([slug, n]) => {
    const p = path.join(out, "xh", slug, "index.json");
    return xhCatalogItem(slug, n, fs.existsSync(p) ? readJson(p) : null);
  });
  const catalog = { ok: true, completedOnly: true, generatedAt: new Date().toISOString(), permissionBasis: "XH titles are republished with permission from XperimentalHamid.", gutenberg: g, xh: x };
  writeJson(path.join(out, "catalog.json"), catalog);
  return catalog;
}

/** Offline validation of committed data (runs in CI without network). */
export function checkData(out = OUT) {
  const problems = [];
  const summary = {};
  for (const [slug, n] of Object.entries(GUTENBERG_SERIALS)) {
    const dir = path.join(out, "gutenberg", slug);
    const mp = path.join(dir, "manifest.json");
    if (!fs.existsSync(mp)) { summary[slug] = "not generated (reader falls back to Render)"; continue; }
    const m = readJson(mp);
    const seen = new Set();
    for (const c of m.chunks) {
      const fp = path.join(dir, c.file);
      if (!fs.existsSync(fp)) { problems.push(`${slug}: missing chunk ${c.file}`); continue; }
      const body = readJson(fp);
      if (body.from !== c.from || body.to !== c.to) problems.push(`${slug}: chunk ${c.file} range mismatch`);
      for (const ch of body.chapters) {
        if (seen.has(ch.n)) problems.push(`${slug}: duplicate chapter ${ch.n}`);
        seen.add(ch.n);
        if (ch.n < c.from || ch.n > c.to) problems.push(`${slug}: chapter ${ch.n} outside chunk ${c.file}`);
        if (!Array.isArray(ch.paragraphs) || !ch.paragraphs.length || ch.paragraphs.join("").length < 40) problems.push(`${slug}: chapter ${ch.n} is empty`);
      }
    }
    const missing = [];
    for (let k = 1; k <= n.finalChapter; k++) if (!seen.has(k)) missing.push(k);
    const declared = (m.gaps || []).reduce((t, [a, b]) => t + (b - a + 1), 0);
    if (missing.length !== declared) problems.push(`${slug}: ${missing.length} missing chapters but manifest declares ${declared}`);
    if (m.finalChapter !== n.finalChapter) problems.push(`${slug}: finalChapter ${m.finalChapter} != catalog ${n.finalChapter}`);
    summary[slug] = `${seen.size}/${n.finalChapter} chapters static${missing.length ? `, gaps ${JSON.stringify(m.gaps)}` : ""}`;
  }
  for (const slug of Object.keys(XH_COMPLETED)) {
    const p = path.join(out, "xh", slug, "index.json");
    if (!fs.existsSync(p)) { summary["xh:" + slug] = "no prebuilt index (Worker builds it live)"; continue; }
    const idx = readJson(p);
    if (JSON.stringify(idx).match(/"paragraphs"/)) problems.push(`xh/${slug}: index must not contain prose`);
    summary["xh:" + slug] = `${idx.rangeCount} ranges, gaps ${JSON.stringify(idx.gaps)}`;
  }
  return { problems, summary };
}

async function main() {
  const report = { startedAt: new Date().toISOString(), gutenberg: {}, xh: {}, parity: [] };
  const doG = flag("gutenberg") || flag("all"), doX = flag("xh-index") || flag("all");

  if (doG) {
    for (const [slug, novel] of Object.entries(GUTENBERG_SERIALS)) {
      if (ONLY && ONLY !== slug) continue;
      try {
        const r = await politeFetch(novel.sources[0].url);
        const text = await r.text();
        const built = buildGutenbergNovel(slug, novel, text);
        writeNovel(path.join(OUT, "gutenberg", slug), built);
        report.gutenberg[slug] = { chapters: built.manifest.chapterCount, finalChapter: novel.finalChapter, gaps: built.manifest.gaps, files: built.files.length, bytes: text.length };
        if (built.manifest.gaps.length) report.gutenberg[slug].gapHints = gapHints(text, built.manifest.gaps);
        console.log(`gutenberg ${slug}: ${built.manifest.chapterCount}/${novel.finalChapter} chapters in ${built.files.length} files`);
      } catch (e) {
        report.gutenberg[slug] = { error: String(e.message || e) };
        console.log(`::warning::gutenberg ${slug}: ${e.message}`);
      }
      await sleep(DELAY);
    }
  }

  if (doX) {
    const xh = createXhSource({ fetchImpl: (u, init) => fetch(u, init) });
    for (const slug of Object.keys(XH_COMPLETED)) {
      if (ONLY && ONLY !== slug) continue;
      try {
        const idx = await xh.buildIndex(slug);
        writeJson(path.join(OUT, "xh", slug, "index.json"), idx);
        report.xh[slug] = { rangeCount: idx.rangeCount, gaps: idx.gaps };
        console.log(`xh ${slug}: ${idx.rangeCount} ranges, gaps ${JSON.stringify(idx.gaps)}`);
      } catch (e) {
        report.xh[slug] = { error: String(e.message || e) };
        console.log(`::warning::xh index ${slug}: ${e.message}`);
      }
      await sleep(DELAY);
    }
  }

  if (doG || doX) writeCatalog();

  const parityBase = opt("parity", null);
  if (parityBase) {
    // Compare static chapters with what the Render service returns for the same chapter.
    const samples = Number(opt("samples", 3));
    for (const [slug, n] of Object.entries(GUTENBERG_SERIALS)) {
      const mp = path.join(OUT, "gutenberg", slug, "manifest.json");
      if (!fs.existsSync(mp)) continue;
      const m = readJson(mp);
      const picks = [1, Math.ceil(n.finalChapter / 2), n.finalChapter].slice(0, samples);
      for (const ch of picks) {
        const chunk = m.chunks.find((c) => ch >= c.from && ch <= c.to);
        const local = chunk && readJson(path.join(OUT, "gutenberg", slug, chunk.file)).chapters.find((x) => x.n === ch);
        let remote = null, err = null;
        try {
          const r = await fetch(`${parityBase}/gutenberg/chapter?slug=${slug}&n=${ch}`, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(90000) });
          remote = await r.json();
        } catch (e) { err = String(e.message || e); }
        const same = Boolean(local && remote?.ok && remote.chapterTitle === local.title && JSON.stringify(remote.paragraphs) === JSON.stringify(local.paragraphs));
        report.parity.push({ slug, chapter: ch, identical: same, error: err || (remote && !remote.ok ? remote.error : null) });
        console.log(`${same ? "" : "::warning::"}parity ${slug}#${ch}: ${same ? "identical" : "DIFFERENT " + (err || "")}`);
      }
    }
  }

  if (flag("check") || doG || doX) {
    const { problems, summary } = checkData();
    report.check = { problems, summary };
    for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${v}`);
    problems.forEach((p) => console.log(`::error::${p}`));
    if (problems.length) process.exitCode = 1;
  }
  if (doG || doX || parityBase) {
    report.finishedAt = new Date().toISOString();
    writeJson(path.resolve("reports/novel-data-build.json"), report);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
