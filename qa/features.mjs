import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || '/opt/node-tools/node_modules/playwright');
import fs from 'fs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8787').replace(/\/$/, '');
const OUT = process.argv[3] || 'features.json';
const ADMIN = process.env.ADMIN_TOKEN || '';
const WRITE = process.env.QA_WRITE === '1'; // only submit forms / create data when allowed
const browser = await chromium.launch();
const results = [];
const stamp = Date.now().toString(36);

async function test(name, fn, opts = {}) {
  if (process.env.ONLY && !new RegExp(process.env.ONLY, 'i').test(name)) return;
  const ctx = await browser.newContext({ viewport: opts.mobile ? { width: 390, height: 844 } : { width: 1366, height: 900 }, isMobile: !!opts.mobile, hasTouch: !!opts.mobile });
  await ctx.route('**/api/event', r => r.fulfill({ status: 204, body: '' }));
  const page = await ctx.newPage();
  const errs = [], bad = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
  page.on('response', r => { if (r.status() >= 400 && new URL(r.url()).host === new URL(BASE).host) bad.push(r.status() + ' ' + r.request().method() + ' ' + new URL(r.url()).pathname); });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  const notes = [];
  const t0 = Date.now();
  let status = 'pass', error = '';
  try { await fn(page, notes, ctx); }
  catch (e) { status = 'fail'; error = String(e.message || e).split('\n').slice(0, 3).join(' | ').slice(0, 500); try { await page.screenshot({ path: `shots/${name.replace(/\W+/g, '_')}.png`, fullPage: false }); } catch {} }
  results.push({ name, status, error, notes, pageErrors: errs, badResponses: bad, ms: Date.now() - t0 });
  console.error(status.toUpperCase(), name, error);
  await ctx.close();
}
const ok = (c, m) => { if (!c) throw new Error(m); };
const go = (p, path) => p.goto(BASE + path, { waitUntil: 'load', timeout: 30000 });
const text = (p, sel) => p.locator(sel).first().innerText({ timeout: 8000 });
fs.mkdirSync('shots', { recursive: true });

// ---------- commercial pages: menu, theme, lead form ----------
for (const path of ['/', '/services', '/contact', '/clinic-website-development', '/website-development-gurugram']) {
  await test(`mobile menu opens and closes on ${path}`, async (p) => {
    await go(p, path);
    await p.click('#menu'); await p.waitForTimeout(300);
    ok(await p.locator('#nav').evaluate(n => n.classList.contains('open') && getComputedStyle(n).display !== 'none'), 'nav did not open');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    ok(!(await p.locator('#nav').evaluate(n => n.classList.contains('open'))), 'nav did not close');
  }, { mobile: true });
}
await test('theme toggle switches and persists (home)', async (p) => {
  await go(p, '/'); await p.click('#themeToggle');
  ok(await p.evaluate(() => document.documentElement.dataset.theme === 'dark'), 'not dark after click');
  await p.reload(); ok(await p.evaluate(() => document.documentElement.dataset.theme === 'dark'), 'dark not persisted after reload');
});
await test('lead form: empty submit shows validation, sends nothing', async (p) => {
  await go(p, '/'); let posted = false; p.on('request', r => { if (r.url().includes('/api/lead')) posted = true; });
  await p.click('form[data-lead-form] button[type=submit]'); await p.waitForTimeout(800);
  const s = await text(p, 'form[data-lead-form] [data-lead-status]').catch(() => '');
  ok(!posted, 'empty form was posted to /api/lead'); ok(s.trim().length > 0, 'no validation message shown'); return s;
});
await test('lead form: offer buttons preselect package', async (p, notes) => {
  await go(p, '/');
  const btns = await p.locator('[data-offer]').count(); notes.push(btns + ' offer buttons');
  ok(btns > 0, 'no [data-offer] buttons');
  const b = p.locator('[data-offer]').nth(1); const want = await b.getAttribute('data-offer');
  await b.click(); await p.waitForTimeout(400);
  ok(await p.locator('#lf-offer').inputValue() === want, 'offer not preselected: wanted ' + want);
});
if (WRITE) for (const path of ['/', '/contact', '/services']) {
  await test(`lead form submits on ${path}`, async (p, notes) => {
    await go(p, path);
    const f = p.locator('form[data-lead-form]').first();
    await f.locator('[name=name]').fill('QA Test ' + stamp);
    await f.locator('[name=phone]').fill('9999999999').catch(() => {});
    await f.locator('[name=email]').fill(`qa+${stamp}@example.com`).catch(() => {});
    await f.locator('[name=business]').fill('QA automated check').catch(() => {});
    await f.locator('[name=message]').fill('Automated QA test lead, please ignore.').catch(() => {});
    const resp = p.waitForResponse(r => r.url().includes('/api/lead'), { timeout: 15000 });
    await f.locator('button[type=submit]').click();
    const r = await resp; notes.push('POST /api/lead ' + r.status());
    await p.waitForTimeout(800);
    const s = await f.locator('[data-lead-status]').innerText().catch(() => '');
    notes.push('status: ' + s.slice(0, 160));
    ok(r.status() < 300, 'lead API returned ' + r.status());
  });
}

// ---------- tools ----------
await test('website cost calculator updates estimate + WhatsApp link', async (p, notes) => {
  await go(p, '/website-cost-calculator');
  const before = await text(p, '#estimate');
  const opts = await p.locator('#type option').count(); ok(opts > 1, 'no type options');
  await p.selectOption('#type', { index: opts - 1 }); await p.fill('#pages', '12'); await p.locator('#pages').dispatchEvent('change');
  await p.locator('.addon').first().check();
  const after = await text(p, '#estimate'); notes.push(`${before} -> ${after}`);
  ok(after !== before, 'estimate did not change');
  const href = await p.getAttribute('#quoteBtn', 'href'); ok(/wa\.me/.test(href || '') && href.includes('Pages%3A%2012'), 'quote link not updated: ' + href);
  await p.fill('#pages', '-5'); await p.locator('#pages').dispatchEvent('change'); notes.push('negative pages -> ' + await text(p, '#estimate'));
  await p.fill('#pages', ''); await p.locator('#pages').dispatchEvent('change'); notes.push('empty pages -> ' + await text(p, '#estimate'));
});
await test('preview builder renders live draft', async (p, notes) => {
  await go(p, '/preview-builder');
  await p.waitForTimeout(800);
  const fr = p.frameLocator('iframe').first();
  await p.fill('[name=name]', 'QA Dental ' + stamp); await p.waitForTimeout(1200);
  const body = await fr.locator('body').innerText({ timeout: 8000 });
  ok(body.includes('QA Dental'), 'preview iframe did not update with business name');
  notes.push('vertical options: ' + await p.locator('#vertical option').count());
  for (const w of ['390', '820']) { await p.click(`[data-w="${w}"]`); }
  await p.click('#save'); await p.waitForTimeout(1200);
  notes.push('save without admin token -> ' + (await p.locator('body').innerText()).match(/(token|admin|unauthori[sz]ed|saved|error)[^\n]{0,80}/i)?.[0]);
});
await test('chat widget answers a quick question', async (p, notes) => {
  await go(p, '/articles');
  await p.click('#xsChatFab');
  const resp = p.waitForResponse(r => r.url().includes('/api/chat'), { timeout: 20000 });
  await p.locator('#xsChatQuick button').nth(1).click();
  const r = await resp; notes.push('/api/chat ' + r.status());
  await p.waitForTimeout(800);
  const last = await p.locator('#xsChatMessages .xs-msg.bot').last().innerText(); notes.push('reply: ' + last.slice(0, 160));
  ok(r.status() < 400, 'chat API ' + r.status()); ok(!/Connection issue|Sorry, mujhe/.test(last), 'chat fallback reply: ' + last.slice(0, 100));
});

// ---------- catalogs ----------
await test('website catalog grids render and sample links open', async (p, notes) => {
  await go(p, '/website-catalog'); await p.waitForTimeout(800);
  for (const id of ['catalogStats', 'businessPreview', 'frontendGrid']) { const n = await p.locator('#' + id + ' > *').count(); notes.push(id + ': ' + n); ok(n > 0, id + ' is empty'); }
  const samples = await p.locator('a[href^="sample-preview.html"]').evaluateAll(as => as.map(a => a.href));
  notes.push(samples.length + ' sample links');
  for (const s of samples.slice(0, 40).filter((_, i) => i % 4 === 0)) {
    await p.goto(s, { waitUntil: 'load' }); await p.waitForTimeout(500);
    const t = (await p.locator('body').innerText()).slice(0, 4000);
    ok(!/not found|undefined|null/i.test(t.slice(0, 400)), 'sample page looks broken: ' + s + ' -> ' + t.slice(0, 120));
  }
});
await test('business templates: search, filters, load more, preview', async (p, notes) => {
  await go(p, '/business-templates'); await p.waitForTimeout(800);
  const cnt = async () => p.locator('#templateGrid > *, .template-grid > *, [data-template-card]').count();
  const n0 = await cnt(); notes.push('initial cards ' + n0); ok(n0 > 0, 'no template cards');
  await p.fill('#searchTemplates', 'dental'); await p.waitForTimeout(600); notes.push('after search dental: ' + await cnt());
  await p.fill('#searchTemplates', 'zzzzqqq'); await p.waitForTimeout(600); notes.push('after nonsense search: ' + await cnt() + ' / ' + (await p.locator('body').innerText()).match(/no [^\n]{0,60}/i)?.[0]);
  await p.click('#clearFilters'); await p.waitForTimeout(400);
  const n1 = await cnt(); if (await p.locator('#loadMore').isVisible()) { await p.click('#loadMore'); await p.waitForTimeout(400); notes.push(`load more ${n1} -> ${await cnt()}`); }
  for (const sel of ['#groupFilter', '#businessFilter', '#styleFilter', '#featureFilter', '#sortFilter']) {
    const c = await p.locator(sel + ' option').count(); if (c > 1) { await p.selectOption(sel, { index: 1 }); await p.waitForTimeout(300); notes.push(`${sel} -> ${await cnt()}`); await p.click('#clearFilters'); }
  }
  const link = await p.locator('a[href*="template-preview"]').first().getAttribute('href');
  ok(link, 'no template-preview link'); await p.goto(new URL(link, p.url()).href); await p.waitForTimeout(800);
  const t = await p.locator('body').innerText(); notes.push('template preview: ' + t.slice(0, 100).replace(/\s+/g, ' '));
  ok(t.length > 200, 'template preview empty');
});
await test('shop: filter, search, cart, checkout form', async (p, notes) => {
  await go(p, '/catalog'); await p.waitForTimeout(800);
  const cards = () => p.locator('.product-card:not(.hidden)').count();
  const n0 = await cards(); notes.push('products ' + n0); ok(n0 > 0, 'no products');
  await p.click('[data-filter="desk"]'); await p.waitForTimeout(300); notes.push('desk filter: ' + await cards());
  await p.click('[data-filter="all"]');
  await p.fill('#productSearch', 'zzzz'); await p.waitForTimeout(400); notes.push('nonsense search: ' + await cards());
  await p.fill('#productSearch', '');  await p.waitForTimeout(300);
  const add = p.locator('.product-card button:has-text("Add"), [data-add], .add-to-cart').first();
  await add.click(); await p.waitForTimeout(300);
  notes.push('cart button: ' + (await text(p, '#cartButton')).replace(/\s+/g, ' '));
  if (!(await p.locator('#checkoutButton').isVisible())) { await p.click('#cartButton'); await p.waitForTimeout(300); }
  notes.push('cart drawer auto-opened after add: ' + await p.locator('#checkoutButton').isVisible());
  await p.click('#checkoutButton'); await p.waitForTimeout(400);
  ok(await p.locator('#checkoutForm').isVisible(), 'checkout form not visible');
  if (WRITE) {
    await p.fill('#checkoutForm [name=name]', 'QA Test'); await p.fill('#checkoutForm [name=email]', `qa+${stamp}@example.com`);
    await p.fill('#checkoutForm [name=phone]', '9999999999'); await p.fill('#checkoutForm [name=pincode]', '122001'); await p.fill('#checkoutForm [name=address]', 'QA test address'); await p.selectOption('#checkoutForm [name=payment]', 'cod');
    const r = p.waitForResponse(r => r.url().includes('/api/store/checkout') || r.url().includes('/api/orders'), { timeout: 15000 }).catch(() => null);
    await p.click('#checkoutForm [type=submit]'); const rr = await r; notes.push('checkout API: ' + (rr ? rr.status() + ' ' + new URL(rr.url()).pathname : 'no request'));
    await p.waitForTimeout(800); notes.push('after checkout: ' + (await p.locator('#checkoutForm, .checkout-panel, body').first().innerText()).slice(-200).replace(/\s+/g, ' '));
  }
});

// ---------- novels / reader ----------
await test('novels: list, search, open reader, next chapter, translate', async (p, notes) => {
  await go(p, '/novels'); await p.waitForTimeout(1500);
  const links = p.locator('a[href*="reader"]'); const n = await links.count(); notes.push(n + ' reader links'); ok(n > 0, 'no novel links');
  await p.fill('#search', 'xyzxyznotabook'); await p.waitForTimeout(500); notes.push('nonsense search visible links: ' + await p.locator('a[href*="reader"]:visible').count());
  await p.fill('#search', ''); await p.waitForTimeout(500);
  const href = await links.first().getAttribute('href'); notes.push('first: ' + href);
  await p.goto(new URL(href, p.url()).href, { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const body = await p.locator('body').innerText(); ok(body.length > 1500, 'chapter text too short: ' + body.slice(0, 200).replace(/\s+/g, ' '));
  ok(!/failed to load|error loading|could not load/i.test(body), 'reader shows load error');
  const before = p.url(); await p.click('#nextChapter'); await p.waitForTimeout(2500); notes.push('next: ' + before + ' -> ' + p.url());
  await p.click('#fontUp'); await p.click('#themeToggle');
  const langs = await p.locator('#languageSelect option').count(); notes.push('languages ' + langs);
  if (langs > 1) {
    await p.selectOption('#languageSelect', { index: 1 });
    const r = p.waitForResponse(r => r.url().includes('/api/translate'), { timeout: 30000 }).catch(() => null);
    await p.click('#translateChapter'); const rr = await r; notes.push('translate: ' + (rr ? rr.status() : 'no request')); await p.waitForTimeout(3000); notes.push('after translate: ' + (await p.locator('main, body').first().innerText()).slice(0, 300).replace(/\s+/g, ' ')); await p.screenshot({ path: 'shots/reader_translate.png' });
  }
  await p.fill('#jumpInput', '99999'); await p.click('#jumpBtn'); await p.waitForTimeout(1500); notes.push('jump 99999 -> ' + p.url() + ' / ' + (await p.locator('body').innerText()).slice(0, 120).replace(/\s+/g, ' '));
});

// ---------- account / community / ideas ----------
await test('account: wrong-password login shows error', async (p, notes) => {
  await go(p, '/account');
  await p.fill('#loginForm [name=email]', 'nobody-qa@example.com'); await p.fill('#loginForm [name=password]', 'wrongpassword123');
  const lr = p.waitForResponse(r => r.url().includes('/api/auth/login'), { timeout: 20000 }); const t1 = Date.now();
  await p.click('#loginForm [type=submit]'); const lres = await lr; notes.push('login API ' + lres.status() + ' in ' + (Date.now() - t1) + 'ms: ' + (await lres.text()).slice(0, 120)); await p.waitForTimeout(2500);
  const m = await text(p, '#authMessage'); notes.push('message: ' + m); ok(m.trim(), 'no error message');
  for (const prov of ['google', 'github', 'facebook', 'x']) { await p.click(`[data-provider=${prov}]`, { force: true }); await p.waitForTimeout(300); notes.push(prov + ': ' + (await text(p, '#authMessage')).slice(0, 90) + ' @ ' + new URL(p.url()).pathname); if (!p.url().includes('/account')) await go(p, '/account'); }
});
if (WRITE) await test('account: register, dashboard, logout, login; community + ideas posting', async (p, notes) => {
  await go(p, '/account');
  await p.click('[data-auth-tab=register]');
  const email = `qa+${stamp}@example.com`, pw = 'QaTest!' + stamp + 'x9';
  await p.fill('#registerForm [name=name]', 'QA Tester'); await p.fill('#registerForm [name=email]', email); await p.fill('#registerForm [name=password]', pw);
  await p.check('#registerForm [name=terms]').catch(() => {});
  await p.click('#registerForm [type=submit]'); await p.waitForTimeout(1500);
  ok(await p.locator('#accountDashboard').isVisible(), 'dashboard not shown after register: ' + await text(p, '#authMessage'));
  await p.click('#logoutButton'); await p.waitForTimeout(800);
  await p.fill('#loginForm [name=email]', email); await p.fill('#loginForm [name=password]', pw); await p.click('#loginForm [type=submit]'); await p.waitForTimeout(1500);
  ok(await p.locator('#accountDashboard').isVisible(), 'login after register failed: ' + await text(p, '#authMessage'));
  // community
  await go(p, '/community'); await p.waitForTimeout(1200);
  notes.push('member status: ' + await text(p, '#memberStatus'));
  const f = p.locator('#communityPostForm');
  await f.locator('[name=title]').fill('QA test post ' + stamp); await f.locator('[name=body]').fill('Automated QA check, please ignore. '.repeat(3));
  const r = p.waitForResponse(r => r.url().includes('/api/community/posts') && r.request().method() === 'POST', { timeout: 10000 });
  await f.locator('[type=submit]').click(); const rr = await r; notes.push('create post ' + rr.status());
  await p.waitForTimeout(1200);
  notes.push('form status: ' + await text(p, '#communityFormStatus'));
  notes.push('in feed: ' + await p.locator('.discussion-card', { hasText: 'QA test post ' + stamp }).count());
  ok(await p.locator('#threadDrawer.open').count(), 'thread drawer did not open after publishing');
  ok((await p.locator('#threadDrawer').innerText()).includes('QA test post ' + stamp), 'drawer does not show the new post');
  const drawerText = await p.locator('#threadDrawer').innerText(); notes.push('drawer: ' + drawerText.slice(0, 120).replace(/\s+/g, ' '));
  const like = p.locator('#threadDrawer button:has-text("♥"), #threadDrawer [data-like], #threadDrawer button:has-text("Like")').first();
  if (await like.count()) { await like.click(); await p.waitForTimeout(600); notes.push('liked'); }
  const c = p.locator('#threadDrawer textarea, #threadDrawer input[name=body]').first();
  if (await c.count()) { await c.fill('QA comment'); await p.locator('#threadDrawer [type=submit]').first().click(); await p.waitForTimeout(1000); notes.push('comment visible: ' + (await p.locator('#threadDrawer').innerText()).includes('QA comment')); }
});
if (WRITE) await test('ideas: post an idea while signed in', async (p, notes) => {
  const email = `qa3+${stamp}@example.com`, pw = 'QaTest!' + stamp + 'z9';
  await go(p, '/account'); await p.click('[data-auth-tab=register]');
  await p.fill('#registerForm [name=name]', 'QA Three'); await p.fill('#registerForm [name=email]', email); await p.fill('#registerForm [name=password]', pw);
  await p.check('#registerForm [name=terms]').catch(() => {}); await p.click('#registerForm [type=submit]'); await p.waitForTimeout(1200);
  await go(p, '/ideas'); await p.waitForTimeout(1000);
  const fi = p.locator('#ideaForm');
  await fi.locator('[name=title]').fill('QA idea ' + stamp); await fi.locator('[name=details]').fill('Automated QA test idea, please ignore.');
  await fi.locator('[name=budget]').fill('1000').catch(async () => { await fi.locator('[name=budget]').selectOption({ index: 1 }).catch(() => {}); });
  await fi.locator('[type=submit]').click(); await p.waitForTimeout(1500); notes.push('status: ' + await text(p, '#ideaFormStatus'));
  ok((await p.locator('#ideaGrid').innerText()).includes('QA idea ' + stamp), 'new idea not shown in grid');
});
await test('community + ideas pages load feeds (logged out)', async (p, notes) => {
  await go(p, '/community'); await p.waitForTimeout(1500);
  const feed = await text(p, '#communityFeed'); notes.push('feed: ' + feed.slice(0, 100).replace(/\s+/g, ' ')); ok(!/error|failed/i.test(feed.slice(0, 80)), 'feed error');
  for (const c of ['ideas', 'webdev', 'books']) { await p.click(`[data-community-category=${c}]`); await p.waitForTimeout(500); }
  await go(p, '/ideas'); await p.waitForTimeout(1200); const g = await text(p, '#ideaGrid'); notes.push('ideas: ' + g.slice(0, 100).replace(/\s+/g, ' '));
});

// ---------- demos ----------
await test('demo booking: load slots + book', async (p, notes) => {
  await go(p, '/demo-fullstack-booking'); await p.waitForTimeout(1200);
  const s = await p.locator('#slot option').count(); notes.push(s + ' slots; ' + await text(p, '#bookingStatus')); ok(s > 0, 'no slots');
  if (WRITE) { const f = p.locator('#booking'); for (const i of await f.locator('input:not([type=date])').all()) await i.fill('QA Test').catch(() => {});
    await f.locator('[type=submit]').click(); await p.waitForTimeout(1200); notes.push('book: ' + await text(p, '#bookingStatus')); ok(/Confirmed/.test(await text(p, '#bookingStatus')), 'booking not confirmed'); }
});
await test('demo CRM lead (test-flagged)', async (p, notes) => {
  await go(p, '/demo-backend-crm'); const f = p.locator('#leadForm');
  for (const i of await f.locator('input').all()) { const t = await i.getAttribute('type'); await i.fill(t === 'email' ? 'qa@example.com' : 'QA Test').catch(() => {}); }
  if (!WRITE) return; await f.locator('button').click(); await p.waitForTimeout(1500); const s = await text(p, '#leadStatus'); notes.push(s); ok(/Success/.test(s), 'CRM demo failed: ' + s);
});
if (WRITE) await test('demo auth: login with a registered account', async (p, notes) => {
  const email = `qa2+${stamp}@example.com`, pw = 'QaTest!' + stamp + 'y9';
  await go(p, '/account'); await p.click('[data-auth-tab=register]');
  await p.fill('#registerForm [name=name]', 'QA Two'); await p.fill('#registerForm [name=email]', email); await p.fill('#registerForm [name=password]', pw);
  await p.check('#registerForm [name=terms]').catch(() => {}); await p.click('#registerForm [type=submit]'); await p.waitForTimeout(1200);
  await p.click('#logoutButton'); await p.waitForTimeout(600);
  await go(p, '/demo-backend-auth'); const f = p.locator('#login');
  await f.locator('[name=email]').fill(email); await f.locator('[name=password]').fill(pw);
  await f.locator('button').click(); await p.waitForTimeout(1500); const s = await text(p, '#authStatus'); notes.push('status: ' + s);
  ok(/Authenticated/.test(s), 'demo login failed: ' + s);
  await p.click('#logout'); await p.waitForTimeout(600);
});
await test('demo API explorer buttons', async (p, notes) => {
  await go(p, '/demo-backend-api');
  for (const b of await p.locator('[data-url]').all()) { const u = await b.getAttribute('data-url'); await b.click(); await p.waitForTimeout(1000); const o = await text(p, '#out'); notes.push(u + ' -> ' + o.slice(0, 60).replace(/\s+/g, ' ')); ok(!/Request failed|Loading…/.test(o), u + ' failed: ' + o.slice(0, 80)); }
});
await test('demo commerce: products, cart, quote', async (p, notes) => {
  await go(p, '/demo-fullstack-commerce'); await p.waitForTimeout(1200);
  const n = await p.locator('#products .add').count(); notes.push(n + ' products'); ok(n > 0, 'no products');
  await p.locator('#products .add').first().click(); await p.locator('#products .add').nth(1).click();
  notes.push(await text(p, '#cartInfo') + ' ' + await text(p, '#cartTotal'));
  await p.click('#getQuote'); await p.waitForTimeout(1000); const q = await text(p, '#quote'); notes.push(q); ok(/Total/.test(q) && !/undefined|NaN/.test(q), 'quote broken: ' + q);
});
await test('demo SaaS tasks: load + add', async (p, notes) => {
  await go(p, '/demo-fullstack-saas'); await p.waitForTimeout(1200); notes.push(await text(p, '#taskStatus'));
  if (!WRITE) return; await p.fill('#newTask', 'QA task <b>x</b>'); await p.click('#addTask'); await p.waitForTimeout(1000); notes.push(await text(p, '#taskStatus'));
  ok((await p.locator('#todo, #progress, #done').allInnerTexts()).join(' ').includes('QA task <b>x</b>'), 'added task not shown (or HTML not escaped)');
});
await test('demo store filters + cart; SaaS pricing toggle', async (p, notes) => {
  await go(p, '/demo-frontend-store');
  await p.locator('.add').first().click(); await p.locator('.add').nth(1).click(); ok(await text(p, '#cartCount') === '2', 'cart count wrong');
  await p.click('#clearCart'); ok(await text(p, '#cartCount') === '0', 'clear failed');
  const cats = await p.locator('[data-c]').all(); if (cats.length > 1) { await cats[1].click(); notes.push('visible after filter: ' + await p.locator('.product:not(.hide)').count()); }
  await go(p, '/demo-frontend-saas'); const m = await text(p, '.price'); await p.click('#annual'); const a = await text(p, '.price'); notes.push(m + ' -> ' + a); ok(m !== a, 'annual toggle did nothing');
});

// ---------- admin ----------
await test('admin: wrong token rejected', async (p, notes) => {
  await go(p, '/admin'); await p.fill('#token', 'wrong-token-qa-000000000000000'); await p.locator('#loginForm [type=submit], #loginForm button').first().click(); await p.waitForTimeout(1500);
  notes.push((await p.locator('body').innerText()).slice(0, 200).replace(/\s+/g, ' '));
});
if (ADMIN) await test('admin: valid token shows leads, report, previews, scorecard', async (p, notes) => {
  await go(p, '/admin'); await p.fill('#token', ADMIN); await p.locator('#loginForm [type=submit], #loginForm button').first().click(); await p.waitForTimeout(2000);
  const t = await p.locator('body').innerText(); notes.push(t.slice(0, 300).replace(/\s+/g, ' '));
  ok(!(await p.locator('#loginForm').isVisible()), 'still on login form');
  await p.check('#showTest').catch(() => {}); await p.click('#refresh').catch(() => {}); await p.waitForTimeout(1200);
  notes.push('QA leads visible: ' + (await p.locator('body').innerText()).includes('QA Test ' + stamp));
  await p.click('#scorecard').catch(e => notes.push('scorecard: ' + e.message.split('\n')[0])); await p.waitForTimeout(500);
  const dl = p.waitForEvent('download', { timeout: 5000 }).catch(() => null); await p.click('#csv').catch(() => {}); const d = await dl; notes.push('csv download: ' + (d ? d.suggestedFilename() : 'none'));
});

// ---------- routing ----------
await test('404 page for unknown URL', async (p, notes) => {
  const r = await go(p, '/this-page-does-not-exist-qa'); notes.push('status ' + r.status() + ': ' + (await p.locator('body').innerText()).slice(0, 120).replace(/\s+/g, ' '));
  ok(r.status() === 404, 'unknown URL returned ' + r.status());
});
await test('expired/unknown client preview link', async (p, notes) => {
  const r = await go(p, '/p/doesnotexist'); await p.waitForTimeout(1200); notes.push(p.url() + ' -> ' + (await p.locator('body').innerText()).slice(0, 150).replace(/\s+/g, ' '));
});

fs.writeFileSync(OUT, JSON.stringify({ base: BASE, write: WRITE, results }, null, 1));
await browser.close();
console.log(results.filter(r => r.status === 'pass').length + '/' + results.length + ' passed');
