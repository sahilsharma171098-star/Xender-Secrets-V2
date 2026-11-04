// Ratings and display text for the page-load metrics returned by src/vitals.js.
// Thresholds are Google's published good / needs-improvement / poor limits (web.dev).
// These metrics never change the SiteCheck Health Score, which stays a deterministic
// heuristic score of the page's code.
export const THRESHOLDS = Object.freeze({
  lcp: [2500, 4000],
  inp: [200, 500],
  cls: [0.1, 0.25],
  fcp: [1800, 3000],
  ttfb: [800, 1800],
});

export const METRICS = Object.freeze([
  { id: "lcp", label: "Largest Contentful Paint", short: "LCP", core: true },
  { id: "inp", label: "Interaction to Next Paint", short: "INP", core: true },
  { id: "cls", label: "Cumulative Layout Shift", short: "CLS", core: true },
  { id: "fcp", label: "First Contentful Paint", short: "FCP", core: false },
  { id: "ttfb", label: "Time to First Byte", short: "TTFB", core: false },
]);

const RATING_LABEL = { good: "Good", "needs-improvement": "Needs improvement", poor: "Poor" };

export function rate(metric, value) {
  const t = THRESHOLDS[metric];
  if (!t || !Number.isFinite(value) || value < 0) return null;
  if (value <= t[0]) return "good";
  if (value <= t[1]) return "needs-improvement";
  return "poor";
}

export function formatValue(metric, value) {
  if (!Number.isFinite(value)) return "–";
  if (metric === "cls") return value.toFixed(2);
  return value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(1)} s`;
}

/**
 * Rows for the popup (and reports): one per metric with display value, rating and a
 * short note when the number is missing or needs context. Never invents a value.
 */
export function vitalsRows(v) {
  if (!v || v.engine !== "xender-sitecheck-vitals" || v.error || !v.metrics) return [];
  return METRICS.map(({ id, label, short, core }) => {
    const value = v.metrics[id];
    const row = { id, label, short, core, raw: Number.isFinite(value) ? value : null, display: formatValue(id, value), rating: rate(id, value), note: "" };
    if (row.raw !== null) return row;
    if (v.supported && v.supported[id] === false) { row.display = "Not available"; row.note = "This browser does not report it."; return row; }
    if (id === "inp") {
      if (v.inpBelowMs) { row.display = `Under ${v.inpBelowMs} ms`; row.rating = "good"; row.note = "No slow interaction on this page so far."; }
      else { row.display = "Interact first"; row.note = "Click, tap or type on the page, then check again."; }
      return row;
    }
    row.display = "Not recorded";
    row.note = id === "lcp" ? "Reload the page, wait for it to finish, then check again." : "";
    return row;
  });
}

export const ratingLabel = (r) => RATING_LABEL[r] || "";

/** One-line caveats shown under the metrics. */
export function vitalsNotes(v) {
  const notes = [];
  if (!v || v.error) return notes;
  if (v.loadedInBackground) notes.push("This tab loaded in the background, so paint times are not meaningful. Reload it in front and check again.");
  if (v.stillLoading) notes.push("The page was still loading; numbers may change.");
  return notes;
}
