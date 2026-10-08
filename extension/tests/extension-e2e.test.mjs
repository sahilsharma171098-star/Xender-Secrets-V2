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

/**
 * Chromium derives an unpacked extension's id from its absolute path. On Windows it hashes the
 * UTF-16LE path with an upper-cased drive letter (extensions/common/id_util.cc); elsewhere UTF-8.
 */
function unpackedId(dir) {
  let abs = path.resolve(dir);
  if (process.platform === "win32" && /^[a-z]:/.test(abs)) abs = abs[0].toUpperCase() + abs.slice(1);
  const bytes = Buffer.from(abs, process.platform === "win32" ? "utf16le" : "utf8");
  const hex = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 32);
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
