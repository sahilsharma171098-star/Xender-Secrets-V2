// XEND-PM-001 — plain English/Hinglish summaries for the owner. ASCII only (works in Windows cmd).
import { projectContext } from "./planner.mjs";
import { listTasks } from "./store.mjs";

const short = (s, n = 110) => {
  const t = String(s || "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 3)}...` : t;
};

export function projectSummary(memory, project) {
  const ctx = projectContext(memory, project);
  const g = ctx.gates;
  return {
    key: project.key,
    name: project.name,
    total: ctx.items.length,
    done: ctx.completed.length,
    inProgress: ctx.items.filter((i) => i.category === "in_progress").length,
    pending: ctx.items.filter((i) => i.category === "pending").length,
    blocked: ctx.items.filter((i) => i.category === "blocked").length,
    gatesPassed: g.filter((x) => x.category === "done").length,
    gatesTotal: g.length,
    next: ctx.ready[0] || null,
    owner: ctx.owner,
    issueBlockers: (ctx.issue?.remainingBlockers || []).filter((b) => /sahil/i.test(b.owner)),
    conflicts: ctx.conflicts,
    openPrs: ctx.openPrs,
  };
}

export function renderStatus(memory, { only, now = new Date().toISOString() } = {}) {
  const lines = [];
  const projects = memory.projects.projects.filter((p) => p.backlogSection && (!only || p.key === only.toUpperCase()));
  lines.push(`XENDER STATUS - ${now.slice(0, 16).replace("T", " ")} UTC`);
  lines.push(`Memory: ${memory.sources.backlog} | GitHub snapshot ${memory.sources.snapshot}`);
  let ownerCount = 0;
  for (const p of projects) {
    const s = projectSummary(memory, p);
    lines.push("", `== ${s.name} ==`);
    lines.push(`  Done (ho gaya): ${s.done}/${s.total}${s.gatesTotal ? ` | release gates passed: ${s.gatesPassed}/${s.gatesTotal}` : ""}`);
    lines.push(`  Pending (baaki): ${s.pending + s.inProgress} (in progress ${s.inProgress}) | Blocked (ruka hua): ${s.blocked}`);
    lines.push(`  Next (agla step): ${s.next ? `${s.next.id} ${short(s.next.next || s.next.task)}` : "no agent-ready item - waiting on owner or other items"}`);
    if (s.openPrs.length) lines.push(`  Open PRs: ${s.openPrs.map((x) => `#${x.number}${x.draft ? " draft" : ""}`).join(", ")}`);
    const owner = [...s.owner.map((i) => `${i.id}: ${short(i.next || i.task, 90)}`), ...s.issueBlockers.map((b) => `#${p.issue} ${b.id}: ${short(b.text, 90)}`)];
    ownerCount += owner.length;
    if (owner.length) {
      lines.push(`  Your action (aapka kaam): ${owner.length}`);
      owner.slice(0, 3).forEach((o) => lines.push(`    - ${o}`));
      if (owner.length > 3) lines.push(`    - ...and ${owner.length - 3} more (xender-pm status ${p.key})`);
    }
    if (s.conflicts.length) lines.push(`  Records fixed from GitHub: ${s.conflicts.map((c) => c.id).join(", ")} (backlog file is out of date)`);
  }
  const tasks = listTasks(memory.root).filter((t) => t.status !== "DONE" && (!only || t.project === only.toUpperCase()));
  lines.push("", "== Saved agent tasks ==");
  if (!tasks.length) lines.push('  none - start one with: xender-pm "Complete SiteCheck"');
  for (const t of tasks) lines.push(`  ${t.id} [${t.status}] ${t.agent} - next: ${short(t.nextAction, 90)}`);
  lines.push("", `Owner action needed? ${ownerCount ? `YES - ${ownerCount} item(s) above marked "Your action".` : "No."}`);
  return lines.join("\n");
}

/** One recommended move for the agent side and one for the owner. Resuming beats starting new work. */
export function renderNext(memory) {
  const tasks = listTasks(memory.root).filter((t) => t.status !== "DONE");
  const resumable = tasks.find((t) => t.status === "INTERRUPTED") || tasks.find((t) => t.status === "IN_PROGRESS");
  const lines = [];
  if (resumable) {
    lines.push(`1) Resume saved task ${resumable.id} (${resumable.status}): ${short(resumable.nextAction)}`);
    lines.push(`   Command: npm run pm -- resume ${resumable.id} --agent <claude|codex|gemini>`);
  } else {
    const projects = memory.projects.projects.filter((p) => p.backlogSection).sort((a, b) => a.backlogSection.localeCompare(b.backlogSection));
    const ready = projects.map((p) => ({ p, s: projectSummary(memory, p) })).find((x) => x.s.next);
    if (ready) {
      lines.push(`1) Agent work: ${ready.s.next.id} ${short(ready.s.next.task)} -> ${short(ready.s.next.next, 90)}`);
      lines.push(`   Command: npm run pm -- "Complete ${ready.p.name.split(" ")[0]}"`);
    } else lines.push("1) No agent-ready work. Everything open waits on the owner or on other items.");
  }
  const p0 = memory.projects.projects.find((p) => p.backlogSection === "P0");
  const owner = p0 ? projectSummary(memory, p0) : null;
  const first = owner?.issueBlockers[0] || owner?.owner[0];
  if (first) lines.push(`2) Your action (Sahil): ${short(first.text || `${first.id}: ${first.next || first.task}`, 160)}`);
  return lines.join("\n");
}
