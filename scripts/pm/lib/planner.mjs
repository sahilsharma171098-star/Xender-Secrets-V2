// XEND-PM-001 — turns a short owner command into a bounded, saved assignment. No LLM needed.
import { normalize } from "./util.mjs";

const INTENTS = [
  { intent: "deploy", re: /\b(deploy|go live|live kar|release|publish|ship)\b/ },
  { intent: "check", re: /\b(check|verify|status|audit|test kar|dekh)\b/ },
  { intent: "fix", re: /\b(fix|repair|debug|theek|sudhar)\b/ },
  { intent: "next", re: /^(next|aage|continue)\b/ },
  { intent: "complete", re: /\b(complete|finish|done|pura|poora|build|implement|kar do)\b/ },
];

export function detectIntent(instruction) {
  const t = normalize(instruction);
  for (const { intent, re } of INTENTS) if (re.test(t)) return intent;
  return "complete";
}

export function needsApproval(instruction, cfg) {
  const t = normalize(instruction);
  return (cfg.approvalWords || []).filter((w) => new RegExp(`\\b${w}\\b`).test(t));
}

/** Picks the project whose keywords best match. Explicit MT ids win. */
export function matchProject(instruction, memory) {
  const t = ` ${normalize(instruction)} `;
  const ids = [...String(instruction).matchAll(/\bMT-\d{3}\b/gi)].map((m) => m[0].toUpperCase());
  const projects = memory.projects.projects;
  if (ids.length) {
    const item = memory.items.find((i) => i.id === ids[0]);
    const p = item && projects.find((x) => x.backlogSection && item.section.startsWith(x.backlogSection));
    if (p) return { project: p, ids, score: 99 };
  }
  let best = null;
  for (const p of projects) {
    let score = 0;
    for (const k of p.keywords) if (t.includes(` ${normalize(k)} `) || t.includes(` ${normalize(k)}s `)) score += k.includes(" ") ? 3 : 2;
    if (t.includes(` ${p.key.toLowerCase()} `)) score += 3;
    if (score > (best?.score || 0)) best = { project: p, ids, score };
  }
  return best || { project: null, ids, score: 0 };
}

export function projectItems(memory, project) {
  if (!project?.backlogSection) return [];
  return memory.items.filter((i) => i.section.startsWith(project.backlogSection));
}

export function projectGates(memory, project) {
  if (!project?.gatePrefix) return [];
  return memory.gates.filter((g) => g.id.startsWith(project.gatePrefix));
}

/** Everything an agent needs about a project, without re-reading the repository. */
export function projectContext(memory, project) {
  const items = projectItems(memory, project);
  const gates = projectGates(memory, project);
  const issue = project.issue ? memory.snapshot.issues?.[project.issue] : null;
  const prs = (memory.snapshot.pulls || []).filter((p) => (project.prs || []).includes(p.number));
  return {
    items,
    gates,
    issue,
    openPrs: prs.filter((p) => !p.merged && p.state === "open"),
    mergedPrs: prs.filter((p) => p.merged),
    completed: items.filter((i) => i.category === "done"),
    ready: items.filter((i) => i.ready),
    owner: items.filter((i) => i.ownerAction && i.category !== "done"),
    blocked: items.filter((i) => i.category === "blocked" && !i.ownerAction),
    waiting: items.filter((i) => !i.ready && i.category !== "done" && !i.ownerAction && i.category !== "blocked"),
    conflicts: memory.conflicts.filter((c) => items.some((i) => i.id === c.id)),
  };
}

/** The bounded work unit: at most `limit` agent-executable items. */
export function planAssignment(instruction, memory, { limit = 2 } = {}) {
  const { project, ids } = matchProject(instruction, memory);
  if (!project) {
    const names = memory.projects.projects.map((p) => `${p.key} (${p.keywords.slice(0, 3).join(", ")})`).join("; ");
    return { error: `Could not tell which project "${instruction}" is about. Known projects: ${names}` };
  }
  const intent = detectIntent(instruction);
  const ctx = projectContext(memory, project);
  let focus;
  if (ids.length) focus = ctx.items.filter((i) => ids.includes(i.id));
  else if (intent === "check") focus = ctx.items.filter((i) => i.category === "in_progress" || i.reconciled).slice(0, limit + 1);
  else focus = ctx.ready.slice(0, limit);
  const approval = needsApproval(instruction, memory.projects);
  const objective =
    intent === "check"
      ? `Verify the current state of ${project.name} against GitHub/CI and update the records. Read-only: no code, config or deploy changes.`
      : focus.length
        ? `${project.name}: ${focus.map((i) => `${i.id} ${i.task}`).join(" + ")}`
        : `${project.name}: no agent-executable item is ready — prepare the owner's next step and report blockers.`;
  return { project, intent, focus, ctx, approval, objective };
}
