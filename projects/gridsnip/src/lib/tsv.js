// GridSnip — turn the model's answer into clean rows, and rows into TSV/CSV.
// Pure functions (unit-tested). The model is asked for TSV, but answers sometimes arrive as a
// markdown table, inside code fences, or as CSV; all of those are normalised here.

export const NO_TABLE = "NO_TABLE";

/** Model text → rows (string[][]), or [] when there is no table. Every row gets the same width. */
export function rowsFromModelText(text) {
  let body = String(text ?? "").replace(/\r\n?/g, "\n").trim();
  const fenced = /^```[\w-]*\n([\s\S]*?)\n?```$/.exec(body);
  if (fenced) body = fenced[1].trim();
  if (!body || body === NO_TABLE || /^no[_ ]table\.?$/i.test(body)) return [];
  const lines = body.split("\n").filter((l) => l.trim().length > 0);
  let rows;
  if (lines.some((l) => l.includes("\t"))) rows = lines.map((l) => l.split("\t"));
  else if (isMarkdownTable(lines)) rows = lines.filter((l) => !/^\s*\|?\s*:?-{2,}/.test(l)).map(markdownCells);
  else if (isCsv(lines)) rows = lines.map(csvCells);
  else rows = lines.map((l) => [l]);
  rows = rows.map((r) => r.map((c) => c.replace(/\s+/g, " ").trim()));
  while (rows.length && rows[rows.length - 1].every((c) => c === "")) rows.pop();
  const width = Math.max(0, ...rows.map((r) => r.length));
  return rows.map((r) => (r.length < width ? [...r, ...Array(width - r.length).fill("")] : r));
}

const isMarkdownTable = (lines) => lines.length >= 2 && lines.every((l) => l.trim().startsWith("|")) && lines.some((l) => /^\s*\|?\s*:?-{2,}/.test(l));
function markdownCells(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, "|"));
}
function isCsv(lines) {
  if (lines.length < 2) return false;
  const counts = lines.map((l) => csvCells(l).length);
  return counts[0] > 1 && counts.every((n) => n === counts[0]);
}
function csvCells(line) {
  const out = [];
  let cur = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"' && cur === "") quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * Spreadsheet-safe cell text. A cell that would start a formula (=, @, or +/- followed by
 * something that is not a number) gets a leading apostrophe so Excel/Sheets keep it as text.
 * Real numbers such as -12.5, - 3, +91 98…, (1,200) or 5% are left untouched.
 */
export function safeCell(value) {
  const text = String(value ?? "").replace(/[\t\r\n]+/g, " ");
  if (/^[=@]/.test(text) || /^[+-](?!\s?[\d.,(])/.test(text)) return "'" + text;
  return text;
}

export const toTsv = (rows) => rows.map((r) => r.map(safeCell).join("\t")).join("\n");

export function toCsv(rows) {
  const cell = (v) => {
    const t = safeCell(v);
    return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export const shape = (rows) => ({ rows: rows.length, cols: rows.length ? rows[0].length : 0 });
