// SiteCheck Pro — white-label PDF report, built entirely in the popup.
//
// No library and no network: a small PDF 1.4 writer using the standard Helvetica and
// Courier fonts (WinAnsi encoding), so the file opens in every PDF viewer. The report has
// no Xender branding — agencies hand it to their clients as their own. Characters outside
// WinAnsi (for example Devanagari or emoji in link text) are replaced, never dropped
// silently in a way that changes meaning: common symbols get ASCII stand-ins, the rest "?".
//
// Content: heuristic Health Score and category scores (with the not-Lighthouse disclaimer),
// optional page-load metrics measured on the reviewer's device, every issue grouped by
// severity with why/fix and up to three examples, and the passed checks.

import { CATEGORIES } from "./checks.js";

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
const PAGE_W = 595.28, PAGE_H = 841.89;            // A4 in points
const LEFT = 50, RIGHT = 50, TOP = 58, BOTTOM = 64;
const WIDTH = PAGE_W - LEFT - RIGHT;

const COLOR = {
  ink: "0.043 0.071 0.125", muted: "0.357 0.400 0.471", line: "0.890 0.910 0.941",
  crit: "0.725 0.110 0.110", warn: "0.631 0.361 0.027", rec: "0.114 0.306 0.847", ok: "0.016 0.471 0.341",
  soft: "0.961 0.969 0.984",
};
const BAND_COLOR = { strong: "ok", good: "ok", work: "warn", poor: "crit", none: "muted" };
const RATING_COLOR = { good: "ok", "needs-improvement": "warn", poor: "crit" };
const SEVERITY = [["critical", "Critical", "crit"], ["warning", "Warnings", "warn"], ["recommendation", "Recommendations", "rec"]];

// Standard Helvetica / Helvetica-Bold advance widths (1/1000 em) for codes 32..126.
const HELVETICA = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const HELVETICA_BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
// Widths for the WinAnsi punctuation we actually emit; other high bytes use a safe upper bound.
const HIGH = { 0x85: [1000, 1000], 0x91: [222, 278], 0x92: [222, 278], 0x93: [333, 500], 0x94: [333, 500], 0x95: [350, 350], 0x96: [556, 556], 0x97: [1000, 1000], 0xa0: [278, 278], 0xb7: [278, 278], 0xd7: [584, 584] };

// Unicode → WinAnsi bytes 0x80..0x9F (the rest of 0xA0..0xFF is Latin-1 as is).
const WIN_ANSI = { 0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f };
const STAND_IN = { "→": "->", "←": "<-", "≥": ">=", "≤": "<=", "≠": "!=", "₹": "Rs.", "✓": "v", "✔": "v", "✗": "x", "✕": "x", "⦸": "(blocked)", "​": "", "­": "", "﻿": "" };

/** Text → string of single-byte WinAnsi codes (each char code < 256). */
export function toWinAnsi(text) {
  let out = "";
  for (const ch of String(text ?? "").normalize("NFC")) {
    if (ch in STAND_IN) { out += STAND_IN[ch]; continue; }
    const cp = ch.codePointAt(0);
    if (cp === 9 || cp === 10 || cp === 13) out += " ";
    else if (cp < 32 || (cp >= 0x7f && cp < 0xa0)) continue;
    else if (cp < 0x7f || (cp >= 0xa0 && cp <= 0xff)) out += ch;
    else if (WIN_ANSI[cp]) out += String.fromCharCode(WIN_ANSI[cp]);
    else out += "?";
  }
  return out;
}

const charWidth = (code, font) => {
  if (font === "mono") return 600;
  const bold = font === "bold";
  if (code >= 32 && code <= 126) return (bold ? HELVETICA_BOLD : HELVETICA)[code - 32];
  if (HIGH[code]) return HIGH[code][bold ? 1 : 0];
  return bold ? 611 : 556;
};
/** Width in points of an already-encoded string. */
export function textWidth(encoded, font, size) {
  let w = 0;
  for (let i = 0; i < encoded.length; i++) w += charWidth(encoded.charCodeAt(i), font);
  return (w * size) / 1000;
}

/** Greedy word wrap on encoded text; words longer than a line (URLs, selectors) are split. */
export function wrap(encoded, font, size, maxWidth) {
  const lines = [];
  let line = "";
  const fits = (s) => textWidth(s, font, size) <= maxWidth;
  for (const word of encoded.split(" ").filter((w) => w.length)) {
    const candidate = line ? line + " " + word : word;
    if (fits(candidate)) { line = candidate; continue; }
    if (line) lines.push(line);
    line = "";
    let rest = word;
    while (!fits(rest)) {
      let n = rest.length - 1;
      while (n > 1 && !fits(rest.slice(0, n))) n--;
      lines.push(rest.slice(0, n));
      rest = rest.slice(n);
    }
    line = rest;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

const pdfString = (encoded) => "(" + encoded.replace(/[\\()]/g, (c) => "\\" + c) + ")";
const FONT_ID = { regular: "F1", bold: "F2", mono: "F3" };
const fmt = (n) => (Math.round(n * 100) / 100).toString();

/** Lays content out on A4 pages; each page is a list of PDF content-stream operators. */
class Layout {
  constructor(footerLeft) {
    this.pages = [];
    this.footerLeft = footerLeft;
    this.newPage();
  }
  newPage() {
    this.ops = [];
    this.pages.push(this.ops);
    this.y = PAGE_H - TOP;
  }
  ensure(height) { if (this.y - height < BOTTOM) this.newPage(); }
  gap(h) { this.y -= h; }
  text(encoded, { x = LEFT, font = "regular", size = 10, color = "ink" } = {}) {
    this.ops.push(`BT /${FONT_ID[font]} ${fmt(size)} Tf ${COLOR[color]} rg ${fmt(x)} ${fmt(this.y)} Td ${pdfString(encoded)} Tj ET`);
  }
  /** Wrapped paragraph; keeps each line on a page. */
  para(raw, { x = LEFT, width = WIDTH - (x - LEFT), font = "regular", size = 10, color = "ink", lead = 1.35 } = {}) {
    const lines = wrap(toWinAnsi(raw), font, size, width);
    for (const line of lines) {
      this.ensure(size * lead);
      this.y -= size;
      this.text(line, { x, font, size, color });
      this.y -= size * (lead - 1);
    }
  }
  rule(color = "line") {
    this.ops.push(`${COLOR[color]} RG 0.7 w ${fmt(LEFT)} ${fmt(this.y)} m ${fmt(PAGE_W - RIGHT)} ${fmt(this.y)} l S`);
  }
  box(x, y, w, h, color) { this.ops.push(`${COLOR[color]} rg ${fmt(x)} ${fmt(y)} ${fmt(w)} ${fmt(h)} re f`); }
  finish() {
    const total = this.pages.length;
    this.pages.forEach((ops, i) => {
      const label = toWinAnsi(`Page ${i + 1} of ${total}`);
      ops.push(`${COLOR.line} RG 0.7 w ${fmt(LEFT)} ${fmt(BOTTOM - 22)} m ${fmt(PAGE_W - RIGHT)} ${fmt(BOTTOM - 22)} l S`);
      ops.push(`BT /F1 8 Tf ${COLOR.muted} rg ${fmt(LEFT)} ${fmt(BOTTOM - 36)} Td ${pdfString(this.footerLeft)} Tj ET`);
      ops.push(`BT /F1 8 Tf ${COLOR.muted} rg ${fmt(PAGE_W - RIGHT - textWidth(label, "regular", 8))} ${fmt(BOTTOM - 36)} Td ${pdfString(label)} Tj ET`);
    });
    return this.pages;
  }
}

/** Serialises pages to PDF bytes with a correct cross-reference table. */
function serialize(pages, { title, created }) {
  const objects = [];
  const add = (body) => { objects.push(body); return objects.length; };
  const catalog = add(null), pagesObj = add(null);
  const f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const f3 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>");
  const info = add(`<< /Title ${pdfString(toWinAnsi(title))} /CreationDate (D:${created}Z) >>`);
  const kids = [];
  for (const ops of pages) {
    const stream = ops.join("\n");
    const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R /F3 ${f3} 0 R >> >> /Contents ${content} 0 R >>`));
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => k + " 0 R").join(" ")}] /Count ${kids.length} >>`;

  let out = "%PDF-1.4\n%âãÏÓ\n";
  const offsets = [];
  objects.forEach((body, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += String(o).padStart(10, "0") + " 00000 n \n";
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) { const c = out.charCodeAt(i); bytes[i] = c < 256 ? c : 63; }
  return bytes;
}

/**
 * Builds the white-label report.
 * @param {{result:object, scored:object, vitalRows?:Array, now?:Date}} input
 * vitalRows are the rows from lib/vitals-rate.js vitalsRows(); pass [] to leave them out.
 */
export function pdfReport({ result, scored, vitalRows = [], now = new Date() }) {
  if (!result || !scored) throw new Error("No audit to export");
  let host = "";
  try { host = new URL(result.url).host; } catch (e) { host = String(result.url || ""); }
  const day = now.toISOString().slice(0, 10);
  const L = new Layout(toWinAnsi(`Website QA report · ${host} · ${day}`));

  // Header
  L.y -= 20; L.text(toWinAnsi("Website QA report"), { font: "bold", size: 20 });
  L.gap(10);
  L.para(String(result.url || ""), { size: 10.5, color: "ink" });
  L.para(`Checked ${day}${result.viewport && result.viewport.width ? ` at a ${result.viewport.width}px wide browser window` : ""}`, { size: 9, color: "muted" });
  L.gap(8); L.rule(); L.gap(18);

  // Score
  const score = scored.overall === null || scored.overall === undefined ? "–" : String(scored.overall);
  const band = scored.band || { id: "none", label: "Not enough data" };
  L.ensure(60);
  L.y -= 30;
  L.text(toWinAnsi(score), { font: "bold", size: 34, color: BAND_COLOR[band.id] || "ink" });
  const scoreW = textWidth(toWinAnsi(score), "bold", 34);
  L.text(toWinAnsi("/100"), { x: LEFT + scoreW + 4, size: 12, color: "muted" });
  L.text(toWinAnsi("Health Score · " + band.label), { x: LEFT + scoreW + 44, font: "bold", size: 12, color: BAND_COLOR[band.id] || "ink" });
  L.gap(12);
  L.para("Heuristic score from automated checks of the page's code. It is not a Lighthouse score and not a full accessibility (WCAG) audit.", { size: 8.5, color: "muted" });
  L.gap(6);
  if (Array.isArray(scored.categories) && scored.categories.length) {
    L.para(scored.categories.map((c) => `${c.label} ${c.score ?? "–"}`).join("   ·   "), { size: 10 });
  }
  const counts = scored.counts || {};
  L.para([["critical", "critical"], ["warning", "warnings"], ["recommendation", "recommendations"]].filter(([k]) => counts[k]).map(([k, w]) => `${counts[k]} ${w}`).concat(`${(scored.passed || []).length} passed`).join("   ·   "), { size: 10, color: "muted" });
  L.gap(14);

  // Page-load metrics (optional)
  const rows = Array.isArray(vitalRows) ? vitalRows : [];
  if (rows.length) {
    L.ensure(40 + rows.length * 15);
    L.y -= 12; L.text(toWinAnsi("Page load on the reviewer's device"), { font: "bold", size: 11.5 });
    L.gap(8);
    for (const r of rows) {
      L.ensure(15);
      L.y -= 10;
      L.text(toWinAnsi(r.short || ""), { font: "bold", size: 9.5 });
      L.text(toWinAnsi(r.label || ""), { x: LEFT + 44, size: 9.5, color: "muted" });
      L.text(toWinAnsi(r.display || "–"), { x: LEFT + 220, font: "bold", size: 9.5 });
      const rating = r.rating === "good" ? "Good" : r.rating === "needs-improvement" ? "Needs improvement" : r.rating === "poor" ? "Poor" : "";
      if (rating) L.text(toWinAnsi(rating), { x: LEFT + 300, size: 9.5, color: RATING_COLOR[r.rating] });
      L.y -= 5;
      if (r.note) { L.para(r.note, { x: LEFT + 44, size: 7.5, color: "muted" }); L.y -= 3; }
    }
    L.gap(2);
    L.para("Measured from one page load in the reviewer's browser, so results vary with device, network and cache. Not Google field data or a Lighthouse test, and not part of the Health Score.", { size: 8, color: "muted" });
    L.gap(12);
  }

  // Issues by severity
  const issues = Array.isArray(scored.issues) ? scored.issues : [];
  if (!issues.length) {
    L.para("No issues were found by these checks.", { size: 11, font: "bold", color: "ok" });
    L.gap(10);
  }
  for (const [sev, heading, color] of SEVERITY) {
    const list = issues.filter((i) => i.severity === sev);
    if (!list.length) continue;
    L.ensure(60);
    L.gap(4);
    L.box(LEFT, L.y - 18, WIDTH, 20, "soft");
    L.y -= 13; L.text(toWinAnsi(`${heading} (${list.length})`), { x: LEFT + 8, font: "bold", size: 11.5, color });
    L.gap(14);
    for (const i of list) {
      L.ensure(46);
      L.para(`${i.title || ""}${i.count > 1 ? ` (${i.count})` : ""}`, { font: "bold", size: 10.5 });
      if (i.category) L.para(CATEGORY_LABEL[i.category] || String(i.category), { size: 8, color: "muted" });
      L.gap(2);
      if (i.detail) L.para(i.detail, { size: 9.5 });
      if (i.why) L.para("Why it matters: " + i.why, { size: 9, color: "muted" });
      if (i.fix) L.para("Fix: " + i.fix, { size: 9.5 });
      const examples = Array.isArray(i.samples) ? i.samples.slice(0, 3) : [];
      for (const s of examples) L.para("· " + s, { x: LEFT + 10, font: "mono", size: 8, color: "muted" });
      if (Array.isArray(i.samples) && i.count > examples.length && examples.length) L.para(`+ ${i.count - examples.length} more on the page`, { x: LEFT + 10, size: 7.5, color: "muted" });
      L.gap(9);
    }
    L.gap(4);
  }

  // Passed checks
  const passed = Array.isArray(scored.passed) ? scored.passed : [];
  if (passed.length) {
    L.ensure(40);
    L.gap(4); L.rule(); L.gap(16);
    L.y -= 2; L.text(toWinAnsi(`Passed checks (${passed.length})`), { font: "bold", size: 11.5, color: "ok" });
    L.gap(8);
    L.para(passed.map((p) => p.passTitle || p.title || p.id).join("  ·  "), { size: 8.5, color: "muted" });
  }

  return serialize(L.finish(), { title: `Website QA report - ${host}`, created: now.toISOString().replace(/[-:T]/g, "").slice(0, 14) });
}
