// Loads the real unpacked extension (test build) in Chromium and drives the
// popup UI against fixture pages. The test build only differs from the release
// build by an <all_urls> host permission, which stands in for the activeTab
// grant that a real toolbar click would give (automation cannot click the
// browser toolbar).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ROOT, ORIGIN, routeFixtures } from './helpers.mjs';

const EXT = path.join(ROOT, 'dist/test-chromium');
// Chromium derives an unpacked extension's ID from its absolute path.
const extId = [...createHash('sha256').update(EXT).digest('hex').slice(0, 32)]
  .map((c) => String.fromCharCode(97 + parseInt(c, 16))).join('');

let context;
let userDataDir;

before(async () => {
  userDataDir = await mkdtemp(path.join(os.tmpdir(), 'sitecheck-'));
  context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`]
  });
  await routeFixtures(context);
});

after(async () => {
  await context?.close();
  if (userDataDir) await rm(userDataDir, { recursive: true, force: true });
});

async function openPopupFor(url) {
  // Find the new tab's ID by diffing tab IDs (chrome:// URLs are not visible
  // to extensions, so we cannot look the tab up by URL).
  const helper = await context.newPage();
  await helper.goto(`chrome-extension://${extId}/popup/popup.html?tabId=-1`);
  const tabIds = () => helper.evaluate(async () => (await chrome.tabs.query({})).map((t) => t.id));
  const beforeIds = await tabIds();
  const target = await context.newPage();
  await target.goto(url).catch(() => {});
  const added = (await tabIds()).filter((id) => !beforeIds.includes(id));
  await helper.close();
  assert.equal(added.length, 1, 'expected exactly one new tab');
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 400, height: 600 });
  // Capture clipboard writes (the OS clipboard is not available headless).
  await popup.addInitScript(() => {
    navigator.clipboard.writeText = async (t) => { globalThis.__copied = t; };
  });
  await popup.goto(`chrome-extension://${extId}/popup/popup.html?tabId=${added[0]}`);
  return { popup, target };
}

test('popup scans a page and renders score, categories and issues', async () => {
  const { popup, target } = await openPopupFor(`${ORIGIN}/a11y-issues.html`);
  await popup.waitForSelector('#results:not([hidden])', { timeout: 15000 });
  const score = Number(await popup.textContent('#score'));
  assert.ok(score >= 0 && score < 100, `score ${score}`);
  assert.equal(await popup.textContent('#host'), 'fixtures.sitecheck.test');
  assert.equal(await popup.locator('.cat').count(), 5);
  assert.match(await popup.textContent('.disclaimer'), /not a Lighthouse score/);
  assert.ok((await popup.locator('details.issue').count()) >= 8);
  // Expand an issue → why + fix visible
  await popup.locator('details.issue summary').first().click();
  assert.match(await popup.locator('details.issue[open]').first().textContent(), /Why it matters[\s\S]*Recommended fix/);
  // Filter by category
  await popup.locator('.cat', { hasText: 'Accessibility' }).click();
  const cats = await popup.locator('details.issue .issue-meta').allTextContents();
  assert.ok(cats.length > 0 && cats.every((c) => c.startsWith('Accessibility')), cats.join('|'));
  // Clear the filter, then open the Passed tab
  await popup.locator('.cat', { hasText: 'Accessibility' }).click();
  await popup.click('#tab-passed');
  assert.ok(await popup.locator('#panel-passed:not([hidden]) .passed-item').count());
  // CTA
  assert.equal(await popup.getAttribute('#cta-link', 'href'), 'https://www.xendersecrets.com/sitecheck.html#free-audit');
  await popup.close();
  await target.close();
});

test('popup link check finds the verified broken link', async () => {
  const { popup, target } = await openPopupFor(`${ORIGIN}/insecure-links.html`);
  await popup.waitForSelector('#results:not([hidden])', { timeout: 15000 });
  await popup.click('#check-links');
  await popup.waitForSelector('#links-result:not([hidden])', { timeout: 20000 });
  const text = await popup.textContent('#links-result');
  // missing.html is a real 404; "www.example.com" without https:// resolves to a
  // relative path on this site, which is genuinely broken too.
  assert.match(text, /2 broken · 3 checked/);
  assert.match(text, /404 — https:\/\/fixtures\.sitecheck\.test\/missing\.html/);
  assert.match(text, /404 — https:\/\/fixtures\.sitecheck\.test\/www\.example\.com/);
  assert.doesNotMatch(text, /ok\.html/);
  await popup.close();
  await target.close();
});

test('copy report writes a plain-text report to the clipboard', async () => {
  const { popup, target } = await openPopupFor(`${ORIGIN}/healthy.html`);
  await popup.waitForSelector('#results:not([hidden])', { timeout: 15000 });
  await popup.click('#copy');
  await popup.waitForFunction(() => document.getElementById('copy').textContent.includes('Copied'));
  const clip = await popup.evaluate(() => globalThis.__copied);
  assert.match(clip, /Xender SiteCheck report — https:\/\/fixtures\.sitecheck\.test\/healthy\.html/);
  assert.match(clip, /not a Lighthouse score/);
  await popup.close();
  await target.close();
});

test('browser-protected pages show the friendly message, no crash', async () => {
  const errors = [];
  const { popup, target } = await openPopupFor('chrome://version/');
  popup.on('pageerror', (e) => errors.push(e.message));
  await popup.waitForSelector('#state-message:not([hidden])', { timeout: 10000 });
  assert.equal(
    await popup.textContent('#message-text'),
    'SiteCheck cannot analyze this browser-protected page. Open a normal website and try again.'
  );
  assert.deepEqual(errors, []);
  await popup.close();
  await target.close();
});
