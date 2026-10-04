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
  await page.goto(BASE + '/services.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => localStorage.setItem('xs-country','US'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('.xs-country-meta')?.textContent.includes('USD'), null, {timeout:20000});
  const meta = await page.locator('.xs-country-meta').innerText();
  const price = await page.locator('[data-inr="999"]').first().innerText();
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

  await page.goto(BASE + '/reader.html?xh=billionaire-god-of-war&chapter=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('#readerContent')?.innerText.includes('Fingol'), null, { timeout: 60000 });
  const original = (await page.locator('#readerContent').innerText()).slice(0, 160);
  await page.locator('#languageSelect').selectOption('hi');
  await page.locator('#translateChapter').click();
  await page.waitForFunction(() => {
    const s=(document.querySelector('#translateStatus')?.textContent||'').trim();
    return s==='Translated' || (s && !s.startsWith('Translating'));
  }, null, { timeout: 60000 }).catch(()=>{});
  const status=(await page.locator('#translateStatus').innerText()).trim();
  const translated = (await page.locator('#readerContent').innerText()).slice(0, 220);
  const hasHindi = /[\u0900-\u097F]/.test(translated);
  record('novel_hindi_translation', status==='Translated' && hasHindi && translated !== original, `status=${status}; original=${original}; translated=${translated}`);
} catch (e) { record('novel_hindi_translation', false, e); }

try {
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mp = await mobile.newPage();
  const bad = [];
  for (const path of ['/website-catalog.html','/business-templates.html','/template-preview.html?id=DENT-18']) {
    await mp.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const dims = await mp.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    if (dims.sw > dims.cw + 2) bad.push({ path, ...dims });
  }
  record('mobile_no_horizontal_overflow', bad.length===0, bad.length ? JSON.stringify(bad) : '390px key pages clean');
  await mobile.close();
} catch (e) { record('mobile_no_horizontal_overflow', false, e); }

await browser.close();

const failed = results.filter(x => !x.ok);
const report = { base: BASE, passed: results.length - failed.length, failed: failed.length, results };
fs.writeFileSync('xender-e2e-results.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
