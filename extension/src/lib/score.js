// Deterministic Xender SiteCheck score (documented in extension/docs/SCORING.md).
// This is a Xender SiteCheck heuristic score, not a Lighthouse score.
import { CATEGORIES, CHECK_BY_ID, SEVERITY } from "./checks.js";

/** Joins audit results with the catalog; unknown ids are ignored. */
export function enrich(checks) {
  return checks.filter((r) => CHECK_BY_ID[r.id]).map((r) => {
    const meta = CHECK_BY_ID[r.id];
    return { ...meta, ...r, severity: SEVERITY[meta.weight] };
  });
}

export function band(score) {
  if (score === null) return { id: "none", label: "Not enough data" };
  if (score >= 90) return { id: "strong", label: "Strong" };
  if (score >= 75) return { id: "good", label: "Good — a few fixes" };
  if (score >= 50) return { id: "work", label: "Needs work" };
  return { id: "poor", label: "Poor" };
}

/**
 * Category score = round(100 × Σ weight of passed checks ÷ Σ weight of applicable checks).
 * Overall = category scores averaged with the category weights (SEO 25, Accessibility 25,
 * Usability 15, Conversion 20, Technical 15); categories with no applicable checks are left out
 * and the remaining weights re-normalised. "na" checks never count.
 */
export function scoreReport(checks) {
  const items = enrich(checks);
  const categories = CATEGORIES.map((cat) => {
    const applicable = items.filter((i) => i.category === cat.id && i.status !== "na");
    const possible = applicable.reduce((s, i) => s + i.weight, 0);
    const earned = applicable.filter((i) => i.status === "pass").reduce((s, i) => s + i.weight, 0);
    const score = possible ? Math.round((100 * earned) / possible) : null;
    return { ...cat, score, passed: applicable.filter((i) => i.status === "pass").length, failed: applicable.filter((i) => i.status === "fail").length };
  });
  const scored = categories.filter((c) => c.score !== null);
  const totalWeight = scored.reduce((s, c) => s + c.weight, 0);
  const overall = totalWeight ? Math.round(scored.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight) : null;
  const failed = items.filter((i) => i.status === "fail");
  const order = { critical: 0, warning: 1, recommendation: 2 };
  failed.sort((a, b) => order[a.severity] - order[b.severity] || b.weight - a.weight);
  return {
    overall,
    band: band(overall),
    categories,
    issues: failed,
    passed: items.filter((i) => i.status === "pass"),
    notApplicable: items.filter((i) => i.status === "na"),
    counts: {
      critical: failed.filter((i) => i.severity === "critical").length,
      warning: failed.filter((i) => i.severity === "warning").length,
      recommendation: failed.filter((i) => i.severity === "recommendation").length,
      passed: items.filter((i) => i.status === "pass").length,
    },
  };
}
