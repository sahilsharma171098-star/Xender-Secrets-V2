// Optional SiteCheck Pro before/after comparison. Saved ONLY by explicit user action.
// Minimal local snapshots (page origin+path, score, issue ids/counts) never leave the browser.
// No full DOM, URLs with query strings, form values, issue descriptions or samples.
export const BASELINE_STORAGE_KEY = "sitecheckProBaselines";
export const MAX_BASELINES = 20;

export function pageIdentity(raw) {
  const page = new URL(String(raw || ""));
  if (!["http:", "https:"].includes(page.protocol) || page.username || page.password) {
    throw new Error("Only regular public web pages can be compared");
  }
  const url = page.origin + page.pathname;
  if (url.length > 1200) throw new Error("Page URL is too long for baseline comparison");
  return url;
}

export function snapshotOf(result, scored, now = new Date()) {
  if (!result || !scored || !Array.isArray(scored.issues)) {
    throw new Error("Audit report is required");
  }
  const score = scored.overall;
  if (score !== null && (!Number.isInteger(score) || score < 0 || score > 100)) {
    throw new Error("Invalid audit score");
  }
  const issues = scored.issues.map(issue => {
    if (!/^[a-z0-9-]{2,80}$/i.test(String(issue.id || ""))) {
      throw new Error("Invalid issue identifier");
    }
    const count = Number(issue.count) || 1;
    if (!Number.isSafeInteger(count) || count < 1) throw new Error("Invalid issue count");
    return { id: issue.id, count };
  });
  return { v: 1, url: pageIdentity(result.url), score, issues, savedAt: now.toISOString() };
}

export function withSavedBaseline(existing, snapshot) {
  if (!snapshot?.url || snapshot.v !== 1) throw new Error("Invalid baseline");
  const previous = Array.isArray(existing) ? existing : [];
  return [snapshot, ...previous.filter(b => b && b.v === 1 && b.url !== snapshot.url)]
    .slice(0, MAX_BASELINES);
}

export function findSavedBaseline(existing, url) {
  const identity = pageIdentity(url);
  return (Array.isArray(existing) ? existing : []).find(b => b?.v === 1 && b.url === identity) || null;
}

export function compareWithBaseline(baseline, current) {
  if (!baseline || !current || baseline.v !== 1 || current.v !== 1 || baseline.url !== current.url) {
    throw new Error("A saved baseline for this exact page is required");
  }
  const oldIssues = new Map(baseline.issues.map(x => [x.id, x.count]));
  const newIssues = new Map(current.issues.map(x => [x.id, x.count]));
  const resolved = [...oldIssues.keys()].filter(x => !newIssues.has(x)).length;
  const introduced = [...newIssues.keys()].filter(x => !oldIssues.has(x)).length;
  let fewerOccurrences = 0, moreOccurrences = 0;
  for (const [id, count] of newIssues) {
    if (!oldIssues.has(id)) continue;
    fewerOccurrences += Math.max(0, oldIssues.get(id) - count);
    moreOccurrences += Math.max(0, count - oldIssues.get(id));
  }
  return {
    before: baseline.score,
    after: current.score,
    delta: baseline.score == null || current.score == null ? null : current.score - baseline.score,
    resolved, introduced, fewerOccurrences, moreOccurrences,
    checkedAt: current.savedAt, baselineAt: baseline.savedAt
  };
}
