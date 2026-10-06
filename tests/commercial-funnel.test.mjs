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

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

async function newPage({ viewport = { width: 1280, height: 900 }, leadStatus = null, sql = null } = {}) {
  const db = sql || doSql();
  ensureGrowthSchema(db);
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const log = { errors: [], external: [], leadPosts: 0, missing: [] };
  page.on('pageerror', (e) => log.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) log.errors.push(m.text()); });
  await context.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin !== ORIGIN) { log.external.push(url.host); return route.fulfill({ status: 204, body: '' }); }
    if (url.pathname.startsWith('/api/')) {
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
  assert.match(await page.locator('#pitch').innerText(), /from ₹999/);
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
