import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.XENDER_BASE_URL || 'https://www.xendersecrets.com';
const results = [];
const record = (test, ok, detail='') => results.push({ test, ok: Boolean(ok), detail: String(detail).slice(0, 800) });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(20000);


try {
  // The homepage was simplified in 83c033d (new hero, "explore" grid removed). The old assertions
  // ('Simple digital work', >=8 #explore links) failed on every run after that commit.
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  const title = await page.title();
  const hero = (await page.locator('h1').first().innerText()).replace(/\s+/g, ' ');
  const serviceCards = await page.locator('#services .card').count();
  const waLinks = await page.locator('a[href*="wa.me/919821941814"]').count();
  const catalogLink = await page.locator('a[href*="website-catalog"]').count();
  const leadForm = await page.locator('form[data-lead-form]').count();
  record('homepage_lead_form', leadForm === 1, `leadForms=${leadForm}`);
  record('homepage', title.includes('Xender Secrets') && /websites?/i.test(hero) && serviceCards >= 3 && waLinks >= 1 && catalogLink >= 1,
    `title=${title}; hero=${hero}; services=${serviceCards}; whatsapp=${waLinks}; catalogLinks=${catalogLink}`);
} catch (e) { record('homepage', false, e); }

try {
  await page.goto(BASE + '/website-catalog.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll('#frontendGrid article').length===20, null, {timeout:20000});
  const stats = await page.locator('#catalogStats').innerText();
  const fe = await page.locator('#frontendGrid article').count();
  const be = await page.locator('#backendGrid article').count();
  const fsCount = await page.locator('#fullstackGrid article').count();
  record('catalog_render', stats.includes('32') && stats.includes('640') && fe===20 && be===20 && fsCount===20, `stats=${stats}; fe=${fe}; be=${be}; fs=${fsCount}`);
} catch (e) { record('catalog_render', false, e); }

try {
  await page.goto(BASE + '/business-templates.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll('#templateGrid article').length===24, null, {timeout:20000});
  const initial = await page.locator('#templateGrid article').count();
  await page.locator('#searchTemplates').fill('dentist');
  await sleep(250);
  const found = await page.locator('#resultCount').innerText();
  const visible = await page.locator('#templateGrid article').count();
  const categories = await page.locator('#groupFilter option').count();
  const sorts = await page.locator('#sortFilter option').count();
  record('business_filters', initial===24 && found.includes('20 templates found') && visible===20 && categories>2 && sorts===4,
    `initial=${initial}; visible=${visible}; found=${found}; categories=${categories}; sorts=${sorts}`);
} catch (e) { record('business_filters', false, e); }

try {
  await page.goto(BASE + '/template-preview.html?id=REAL-18', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('#templateLabel')?.textContent.includes('REAL-18'), null, {timeout:20000});
  const label = await page.locator('#templateLabel').innerText();
  const href = await page.locator('#customizeBtn').getAttribute('href');
  await page.locator('#mobileView').click();
  const cls = await page.locator('#previewStage').getAttribute('class');
  record('template_preview', label.includes('REAL-18') && (href||'').includes('REAL-18') && (cls||'').includes('mobile'),
    `label=${label}; href=${href}; class=${cls}`);
} catch (e) { record('template_preview', false, e); }

try {
  await page.goto(BASE + '/sample-preview.html?type=frontend&id=FE-08', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('#sampleTitle')?.textContent.includes('FE-08'), null, {timeout:20000});
  const title = await page.locator('#sampleTitle').innerText();
  const before = await page.locator('#sampleList .sample-item').count();
  await page.locator('#sampleSearch').fill('Skyline');
  await sleep(150);
  const after = await page.locator('#sampleList .sample-item').count();
  await page.locator('#sampleList .sample-item').first().click();
  const modal = await page.locator('#sampleModal').evaluate(e => getComputedStyle(e).display);
  record('frontend_interaction', title.includes('FE-08') && before===6 && after===1 && modal==='grid',
    `title=${title}; before=${before}; after=${after}; modal=${modal}`);
} catch (e) { record('frontend_interaction', false, e); }

try {
  await page.goto(BASE + '/sample-preview.html?type=backend&id=BE-01', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#runApi',{timeout:20000});
  await page.locator('#runApi').click();
  await page.waitForFunction(() => document.querySelector('#apiConsole')?.textContent.includes('HTTP 200'), null, { timeout: 25000 });
  const output = await page.locator('#apiConsole').innerText();
  record('backend_live_request', output.includes('HTTP 200') && output.includes('rest-api'), output.slice(0, 300));
} catch (e) { record('backend_live_request', false, e); }

let cleanupId = null;
try {
  const unique = 'E2E ' + Date.now();
  await page.goto(BASE + '/sample-preview.html?type=fullstack&id=FS-01', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#fsInput',{timeout:20000});
  await page.locator('#fsInput').fill(unique);
  await page.locator('#fsAdd').click();
  await page.waitForFunction(v => document.querySelector('#fsList')?.innerText.includes(v), unique, { timeout: 25000 });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(v => document.querySelector('#fsList')?.innerText.includes(v), unique, { timeout: 25000 });
  const data = await page.evaluate(() => fetch('/api/demo/fs-appointment').then(r => r.json()));
  cleanupId = (data.records || []).find(r => r.label === unique)?.id || null;
  const persisted = (await page.locator('#fsList').innerText()).includes(unique);
  if (cleanupId) {
    await page.evaluate(id => fetch('/api/demo/fs-appointment?id=' + encodeURIComponent(id), { method: 'DELETE' }).then(r => r.json()), cleanupId);
  }
  record('fullstack_persistence', persisted && Boolean(cleanupId), `persisted=${persisted}; cleanupId=${cleanupId}`);
} catch (e) {
  record('fullstack_persistence', false, e);
  if (cleanupId) {
    try { await page.evaluate(id => fetch('/api/demo/fs-appointment?id=' + encodeURIComponent(id), { method: 'DELETE' }), cleanupId); } catch {}
  }
}

try {
  // Currency conversion lives on the shop catalog. Commercial pages show India ₹ pricing plus a
  // US$299 international anchor instead of converting ₹999 to a misleadingly tiny amount (XEND-DEV-002).
  await page.goto(BASE + '/catalog.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => localStorage.setItem('xs-country','US'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('.xs-country-meta')?.textContent.includes('USD'), null, {timeout:20000});
  const meta = await page.locator('.xs-country-meta').innerText();
  const price = await page.locator('[data-inr]').first().innerText();
  record('currency_us', meta.includes('USD') && (price.includes('$') || price.includes('US$')), `meta=${meta}; price=${price}`);
  await page.evaluate(() => localStorage.removeItem('xs-country'));
} catch (e) { record('currency_us', false, e); }

try {
  const apiProbe = await page.evaluate(async () => {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{
      const r=await fetch('/api/translate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({target:'hi',texts:['Hello reader']}),signal:controller.signal});
      return {status:r.status,body:await r.json()};
    }catch(e){return {status:0,error:String(e)}}finally{clearTimeout(timer)}
  });
  record('translation_api_small', apiProbe.status===200 && apiProbe.body?.ok===true && /[\u0900-\u097F]/.test((apiProbe.body?.translated||[]).join(' ')), JSON.stringify(apiProbe));

} catch (e) { record('translation_api_small', false, e); }

try {
  // Lead capture is the revenue-critical path: smoke it on production with a test-flagged lead
  // (hidden from the MIS by default and never sent as a notification).
  const probe = await page.evaluate(async () => {
    const r = await fetch('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'E2E smoke', email: 'e2e-smoke@xendersecrets.com', test: true, page: '/e2e', cta: 'live-e2e' }) });
    return { status: r.status, body: await r.json().catch(() => null) };
  });
  record('lead_api_smoke', probe.status === 201 && /^XS-\d{6}-[A-Z2-9]{4}$/.test(probe.body?.id || ''), JSON.stringify(probe));
} catch (e) { record('lead_api_smoke', false, e); }

try {
  // Admin/MIS must be configured (401 without a valid token; 503 means ADMIN_TOKEN is missing).
  const auth = await page.evaluate(async () => {
    const none = await fetch('/api/admin/report');
    const wrong = await fetch('/api/admin/report', { headers: { authorization: 'Bearer wrong-token-wrong-token-wrong' } });
    const why = none.status === 503 ? (await none.json().catch(() => ({}))).code || 'unknown' : '';
    return { none: none.status, wrong: wrong.status, why };
  });
  record('admin_auth_configured', auth.none === 401 && auth.wrong === 401, JSON.stringify(auth));
} catch (e) { record('admin_auth_configured', false, e); }

// Full lead -> Durable Object -> admin read-back, only when the repo has the XENDER_ADMIN_TOKEN Actions secret.
if (process.env.XENDER_ADMIN_TOKEN) {
  try {
    const token = process.env.XENDER_ADMIN_TOKEN;
    const r = await page.evaluate(async (token) => {
      const sent = await fetch('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'E2E readback', email: 'e2e-readback@xendersecrets.com', test: true, page: '/e2e', cta: 'live-e2e-readback' }) }).then((x) => x.json());
      const leads = await fetch('/api/admin/leads?test=1&limit=50', { headers: { authorization: 'Bearer ' + token } });
      const report = await fetch('/api/admin/report?days=1', { headers: { authorization: 'Bearer ' + token } });
      const list = await leads.json();
      return { id: sent.id, leadsStatus: leads.status, reportStatus: report.status, found: (list.leads || []).some((l) => l.id === sent.id && l.is_test === 1) };
    }, token);
    record('lead_admin_readback', r.leadsStatus === 200 && r.reportStatus === 200 && r.found, JSON.stringify(r));
  } catch (e) { record('lead_admin_readback', false, String(e).replace(/Bearer \S+/g, 'Bearer ***')); }
}

try {
  const bad = [];
  for (const p of ['/services.html', '/clinic-website-development.html', '/website-development-gurugram.html', '/contact.html', '/about.html']) {
    const r = await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const forms = await page.locator('form[data-lead-form]').count();
    if (!r || r.status() !== 200 || forms !== 1) bad.push(`${p}:${r && r.status()}:${forms}`);
  }
  const redirect = await page.goto(BASE + '/website-development-mumbai.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!redirect || !/\/small-business-website-india(\.html)?$/.test(redirect.url())) bad.push('mumbai-redirect:' + (redirect && redirect.url()));
  record('commercial_pages', bad.length === 0, bad.join(', ') || 'all commercial pages have one lead form; city redirect ok');
} catch (e) { record('commercial_pages', false, e); }

// Reader: Gutenberg chapters are static JSON (no backend); XH chapters come from the Worker
// (/api/reader/*) with the Render service only as a fallback.
try {
  await page.goto(BASE + '/reader.html?gutenberg=journey-to-the-west-zh&chapter=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll('#readerContent p').length > 3, null, { timeout: 30000 });
  const src1 = await page.evaluate(() => document.body.dataset.readerSource);
  const t1 = await page.locator('#chapterTitle').innerText();
  await page.locator('#nextChapter').click();
  await page.waitForFunction(() => /chapter=2/.test(location.search) && document.querySelector('#chapterTitle')?.textContent.startsWith('Chapter 2'), null, { timeout: 30000 });
  record('reader_gutenberg_static', src1 === 'static' && /^Chapter 1/.test(t1), `source=${src1}; title=${t1}`);
} catch (e) { record('reader_gutenberg_static', false, e); }

try {
  const health = await page.evaluate(() => fetch('/api/reader/health').then(r => r.json()).catch(e => ({ error: String(e) })));
  record('reader_api_health', health.ok === true && health.sources?.gutenberg === 'static', JSON.stringify(health));
} catch (e) { record('reader_api_health', false, e); }

try {
  await page.goto(BASE + '/reader.html?xh=billionaire-god-of-war&chapter=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => (document.querySelector('#readerContent')?.innerText || '').length > 200, null, { timeout: 120000 });
  const source = await page.evaluate(() => document.body.dataset.readerSource);
  const original = (await page.locator('#readerContent').innerText()).slice(0, 220);
  await page.locator('#languageSelect').selectOption('hi');
  await page.waitForFunction(() => (document.querySelector('#translateStatus')?.textContent||'').trim()==='Tap Translate chapter', null, { timeout: 5000 });
  const status=(await page.locator('#translateStatus').innerText()).trim();
  const buttonEnabled=await page.locator('#translateChapter').isEnabled();
  const afterSelect=(await page.locator('#readerContent').innerText()).slice(0,220);
  record('reader_xh_and_translation_ui', status==='Tap Translate chapter' && buttonEnabled && afterSelect===original, `source=${source}; status=${status}; buttonEnabled=${buttonEnabled}; contentUnchanged=${afterSelect===original}`);
} catch (e) { record('reader_xh_and_translation_ui', false, e); }

try {
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mp = await mobile.newPage();
  const bad = [];
  for (const path of ['/website-catalog.html','/business-templates.html','/template-preview.html?id=DENT-18','/novels.html','/reader.html?gutenberg=journey-to-the-west-zh&chapter=1']) {
    await mp.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const dims = await mp.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    if (dims.sw > dims.cw + 2) bad.push({ path, ...dims });
  }
  await mobile.close().catch(() => {});
  record('mobile_no_horizontal_overflow', bad.length===0, bad.length ? JSON.stringify(bad) : '390px key pages clean');
} catch (e) { record('mobile_no_horizontal_overflow', false, e); }

await browser.close();

const failed = results.filter(x => !x.ok);
const report = { base: BASE, passed: results.length - failed.length, failed: failed.length, results };
fs.writeFileSync('xender-e2e-results.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
// GitHub annotations are readable through the API even when raw logs are not.
for (const f of failed) console.log(`::error title=E2E ${f.test}::${String(f.detail).replace(/[\r\n]+/g, ' ').slice(0, 500)}`);
if (failed.length) process.exit(1);
