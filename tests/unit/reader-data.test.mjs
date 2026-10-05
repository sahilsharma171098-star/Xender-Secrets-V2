// Offline tests for the reader migration: Gutenberg pre-generation, data validation,
// the XH partner source and the Worker /api/reader/* handler (network fully mocked).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildGutenbergNovel, checkData } from '../../scripts/build-novel-data.mjs';
import { createXhSource } from '../../src/reader/xh.mjs';
import { handleReaderApi } from '../../src/reader/api.mjs';
import { GUTENBERG_SERIALS } from '../../src/reader/catalog.mjs';

const ZH = ['一','二','三','四','五','六','七','八','九','十'];
const zhNum = (n) => n <= 10 ? ZH[n - 1] : n < 20 ? '十' + ZH[n - 11] : ZH[Math.floor(n / 10) - 1] + '十' + (n % 10 ? ZH[n % 10 - 1] : '');
function chineseBook(final, { skip = [] } = {}) {
  let t = 'Title: Test\n\n*** START OF THE PROJECT GUTENBERG EBOOK TEST ***\n\n目錄\n';
  for (let n = 1; n <= final; n++) t += `第${zhNum(n)}回　目錄項${n}\n`; // table of contents: short entries, must be ignored
  for (let n = 1; n <= final; n++) {
    if (skip.includes(n)) continue;
    t += `\n\n第${zhNum(n)}回　標題${n}\n\n` + Array.from({ length: 4 }, (_, p) => `　　第${n}回第${p + 1}段：孫悟空道：「師父，此去西天路遠，須要小心。」`).join('\n\n');
  }
  return t + '\n\n*** END OF THE PROJECT GUTENBERG EBOOK TEST ***\nLicense text that must not appear.';
}
const novel = (final) => ({ ...GUTENBERG_SERIALS['travels-lao-can-zh'], finalChapter: final });

test('Gutenberg Chinese edition is split into contiguous static chapters', () => {
  const { manifest, files } = buildGutenbergNovel('test-zh', novel(23), chineseBook(23), { chunk: 10 });
  assert.equal(manifest.chapterCount, 23);
  assert.deepEqual(manifest.gaps, []);
  assert.deepEqual(files.map((f) => f.file), ['00001-00010.json', '00011-00020.json', '00021-00023.json']);
  const ch21 = files[2].body.chapters[0];
  assert.equal(ch21.n, 21);
  assert.equal(ch21.title, 'Chapter 21 — 標題21');
  assert.equal(ch21.paragraphs.length, 4);
  assert.ok(ch21.paragraphs[0].includes('第21回第1段'));
  assert.ok(!JSON.stringify(files).includes('License text'), 'Gutenberg licence footer excluded');
  assert.match(manifest.sourceSha256, /^[0-9a-f]{64}$/);
});

test('missing chapters are reported as gaps, never silently skipped', () => {
  const { manifest } = buildGutenbergNovel('test-zh', novel(12), chineseBook(12, { skip: [5, 6, 11] }), { chunk: 10 });
  assert.deepEqual(manifest.gaps, [[5, 6], [11, 11]]);
  assert.equal(manifest.chapterCount, 9);
});

test('checkData validates committed files and catches tampering', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'nd-'));
  const slug = 'travels-lao-can-zh';
  const built = buildGutenbergNovel(slug, GUTENBERG_SERIALS[slug], chineseBook(20), { chunk: 10 });
  const dir = path.join(out, 'gutenberg', slug);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of built.files) fs.writeFileSync(path.join(dir, f.file), JSON.stringify(f.body));
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(built.manifest));
  assert.deepEqual(checkData(out).problems, []);
  fs.rmSync(path.join(dir, '00011-00020.json'));
  assert.ok(checkData(out).problems.some((p) => p.includes('missing chunk')));
});

// ---- XH partner source -------------------------------------------------------------------
function fakeXh({ status = 200 } = {}) {
  const calls = [];
  const indexHtml = '<article>' + Array.from({ length: 20 }, (_, i) => {
    const a = i * 5 + 1;
    return `<p><a href="https://xperimentalhamid.com/novels/take-my-breath-away-chapter-${a}-${a + 4}-new/">Chapter ${a} &#8211; ${a + 4}</a></p>`;
  }).join('') + '</article><a href="https://evil.example.com/chapter-1">Chapter 1</a>';
  const post = (a) => '<article>' + Array.from({ length: 5 }, (_, k) => `<h2>Chapter ${a + k}</h2><p>Story text of chapter ${a + k}, part one.</p><p>Part two of ${a + k}.</p><p>Subscribe for more update</p>`).join('') + '</article>';
  const impl = async (url) => {
    calls.push(url);
    if (status !== 200) return new Response('blocked', { status });
    if (url.includes('complete-chapters')) return new Response(indexHtml, { headers: { 'content-type': 'text/html' } });
    const m = url.match(/chapter-(\d+)-(\d+)-new/);
    if (m) return new Response(post(Number(m[1])), { headers: { 'content-type': 'text/html' } });
    if (url.includes('/wp-json/')) return new Response('[]', { headers: { 'content-type': 'application/json' } });
    return new Response('nf', { status: 404 });
  };
  return { impl, calls };
}

test('XH index is built from links on the partner index page (foreign hosts ignored)', async () => {
  const f = fakeXh();
  const idx = await createXhSource({ fetchImpl: f.impl }).buildIndex('take-my-breath-away');
  assert.ok(idx.ranges.some((r) => r.start === 6 && r.end === 10));
  assert.ok(idx.ranges.every((r) => /xperimentalhamid\.com/.test(r.url)));
  assert.deepEqual(idx.gaps[0], [101, 1295]);
  assert.ok(!JSON.stringify(idx).includes('Story text'), 'index carries no prose');
});

test('XH chapter is isolated from a multi-chapter post and boilerplate is dropped', async () => {
  const f = fakeXh();
  const xh = createXhSource({ fetchImpl: f.impl });
  const idx = await xh.buildIndex('take-my-breath-away');
  const store = new Map();
  const pageCache = { get: async (k) => store.get(k) || null, put: async (k, v) => { store.set(k, v); } };
  const ch8 = await xh.getChapter(idx, 8, { pageCache });
  assert.deepEqual(ch8.paragraphs, ['Story text of chapter 8, part one.', 'Part two of 8.']);
  const before = f.calls.length;
  const ch9 = await xh.getChapter(idx, 9, { pageCache });
  assert.equal(ch9.paragraphs[1], 'Part two of 9.');
  assert.equal(f.calls.length, before, 'neighbouring chapter served from the page cache');
});

test('XH access denial is surfaced, not worked around', async () => {
  const f = fakeXh({ status: 403 });
  await assert.rejects(() => createXhSource({ fetchImpl: f.impl }).buildIndex('take-my-breath-away'), /Upstream 403/);
  assert.equal(f.calls.length, 1, 'no retry storm, no alternative hosts');
});

// ---- Worker handler -----------------------------------------------------------------------
class MemCache { constructor() { this.m = new Map(); } async match(req) { const v = this.m.get(req.url); return v ? new Response(v) : undefined; } async put(req, res) { this.m.set(req.url, await res.text()); } }

test('/api/reader/xh/chapter: validates input, serves chapters and caches them at the edge', async () => {
  const f = fakeXh();
  const cache = new MemCache();
  const call = (q) => handleReaderApi(new Request('https://x.test/api/reader/' + q), { cache, fetchImpl: f.impl }).then(async (r) => ({ status: r.status, body: await r.json(), cc: r.headers.get('cache-control') }));
  assert.equal((await call('xh/chapter?slug=../../etc&n=1')).status, 404);
  assert.equal((await call('xh/chapter?slug=take-my-breath-away&n=99999')).status, 404);
  const meta = await call('xh/novel?slug=take-my-breath-away');
  assert.equal(meta.body.finalChapter, 1476);
  const a = await call('xh/chapter?slug=take-my-breath-away&n=12');
  assert.equal(a.status, 200);
  assert.equal(a.body.paragraphs[0], 'Story text of chapter 12, part one.');
  assert.match(a.cc, /max-age=3600/);
  const before = f.calls.length;
  const b = await call('xh/chapter?slug=take-my-breath-away&n=12');
  assert.deepEqual(b.body.paragraphs, a.body.paragraphs);
  assert.equal(f.calls.length, before, 'second request served from edge cache');
  assert.equal((await handleReaderApi(new Request('https://x.test/api/reader/xh/novel?slug=take-my-breath-away', { method: 'POST' }), {})).status, 405);
});

test('/api/reader prefers the prebuilt static index over a live index fetch', async () => {
  const f = fakeXh();
  const prebuilt = await createXhSource({ fetchImpl: f.impl }).buildIndex('take-my-breath-away');
  const assets = { fetch: async (req) => (new URL(req.url).pathname === '/novel-data/xh/take-my-breath-away/index.json' ? new Response(JSON.stringify(prebuilt)) : new Response('nf', { status: 404 })) };
  f.calls.length = 0;
  const r = await handleReaderApi(new Request('https://x.test/api/reader/xh/novel?slug=take-my-breath-away'), { assets, fetchImpl: f.impl });
  assert.equal(r.status, 200);
  assert.equal(f.calls.length, 0, 'no upstream call when the static index exists');
});

test('upstream failure becomes a 502 the reader can fall back from', async () => {
  const r = await handleReaderApi(new Request('https://x.test/api/reader/xh/chapter?slug=take-my-breath-away&n=1'), { fetchImpl: fakeXh({ status: 503 }).impl });
  assert.equal(r.status, 502);
  assert.equal((await r.json()).ok, false);
});
