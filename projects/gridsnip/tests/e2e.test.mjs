// End-to-end test of the packaged GridSnip build in real Chromium with a mocked Gemini API:
// install → welcome page → save key → screenshot of a page → snip tab → drag a box → Gemini
// request (only the crop, key in a header) → preview, clipboard and TSV → errors and recovery.
// Automation cannot press the real shortcut, so this copies the build to a temp dir with a
// TEST-ONLY <all_urls> host permission (standing in for the activeTab grant) and calls the
// service worker's startSnip directly. The shipped manifest is checked in unit.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { build } from "../scripts/build.mjs";

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const KEY = "AIzaSyTESTKEY000000000000000";
let context, sw, extId;
const gemini = { requests: [], respond: null, models: ["gemini-2.5-flash"] };
const pageErrors = [];

test.before(async () => {
  const { dir } = build({ log: () => {} });
  const extDir = fs.mkdtempSync(path.join(os.tmpdir(), "gridsnip-e2e-"));
  fs.cpSync(dir, extDir, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(extDir, "manifest.json"), "utf8"));
  manifest.host_permissions = [...manifest.host_permissions, "<all_urls>"]; // TEST ONLY — stands in for activeTab
  fs.writeFileSync(path.join(extDir, "manifest.json"), JSON.stringify(manifest));
  context = await chromium.launchPersistentContext("", {
    channel: "chromium", headless: true, viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`],
  });
  await context.route("https://fixtures.test/**", (route) => {
    const file = path.join(FIXTURES, new URL(route.request().url()).pathname.slice(1));
    if (!file.startsWith(FIXTURES) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ status: 200, contentType: "text/html", body: fs.readFileSync(file) });
  });
  await context.route("https://generativelanguage.googleapis.com/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const entry = { url: url.toString(), key: req.headers()["x-goog-api-key"], body: req.postData() ? JSON.parse(req.postData()) : null };
    gemini.requests.push(entry);
    if (url.pathname === "/v1beta/models") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ models: gemini.models.map((m) => ({ name: "models/" + m, supportedGenerationMethods: ["generateContent"] })) }) });
    }
    const [status, body] = gemini.respond ? gemini.respond(entry) : [200, { candidates: [{ content: { parts: [{ text: "Quarter\tRevenue\tOrders\nQ1\t12.40\t1,180\nQ2\t13.95\t1,302" }] }, finishReason: "STOP" }] }];
    return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  sw = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker");
  extId = new URL(sw.url()).host;
  context.on("page", (p) => p.on("pageerror", (e) => pageErrors.push(p.url() + ": " + e.message)));
});
test.after(async () => { await context?.close(); });

async function snipFrom(target) {
  await target.bringToFront();
  const opened = context.waitForEvent("page", (p) => p.url().includes("/snip.html"));
  // The shortcut always fires on the active tab; make the fixture the active tab first.
  const result = await sw.evaluate(async (url) => { const [t] = await chrome.tabs.query({ url }); await chrome.tabs.update(t.id, { active: true }); await new Promise((r) => setTimeout(r, 250)); return self.gridsnipStartSnip(t); }, target.url());
  const snip = await opened;
  await snip.waitForLoadState();
  return { snip, result };
}

/** Drags across the screenshot over the fixture table (plus a small margin). */
async function dragOverTable(snip, target) {
  await snip.waitForSelector("#stage:not([hidden])");
  const table = await target.locator("#results").boundingBox();
  const img = await snip.locator("#shot").boundingBox();
  const natural = await snip.locator("#shot").evaluate((i) => i.naturalWidth);
  const s = img.width / natural; // screenshot pixels == CSS px of the page at DPR 1
  await snip.mouse.move(img.x + (table.x - 6) * s, img.y + (table.y - 6) * s);
  await snip.mouse.down();
  await snip.mouse.move(img.x + (table.x + table.width + 6) * s, img.y + (table.y + table.height + 6) * s, { steps: 6 });
  await snip.mouse.up();
  return table;
}

const pngSize = (b64) => { const b = Buffer.from(b64, "base64"); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

test("first run: the welcome page opens and saves the user's own key after checking it with Google", async () => {
  let welcome = context.pages().find((p) => p.url().endsWith("/welcome.html"));
  if (!welcome) welcome = await context.waitForEvent("page", (p) => p.url().endsWith("/welcome.html"));
  await welcome.waitForSelector("#gsKeyInput");
  await welcome.fill("#gsKeyInput", KEY);
  await welcome.click("text=Save key");
  await welcome.waitForSelector("#keyDone:not([hidden])");
  const check = gemini.requests.at(-1);
  assert.equal(check.url, "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200");
  assert.equal(check.key, KEY);
  const stored = await welcome.evaluate(() => chrome.storage.local.get(null));
  assert.deepEqual(stored, { gridsnipGeminiKey: KEY, gridsnipGeminiModel: "gemini-2.5-flash" }, "only the key and model are stored");
  await welcome.close();
});

test("snip a table: only the crop goes to Gemini, the table is previewed and copied as TSV", async () => {
  const target = await context.newPage();
  await target.goto("https://fixtures.test/table.html");
  const { snip, result } = await snipFrom(target);
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(await snip.evaluate(() => chrome.storage.session.get(null)), {}, "screenshot removed from session storage once loaded");
  gemini.requests.length = 0;
  const table = await dragOverTable(snip, target);
  await snip.waitForSelector("#result:not([hidden])");
  const status = await snip.textContent("#resultStatus");
  assert.match(status, /Copied 3 rows × 3 columns\. Paste into Excel or Google Sheets/);
  assert.equal(await snip.inputValue("#tsvOutput"), "Quarter\tRevenue\tOrders\nQ1\t12.40\t1,180\nQ2\t13.95\t1,302");
  assert.deepEqual(await snip.locator("#preview tr").evaluateAll((trs) => trs.map((tr) => [...tr.cells].map((c) => c.textContent))), [["Quarter", "Revenue", "Orders"], ["Q1", "12.40", "1,180"], ["Q2", "13.95", "1,302"]]);
  const sent = gemini.requests.filter((r) => r.url.endsWith(":generateContent"));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent");
  assert.equal(sent[0].key, KEY);
  assert.equal(sent[0].url.includes(KEY), false, "key never in the URL");
  const img = sent[0].body.contents[0].parts[1].inline_data;
  assert.equal(img.mime_type, "image/png");
  const size = pngSize(img.data);
  assert.ok(Math.abs(size.w - (table.width + 12)) <= 6 && Math.abs(size.h - (table.height + 12)) <= 6, `crop is the selection, not the screen: ${size.w}x${size.h} vs table ${table.width}x${table.height}`);
  assert.ok(size.w < 1280 / 2, "far smaller than the full screenshot");
  await snip.close(); await target.close();
});

test("recovery: retired model is replaced automatically; quota and empty answers explain themselves", async () => {
  const target = await context.newPage();
  await target.goto("https://fixtures.test/table.html");
  // Google retires the saved model: generateContent 404 → models.list → new model → retry.
  gemini.models = ["gemini-3.1-flash-lite"];
  gemini.respond = (r) => r.url.includes("gemini-2.5-flash:") ? [404, { error: { code: 404, status: "NOT_FOUND" } }] : [200, { candidates: [{ content: { parts: [{ text: "A\tB\n1\t2" }] }, finishReason: "STOP" }] }];
  let { snip } = await snipFrom(target);
  await dragOverTable(snip, target);
  await snip.waitForSelector("#result:not([hidden])");
  assert.match(await snip.textContent("#resultStatus"), /2 rows × 2 columns/);
  assert.equal((await snip.evaluate(() => chrome.storage.local.get("gridsnipGeminiModel"))).gridsnipGeminiModel, "gemini-3.1-flash-lite");
  await snip.close();
  // Quota used up.
  gemini.respond = () => [429, { error: { code: 429, status: "RESOURCE_EXHAUSTED" } }];
  ({ snip } = await snipFrom(target));
  await dragOverTable(snip, target);
  await snip.waitForSelector("#message:not([hidden])");
  assert.match(await snip.textContent("#message"), /quota is used up/);
  assert.equal(await snip.isVisible("#result"), false);
  // Model sees no table.
  gemini.respond = () => [200, { candidates: [{ content: { parts: [{ text: "NO_TABLE" }] }, finishReason: "STOP" }] }];
  await dragOverTable(snip, target);
  await snip.waitForFunction(() => /No table found/.test(document.querySelector("#message").textContent));
  await snip.close();
  // A rejected key brings the key form back.
  gemini.respond = () => [400, { error: { code: 400, message: "API key not valid.", details: [{ reason: "API_KEY_INVALID" }] } }];
  ({ snip } = await snipFrom(target));
  await dragOverTable(snip, target);
  await snip.waitForSelector("#keySetup:not([hidden]) #gsKeyInput");
  assert.match(await snip.textContent("#message"), /rejected this API key/);
  gemini.respond = null;
  await snip.close(); await target.close();
});

test("an old or reloaded snip tab explains it has expired instead of failing", async () => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extId}/snip.html?id=not-a-real-snip`);
  await page.waitForSelector("#message:not([hidden])");
  assert.match(await page.textContent("#message"), /expired/);
  assert.equal(await page.isVisible("#stage"), false);
  await page.goto(`chrome-extension://${extId}/snip.html?id=x&error=capture-blocked`);
  await page.waitForFunction(() => /doesn't allow screenshots of this page/.test(document.querySelector("#message").textContent));
  await page.close();
});

test("popup shows the saved key masked and can remove it", async () => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  await popup.waitForSelector("#keySaved:not([hidden])");
  assert.equal(await popup.textContent("#keyMask"), "AIza…0000");
  assert.match(await popup.textContent("#modelLine"), /gemini-3\.1-flash-lite/);
  assert.equal(await popup.textContent("#shortcut"), "Alt+S");
  await popup.click("#removeKey");
  await popup.waitForSelector("#keySetup:not([hidden]) #gsKeyInput");
  assert.deepEqual(await popup.evaluate(() => chrome.storage.local.get(null)), {}, "nothing left behind");
  await popup.close();
});

test("no page errors anywhere in the extension", () => {
  assert.deepEqual(pageErrors, []);
});
