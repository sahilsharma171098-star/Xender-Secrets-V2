// Builds the plain-text report used by “Copy report”. Pure function: no I/O.

const SEVERITY_LABEL = { critical: 'CRITICAL', warning: 'WARNING', notice: 'RECOMMENDATION' };

/**
 * @param {object} result  Output of XenderSiteCheck.run()
 * @param {object} [links] Output of XenderSiteCheck.checkLinks(), if the user ran it
 * @returns {string}
 */
export function formatReport(result, links) {
  const lines = [];
  lines.push(`Xender SiteCheck report — ${result.url}`);
  lines.push(`Checked: ${result.analyzedAt}`);
  lines.push('');
  lines.push(`Website Health Score: ${result.score.overall}/100 (${result.score.grade})`);
  lines.push('This is a Xender SiteCheck heuristic score, not a Lighthouse score.');
  for (const cat of Object.values(result.score.categories)) {
    lines.push(`  ${cat.label.padEnd(14)} ${String(cat.score).padStart(3)}/100${cat.issues ? `  (${cat.issues} issue${cat.issues > 1 ? 's' : ''})` : ''}`);
  }
  lines.push('');
  lines.push(`${result.summary.critical} critical · ${result.summary.warning} warnings · ${result.summary.notice} recommendations · ${result.summary.passed} passed`);
  lines.push('');
  for (const issue of result.issues) {
    lines.push(`[${SEVERITY_LABEL[issue.severity]}] ${issue.title}${issue.count > 1 ? ` (${issue.count})` : ''}${issue.heuristic ? ' — heuristic' : ''}`);
    lines.push(`  Why it matters: ${issue.why}`);
    lines.push(`  Fix: ${issue.fix}`);
    if (issue.examples && issue.examples.length) {
      lines.push(`  Examples: ${issue.examples.slice(0, 3).join('; ')}`);
    }
    lines.push('');
  }
  if (links) {
    lines.push(`Same-site link check: ${links.checked} of ${links.total} links checked, ${links.broken.length} broken, ${links.unverified.length} could not be verified.`);
    for (const b of links.broken) lines.push(`  BROKEN ${b.status} ${b.url}`);
    lines.push('');
  }
  lines.push('Generated locally by Xender SiteCheck. Want a human review? https://www.xendersecrets.com/sitecheck.html#free-audit');
  return lines.join('\n');
}
