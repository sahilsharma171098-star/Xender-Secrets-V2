import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { AUDIT_JS } from './helpers.mjs';

await import(pathToFileURL(AUDIT_JS).href);

const SC = globalThis.XenderSiteCheck;

const issue = (category, severity, count = 1) => ({ category, severity, count });

test('no issues scores 100 in every category', () => {
  const s = SC.scoreIssues([]);
  assert.equal(s.overall, 100);
  for (const c of Object.values(s.categories)) assert.equal(c.score, 100);
  assert.equal(s.grade, 'Good');
});

test('documented weights: critical 20, warning 8, notice 3, ×1.5 at 10+ elements', () => {
  assert.deepEqual(SC.SEVERITY_POINTS, { critical: 20, warning: 8, notice: 3 });
  assert.equal(SC.MANY_THRESHOLD, 10);
  assert.deepEqual(SC.CATEGORY_WEIGHTS, { seo: 25, accessibility: 25, usability: 15, conversion: 15, technical: 20 });
  const s = SC.scoreIssues([issue('seo', 'critical'), issue('seo', 'warning'), issue('seo', 'notice', 12)]);
  assert.equal(s.categories.seo.score, Math.round(100 - 20 - 8 - 3 * 1.5)); // 67.5 → 68
  assert.equal(s.overall, Math.round((68 * 25 + 100 * 75) / 100));
});

test('category score never drops below 0', () => {
  const many = Array.from({ length: 10 }, () => issue('technical', 'critical'));
  assert.equal(SC.scoreIssues(many).categories.technical.score, 0);
});

test('grades', () => {
  const grade = (n) => SC.scoreIssues(Array.from({ length: n }, () => issue('seo', 'critical'))).grade;
  assert.equal(grade(0), 'Good');
  assert.equal(grade(2), 'Good'); // seo 60 → overall 90
  assert.equal(grade(5), 'Needs work'); // seo 0 → overall 75
});

test('contrast ratio math', () => {
  assert.equal(SC.contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }).toFixed(1), '21.0');
  assert.equal(SC.contrastRatio({ r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 255 }), 1);
});
