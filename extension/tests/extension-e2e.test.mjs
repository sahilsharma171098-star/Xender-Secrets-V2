// End-to-end test of the packaged Chromium build: loads extension/dist/chrome as a real unpacked
// extension in Chromium and drives the real popup against fixture pages.
// The popup normally audits the active tab via the activeTab grant from a toolbar click, which
// automation can't perform; this test copies the build to a temp dir, adds a TEST-ONLY host
// permission, and opens popup.html?tab=<id>. The shipped manifest is not changed (see unit tests).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";
import { build } from "../../scripts/extension/build.mjs";
import { serveFixtures } from "./helpers.mjs";

let context, extId, extDir;
const consoleErrors = [];

/** Chromium derives an unpacked extension's id from its absolute path (UTF-16 bytes on Windows). */
function unpackedId(dir) {
  const hex = crypto.createHash("sha256").update(process.platform === "win32" ? Buffer.from(path.resolve(dir), "utf16le") : path.resolve(dir)).digest("hex").slice(0, 32);
  return [...hex].map((ch) => String.fromCharCode(97 + parseInt(ch, 16))).join("");
}

test.before(async () => {
  const { chrome } = build({ targets: ["chrome"], log: () => {} });
  extDir = fs.mkdtempSync(path.join(os.tmpdir(), "sitecheck-e2e-"));
  fs.cpSync(chrome.dir, extDir, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(extDir, "manifest.json"), "utf8"));
  manifest.host_permissions = ["<all_urls>"]; // TEST ONLY — stands in for the activeTab click grant
  fs.writeFileSync(path.join(extDir, "manifest.json"), JSON.stringify(manifest));
  extId = unpackedId(extDir);
  context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`],
    viewport: { width: 1280, height: 800 },
  });
  await serveFixtures(context);
});
test.after(async () => {
  await context?.close();
  if (extDir) fs.rmSync(extDir, { recursive: true, force: true });
});

async function openPopupFor(fixtureUrl) {
  const target = await context.newPage();
  await target.goto(fixtureUrl);
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 400, height: 600 });
  popup.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  popup.on("pageerror", (e) => consoleErrors.push(e.message));
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  const tabId = await popup.evaluate(async (url) => (await chrome.tabs.query({ url })).map((t) => t.id)[0], fixtureUrl);
  assert.ok(tabId, "fixture tab found");
  await popup.goto(`chrome-extension://${extId}/popup.html?tab=${tabId}`);
  return { popup, target };
}

test("the packaged extension loads and audits a healthy page", async () => {
  const { popup, target } = await openPopupFor("https://fixtures.test/healthy.html");
  await popup.waitForSelector("#report:not([hidden])");
  assert.equal(await popup.textContent("#scoreNum"), "100");
  assert.equal(await popup.textContent("#domain"), "fixtures.test");
  assert.match(await popup.textContent(".disclaimer"), /not a Lighthouse score/);
  assert.match(await popup.textContent("#groups"), /No issues found/);
  assert.equal(await popup.isVisible("#cta"), true);
  const href = await popup.getAttribute("#ctaLink", "href");
  assert.equal(new URL(href).origin + new URL(href).pathname, "https://www.xendersecrets.com/sitecheck");
  assert.equal(new URL(href).search.includes("fixtures"), false, "the audited site is never sent in the CTA link");
  await popup.close(); await target.close();
});

test("issues render grouped by severity with why/fix, and filters work", async () => {
  const { popup, target } = await openPopupFor("https://fixtures.test/insecure.html");
  await popup.waitForSelector("#report:not([hidden])");
  const score = Number(await popup.textContent("#scoreNum"));
  assert.ok(score > 0 && score < 100);
  assert.ok(await popup.isVisible(".g-critical"));
  const card = popup.locator('[data-check="tech-broken-anchors"]');
  await card.locator("summary").click();
  const body = await card.textContent();
  assert.match(body, /Why it matters/);
  assert.match(body, /Recommended fix/);
  assert.match(body, /#missing-section/);
  await popup.getByRole("button", { name: /^Technical/ }).click();
  assert.equal(await popup.locator('[data-check^="seo-"]').count(), 0, "filter hides other categories");
  await popup.getByRole("button", { name: /^All issues/ }).click();
  assert.ok(await popup.locator('[data-check^="seo-"]').count() > 0);
  await popup.close(); await target.close();
});

test("browser-protected pages get the friendly message, not an error", async () => {
  const popup = await context.newPage();
  popup.on("pageerror", (e) => consoleErrors.push(e.message));
  await popup.goto(`chrome-extension://${extId}/popup.html`); // active tab = the extension page itself
  await popup.waitForSelector("#blocked:not([hidden])");
  assert.match(await popup.textContent("#blockedMsg"), /cannot analyze this browser-protected page/);
  assert.equal(await popup.isVisible("#report"), false);
  await popup.close();
});

test("no console errors in the popup", () => {
  assert.deepEqual(consoleErrors, []);
});


test("Pro CSV export unlocks only while a valid server-verified key is active",async()=>{
 const key="sc1_"+"a".repeat(64);
 const {popup,target}=await openPopupFor("https://fixtures.test/healthy.html");
 await popup.waitForSelector("#report:not([hidden])");
 assert.equal(await popup.isVisible("#exportCsv"),false,"free report remains usable");
 await context.route("https://www.xendersecrets.com/api/sitecheck/license/verify",async route=>{
   const body=route.request().postDataJSON();
   assert.equal(body.licenseKey,key);
   await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify({ok:true,product:"sitecheck",pro:true})});
 });
 await popup.evaluate(async token=>chrome.storage.local.set({sitecheckLicenseKey:token}),key);
 await popup.reload();
 await popup.waitForSelector("#report:not([hidden])");
 await popup.waitForSelector("#exportCsv:not([hidden])");
 assert.match(await popup.textContent("#proStatus"),/Pro active/);
 await popup.click("#deactivatePro");
 await popup.locator("#exportCsv").waitFor({state:"hidden"});
 assert.equal((await popup.evaluate(async()=>chrome.storage.local.get("sitecheckLicenseKey"))).sitecheckLicenseKey,undefined);
 await context.unroute("https://www.xendersecrets.com/api/sitecheck/license/verify");
 await popup.close();await target.close();
});


test("Pro can explicitly save local before/after snapshots and delete them even after deactivation", async () => {
  const key = "sc1_" + "b".repeat(64);
  const {popup, target} = await openPopupFor("https://fixtures.test/insecure.html");
  await context.route("https://www.xendersecrets.com/api/sitecheck/license/verify", async route => {
    await route.fulfill({status:200,contentType:"application/json",
      headers:{"access-control-allow-origin":"*"},
      body:JSON.stringify({ok:true,product:"sitecheck",pro:true})});
  });
  await popup.evaluate(async token => chrome.storage.local.set({sitecheckLicenseKey:token}),key);
  await popup.reload();
  await popup.waitForSelector("#baselinePanel:not([hidden])");
  await popup.waitForSelector("#report:not([hidden])");
  assert.equal(await popup.isEnabled("#compareBaseline"),false);
  await popup.click("#saveBaseline");
  await popup.waitForFunction(() => !document.getElementById("compareBaseline").disabled);
  const stored=await popup.evaluate(async()=>chrome.storage.local.get("sitecheckProBaselines"));
  assert.equal(stored.sitecheckProBaselines.length,1);
  const baseline=stored.sitecheckProBaselines[0];
  assert.equal(baseline.url,"https://fixtures.test/insecure.html");
  assert.ok(baseline.issues.every(x=>Object.keys(x).sort().join(",")==="count,id"));
  assert.ok(!JSON.stringify(baseline).includes("Recommended fix"));

  await popup.click("#compareBaseline");
  assert.match(await popup.textContent("#baselineStatus"),/Score .* issue types resolved/);

  await popup.click("#deactivatePro");
  await popup.locator("#baselinePanel").waitFor({state:"hidden"});
  await popup.click("#clearBaselines");
  const cleared=await popup.evaluate(async()=>chrome.storage.local.get("sitecheckProBaselines"));
  assert.equal(cleared.sitecheckProBaselines,undefined);
  await context.unroute("https://www.xendersecrets.com/api/sitecheck/license/verify");
  await popup.close();await target.close();
});


test("human-review suggestion: Not now hides it for later popups; Pro never sees it", async () => {
  const { popup, target } = await openPopupFor("https://fixtures.test/healthy.html");
  await popup.evaluate(async () => chrome.storage.local.remove("sitecheckCtaDismissedAt"));
  await popup.reload();
  await popup.waitForSelector("#report:not([hidden])");
  await popup.waitForSelector("#cta:not([hidden])");
  await popup.click("#ctaDismiss");
  await popup.locator("#cta").waitFor({ state: "hidden" });
  const saved = (await popup.evaluate(async () => chrome.storage.local.get("sitecheckCtaDismissedAt"))).sitecheckCtaDismissedAt;
  assert.ok(Number.isFinite(saved) && Math.abs(Date.now() - saved) < 60_000, "only a timestamp is stored");
  await popup.reload();
  await popup.waitForSelector("#report:not([hidden])");
  assert.equal(await popup.isVisible("#cta"), false, "stays hidden on the next popup");
  await popup.evaluate(async () => chrome.storage.local.remove("sitecheckCtaDismissedAt"));
  const key = "sc1_" + "c".repeat(64);
  await context.route("https://www.xendersecrets.com/api/sitecheck/license/verify", (route) => route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ ok: true, product: "sitecheck", pro: true }) }));
  await popup.evaluate(async (token) => chrome.storage.local.set({ sitecheckLicenseKey: token }), key);
  await popup.reload();
  await popup.waitForSelector("#exportCsv:not([hidden])");
  assert.equal(await popup.isVisible("#cta"), false, "Pro users never see the suggestion");
  await popup.evaluate(async () => chrome.storage.local.remove(["sitecheckLicenseKey", "sitecheckCtaDismissedAt"]));
  await context.unroute("https://www.xendersecrets.com/api/sitecheck/license/verify");
  await popup.close(); await target.close();
});


test("v2.1: page-load metrics panel and Show on page work in the packaged extension", async () => {
  const { popup, target } = await openPopupFor("https://fixtures.test/insecure.html");
  await popup.waitForSelector("#report:not([hidden])");
  await popup.waitForSelector("#vitals:not([hidden])");
  assert.deepEqual(await popup.locator("#vitalsList li").evaluateAll((els) => els.map((e) => e.dataset.metric)), ["lcp", "inp", "cls", "fcp", "ttfb"]);
  assert.match(await popup.textContent('#vitalsList [data-metric="lcp"] b'), /^\d+ ms$|^\d+\.\d s$/);
  assert.match(await popup.textContent("#vitals"), /not Google field data or a Lighthouse test/);
  const card = popup.locator('[data-check="tech-broken-anchors"]');
  await card.locator("summary").click();
  await card.getByRole("button", { name: "Show on page" }).click();
  await popup.waitForFunction(() => /Outlined \d/.test(document.querySelector('[data-check="tech-broken-anchors"] .show-status').textContent));
  assert.equal(await target.evaluate(() => document.querySelectorAll("xender-sitecheck-outline").length), 1, "outline drawn in the audited tab");
  await popup.click("#clearOutlines");
  await target.waitForFunction(() => document.querySelectorAll("xender-sitecheck-outline").length === 0);
  await card.getByRole("button", { name: "Show on page" }).click();
  await target.waitForFunction(() => document.querySelectorAll("xender-sitecheck-outline").length === 1);
  await popup.click("#rerun");
  await popup.waitForSelector("#report:not([hidden])");
  await target.waitForFunction(() => document.querySelectorAll("xender-sitecheck-outline").length === 0);
  await popup.close(); await target.close();
});


test("Pro: white-label PDF and CSV download from the popup; free users never see them", async () => {
  const { popup, target } = await openPopupFor("https://fixtures.test/insecure.html");
  await popup.waitForSelector("#report:not([hidden])");
  assert.equal(await popup.isVisible("#exportPdf"), false, "PDF is Pro-only");
  await context.route("https://www.xendersecrets.com/api/sitecheck/license/verify", (route) => route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ ok: true, product: "sitecheck", pro: true }) }));
  await popup.evaluate(async (token) => chrome.storage.local.set({ sitecheckLicenseKey: token }), "sc1_" + "d".repeat(64));
  await popup.reload();
  await popup.waitForSelector("#exportPdf:not([hidden])");
  const [pdf] = await Promise.all([popup.waitForEvent("download"), popup.click("#exportPdf")]);
  assert.equal(pdf.suggestedFilename(), "website-qa-fixtures.test.pdf");
  const bytes = fs.readFileSync(await pdf.path());
  assert.equal(bytes.subarray(0, 8).toString("latin1"), "%PDF-1.4");
  assert.doesNotMatch(bytes.toString("latin1"), /xender/i);
  const [csv] = await Promise.all([popup.waitForEvent("download"), popup.click("#exportCsv")]);
  assert.equal(csv.suggestedFilename(), "website-qa-fixtures.test.csv");
  assert.doesNotMatch(fs.readFileSync(await csv.path(), "utf8"), /xender/i);
  await popup.evaluate(async () => chrome.storage.local.remove("sitecheckLicenseKey"));
  await context.unroute("https://www.xendersecrets.com/api/sitecheck/license/verify");
  await popup.close(); await target.close();
});
