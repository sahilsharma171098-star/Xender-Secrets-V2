// Page-load metrics (src/vitals.js) measured in real Chromium on fixture pages, plus the
// pure rating/formatting rules in src/lib/vitals-rate.js. Run: npm run extension:test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { serveFixtures, SRC } from "./helpers.mjs";
import { rate, formatValue, vitalsRows, vitalsNotes, THRESHOLDS } from "../src/lib/vitals-rate.js";

const VITALS_JS = fs.readFileSync(path.join(SRC, "vitals.js"), "utf8");
let browser, context;
test.before(async () => {
  browser = await chromium.launch();
  context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await serveFixtures(context);
});
test.after(async () => { await browser?.close(); });

async function open(hash = "") {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("https://fixtures.test/vitals.html" + hash, { waitUntil: "load" });
  return { page, errors };
}

test("measures paint and navigation timing locally, leaves nothing behind", async () => {
  const { page, errors } = await open();
  await page.waitForTimeout(150);
  const before = await page.evaluate(() => Object.keys(window).length);
  const v = await page.evaluate(VITALS_JS);
  assert.equal(v.engine, "xender-sitecheck-vitals");
  for (const k of ["lcp", "fcp", "ttfb"]) assert.ok(Number.isInteger(v.metrics[k]) && v.metrics[k] >= 0, k + " is a whole number of ms");
  assert.ok(v.metrics.lcp >= v.metrics.fcp, "LCP is never before FCP");
  assert.equal(v.metrics.cls, 0, "no shift on the plain page");
  assert.equal(v.metrics.inp, null);
  assert.equal(v.interacted, false);
  assert.equal(v.stillLoading, false);
  assert.equal(await page.evaluate(() => Object.keys(window).length), before, "no globals added");
  assert.deepEqual(errors, []);
  const rows = vitalsRows(v);
  assert.deepEqual(rows.map((r) => r.short), ["LCP", "INP", "CLS", "FCP", "TTFB"]);
  assert.equal(rows.find((r) => r.id === "inp").display, "Interact first");
  assert.equal(rows.find((r) => r.id === "cls").rating, "good");
  await page.close();
});

test("CLS counts a late banner that pushes content without user input", async () => {
  const { page } = await open("#shift");
  await page.waitForFunction(() => document.body.firstElementChild.textContent === "Late banner");
  await page.waitForTimeout(100);
  const v = await page.evaluate(VITALS_JS);
  assert.ok(v.metrics.cls > 0.05, "shift recorded: " + v.metrics.cls);
  await page.close();
});

test("INP: a slow click is measured; a fast click only proves it is under 104 ms", async () => {
  const slow = await open();
  await slow.page.click("#slow");
  await slow.page.waitForTimeout(100);
  const s = await slow.page.evaluate(VITALS_JS);
  assert.ok(s.metrics.inp >= 200, "blocked click is slow: " + s.metrics.inp);
  assert.equal(s.interacted, true);
  assert.notEqual(rate("inp", s.metrics.inp), "good");
  await slow.page.close();

  const fast = await open();
  await fast.page.click("#fast");
  await fast.page.waitForTimeout(100);
  const f = await fast.page.evaluate(VITALS_JS);
  assert.equal(f.interacted, true);
  if (f.metrics.inp === null) {
    assert.equal(f.inpBelowMs, 104);
    const row = vitalsRows(f).find((r) => r.id === "inp");
    assert.equal(row.display, "Under 104 ms");
    assert.equal(row.rating, "good");
  } else {
    assert.ok(f.metrics.inp < 200, "fast click stays good: " + f.metrics.inp);
  }
  await fast.page.close();
});

test("ratings use Google's published limits, inclusive at the good/poor edges", () => {
  assert.deepEqual(THRESHOLDS.lcp, [2500, 4000]);
  assert.equal(rate("lcp", 2500), "good");
  assert.equal(rate("lcp", 2501), "needs-improvement");
  assert.equal(rate("lcp", 4001), "poor");
  assert.equal(rate("inp", 200), "good");
  assert.equal(rate("inp", 501), "poor");
  assert.equal(rate("cls", 0.1), "good");
  assert.equal(rate("cls", 0.26), "poor");
  assert.equal(rate("ttfb", 1800), "needs-improvement");
  for (const bad of [null, undefined, NaN, -1, "12"]) assert.equal(rate("lcp", bad), null, String(bad));
  assert.equal(rate("unknown", 1), null);
  assert.equal(formatValue("lcp", 640), "640 ms");
  assert.equal(formatValue("lcp", 2430), "2.4 s");
  assert.equal(formatValue("cls", 0.137), "0.14");
  assert.equal(formatValue("inp", null), "–");
});

test("rows never invent numbers: unsupported, missing and background-tab cases", () => {
  assert.deepEqual(vitalsRows(null), []);
  assert.deepEqual(vitalsRows({ engine: "other" }), []);
  assert.deepEqual(vitalsRows({ engine: "xender-sitecheck-vitals", error: true }), []);
  const firefoxLike = { engine: "xender-sitecheck-vitals", metrics: { lcp: 900, inp: null, cls: null, fcp: 500, ttfb: 120 }, inpBelowMs: null, interacted: false,
    supported: { lcp: true, inp: true, cls: false, fcp: true, ttfb: true }, loadedInBackground: null, stillLoading: false };
  const rows = vitalsRows(firefoxLike);
  const cls = rows.find((r) => r.id === "cls");
  assert.equal(cls.display, "Not available");
  assert.equal(cls.rating, null);
  assert.equal(cls.raw, null);
  assert.deepEqual(vitalsNotes({ ...firefoxLike, loadedInBackground: true, stillLoading: true }).length, 2);
  const noLcp = vitalsRows({ ...firefoxLike, metrics: { ...firefoxLike.metrics, lcp: null } }).find((r) => r.id === "lcp");
  assert.equal(noLcp.display, "Not recorded");
  assert.equal(noLcp.rating, null);
});
