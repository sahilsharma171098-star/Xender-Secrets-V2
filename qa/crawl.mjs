import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || '/opt/node-tools/node_modules/playwright');
import fs from 'fs';

const BASE = (process.argv[2] || 'http://127.0.0.1:8787').replace(/\/$/, '');
const OUT = process.argv[3] || 'crawl-results.json';
const seeds = (process.argv[4] ? fs.readFileSync(process.argv[4], 'utf8').split('\n').filter(Boolean) : ['/']);
const host = new URL(BASE).host;
const norm = (u) => { const x = new URL(u, BASE); x.hash = ''; return x.href; };
const crawlKey = (u) => { const x = new URL(u); if (x.host === host) { x.pathname = x.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, ''); } return x.href; };

const browser = await chromium.launch({ args: ['--ignore-certificate-errors'] });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, userAgent: 'XenderQA/1.0 (+playwright)' });
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'XenderQA-mobile/1.0' });
// Don't let QA visits pollute analytics
const external = {};
const LOCAL_ONLY = process.env.LOCAL_ONLY === '1';
for (const c of [ctx, mctx]) {
  await c.route('**/*', r => {
    const u = r.request().url();
    if (/\/api\/event$/.test(new URL(u).pathname)) return r.fulfill({ status: 204, body: '' });
    if (LOCAL_ONLY && new URL(u).host !== host && /^https?:/.test(u)) { external[u.split('?')[0]] = (external[u.split('?')[0]] || 0) + 1; return r.abort('blockedbyclient'); }
    return r.continue();
  });
}

const queue = [...new Set(seeds.map(s => crawlKey(norm(BASE + (s.startsWith('/') ? s : '/' + s)))))];
const seen = new Set(queue);
const pages = {};
const links = new Map(); // url -> Set(from)
const qcount = {};
const anchors = []; // {from, url, hash}
const MAX = Number(process.env.MAX_PAGES || 400);

while (queue.length && Object.keys(pages).length < MAX) {
  const url = queue.shift();
  const page = await ctx.newPage();
  const rec = { url, console: [], pageErrors: [], badResponses: [], failedRequests: [], brokenImages: [], issues: [] };
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) rec.console.push(`${m.type()}: ${m.text()}`.slice(0, 400)); });
  page.on('pageerror', e => rec.pageErrors.push(String(e.message || e).slice(0, 400)));
  page.on('response', r => { if (r.status() >= 400) rec.badResponses.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', r => { if (!/blockedbyclient|BLOCKED_BY_CLIENT/i.test(r.failure()?.errorText||'')) rec.failedRequests.push(`${r.failure()?.errorText} ${r.url()}`); });
  let resp;
  try { resp = await page.goto(url, { waitUntil: 'load', timeout: 25000 }); }
  catch (e) { rec.issues.push('navigation: ' + e.message.split('\n')[0]); try { resp = await page.goto(url, { waitUntil: 'load', timeout: 30000 }); } catch {} }
  rec.status = resp?.status(); rec.finalUrl = page.url();
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const ids = {}; document.querySelectorAll('[id]').forEach(e => ids[e.id] = (ids[e.id] || 0) + 1);
    return {
      title: document.title,
      desc: document.querySelector('meta[name=description]')?.content || '',
      canonical: document.querySelector('link[rel=canonical]')?.href || '',
      robots: document.querySelector('meta[name=robots]')?.content || '',
      h1: [...document.querySelectorAll('h1')].map(h => h.textContent.trim().slice(0, 80)),
      hrefs: [...document.querySelectorAll('a[href]')].map(a => ({ href: a.getAttribute('href'), abs: a.href, text: (a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 50), target: a.target })),
      imgs: [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map(i => i.currentSrc || i.src),
      imgsNoAlt: [...document.querySelectorAll('img:not([alt])')].length,
      dupIds: Object.entries(ids).filter(([, n]) => n > 1).map(([k]) => k),
      ids: Object.keys(ids),
      names: [...document.querySelectorAll('a[name]')].map(a => a.name),
      forms: [...document.querySelectorAll('form')].map(f => ({ id: f.id, action: f.getAttribute('action'), fields: f.elements.length })),
      buttonsNoName: [...document.querySelectorAll('button')].filter(b => !b.textContent.trim() && !b.getAttribute('aria-label') && !b.title).length,
      emptyHrefs: [...document.querySelectorAll('a')].filter(a => { const h = a.getAttribute('href'); return h === null || h === '' || h === '#'; }).map(a => (a.textContent || '').trim().slice(0, 40)),
      jsHrefs: [...document.querySelectorAll('a[href^="javascript"]')].length,
      lang: document.documentElement.lang,
      textLen: document.body?.innerText.length || 0,
    };
  }).catch(e => ({ error: e.message }));
  Object.assign(rec, info); rec.ids = undefined;
  rec.brokenImages = info.imgs || [];
  const idset = new Set([...(info.ids || []), ...(info.names || [])]);
  pages[url] = rec; pages[url]._ids = [...idset];
  for (const l of info.hrefs || []) {
    if (!l.abs || /^(mailto|tel|javascript|data|sms|whatsapp):/i.test(l.abs)) continue;
    const n = norm(l.abs);
    if (!links.has(n)) links.set(n, new Set());
    links.get(n).add(url);
    const h = new URL(l.abs).hash;
    if (h && h.length > 1) anchors.push({ from: url, url: n, hash: decodeURIComponent(h.slice(1)), text: l.text });
    const ck = crawlKey(n);
    if (new URL(n).host === host && !seen.has(ck) && !/\.(png|jpe?g|svg|webp|gif|pdf|xml|txt|json|zip|css|js)$/i.test(new URL(n).pathname)) { seen.add(ck); const pth = new URL(ck).pathname; if (new URL(ck).search) { qcount[pth] = (qcount[pth] || 0) + 1; if (qcount[pth] > 3) continue; } queue.push(ck); }
  }
  // mobile layout check
  const mp = await mctx.newPage();
  try {
    await mp.goto(url, { waitUntil: 'load', timeout: 30000 }); await mp.waitForTimeout(500);
    rec.mobile = await mp.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const over = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > vw + 2 && getComputedStyle(e).position !== 'fixed'; })
        .slice(0, 5).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''));
      return { scrollWidth: document.documentElement.scrollWidth, vw, overflow: document.documentElement.scrollWidth > vw + 2, over };
    });
  } catch (e) { rec.mobile = { error: e.message.split('\n')[0] }; }
  await mp.close();
  await page.close();
  process.stderr.write(`${Object.keys(pages).length} ${rec.status} ${url}\n`);
}

// check every link target status (internal via fetch through browser context; external too)
const linkStatus = {};
const req = ctx.request;
await Promise.all([...links.keys()].filter(u => !(LOCAL_ONLY && new URL(u).host !== host)).map(async (u, i) => {
  await new Promise(r => setTimeout(r, (i % 50) * 30));
  try {
    let r = await req.fetch(u, { method: 'GET', maxRedirects: 0, timeout: 20000, failOnStatusCode: false });
    const chain = [r.status()];
    let cur = u;
    for (let k = 0; k < 5 && r.status() >= 300 && r.status() < 400; k++) {
      cur = new URL(r.headers()['location'], cur).href;
      r = await req.fetch(cur, { maxRedirects: 0, timeout: 20000, failOnStatusCode: false });
      chain.push(r.status());
    }
    linkStatus[u] = { status: r.status(), chain, final: cur };
  } catch (e) { linkStatus[u] = { error: e.message.split('\n')[0] }; }
}));

// anchor checks
const badAnchors = [];
for (const a of anchors) {
  const p = pages[crawlKey(a.url)] || pages[a.url];
  if (!p) continue;
  if (!p._ids.includes(a.hash)) badAnchors.push(a);
}
const out = { external, base: BASE, crawled: Object.keys(pages).length, pages, links: Object.fromEntries([...links].map(([k, v]) => [k, { from: [...v], ...linkStatus[k] }])), badAnchors };
for (const p of Object.values(pages)) delete p._ids;
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
await browser.close();
console.log('done', out.crawled);
