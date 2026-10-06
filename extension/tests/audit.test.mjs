import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, audit, ids, issue, HTTP_ORIGIN, routeFixtures, ORIGIN, AUDIT_JS } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

test('healthy page: no critical issues or warnings, high score', async () => {
  const r = await audit(browser, 'healthy.html');
  const serious = r.issues.filter((i) => i.severity !== 'notice');
  assert.deepEqual(serious.map((i) => i.id), [], 'unexpected warnings/critical: ' + JSON.stringify(serious, null, 1));
  assert.ok(r.score.overall >= 95, `score ${r.score.overall}`);
  assert.equal(r.score.grade, 'Good');
  assert.ok(r.passed.length >= 25, `passed ${r.passed.length}`);
  assert.equal(r.host, 'fixtures.sitecheck.test');
});

test('bad SEO page: title, description, viewport, OG, canonical, noindex, multiple H1', async () => {
  const r = await audit(browser, 'bad-seo.html');
  const found = ids(r);
  for (const id of ['seo-title-missing', 'seo-meta-description-missing', 'seo-canonical-missing', 'seo-open-graph-missing',
    'seo-noindex', 'struct-h1-multiple', 'tech-viewport-missing', 'tech-doctype-missing']) {
    assert.ok(found.includes(id), `expected ${id} in ${found}`);
  }
  assert.equal(issue(r, 'seo-title-missing').severity, 'critical');
  assert.equal(issue(r, 'seo-open-graph-missing').count, 3);
  assert.equal(issue(r, 'struct-h1-multiple').count, 2);
  assert.ok(r.score.categories.seo.score <= 50, `seo ${r.score.categories.seo.score}`);
});

test('title length checks', async () => {
  const short = await audit(browser, 'short-title.html');
  assert.ok(ids(short).includes('seo-title-short'));
  assert.ok(ids(short).includes('seo-meta-description-length'));
  const long = await audit(browser, 'long-title.html');
  assert.ok(ids(long).includes('seo-title-long'));
  assert.ok(!ids(long).includes('seo-title-short'));
});

test('accessibility fixture: names, alt, ARIA, headings, contrast, lang', async () => {
  const r = await audit(browser, 'a11y-issues.html');
  const found = ids(r);
  for (const id of ['img-alt-missing', 'img-alt-empty-large', 'a11y-button-no-name', 'link-no-name', 'link-vague-text',
    'a11y-aria-invalid-role', 'a11y-aria-broken-reference', 'a11y-aria-hidden-focusable', 'struct-heading-skip',
    'struct-heading-empty', 'a11y-low-contrast', 'a11y-lang-missing']) {
    assert.ok(found.includes(id), `expected ${id} in ${found}`);
  }
  assert.equal(issue(r, 'img-alt-missing').count, 2);
  const contrast = issue(r, 'a11y-low-contrast');
  assert.equal(contrast.count, 1, 'only the faint paragraph should be flagged: ' + contrast.examples);
  assert.match(contrast.examples[0], /1\.\d\d:1/);
});

test('missing headings', async () => {
  const r = await audit(browser, 'no-headings.html');
  assert.ok(ids(r).includes('struct-h1-missing'));
  assert.ok(!ids(r).includes('struct-heading-skip'));
});

test('form problems: labels, submit, autocomplete, long form, vague CTA', async () => {
  const r = await audit(browser, 'bad-forms.html');
  const found = ids(r);
  for (const id of ['form-missing-label', 'form-no-submit', 'form-autocomplete-missing', 'cro-long-form', 'cro-vague-cta']) {
    assert.ok(found.includes(id), `expected ${id} in ${found}`);
  }
  assert.equal(issue(r, 'form-missing-label').count, 9);
  assert.match(issue(r, 'form-missing-label').why, /Placeholder text is not a label/);
  assert.equal(issue(r, 'form-no-submit').count, 1);
});

test('form audit never reads field values', async () => {
  const context = await browser.newContext();
  await routeFixtures(context);
  const page = await context.newPage();
  await page.goto(`${ORIGIN}/bad-forms.html`);
  await page.fill('input[name="email"]', 'secret-person@example.com');
  await page.fill('textarea[name="details"]', 'SECRET-MESSAGE-123');
  await page.addScriptTag({ path: AUDIT_JS });
  const json = JSON.stringify(await page.evaluate(() => globalThis.XenderSiteCheck.run(document, window)));
  await context.close();
  assert.ok(!json.includes('secret-person@example.com'));
  assert.ok(!json.includes('SECRET-MESSAGE-123'));
});

test('insecure and malformed links on an HTTPS page', async () => {
  const r = await audit(browser, 'insecure-links.html');
  const found = ids(r);
  for (const id of ['sec-mixed-active', 'sec-mixed-passive', 'link-insecure-http', 'sec-target-blank', 'link-empty-href',
    'link-javascript', 'link-malformed', 'sec-form-action-http']) {
    assert.ok(found.includes(id), `expected ${id} in ${found}`);
  }
  assert.equal(issue(r, 'link-malformed').count, 2);
  assert.ok(!found.includes('sec-not-https'));
  // logout links are never offered for checking
  assert.ok(!r.linkCandidates.some((u) => u.includes('logout')));
  assert.ok(r.linkCandidates.includes('https://fixtures.sitecheck.test/missing.html'));
  assert.ok(!r.linkCandidates.some((u) => u.startsWith('https://external.example.org')));
});

test('link check reports only verified broken links', async () => {
  const context = await browser.newContext();
  await routeFixtures(context, { '/server-error.html': 503 });
  const page = await context.newPage();
  await page.goto(`${ORIGIN}/insecure-links.html`);
  await page.addScriptTag({ path: AUDIT_JS });
  const res = await page.evaluate(() => globalThis.XenderSiteCheck.checkLinks([
    location.origin + '/ok.html',
    location.origin + '/missing.html',
    location.origin + '/server-error.html'
  ]));
  await context.close();
  assert.equal(res.checked, 3);
  assert.deepEqual(res.broken.map((b) => [new URL(b.url).pathname, b.status]).sort(), [['/missing.html', 404], ['/server-error.html', 503]]);
  assert.equal(res.unverified.length, 0);
});

test('excessive CTAs above the fold', async () => {
  const r = await audit(browser, 'excessive-ctas.html');
  const cta = issue(r, 'cro-competing-ctas');
  assert.ok(cta, ids(r).join());
  assert.equal(cta.heuristic, true);
  assert.ok(cta.examples.length >= 5);
});

test('no CTA and no contact method', async () => {
  const r = await audit(browser, 'no-cta.html');
  assert.ok(ids(r).includes('cro-no-cta'));
  assert.ok(ids(r).includes('cro-no-contact'));
  assert.ok(ids(r).includes('cro-trust-cues'));
});

test('password field on plain HTTP page', async () => {
  const r = await audit(browser, 'http-password.html', { origin: HTTP_ORIGIN });
  assert.ok(ids(r).includes('sec-not-https'));
  assert.equal(issue(r, 'sec-password-on-http').severity, 'critical');
});

test('results are deterministic', async () => {
  const a = await audit(browser, 'a11y-issues.html');
  const b = await audit(browser, 'a11y-issues.html');
  const strip = (r) => ({ ...r, analyzedAt: null, durationMs: null });
  assert.deepEqual(strip(a), strip(b));
});

test('mobile viewport changes nothing structural', async () => {
  const r = await audit(browser, 'healthy.html', { viewport: { width: 375, height: 700 } });
  assert.deepEqual(r.issues.filter((i) => i.severity !== 'notice'), []);
});
