// Browser tests for the audit rules: the real src/audit.js runs inside fixture pages in Chromium.
// Run: npm run extension:test   (needs Playwright: npm install --no-save playwright)
import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { serveFixtures, auditFixture } from "./helpers.mjs";
import { scoreReport } from "../src/lib/score.js";

let browser, context;
test.before(async () => {
  browser = await chromium.launch();
  context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await serveFixtures(context);
});
test.after(async () => { await browser?.close(); });

const fails = (byId) => Object.values(byId).filter((c) => c.status === "fail").map((c) => c.id).sort();

test("healthy page: every check passes or is not applicable, score 100", async () => {
  const { result, errors, byId } = await auditFixture(context, "healthy.html");
  assert.deepEqual(errors, []);
  assert.deepEqual(fails(byId), []);
  assert.equal(scoreReport(result.checks).overall, 100);
  assert.equal(result.url, "https://fixtures.test/healthy.html");
  assert.equal(byId["tech-broken-anchors"].status, "pass", "same-page anchors were verified");
});

test("bad SEO page", async () => {
  const { result, byId } = await auditFixture(context, "bad-seo.html");
  for (const id of ["seo-title-quality", "seo-description-missing", "seo-canonical", "seo-viewport", "seo-og-title", "seo-og-description", "seo-og-image", "seo-noindex", "seo-h1-missing", "a11y-html-lang", "cro-placeholder", "tech-doctype"]) {
    assert.equal(byId[id].status, "fail", id);
  }
  assert.match(byId["seo-title-quality"].detail, /generic/);
  assert.ok(scoreReport(result.checks).overall < 60);
});

test("accessibility issues are found without flagging decorative or labelled elements", async () => {
  const { byId } = await auditFixture(context, "accessibility.html");
  assert.equal(byId["a11y-img-alt"].count, 1, "tracking pixel and role=presentation images are ignored");
  assert.equal(byId["a11y-img-empty-alt"].count, 1);
  assert.equal(byId["a11y-link-name"].count, 1, "aria-label link counts as named");
  assert.equal(byId["a11y-link-vague"].count, 1);
  assert.equal(byId["a11y-button-name"].count, 1);
  assert.equal(byId["a11y-zoom-disabled"].status, "fail");
  assert.equal(byId["a11y-aria"].count, 3, "invalid role, missing labelledby id, focusable in aria-hidden");
  assert.equal(byId["a11y-contrast"].count, 1, "only the #bbb text; #767676 passes; text over images is skipped");
  assert.match(byId["a11y-contrast"].samples[0], /1\.\d\d:1/);
  assert.equal(byId["a11y-empty-heading"].count, 1);
  assert.equal(byId["a11y-heading-order"].count, 1);
});

test("heading structure", async () => {
  const { byId } = await auditFixture(context, "headings.html");
  assert.equal(byId["seo-h1-missing"].status, "fail", "a display:none H1 does not count");
  assert.equal(byId["a11y-heading-order"].count, 2, "H2→H4 and H2→H6");
  assert.equal(byId["a11y-empty-heading"].count, 1);
  const multi = await auditFixture(context, "multi-h1.html");
  assert.equal(multi.byId["seo-h1-multiple"].status, "fail");
  assert.equal(multi.byId["seo-h1-multiple"].count, 3);
  assert.equal(multi.byId["seo-h1-missing"].status, "pass");
});

test("forms: labels, autocomplete, input types, submit buttons, length — never field values", async () => {
  const { result, byId } = await auditFixture(context, "forms.html");
  assert.equal(byId["a11y-form-labels"].count, 4, "placeholder-only name/email, phone, unlabelled select");
  assert.ok(byId["a11y-form-labels"].samples.some((s) => /placeholder only/.test(s)));
  assert.equal(byId["ux-form-submit"].count, 1, "type=button form flagged; role=search form exempt");
  assert.equal(byId["ux-input-types"].count, 2);
  assert.equal(byId["ux-autocomplete"].status, "fail");
  assert.equal(byId["cro-cta-vague"].count, 1);
  assert.equal(byId["cro-form-length"].count, 1);
  const json = JSON.stringify(result);
  assert.doesNotMatch(json, /hunter2|secret-value-must-not-leak/, "form values must never appear in results");
});

test("insecure and invalid links: only verified problems are reported", async () => {
  const { byId } = await auditFixture(context, "insecure.html");
  assert.equal(byId["tech-https"].status, "pass");
  assert.equal(byId["tech-mixed-content"].count, 2, "http stylesheet + image");
  assert.equal(byId["tech-insecure-links"].count, 1);
  assert.equal(byId["tech-target-blank"].count, 1, "rel=noopener link is fine");
  assert.equal(byId["tech-dead-links"].count, 3, "javascript:, # and empty href");
  assert.equal(byId["tech-malformed-links"].count, 4, "htp://, www. without scheme, mailto without @, tel too short");
  assert.equal(byId["tech-broken-anchors"].count, 1, "#missing-section only; #present, #top and #/route are fine");
  assert.equal(byId["tech-form-http"].count, 1);
  assert.equal(byId["tech-duplicate-ids"].count, 1);
});

test("password field on a plain-HTTP page", async () => {
  const { byId } = await auditFixture(context, "http-login.html");
  assert.equal(byId["tech-https"].status, "fail");
  assert.equal(byId["tech-password-http"].status, "fail");
  assert.equal(byId["tech-form-http"].status, "na", "reported once via tech-https, not twice");
  assert.equal(byId["tech-mixed-content"].status, "na");
});

test("conversion heuristics: competing CTAs, crowded nav, missing CTA/contact", async () => {
  const { byId } = await auditFixture(context, "ctas.html");
  assert.equal(byId["cro-cta-competing"].status, "fail");
  assert.equal(byId["cro-cta-competing"].count, 7);
  assert.equal(byId["cro-nav"].status, "fail");
  assert.equal(byId["cro-trust"].status, "pass");
  const none = await auditFixture(context, "no-cta.html");
  assert.equal(none.byId["cro-cta-present"].status, "fail");
  assert.equal(none.byId["cro-contact"].status, "fail");
  const healthy = await auditFixture(context, "healthy.html");
  assert.equal(healthy.byId["cro-cta-competing"].status, "pass");
});

test("horizontal overflow is measured at the current width and ignores scroll containers", async () => {
  const { byId } = await auditFixture(context, "overflow.html");
  assert.equal(byId["ux-horizontal-overflow"].status, "fail");
  assert.equal(byId["ux-horizontal-overflow"].samples.length, 1);
  assert.match(byId["ux-horizontal-overflow"].samples[0], /div\.wide/);
  const mobile = await auditFixture(context, "healthy.html", { viewport: { width: 375, height: 740 } });
  assert.equal(mobile.byId["ux-horizontal-overflow"].status, "pass");
});

test("DOM size indicator", async () => {
  const { byId } = await auditFixture(context, "big-dom.html");
  assert.equal(byId["tech-dom-size"].status, "fail");
  assert.match(byId["tech-dom-size"].detail, /1,7\d\d elements/);
});

test("the audit leaves no trace on the page and returns plain JSON", async () => {
  const page = await context.newPage();
  await page.goto("https://fixtures.test/healthy.html");
  const before = await page.evaluate(() => Object.keys(window).length);
  const { AUDIT_JS } = await import("./helpers.mjs");
  const result = await page.evaluate(AUDIT_JS);
  const after = await page.evaluate(() => Object.keys(window).length);
  assert.equal(after, before, "no globals added");
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  assert.ok(result.durationMs < 1000);
  await page.close();
});
