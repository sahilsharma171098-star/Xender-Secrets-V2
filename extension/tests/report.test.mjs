import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatReport } from '../src/core/report.js';
import { pathToFileURL } from 'node:url';
import { AUDIT_JS } from './helpers.mjs';

await import(pathToFileURL(AUDIT_JS).href);

const SC = globalThis.XenderSiteCheck;

const issues = [
  { id: 'seo-title-missing', category: 'seo', severity: 'critical', heuristic: false, title: 'Page title is missing', why: 'W', fix: 'F', count: 1, examples: [] },
  { id: 'cro-no-cta', category: 'conversion', severity: 'notice', heuristic: true, title: 'No clear call to action found', why: 'W2', fix: 'F2', count: 1, examples: ['a'] }
];
const result = {
  url: 'https://example.com/', analyzedAt: '2026-10-06T00:00:00.000Z',
  score: SC.scoreIssues(issues), summary: { critical: 1, warning: 0, notice: 1, passed: 20 }, issues
};

test('report includes score, disclaimer, issues and CTA', () => {
  const text = formatReport(result);
  assert.match(text, /Website Health Score: \d+\/100/);
  assert.match(text, /not a Lighthouse score/);
  assert.match(text, /\[CRITICAL\] Page title is missing/);
  assert.match(text, /\[RECOMMENDATION\] No clear call to action found — heuristic/);
  assert.match(text, /xendersecrets\.com/);
});

test('report includes link results only when run', () => {
  assert.doesNotMatch(formatReport(result), /link check/);
  const text = formatReport(result, { checked: 3, total: 3, broken: [{ status: 404, url: 'https://example.com/x' }], unverified: [] });
  assert.match(text, /BROKEN 404 https:\/\/example\.com\/x/);
});
