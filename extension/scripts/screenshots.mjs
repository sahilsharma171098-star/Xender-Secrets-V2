// Generates store screenshots and promo tiles from REAL scans of local
// fixture pages, using the real extension popup (test build). Nothing in these
// images is mocked: every score and issue is what SiteCheck reported.
//
//   npm run screenshots   → store/screenshots/*.png, store/promo/*.png
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ROOT, ORIGIN, routeFixtures } from '../tests/helpers.mjs';

const EXT = path.join(ROOT, 'dist/test-chromium');
const OUT = path.join(ROOT, 'store/screenshots');
const PROMO = path.join(ROOT, 'store/promo');
const extId = [...createHash('sha256').update(EXT).digest('hex').slice(0, 32)]
  .map((c) => String.fromCharCode(97 + parseInt(c, 16))).join('');

await mkdir(OUT, { recursive: true });
await mkdir(PROMO, { recursive: true });
const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'sitecheck-shots-'));
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: 'chromium', headless: true, colorScheme: 'light',
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`]
});
await routeFixtures(context);

async function popupFor(fixture, prepare) {
  const helper = await context.newPage();
  await helper.goto(`chrome-extension://${extId}/popup/popup.html?tabId=-1`);
  const ids = () => helper.evaluate(async () => (await chrome.tabs.query({})).map((t) => t.id));
  const before = await ids();
  const target = await context.newPage();
  await target.setViewportSize({ width: 1280, height: 800 });
  await target.goto(`${ORIGIN}/${fixture}`);
  const tabId = (await ids()).find((id) => !before.includes(id));
  await helper.close();
  const page = await context.newPage();
  await page.setViewportSize({ width: 400, height: 600 });
  await page.goto(`chrome-extension://${extId}/popup/popup.html?tabId=${tabId}`);
  await page.waitForSelector('#results:not([hidden])');
  await page.waitForTimeout(700); // ring animation
  if (prepare) await prepare(page);
  const popupPng = await page.screenshot({ type: 'png' });
  const sitePng = await target.screenshot({ type: 'png' });
  await page.close();
  await target.close();
  return { popupPng, sitePng };
}

const b64 = (buf) => `data:image/png;base64,${buf.toString('base64')}`;
const icon = b64(await readFile(path.join(ROOT, 'assets/icons/icon-128.png')));

async function compose(file, { title, sub, popupPng, sitePng, width = 1280, height = 800 }) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height });
  await page.setContent(`<!doctype html><html><body style="margin:0">
  <div style="width:${width}px;height:${height}px;position:relative;overflow:hidden;font-family:Inter,ui-sans-serif,system-ui,'Segoe UI',sans-serif;
    background:linear-gradient(135deg,#f3fbf7 0%,#eef5fb 100%);color:#13202a">
    <img src="${b64(sitePng)}" style="position:absolute;left:600px;top:70px;width:900px;border-radius:14px;opacity:.55;filter:saturate(.8);box-shadow:0 20px 60px rgba(15,23,42,.15)">
    <div style="position:absolute;left:72px;top:0;bottom:0;width:470px;display:flex;flex-direction:column;justify-content:center">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px"><img src="${icon}" width="44" height="44">
        <b style="font-size:20px">Xender SiteCheck</b></div>
      <div style="font-size:46px;line-height:1.06;font-weight:800;letter-spacing:-.03em">${title}</div>
      <div style="font-size:20px;line-height:1.45;color:#4f5d68;margin-top:18px">${sub}</div>
    </div>
    <img src="${b64(popupPng)}" style="position:absolute;right:110px;top:${(height - 600) / 2}px;width:400px;border-radius:14px;border:1px solid #dfe6ea;box-shadow:0 30px 80px rgba(15,23,42,.28)">
  </div></body></html>`);
  await page.screenshot({ path: file, type: 'png' });
  await page.close();
  console.log('wrote', path.relative(ROOT, file));
}

const openFirst = (sel) => async (page) => {
  await page.locator(sel).first().click();
};
const filter = (label, then) => async (page) => {
  await page.locator('.cat', { hasText: label }).click();
  if (then) await then(page);
};

const shots = [
  ['01-check-in-seconds.png', 'Check your website in seconds', 'One click gives a clear health score across SEO, accessibility, usability, conversion and technical basics.', 'demo-store.html'],
  ['02-seo-accessibility.png', 'Find SEO and accessibility issues', 'Missing titles and descriptions, unlabeled fields, images without alt text, low-contrast text and more.', 'demo-store.html', filter('Accessibility', openFirst('details.issue summary'))],
  ['03-clear-fixes.png', 'Get clear fixes — not technical jargon', 'Every issue explains why it matters and exactly what to change.', 'demo-store.html', filter('SEO', openFirst('details.issue summary'))],
  ['04-conversion-friction.png', 'Spot conversion friction', 'Transparent heuristics flag vague buttons, missing contact options and long forms — clearly labelled as recommendations.', 'demo-store.html', filter('Conversion', openFirst('details.issue summary'))],
  ['05-local-first.png', 'Local-first. No browsing-history tracking.', 'SiteCheck only runs when you click it, analyzes the page inside your browser and sends nothing to Xender.', 'healthy.html']
];

for (const [file, title, sub, fixture, prepare] of shots) {
  const { popupPng, sitePng } = await popupFor(fixture, prepare);
  await compose(path.join(OUT, file), { title, sub, popupPng, sitePng });
  if (file.startsWith('01')) {
    // Raw popup capture for the website and docs.
    const { writeFile } = await import('node:fs/promises');
    await writeFile(path.join(OUT, 'popup-raw.png'), popupPng);
  }
}

// Promo tiles (text + icon only).
async function tile(file, width, height, big) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height });
  await page.setContent(`<!doctype html><html><body style="margin:0">
  <div style="width:${width}px;height:${height}px;display:flex;align-items:center;gap:${big ? 40 : 20}px;padding:0 ${big ? 90 : 34}px;box-sizing:border-box;
    background:linear-gradient(135deg,#0b1a22,#071016);color:#eef4f6;font-family:Inter,ui-sans-serif,system-ui,'Segoe UI',sans-serif">
    <img src="${icon}" width="${big ? 160 : 84}" height="${big ? 160 : 84}">
    <div><div style="font-size:${big ? 64 : 30}px;font-weight:800;letter-spacing:-.03em;line-height:1.05">Xender SiteCheck</div>
    <div style="font-size:${big ? 28 : 15}px;color:#73f0b5;font-weight:700;margin-top:${big ? 12 : 6}px">Website QA &amp; Conversion Audit</div>
    ${big ? '<div style="font-size:22px;color:#9fb0ba;margin-top:18px">SEO basics · Accessibility · Usability · Conversion — checked locally in your browser.</div>' : ''}</div>
  </div></body></html>`);
  await page.screenshot({ path: path.join(PROMO, file), type: 'png' });
  await page.close();
  console.log('wrote', path.relative(ROOT, path.join(PROMO, file)));
}
await tile('small-promo-440x280.png', 440, 280, false);
await tile('marquee-1400x560.png', 1400, 560, true);

await context.close();
await rm(userDataDir, { recursive: true, force: true });
