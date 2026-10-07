// Browser tests for the reader data sources (static JSON, Cloudflare Worker, Render fallback).
// /public is served from disk; Render, the Worker API and translation are mocked, so this runs
// in CI with no production or third-party dependency.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const PUBLIC = path.resolve('public');
const ORIGIN = 'http://xender.test';
const RENDER = 'xender-reader-stable.onrender.com';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

const paras = (tag, n) => [`${tag} chapter ${n} opening paragraph with enough prose to be real.`, `${tag} chapter ${n} second paragraph.`];
function gutenbergFixture(slug, final) {
  const files = {};
  const chunks = [];
  for (let from = 1; from <= final; from += 10) {
    const to = Math.min(final, from + 9);
    const file = `${String(from).padStart(5, '0')}-${String(to).padStart(5, '0')}.json`;
    files[file] = { slug, from, to, chapters: Array.from({ length: to - from + 1 }, (_, k) => ({ n: from + k, title: `Chapter ${from + k} — 回目`, paragraphs: paras('STATIC', from + k) })) };
    chunks.push({ from, to, file });
  }
  files['manifest.json'] = { slug, title: 'Journey to the West — Complete Chinese Edition', finalChapter: final, genres: ['Chinese Classic'], language: 'zh-CN', sourceSite: 'Project Gutenberg', gaps: [], chunks };
  return files;
}

/**
 * opts.static: {slug: files} served under /novel-data/gutenberg/<slug>/ (others 404)
 * opts.worker: (url) => Response-ish for /api/reader/*
 * opts.catalog: catalog.json body or null (404)
 */
async function newPage(browser, opts = {}) {
  const page = await browser.newPage();
  const log = { render: [], worker: [], static: [], translate: 0, errors: [] };
  page.on('pageerror', (e) => log.errors.push(e.message));
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.host === RENDER) {
      log.render.push(url.pathname + url.search);
      const slug = url.searchParams.get('slug');
      const n = Number(url.searchParams.get('n') || 1);
      if (url.pathname.endsWith('/catalog')) return route.fulfill({ json: { ok: true, items: [{ slug: 'render-only-' + url.pathname.split('/')[1], title: 'Render Catalog ' + url.pathname.split('/')[1], finalChapter: 5, genres: [], sourceSite: url.pathname.startsWith('/gutenberg') ? 'Project Gutenberg' : 'XperimentalHamid' }] } });
      if (url.pathname.endsWith('/novel')) return route.fulfill({ json: { ok: true, slug, title: 'Render Novel', finalChapter: 50, genres: ['X'], gaps: [] } });
      return route.fulfill({ json: { ok: true, slug, chapter: n, finalChapter: 50, chapterTitle: 'Chapter ' + n, paragraphs: paras('RENDER', n) } });
    }
    if (url.origin !== ORIGIN) return route.fulfill({ status: 204, body: '' });
    if (url.pathname.startsWith('/api/reader/')) {
      log.worker.push(url.pathname + url.search);
      const r = opts.worker ? opts.worker(url) : { status: 502, json: { ok: false, error: 'upstream down' } };
      return route.fulfill(r);
    }
    if (url.pathname === '/api/translate') {
      log.translate++;
      const body = JSON.parse(route.request().postData());
      const label = body.target === 'hi' ? 'हिंदी' : body.target === 'en' ? 'English' : body.target;
      return route.fulfill({ json: { ok: true, translated: body.texts.map((t) => label + ' ' + t) } });
    }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 401, json: { ok: false } });
    const g = url.pathname.match(/^\/novel-data\/gutenberg\/([^/]+)\/([^/]+)$/);
    if (g) {
      log.static.push(url.pathname);
      const files = opts.static?.[g[1]];
      return files?.[g[2]] ? route.fulfill({ json: files[g[2]] }) : route.fulfill({ status: 404, body: 'nf' });
    }
    if (url.pathname === '/novel-data/catalog.json') return opts.catalog ? route.fulfill({ json: opts.catalog }) : route.fulfill({ status: 404, body: 'nf' });
    const file = path.join(PUBLIC, decodeURIComponent(url.pathname));
    if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ status: 404, body: 'nf' });
    return route.fulfill({ body: fs.readFileSync(file), contentType: TYPES[path.extname(file)] || 'application/octet-stream' });
  });
  return { page, log };
}
const firstPara = (page) => page.locator('#readerContent p').first().innerText();
const waitChapter = (page, text) => page.waitForFunction((t) => (document.querySelector('#readerContent p')?.textContent || '').includes(t), text, { timeout: 20000 });

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

test('Gutenberg chapter loads from static JSON with zero backend calls; next/prev work', async () => {
  const { page, log } = await newPage(browser, { static: { 'journey-to-the-west-zh': gutenbergFixture('journey-to-the-west-zh', 100) } });
  await page.goto(ORIGIN + '/reader.html?gutenberg=journey-to-the-west-zh&chapter=10');
  await waitChapter(page, 'STATIC chapter 10');
  assert.equal(await page.locator('#storyTitle').innerText(), 'Journey to the West — Complete Chinese Edition');
  assert.equal(await page.locator('#chapterTitle').innerText(), 'English Chapter 10 — 回目');
  assert.equal(await page.locator('#languageSelect').inputValue(), 'en');
  assert.ok(log.translate >= 1, 'Chinese source is translated to English automatically');
  assert.equal(await page.evaluate(() => document.body.dataset.readerSource), 'static');
  await page.locator('#nextChapter').click();
  await waitChapter(page, 'STATIC chapter 11');
  await page.locator('#prevChapter').click();
  await waitChapter(page, 'STATIC chapter 10');
  assert.match(page.url(), /chapter=10/);
  assert.deepEqual(log.render, [], 'Render never called');
  assert.deepEqual(log.worker, [], 'Worker never called');
  assert.equal(new Set(log.static).size, log.static.length, 'each static file fetched once (client cache)');
  assert.deepEqual(log.errors, []);
  await page.close();
});

test('translation still works on a static chapter', async () => {
  const { page, log } = await newPage(browser, { static: { 'journey-to-the-west-zh': gutenbergFixture('journey-to-the-west-zh', 100) } });
  await page.goto(ORIGIN + '/reader.html?gutenberg=journey-to-the-west-zh&chapter=3');
  await waitChapter(page, 'STATIC chapter 3');
  await page.locator('#languageSelect').selectOption('hi');
  await page.locator('#translateChapter').click();
  await waitChapter(page, 'हिंदी STATIC chapter 3');
  assert.ok(log.translate >= 1);
  await page.close();
});

test('missing static edition falls back to Render transparently', async () => {
  const { page, log } = await newPage(browser, { static: {} });
  await page.goto(ORIGIN + '/reader.html?gutenberg=water-margin-zh&chapter=2');
  await waitChapter(page, 'RENDER chapter 2');
  assert.equal(await page.evaluate(() => document.body.dataset.readerSource), 'render');
  assert.ok(log.render.some((p) => p.startsWith('/gutenberg/chapter')));
  await page.close();
});

test('XH chapter comes from the Cloudflare Worker; next chapter too', async () => {
  const worker = (url) => {
    const n = Number(url.searchParams.get('n') || 1);
    if (url.pathname.endsWith('/novel')) return { json: { ok: true, slug: 'billionaire-god-of-war', title: 'Billionaire God of War', finalChapter: 2495, genres: ['Urban'], gaps: [] } };
    return { json: { ok: true, chapter: n, chapterTitle: 'Chapter ' + n, paragraphs: paras('EDGE', n) } };
  };
  const { page, log } = await newPage(browser, { worker });
  await page.goto(ORIGIN + '/reader.html?xh=billionaire-god-of-war&chapter=1');
  await waitChapter(page, 'EDGE chapter 1');
  assert.equal(await page.evaluate(() => document.body.dataset.readerSource), 'edge');
  await page.locator('#nextChapter').click();
  await waitChapter(page, 'EDGE chapter 2');
  assert.deepEqual(log.render, []);
  assert.ok(log.worker.includes('/api/reader/xh/chapter?slug=billionaire-god-of-war&n=2'));
  await page.close();
});

test('XH edge failure (e.g. partner blocks Cloudflare) falls back to Render', async () => {
  const { page, log } = await newPage(browser, {});
  await page.goto(ORIGIN + '/reader.html?xh=take-my-breath-away&chapter=7');
  await waitChapter(page, 'RENDER chapter 7');
  assert.ok(log.worker.length >= 1 && log.render.length >= 1);
  assert.equal(await page.evaluate(() => document.body.dataset.readerSource), 'render');
  await page.close();
});

test('licensed (bundled) novels are unaffected', async () => {
  const { page, log } = await newPage(browser, {});
  const slug = await page.goto(ORIGIN + '/novels.html').then(() => page.evaluate(() => Object.keys(window.XENDER_LICENSED_FICTION || {})[0]));
  assert.ok(slug, 'a licensed novel exists');
  await page.goto(ORIGIN + '/reader.html?licensed=' + encodeURIComponent(slug) + '&chapter=1');
  await page.waitForFunction(() => document.querySelectorAll('#readerContent p').length > 0, null, { timeout: 20000 });
  assert.deepEqual(log.render.filter((p) => !p.endsWith('/catalog')), []);
  await page.close();
});

test('novels page uses the static catalog; links go to real reader slugs', async () => {
  const catalog = { ok: true, gutenberg: [{ slug: 'journey-to-the-west-zh', title: 'Journey to the West — Complete Chinese Edition', finalChapter: 100, genres: ['Chinese Classic'], sourceSite: 'Project Gutenberg' }], xh: [{ slug: 'take-my-breath-away', title: 'Take My Breath Away', finalChapter: 1476, genres: ['Urban Romance'], sourceSite: 'XperimentalHamid' }] };
  const { page, log } = await newPage(browser, { catalog });
  await page.goto(ORIGIN + '/novels.html');
  await page.waitForFunction(() => [...document.querySelectorAll('a')].some((a) => a.href.includes('gutenberg=journey-to-the-west-zh')), null, { timeout: 15000 });
  assert.deepEqual(log.render, [], 'no Render calls when static catalog exists');
  const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href*="/reader?"], a[href*="reader.html"]')].map((a) => a.getAttribute('href')));
  assert.ok(hrefs.some((h) => h.includes('xh=take-my-breath-away')));
  assert.ok(!hrefs.some((h) => /gutenberg=(dream-red-chamber|romance-three-kingdoms-vol-1)&/.test(h)), 'no broken legacy slugs');
  await page.close();
});

test('novels page falls back to Render catalog if static catalog is missing', async () => {
  const { page, log } = await newPage(browser, { catalog: null });
  await page.goto(ORIGIN + '/novels.html');
  await page.waitForFunction(() => document.body.innerText.includes('Render Catalog gutenberg'), null, { timeout: 15000 });
  assert.ok(log.render.includes('/gutenberg/catalog'));
  await page.close();
});
