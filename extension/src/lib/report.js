// Plain-text report for "Copy report". Built locally; only leaves the browser if the
// user pastes it somewhere themselves.
export function reportText(result, scored, now = new Date()) {
  const lines = [];
  lines.push(`Xender SiteCheck report — ${result.url}`);
  lines.push(`Checked ${now.toISOString().slice(0, 10)} at ${result.viewport.width}px window width`);
  lines.push("");
  lines.push(`Website Health Score: ${scored.overall ?? "–"}/100 (${scored.band.label})`);
  lines.push("This is a Xender SiteCheck heuristic score, not a Lighthouse score.");
  lines.push(scored.categories.map((c) => `${c.label} ${c.score ?? "–"}`).join(" · "));
  lines.push("");
  const groups = [["critical", "CRITICAL"], ["warning", "WARNINGS"], ["recommendation", "RECOMMENDATIONS"]];
  for (const [sev, heading] of groups) {
    const list = scored.issues.filter((i) => i.severity === sev);
    if (!list.length) continue;
    lines.push(`${heading} (${list.length})`);
    for (const i of list) {
      lines.push(`- ${i.title}${i.count > 1 ? ` (${i.count})` : ""}`);
      if (i.detail) lines.push(`  ${i.detail}`);
      lines.push(`  Fix: ${i.fix}`);
    }
    lines.push("");
  }
  lines.push(`PASSED (${scored.passed.length}): ${scored.passed.map((p) => p.passTitle).join("; ")}`);
  lines.push("");
  lines.push("Want a human review? Free website audit: https://www.xendersecrets.com/sitecheck");
  return lines.join("\n");
}
