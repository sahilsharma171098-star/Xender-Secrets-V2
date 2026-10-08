// Browser tests for the commercial funnel (XEND-WARROOM-001): homepage, offer preselection,
// lead form success/failure, first-party events, services/contact forms and the admin MIS page.
// /public is served from disk; /api/lead, /api/event and /api/admin/* run through the REAL
// src/growth.mjs against an in-memory SQLite database, so this exercises production logic offline.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { chromium } from 'playwright';
import { ensureGrowthSchema, handleGrowth } from '../src/growth.mjs';

const PUBLIC = path.resolve('public');
const ORIGIN = 'http://xender.test';
const ADMIN = 'test-admin-token-0123456789abcdef';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain' };

function doSql() {
  const db = new DatabaseSync(':memory:');
  return {
    db,
    exec(query, ...args) {
      let rows = [];
      if (!args.length && query.trim().replace(/;\s*$/, '').includes(';')) db.exec(query);
      else { const st = db.prepare(query); rows = st.columns().length ? st.all(...args) : (st.run(...args), []); }
      return { toArray: () => rows.map((r) => ({ ...r })), one: () => ({ ...rows[0] }) };
    },
  };
}

const demoBookings = new Set();
function demoApi(url, req) {
  const body = () => { try { return JSON.parse(req.postData() || '{}'); } catch { return {}; } };
  switch (url.pathname) {
    case '/api/slots': { const d = url.searchParams.get('date'); return { json: { ok: true, date: d, slots: ['10:00', '11:30', '14:00', '16:30'].filter((s) => !demoBookings.has(d + s)) } }; }
    case '/api/bookings': { const b = body(); if (demoBookings.has(b.date + b.slot)) return { status: 409, json: { ok: false, error: 'That slot is no longer available.' } }; demoBookings.add(b.date + b.slot); return { status: 201, json: { ok: true, bookingId: 'BK-TEST0001', status: 'confirmed' } }; }
    case '/api/tasks': return { json: { ok: true, tasks: [{ id: 't1', title: 'Ship it', status: 'Todo', owner: 'You' }] } };
    case '/api/products': return { json: { ok: true, products: [{ id: 'p1', name: 'Kit', category: 'kits', categoryLabel: 'Kits', price: 499, rating: 4.6 }] } };
    case '/api/quote': return { json: { ok: true, subtotal: 0, shipping: 0, total: 0, currency: 'INR', note: 'Cart is empty' } };
    case '/api/health': return { json: { ok: true, service: 'Xender Secrets API' } };
    case '/api/catalog': return { json: { ok: true, builds: 9 } };
    default: return null;
  }
}

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

async function newPage({ viewport = { width: 1280, height: 900 }, leadStatus = null, sql = null, contextOptions = {} } = {}) {
  const db = sql || doSql();
  ensureGrowthSchema(db);
  const context = await browser.newContext({ viewport, ...contextOptions });
  const page = await context.newPage();
  const log = { errors: [], external: [], leadPosts: 0, missing: [] };
  page.on('pageerror', (e) => log.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) log.errors.push(m.text()); });
  await context.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin !== ORIGIN) { log.external.push(url.host); return route.fulfill({ status: 204, body: '' }); }
    if (url.pathname.startsWith('/api/')) {
      // Demo backends (src/index.js AppState) are stubbed with the same response shapes.
      const demo = demoApi(url, req);
      if (demo) return route.fulfill(demo);
      if (url.pathname === '/api/lead') { log.leadPosts++; if (leadStatus) return route.fulfill({ status: leadStatus, json: { ok: false, error: 'Server busy' } }); }
      const headers = { ...req.headers() };
      const r = new Request('https://www.xendersecrets.com' + url.pathname + url.search, { method: req.method(), headers, body: ['GET', 'HEAD'].includes(req.method()) ? undefined : req.postData() });
      const res = await handleGrowth(r, { sql: db, env: { ADMIN_TOKEN: ADMIN } });
      if (!res) return route.fulfill({ status: 404, json: { ok: false } });
      return route.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: Buffer.from(await res.arrayBuffer()) });
    }
    let file = path.join(PUBLIC, decodeURIComponent(url.pathname));
    if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
    // Mirror Cloudflare html_handling (auto-trailing-slash): /page serves page.html.
    else if (!path.extname(file) && fs.existsSync(file + '.html')) file += '.html';
    if (!file.startsWith(PUBLIC) || !fs.existsSync(file)) { log.missing.push(url.pathname); return route.fulfill({ status: 404, body: 'nf' }); }
    return route.fulfill({ status: 200, headers: { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }, body: fs.readFileSync(file) });
  });
  return { page, context, db, log };
}
const rows = (db, q) => db.exec(q).toArray();
const flushEvents = (page) => page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); });

test('homepage answers the buyer questions and keeps the live-E2E contract', async () => {
  const { page, log, context } = await newPage();
  await page.goto(ORIGIN + '/');
  const h1 = await page.locator('h1').innerText();
  assert.match(h1, /websites?/i);
  assert.ok(await page.locator('#services .card').count() >= 3);
  assert.ok(await page.locator('a[href*="wa.me/919821941814"]').count() >= 1);
  assert.ok(await page.locator('a[href*="website-catalog"]').count() >= 1);
  const text = await page.locator('main').innerText();
  for (const must of ['₹999', '₹1,999', '₹3,499', '+ 18% GST', '₹1,178.82 incl. GST', '₹2,358.82 incl. GST', '₹4,128.82 incl. GST', 'Are prices inclusive of GST?', 'Free website check', 'concept demo', 'GST-registered']) assert.ok(text.includes(must), 'homepage mentions ' + must);
  assert.ok(await page.locator('form[data-lead-form]').count() === 1);
  const lds = (await page.locator('script[type="application/ld+json"]').allInnerTexts()).map((t) => JSON.parse(t)['@type']);
  assert.deepEqual(lds, ['ProfessionalService', 'FAQPage']);
  assert.deepEqual(log.errors, []);
  assert.deepEqual(log.external, [], 'no third-party requests');
  await context.close();
});

test('mobile: no horizontal overflow, menu toggles, key pages clean', async () => {
  const { page, log, context } = await newPage({ viewport: { width: 375, height: 812 } });
  for (const p of ['/', '/services.html', '/contact.html', '/admin.html']) {
    await page.goto(ORIGIN + p);
    const d = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    assert.ok(d.sw <= d.cw + 1, `${p} overflows: ${JSON.stringify(d)}`);
  }
  await page.goto(ORIGIN + '/');
  assert.equal(await page.locator('#nav').isVisible(), false);
  await page.click('#menu');
  assert.equal(await page.locator('#nav').isVisible(), true);
  assert.equal(await page.getAttribute('#menu', 'aria-expanded'), 'true');
  await page.click('#nav a[href="#faq"]');
  assert.equal(await page.locator('#nav').isVisible(), false);
  assert.deepEqual(log.errors, []);
  assert.deepEqual(log.missing, [], 'no missing static assets');
  await context.close();
});

test('offer button preselects the offer; empty contact is caught client-side', async () => {
  const { page, log, context } = await newPage();
  await page.goto(ORIGIN + '/');
  await page.click('[data-cta="home-offer-business-starter-1999"]');
  assert.equal(await page.inputValue('#lf-offer'), 'business-starter-1999');
  await page.fill('#lf-name', 'Asha');
  await page.click('form[data-lead-form] [type="submit"]');
  assert.match(await page.locator('[data-lead-status]').innerText(), /WhatsApp number or an email/);
  assert.equal(log.leadPosts, 0);
  await context.close();
});

test('lead submit stores attribution, shows reference and a one-tap WhatsApp follow-up', async () => {
  const { page, db, log, context } = await newPage();
  await page.goto(ORIGIN + '/?utm_source=linkedin&utm_campaign=clinics-oct');
  await page.click('[data-cta="home-card"]');
  await page.fill('#lf-name', 'Asha Verma');
  await page.fill('#lf-phone', '98765 43210');
  await page.fill('#lf-business', 'Verma Dental, Gurugram');
  await page.fill('#lf-website', 'vermadental.in');
  await page.click('form[data-lead-form] [type="submit"]');
  await page.waitForSelector('.lead-success');
  const ref = await page.locator('.lead-success [data-ref]').innerText();
  assert.match(ref, /^XS-\d{6}-[A-Z2-9]{4}$/);
  const wa = await page.getAttribute('.lead-success a', 'href');
  assert.ok(wa.startsWith('https://wa.me/919821941814?text='));
  assert.ok(decodeURIComponent(wa).includes(ref));
  assert.ok(decodeURIComponent(wa).includes('₹999 + GST · Founding Website'));
  const lead = rows(db, 'SELECT * FROM growth_leads')[0];
  assert.equal(lead.name, 'Asha Verma');
  assert.equal(lead.phone, '+919876543210');
  assert.equal(lead.offer, 'founding-website-999');
  assert.equal(lead.source, 'linkedin');
  assert.equal(lead.campaign, 'clinics-oct');
  assert.equal(lead.website, 'https://vermadental.in');
  assert.equal(lead.page, '/');
  assert.equal(lead.cta, 'home-start-form');
  await flushEvents(page);
  await page.waitForTimeout(300);
  const ev = Object.fromEntries(rows(db, 'SELECT event,SUM(count) n FROM growth_daily GROUP BY event').map((r) => [r.event, r.n]));
  assert.equal(ev.page_view, 1);
  assert.equal(ev.lead_start, 1);
  assert.equal(ev.lead_submit, 1, 'counted once, server-side');
  assert.ok(ev.cta_click >= 1);
  assert.deepEqual(log.errors, []);
  await context.close();
});

test('server failure keeps the form usable and records lead_error', async () => {
  const { page, db, context } = await newPage({ leadStatus: 500 });
  await page.goto(ORIGIN + '/');
  await page.fill('#lf-name', 'Ravi');
  await page.fill('#lf-email', 'ravi@example.com');
  await page.click('form[data-lead-form] [type="submit"]');
  await page.waitForFunction(() => document.querySelector('[data-lead-status]').textContent.length > 0);
  assert.match(await page.locator('[data-lead-status]').innerText(), /Server busy/);
  assert.equal(await page.locator('form[data-lead-form] [type="submit"]').isEnabled(), true);
  await flushEvents(page);
  await page.waitForTimeout(300);
  assert.equal(rows(db, "SELECT SUM(count) n FROM growth_daily WHERE event='lead_error'")[0].n, 1);
  await context.close();
});

test('whatsapp clicks are measured; GPC visitors send no events', async () => {
  const { page, db, context } = await newPage();
  await page.goto(ORIGIN + '/');
  await page.locator('[data-cta="home-hero-whatsapp"]').click({ modifiers: [] }).catch(() => {});
  await flushEvents(page);
  await page.waitForTimeout(300);
  assert.equal(rows(db, "SELECT SUM(count) n FROM growth_daily WHERE event='whatsapp_click'")[0].n, 1);
  await context.close();

  const gpc = await newPage();
  await gpc.context.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true }));
  await gpc.page.goto(ORIGIN + '/');
  await flushEvents(gpc.page);
  await gpc.page.waitForTimeout(300);
  assert.equal(rows(gpc.db, 'SELECT COUNT(*) n FROM growth_daily')[0].n, 0);
  await gpc.context.close();
});

test('theme: light by default, dark persists across reloads', async () => {
  const { page, context } = await newPage();
  await page.goto(ORIGIN + '/');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme || 'light'), 'light');
  await page.click('#themeToggle');
  await page.reload();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  await context.close();
});

test('services and contact forms submit through the same pipeline', async () => {
  const { page, db, log, context } = await newPage();
  await page.goto(ORIGIN + '/services.html');
  await page.click('[data-cta="services-card"]');
  assert.equal(await page.inputValue('#lf-offer'), 'founding-website-999');
  await page.fill('#lf-name', 'Kunal');
  await page.fill('#lf-email', 'kunal@example.com');
  await page.fill('#lf-message', 'Need a CA firm site');
  await page.click('form[data-lead-form] [type="submit"]');
  await page.waitForSelector('.lead-success');
  await page.goto(ORIGIN + '/contact.html');
  await page.fill('form[data-lead-form] [name="name"]', 'Meera');
  await page.fill('form[data-lead-form] [name="phone"]', '+44 7700 900123');
  await page.click('form[data-lead-form] [type="submit"]');
  await page.waitForSelector('.lead-success');
  const leads = rows(db, 'SELECT name,page,offer,phone FROM growth_leads ORDER BY created_at');
  assert.deepEqual(leads.map((l) => [l.name, l.page]), [['Kunal', '/services.html'], ['Meera', '/contact.html']]);
  assert.equal(leads[1].phone, '+447700900123');
  assert.deepEqual(log.errors, []);
  await context.close();
});

test('admin MIS: locked without token, shows pipeline and saves stage changes', async () => {
  const sql = doSql();
  const seed = await newPage({ sql });
  await seed.page.goto(ORIGIN + '/');
  await seed.page.fill('#lf-name', 'Pipeline Lead');
  await seed.page.fill('#lf-email', 'p@example.com');
  await seed.page.click('form[data-lead-form] [type="submit"]');
  await seed.page.waitForSelector('.lead-success');
  await seed.context.close();

  const { page, db, log, context } = await newPage({ sql });
  await page.goto(ORIGIN + '/admin.html');
  assert.equal(await page.locator('#login').isVisible(), true);
  await page.fill('#token', 'wrong-token-wrong-token-wrong-token');
  await page.click('#loginForm button');
  await page.waitForFunction(() => document.getElementById('loginMsg').textContent.length > 0);
  assert.match(await page.locator('#loginMsg').innerText(), /Unauthorized/);
  await page.fill('#token', ADMIN);
  await page.click('#loginForm button');
  await page.waitForSelector('#leads tr[data-id]');
  const tr = page.locator('#leads tr[data-id]').first();
  await tr.locator('[name="stage"]').selectOption('won');
  await tr.locator('[name="quote_value"]').fill('1999');
  await tr.locator('[name="collected_value"]').fill('1000');
  await tr.locator('[data-save]').click();
  await page.waitForFunction(() => [...document.querySelectorAll('.kpi')].some((k) => k.textContent.includes('Cash collected') && k.textContent.includes('1,000')));
  await page.click('#scorecard');
  await page.waitForSelector('#scorecardBox:not([hidden])');
  const card = await page.locator('#scorecardText').innerText();
  assert.match(card, /Xender daily scorecard — \d{4}-\d{2}-\d{2}/);
  assert.match(card, /Cash collected ₹1,000/);
  assert.match(card, /won 1/);
  const lead = rows(db, 'SELECT stage,quote_value,collected_value FROM growth_leads')[0];
  assert.deepEqual({ ...lead }, { stage: 'won', quote_value: 1999, collected_value: 1000 });
  assert.deepEqual(log.errors, []);
  await context.close();
});

test('every generated commercial page: one lead form, valid metadata, no broken internal links, no overflow', async () => {
  const { allPages } = await import('../scripts/commercial/pages.mjs');
  const { page, log, context } = await newPage({ viewport: { width: 375, height: 812 } });
  const broken = new Set();
  for (const { file } of allPages()) {
    await page.goto(ORIGIN + '/' + file);
    assert.equal(await page.locator('h1').count(), 1, file + ' has one h1');
    assert.equal(await page.locator('form[data-lead-form]').count(), 1, file + ' has one lead form');
    assert.equal(await page.locator('#start').count(), 1, file + ' #start target');
    const canonical = await page.getAttribute('link[rel=canonical]', 'href');
    assert.ok(canonical.startsWith('https://www.xendersecrets.com/'), file + ' canonical');
    const desc = await page.getAttribute('meta[name=description]', 'content');
    assert.ok(desc.length >= 70 && desc.length <= 200, `${file} description length ${desc.length}`);
    for (const ld of await page.locator('script[type="application/ld+json"]').allInnerTexts()) JSON.parse(ld);
    const d = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    assert.ok(d.sw <= d.cw + 1, `${file} overflows at 375px: ${JSON.stringify(d)}`);
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    for (const h of hrefs) {
      const p = h.split(/[?#]/)[0];
      const f = p === '/' ? 'index.html' : p.slice(1);
      if (!fs.existsSync(path.join(PUBLIC, f)) && !fs.existsSync(path.join(PUBLIC, f + '.html'))) broken.add(file + ' -> ' + h);
    }
    const offers = await page.locator('[data-offer]').evaluateAll((els) => els.map((e) => e.dataset.offer));
    const options = await page.locator('form[data-lead-form] [name=offer] option').evaluateAll((os) => os.map((o) => o.value));
    for (const o of offers) assert.ok(options.includes(o), `${file}: data-offer ${o} exists in form`);
    // GST rule (approved 2026-10-06): every visible package price says it is exclusive of GST.
    const bare = await page.locator('main').evaluate((m) => (m.innerText.match(/₹(?:999|1,999|3,499|4,999)(?![\d,])(?!\s*(?:\+\s*(?:18% )?GST|website|Founding|Business|\/))[^\n]{0,30}/g) || []));
    const priced = await page.locator('.price').count();
    if (priced) assert.equal(await page.locator('.gst-total').count(), priced, `${file}: every price card shows the GST-inclusive total`);
    assert.ok(bare.length === 0 || (await page.locator('main').innerText()).includes('GST'), `${file}: prices without GST context: ${bare.join(' | ')}`);
  }
  assert.deepEqual([...broken], [], 'no broken internal links');
  assert.deepEqual(log.errors, []);
  assert.deepEqual(log.missing.filter((m) => !m.startsWith('/api/')), []);
  await context.close();
});

test('international visitors see the US$299 anchor, Indian visitors do not', async () => {
  for (const [country, visible] of [['US', true], ['IN', false]]) {
    const { page, context } = await newPage();
    await context.route('**/api/locale*', (route) => route.fulfill({ json: { ok: true, country, currency: country === 'IN' ? 'INR' : 'USD', rate: 1 } }));
    await page.goto(ORIGIN + '/services.html');
    await page.waitForTimeout(300);
    assert.equal(await page.locator('[data-intl-note]').isVisible(), visible, country);
    await context.close();
  }
});

test('preview builder: live draft, admin-only share link, prospect view is counted and escaped', async () => {
  const sql = doSql();
  const { page, db, log, context } = await newPage({ sql });
  await page.goto(ORIGIN + '/preview-builder.html');
  await page.selectOption('#sample', 'dental');
  const frame = page.frameLocator('#frame');
  await frame.locator('.xp-banner').waitFor();
  assert.match(await frame.locator('h1').innerText(), /Gentle, modern dental care/);
  await page.fill('[name=name]', 'Riya <b>Dental</b>');
  await page.fill('[name=services]', 'Root canal | Single sitting where possible | from ₹4,000');
  await page.waitForFunction(() => document.querySelector('#frame').contentDocument.body.innerText.includes('Root canal'));
  assert.equal(await frame.locator('b').count(), 0, 'builder preview escapes markup');

  page.once('dialog', (d) => d.accept(ADMIN));
  await page.click('#save');
  await page.waitForSelector('#shareOut:not([hidden])');
  const link = await page.locator('#link').innerText();
  assert.match(link, /^https:\/\/www\.xendersecrets\.com\/p\/[a-z2-9]{6}$/);
  assert.match(await page.locator('#pitch').innerText(), /concept redesign specifically for Riya/);
  const id = link.slice(-6);

  const prospect = await context.newPage();
  await prospect.goto(ORIGIN + '/preview.html?id=' + id);
  await prospect.waitForSelector('.xp-banner');
  assert.match(await prospect.locator('.xp-banner').innerText(), /Draft website preview.*not the official website/s);
  assert.match(await prospect.locator('.xp-logo').innerText(), /Riya <b>Dental<\/b>/, 'shown as text');
  assert.equal(await prospect.getAttribute('meta[name=robots]', 'content'), 'noindex,nofollow');
  const d = await prospect.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  assert.ok(d.sw <= d.cw + 1);
  assert.equal(rows(db, 'SELECT views FROM growth_previews')[0].views, 1);

  await prospect.goto(ORIGIN + '/preview.html?id=zzzzzz');
  await prospect.waitForFunction(() => /not found/i.test(document.body.innerText));
  assert.deepEqual(log.errors, []);
  await context.close();
});


// ---------------------------------------------------------------- XEND-PORTFOLIO-002
const scrollMetrics = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  return { p: Number(getComputedStyle(el).getPropertyValue('--p') || -1), step: el.dataset.step || '', active: el.querySelector('.is-active')?.dataset.i || '' };
}, sel);
const scrollInto = (page, sel, frac) => page.evaluate(([s, f]) => {
  const el = document.querySelector(s);
  const top = el.getBoundingClientRect().top + scrollY;
  scrollTo({ top: top + (el.offsetHeight - innerHeight) * f, behavior: 'instant' });
}, [sel, frac]);

test('homepage scroll scenes scrub forwards and backwards with scroll position', async () => {
  const { page, log, context } = await newPage();
  await page.goto(ORIGIN + '/');
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('scroll-fx')), true);
  const read = async (sel) => { await page.waitForTimeout(120); return scrollMetrics(page, sel); };
  // Pinned "what we build" stack: progress and the active layer follow the scroll position.
  await scrollInto(page, '.stack', 0.1); const a = await read('.stack');
  await scrollInto(page, '.stack', 0.9); const b = await read('.stack');
  await scrollInto(page, '.stack', 0.4); const c = await read('.stack');
  assert.ok(a.p < c.p && c.p < b.p, `stack progress ${a.p} < ${c.p} < ${b.p}`);
  assert.deepEqual([a.step, c.step, b.step], ['0', '1', '3']);
  assert.equal(c.active, '1', 'scrolling back re-activates the earlier layer');
  // Horizontal rail moves with vertical scroll and back again.
  const tx = () => page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.rail-track')).transform).m41);
  await scrollInto(page, '.rail', 0); await page.waitForTimeout(120); const x0 = await tx();
  await scrollInto(page, '.rail', 1); await page.waitForTimeout(120); const x1 = await tx();
  await scrollInto(page, '.rail', 0.2); await page.waitForTimeout(120); const x2 = await tx();
  assert.ok(x1 < x2 && x2 < x0 + 1, `rail translate ${x0} → ${x1} → ${x2}`);
  // The stages really stay pinned (an overflow:hidden ancestor would silently break sticky).
  for (const [scene, stage] of [['.rail', '.rail-sticky'], ['.stack', '.stack-sticky']]) {
    await scrollInto(page, scene, 0.5); await page.waitForTimeout(80);
    const top = await page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top, stage);
    assert.ok(Math.abs(top) < 2, `${stage} pinned at top (top=${top})`);
  }
  // Hero exit scene.
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); const h0 = await read('.hx');
  await page.evaluate(() => scrollTo({ top: 400, behavior: 'instant' })); const h1 = await read('.hx');
  assert.ok(h0.p === 0 && h1.p > 0, `hero ${h0.p} → ${h1.p}`);
  assert.deepEqual(log.errors, []);
  await context.close();
});

test('reduced motion and no-JS: no pinned layouts, all story content readable', async () => {
  const { page, context: ctx } = await newPage({ contextOptions: { reducedMotion: 'reduce' } });
  for (const p of ['/', '/portfolio']) {
    await page.goto(ORIGIN + p);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('scroll-fx')), false, p);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('motion-enabled')), false, p);
  }
  assert.equal(await page.locator('.pf-step p:visible').count(), 4, 'all four story steps visible');
  assert.equal(await page.evaluate(() => document.querySelector('.pf-story').offsetHeight < innerHeight * 2), true, 'story is not pinned');
  await ctx.close();

  const { page: np, context: nojs } = await newPage({ viewport: { width: 375, height: 812 }, contextOptions: { javaScriptEnabled: false } });
  await np.goto(ORIGIN + '/portfolio');
  assert.equal(await np.locator('.pf-card:visible').count(), 11, 'every project visible without JS');
  assert.equal(await np.locator('.stack-step, .pf-step p').filter({ hasText: /./ }).count() >= 4, true);
  const d = await np.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(d <= 1, 'no overflow without JS');
  await nojs.close();
});

test('portfolio: filters, deep links, sharing and "build something like this" → quote', async () => {
  const { page, db, log, context } = await newPage();
  // The test origin is not a secure context, so copying uses the execCommand fallback; record what it copies.
  await context.addInitScript(() => document.addEventListener('copy', (e) => { window.__copied = e.target && 'value' in e.target ? e.target.value : String(getSelection()); }));
  await page.goto(ORIGIN + '/portfolio');
  const visible = () => page.locator('.pf-card:not([hidden])').count();
  assert.equal(await visible(), 11);
  await page.click('[data-filter="backend"]');
  assert.equal(await visible(), 2);
  assert.match(await page.locator('#pfStatus').innerText(), /Showing 2 projects in Backend systems/);
  assert.equal(await page.getAttribute('[data-filter="backend"]', 'aria-pressed'), 'true');
  assert.match(page.url(), /\?type=backend#projects$/);
  await page.click('[data-filter="extension"]');
  assert.deepEqual(await page.locator('.pf-card:not([hidden]) h3').allInnerTexts(), ['11 Xender SiteCheck']);
  await page.click('[data-filter="all"]');
  // Filtered views are shareable.
  await page.goto(ORIGIN + '/portfolio?type=ecommerce');
  assert.equal(await visible(), 2);
  // Per-project share copies a deep link; the deep link highlights that card.
  await page.goto(ORIGIN + '/portfolio');
  await page.click('#p-slotly-booking [data-share]');
  assert.equal(await page.evaluate(() => window.__copied), 'https://www.xendersecrets.com/portfolio#p-slotly-booking');
  assert.equal(await page.locator('#p-slotly-booking [data-share]').innerText(), 'Link copied');
  await page.goto(ORIGIN + '/portfolio#p-slotly-booking');
  await page.waitForTimeout(200);
  assert.equal(await page.locator('#p-slotly-booking').evaluate((e) => e.classList.contains('is-target') && !e.hidden), true);
  // Whole-portfolio copy link.
  await page.click('#pfCopy');
  await page.waitForFunction(() => /Link copied/.test(document.getElementById('pfCopyMsg').textContent));
  // Build something like this → pre-filled quote, custom-build offer, lead saved.
  await page.click('[data-like="pulse-analytics"]');
  assert.equal(await page.inputValue('#lf-offer'), 'custom-build');
  assert.match(await page.inputValue('#lf-message'), /Pulse Analytics/);
  await page.fill('#lf-name', 'Jordan Lee');
  await page.fill('#lf-email', 'jordan@example.com');
  await page.click('form[data-lead-form] [type="submit"]');
  await page.waitForSelector('.lead-success');
  const lead = rows(db, 'SELECT offer,cta,page,message FROM growth_leads')[0];
  assert.equal(lead.offer, 'custom-build');
  assert.equal(lead.cta, 'portfolio-quote');
  assert.match(lead.message, /Pulse Analytics/);
  // Every demo link resolves; live previews load the real demo pages without errors.
  for (const href of await page.locator('.pf-actions a.btn.primary').evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
    assert.ok(fs.existsSync(path.join(PUBLIC, href.slice(1) + '.html')), href);
  }
  assert.deepEqual(log.errors, []);
  assert.deepEqual(log.missing.filter((m) => !m.startsWith('/api/')), []);
  await context.close();
});

test('portfolio and homepage on mobile: no overflow, menu reaches Portfolio and Contact', async () => {
  const { page, log, context } = await newPage({ viewport: { width: 360, height: 740 } });
  for (const p of ['/', '/portfolio', '/demo-gym', '/demo-frontend-dashboard', '/demo-frontend-store', '/demo-fullstack-booking']) {
    await page.goto(ORIGIN + p);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight / 2));
    await page.waitForTimeout(100);
    const d = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(d <= 1, `${p} overflows by ${d}px at 360px`);
  }
  await page.goto(ORIGIN + '/portfolio');
  await page.click('#menu');
  assert.equal(await page.locator('#nav a[href="/portfolio"]').isVisible(), true);
  assert.equal(await page.locator('#nav a[href="/contact"]').isVisible(), true);
  assert.deepEqual(log.errors, []);
  await context.close();
});

test('rebuilt demos work end to end', async () => {
  const { page, log, context } = await newPage();
  // Booking: live slots → confirm → slot no longer offered.
  await page.goto(ORIGIN + '/demo-fullstack-booking');
  await page.waitForSelector('#slots button');
  await page.click('#slots button:has-text("11:30")');
  await page.fill('#name', 'Sam');
  await page.click('#confirm');
  await page.waitForSelector('.done');
  assert.equal(await page.locator('.done code').innerText(), 'BK-TEST0001');
  await page.click('#again');
  await page.waitForSelector('#slots button');
  assert.deepEqual(await page.locator('#slots button').allInnerTexts(), ['10:00', '14:00', '16:30']);
  // Store: add, change quantity, totals and free-shipping meter.
  await page.goto(ORIGIN + '/demo-frontend-store');
  await page.evaluate(() => localStorage.removeItem('north-cart'));
  await page.reload();
  await page.click('button[aria-label="Add Halo Desk Lamp to cart"]');
  assert.equal(await page.locator('#cartCount').innerText(), '1');
  await page.click('#cartBtn');
  await page.click('.qty button[aria-label="Increase"]');
  assert.equal(await page.locator('#total').innerText(), '₹4,998');
  assert.match(await page.locator('#ship').innerText(), /free shipping/i);
  await page.keyboard.press('Escape');
  await page.fill('#q', 'pouch');
  assert.equal(await page.locator('#grid .p').count(), 1);
  // Dashboard: range switch changes the data; CSV export downloads.
  await page.goto(ORIGIN + '/demo-frontend-dashboard');
  const k30 = await page.locator('.kpi b').first().innerText();
  await page.click('[data-range="7"]');
  assert.notEqual(await page.locator('.kpi b').first().innerText(), k30);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exportCsv')]);
  assert.equal(dl.suggestedFilename(), 'pulse-team-7d.csv');
  await page.click('th button[data-key="name"]');
  assert.equal(await page.getAttribute('th:has(button[data-key="name"])', 'aria-sort'), 'ascending');
  // Gym: validation, then confirmation; ribbon is honest about demo status.
  await page.goto(ORIGIN + '/demo-gym');
  await page.click('#trialForm [type="submit"]');
  assert.match(await page.locator('#trialMsg').innerText(), /name/);
  await page.click('.slots li button >> nth=0');
  await page.fill('#t-name', 'Alex Morgan');
  await page.fill('#t-phone', '+1 415 555 0134');
  await page.click('#trialForm [type="submit"]');
  await page.waitForSelector('.done');
  assert.match(await page.locator('.done').innerText(), /Demo only — nothing was sent/);
  assert.match(await page.locator('.xs-ribbon').innerText(), /Concept demo/);
  assert.equal(await page.getAttribute('.xs-ribbon [data-cta]', 'href'), '/portfolio#p-forge-fitness');
  assert.deepEqual(log.errors, []);
  await context.close();
});
