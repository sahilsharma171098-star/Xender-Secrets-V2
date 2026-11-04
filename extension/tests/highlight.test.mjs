// "Show on page": audit.js returns structural targets for sampled elements, and
// lib/highlight.js outlines them without changing the page. Runs the real code in Chromium.
// Run: npm run extension:test
import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { serveFixtures, AUDIT_JS } from "./helpers.mjs";
import { highlightOnPage, clearPageHighlights } from "../src/lib/highlight.js";

let browser, context;
test.before(async () => {
  browser = await chromium.launch();
  context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await serveFixtures(context);
});
test.after(async () => { await browser?.close(); });

// Mirrors scripting.executeScript({ func, args }): the function is serialised with
// toString() and called with the args spread, so a hidden outer-scope reference fails here too.
const call = (page, fn, ...args) => page.evaluate(`(${fn.toString()})(...${JSON.stringify(args)})`);

async function auditOn(fixture) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("https://fixtures.test/" + fixture, { waitUntil: "load" });
  const result = await page.evaluate(AUDIT_JS);
  return { page, errors, byId: Object.fromEntries(result.checks.map((c) => [c.id, c])) };
}

test("every failing check's targets line up with its samples and resolve to the same element", async () => {
  let resolvable = 0;
  for (const fixture of ["insecure.html", "accessibility.html", "bad-seo.html", "forms.html", "overflow.html", "ctas.html"]) {
    const { page, byId, errors } = await auditOn(fixture);
    for (const c of Object.values(byId)) {
      assert.ok(Array.isArray(c.targets), `${fixture} ${c.id} has targets`);
      assert.ok(c.targets.length <= 5, `${fixture} ${c.id} capped`);
      if (c.status !== "fail") { assert.equal(c.targets.length, 0, `${fixture} ${c.id} no targets when passing`); continue; }
      if (c.targets.length) assert.equal(c.targets.length, c.samples.length, `${fixture} ${c.id} one target per sample`);
      for (const sel of c.targets.filter(Boolean)) {
        assert.ok(sel.length <= 600);
        assert.doesNotMatch(sel, /["'=]/, "structure only, no attribute values");
        assert.equal(await page.evaluate((s) => document.querySelectorAll(s).length, sel), 1, `${fixture} ${c.id} ${sel} is unique`);
        resolvable++;
      }
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  assert.ok(resolvable >= 10, "fixtures produce outlinable elements: " + resolvable);
});

test("outlines draw over the right elements without moving the page, and Esc removes them", async () => {
  const { page, byId } = await auditOn("insecure.html");
  const targets = byId["tech-broken-anchors"].targets.filter(Boolean);
  assert.ok(targets.length > 0);
  const before = await page.evaluate(() => ({ body: document.body.getBoundingClientRect().toJSON(), kids: document.documentElement.children.length, html: document.body.outerHTML.length }));
  const out = await call(page, highlightOnPage, targets, "Same-page links that point nowhere");
  assert.deepEqual(out, { requested: targets.length, shown: targets.length });
  const after = await page.evaluate(() => ({ body: document.body.getBoundingClientRect().toJSON(), kids: document.documentElement.children.length, html: document.body.outerHTML.length, hosts: document.querySelectorAll("xender-sitecheck-outline").length }));
  assert.deepEqual(after.body, { ...before.body, y: after.body.y, top: after.body.top, bottom: after.body.bottom }, "layout unchanged (only scroll may move)");
  assert.equal(after.html, before.html, "page content untouched");
  assert.equal(after.kids, before.kids + 1, "one overlay host appended to <html>");
  assert.equal(after.hosts, 1);
  // A second highlight replaces the first instead of stacking.
  await call(page, highlightOnPage, targets.slice(0, 1), "again");
  assert.equal(await page.evaluate(() => document.querySelectorAll("xender-sitecheck-outline").length), 1);
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => document.querySelectorAll("xender-sitecheck-outline").length), 0, "Esc clears");
  assert.deepEqual(await call(page, clearPageHighlights), { cleared: false });
  await page.close();
});

test("bad or stale selectors never throw and draw nothing", async () => {
  const { page } = await auditOn("healthy.html");
  for (const args of [[[], "x"], [null, "x"], [["!!!", "#does-not-exist", "x".repeat(700), 42], "x"]]) {
    const out = await call(page, highlightOnPage, ...args);
    assert.equal(out.shown, 0, JSON.stringify(args).slice(0, 40));
  }
  assert.equal(await page.evaluate(() => document.querySelectorAll("xender-sitecheck-outline").length), 0);
  await call(page, highlightOnPage, ["h1"], "Heading");
  assert.deepEqual(await call(page, clearPageHighlights), { cleared: true });
  assert.equal(await page.evaluate(() => document.querySelectorAll("xender-sitecheck-outline").length), 0);
  await page.close();
});

test("after outlines are cleared, the next audit is identical to the first", async () => {
  const { page } = await auditOn("insecure.html");
  const first = await page.evaluate(AUDIT_JS);
  const t = first.checks.find((c) => c.id === "tech-broken-anchors").targets.filter(Boolean);
  await call(page, highlightOnPage, t, "x");
  await call(page, clearPageHighlights);
  const second = await page.evaluate(AUDIT_JS);
  assert.deepEqual(second.checks.map((c) => [c.id, c.status, c.count]), first.checks.map((c) => [c.id, c.status, c.count]));
  await page.close();
});
