// SiteCheck Pro white-label PDF (src/lib/pdf-report.js). Node-only: checks the file is a
// structurally valid PDF (xref offsets, stream lengths, page tree), carries no Xender
// branding, keeps the honesty disclaimer, and survives text outside WinAnsi.
// Run: npm run extension:test
import test from "node:test";
import assert from "node:assert/strict";
import { pdfReport, toWinAnsi, wrap, textWidth } from "../src/lib/pdf-report.js";
import { scoreReport } from "../src/lib/score.js";
import { CHECKS } from "../src/lib/checks.js";

const latin1 = (bytes) => Array.from(bytes, (b) => String.fromCharCode(b)).join("");

/** Minimal structural PDF check: every xref offset points at its object, stream lengths match. */
function validate(bytes) {
  const s = latin1(bytes);
  assert.ok(s.startsWith("%PDF-1.4\n"), "header");
  assert.ok(s.endsWith("%%EOF\n"), "trailer end");
  const startxref = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(s)[1]);
  assert.equal(s.slice(startxref, startxref + 4), "xref");
  const [, count] = /xref\n0 (\d+)\n/.exec(s.slice(startxref)).map(Number);
  const rows = s.slice(startxref).split("\n").slice(2, 2 + count);
  assert.equal(rows[0], "0000000000 65535 f ");
  rows.slice(1).forEach((row, i) => {
    const off = Number(row.slice(0, 10));
    assert.ok(s.startsWith(`${i + 1} 0 obj\n`, off), `object ${i + 1} at its xref offset`);
  });
  for (const m of s.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) {
    const start = m.index + m[0].length;
    assert.equal(s.slice(start + Number(m[1]), start + Number(m[1]) + 10), "\nendstream", "stream length is exact");
  }
  const pageCount = Number(/\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/.exec(s)[1]);
  assert.equal((s.match(/\/Type \/Page /g) || []).length, pageCount);
  return { s, pageCount };
}
/** Text drawn with Tj, unescaped (WinAnsi bytes as Latin-1 chars). */
const drawnText = (s) => [...s.matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map((m) => m[1].replace(/\\(.)/g, "$1")).join("\n");

const check = (id, status, extra = {}) => ({ id, status, count: status === "fail" ? 1 : 0, detail: "", samples: [], targets: [], ...extra });

test("valid, white-label PDF with score, disclaimer, issues, metrics and passed checks", () => {
  const checks = CHECKS.map((c, i) => check(c.id, i % 3 === 0 ? "fail" : "pass", i % 3 === 0 ? { count: 5, detail: "Found (3) cases\\with parens", samples: ['<a href="http://example.com/(old)">', "<img src=\"x.png\">", "<div#hero.banner>"] } : {}));
  const scored = scoreReport(checks);
  const vitalRows = [{ id: "lcp", short: "LCP", label: "Largest Contentful Paint", display: "2.4 s", rating: "good", note: "" }, { id: "inp", short: "INP", label: "Interaction to Next Paint", display: "Interact first", rating: null, note: "Click, tap or type on the page, then check again." }];
  const bytes = pdfReport({ result: { url: "https://client.example/pricing", viewport: { width: 1280 } }, scored, vitalRows, now: new Date("2026-11-04T09:30:00Z") });
  assert.ok(bytes instanceof Uint8Array);
  const { s, pageCount } = validate(bytes);
  assert.ok(pageCount >= 2, "long report paginates: " + pageCount);
  const text = drawnText(s);
  assert.doesNotMatch(s, /xender/i, "no Xender branding anywhere in the file");
  assert.match(text, /^Website QA report$/m);
  assert.match(text, /https:\/\/client\.example\/pricing/);
  assert.match(text, /not a Lighthouse score/);
  assert.match(text, new RegExp(`Page 1 of ${pageCount}`));
  assert.match(text, /Page load on the reviewer's device/);
  assert.match(text, /Found \(3\) cases\\with parens/, "parentheses and backslashes survive escaping");
  assert.match(text, /Passed checks \(\d+\)/);
  assert.match(s, /\/Title \(Website QA report - client\.example\)/);
  assert.match(text, /\+ 2 more on the page/);
});

test("no metrics and no issues still produce a valid one-page report", () => {
  const scored = scoreReport(CHECKS.map((c) => check(c.id, "pass")));
  const { s, pageCount } = validate(pdfReport({ result: { url: "https://ok.example/", viewport: { width: 390 } }, scored, now: new Date("2026-11-04T00:00:00Z") }));
  assert.equal(pageCount, 1);
  const text = drawnText(s);
  assert.match(text, /No issues were found by these checks\./);
  assert.doesNotMatch(text, /Page load on/);
  assert.throws(() => pdfReport({ result: null, scored }), /No audit/);
});

test("text outside WinAnsi is replaced, never breaks the file", () => {
  assert.equal(toWinAnsi("Price ₹499 → ok — “quoted” café"), "Price Rs.499 -> ok \u0097 \u0093quoted\u0094 café");
  assert.equal(toWinAnsi("हिंदी 😀\ttab\u0000"), "????? ? tab".replace("????? ?", "?".repeat([..."हिंदी"].length) + " ?"));
  for (const ch of toWinAnsi("Ω∑ 中文 हिंदी 😀 ✓ ≥ … • €")) assert.ok(ch.charCodeAt(0) < 256);
  const checks = [check("tech-dead-links", "fail", { count: 1, detail: "लिंक टूटा है 😀", samples: ["<a> होम"] })];
  const { s } = validate(pdfReport({ result: { url: "https://हिंदी.example/", viewport: { width: 1280 } }, scored: scoreReport(checks) }));
  assert.ok(s.length > 1000);
});

test("wrapping keeps every line inside the width, splitting long URLs", () => {
  const long = toWinAnsi("Fix: " + "https://example.com/" + "very-long-path-segment/".repeat(12) + " then rerun the check on the same page");
  const lines = wrap(long, "regular", 9.5, 300);
  assert.ok(lines.length > 3);
  for (const l of lines) assert.ok(textWidth(l, "regular", 9.5) <= 300, l);
  assert.equal(lines.join("").replace(/ /g, ""), long.replace(/ /g, ""), "no characters lost");
  assert.deepEqual(wrap("", "bold", 10, 100), [""]);
});
