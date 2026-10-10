// XEND-ACQ-002 — pure helpers for the Google Maps no-website finder (unit-tested, no browser).

/** "4.6" / "4,6" → 4.6; anything else → null. */
export function parseRating(raw) {
  const m = String(raw ?? "").match(/(\d)[.,](\d)/) || String(raw ?? "").match(/^\s*(\d)\s*$/);
  if (!m) return null;
  const n = Number(m[2] !== undefined ? `${m[1]}.${m[2]}` : m[1]);
  return n >= 0 && n <= 5 ? n : null;
}

/** "(1,234)", "1.2K reviews", "312 reviews", "2 lakh" → integer; else null. */
export function parseReviews(raw) {
  const s = String(raw ?? "").toLowerCase().replace(/[()]/g, " ");
  const m = s.match(/(\d[\d,]*(?:\.\d+)?)\s*(k|lakh|m)?/);
  if (!m) return null;
  let n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  if (m[2] === "k") n *= 1_000;
  if (m[2] === "lakh") n *= 100_000;
  if (m[2] === "m") n *= 1_000_000;
  return Math.round(n);
}

/** Maps phone button: data-item-id "phone:tel:09876543210" or aria-label "Phone: 098765 43210". */
export function parsePhone({ itemId = "", label = "" } = {}) {
  const fromId = String(itemId).match(/tel:([+\d]+)/);
  if (fromId) return fromId[1];
  const fromLabel = String(label).replace(/^[^:]*:/, "").replace(/[^\d+]/g, "");
  return fromLabel.length >= 7 ? fromLabel : "";
}

/** "Shop 12, Sector 56, Gurugram, Haryana 122011" → "Sector 56" (best-effort locality). */
export function areaFromAddress(address) {
  const parts = String(address ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  const hit = parts.find((p) => /\b(sector|sec|phase|dlf|block|vihar|nagar|colony|road|extension|marg|enclave|city)\b/i.test(p) && !/\d{6}/.test(p));
  if (hit) return hit.slice(0, 80);
  return (parts.length >= 3 ? parts[parts.length - 3] : parts[0] || "").slice(0, 80);
}

/** Collect --q values, a --file of queries (one per line, # comments) and flags. */
export function parseArgs(argv) {
  const opts = { queries: [], file: "", max: 25, headless: false, upload: false, site: "https://www.xendersecrets.com", out: "prospects-out", delayMs: 1800 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => argv[++i];
    if (a === "--q" || a === "-q") opts.queries.push(next());
    else if (a === "--file") opts.file = next();
    else if (a === "--max") opts.max = Math.max(1, Math.min(60, Number(next()) || 25));
    else if (a === "--headless") opts.headless = true;
    else if (a === "--upload") opts.upload = true;
    else if (a === "--site") opts.site = next();
    else if (a === "--out") opts.out = next();
    else if (a === "--delay") opts.delayMs = Math.max(800, Number(next()) || 1800);
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (!a.startsWith("-")) opts.queries.push(a);
  }
  return opts;
}

export const queriesFromText = (txt) => String(txt).split(/\r?\n/).map((l) => l.replace(/#.*/, "").trim()).filter(Boolean);

const CSV_COLS = ["name", "category", "area", "address", "phone", "rating", "reviews", "maps_url", "query"];
export function toCsv(rows) {
  const cell = (v) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // spreadsheet formula-injection guard
    return '"' + s.replace(/"/g, '""') + '"';
  };
  return [CSV_COLS.join(","), ...rows.map((r) => CSV_COLS.map((c) => cell(r[c])).join(","))].join("\r\n");
}

/** Same business seen under two queries → keep one (phone, else name+address). */
export function dedupe(rows) {
  const seen = new Set();
  return rows.filter((r) => {
    const k = (String(r.phone || "").replace(/\D/g, "").slice(-10)) || (r.name + "|" + r.address).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
