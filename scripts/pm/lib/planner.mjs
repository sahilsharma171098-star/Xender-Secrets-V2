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

// Operations an agent must never perform without Sahil's explicit, named approval.
// Matched on the owner's words AND on every selected work item, so a harmless command such as
// "Complete SiteCheck" cannot silently authorize a deploy that sits inside the backlog item.
export const SENSITIVE_OPS = [
  ["deploy", /\b(deploy\w*|production|go[- ]?live|live kar|promote|roll ?back|rollback|wrangler (?:deploy|versions|rollback))\b/],
  ["merge", /\b(merge|merges|merging)\b/],
  ["payment", /\b(?:charge|refunds?|refunding|purchase|canary|enable (?:public )?checkout|pay now)\b|checkout_enabled\s*[=:]\s*["']?(?:true|1)\b/],
  ["secrets", /\b(secrets?|credentials?|rotate|api keys?|tokens?|client_secret|oauth client)\b/],
  ["store-submit", /\b(submit\w*|publish\w*|web store submission|upload (?:the )?zip)\b/],
  ["delete", /\b(delet\w*|drop|destroy|purge|force[- ]push|clean ?up)\b/],
  ["account", /\b(dashboard|dns|billing|account settings|upgrade plan|paid plan)\b/],
];

export function classifyRisk(text) {
  const t = normalize(String(text || "").replace(/_/g, " "));
  const raw = String(text || "").toLowerCase();
  return SENSITIVE_OPS.filter(([, re]) => re.test(t) || re.test(raw)).map(([op]) => op);
}

/** Owner words that need approval (kept for the command summary). */
export function needsApproval(instruction) {
  return classifyRisk(instruction);
}

/** Splits one backlog item into what an agent may do now and what needs Sahil. */
export function itemRisk(item) {
  const ops = classifyRisk(`${item.task} ${item.next}`);
  return {
    risk: ops.length ? "sensitive" : "safe",
    sensitiveOps: ops,
    agentScope: ops.length
      ? `Prepare and verify only (read code, CI runs, logs, docs; draft changes on a branch). Do NOT perform: ${ops.join(", ")} — those need Sahil's explicit approval.`
      : "Agent may implement on a branch, run checks and open/update a PR.",
  };
}

/** All approvals a task needs, recomputed from its content (never trust a stored list alone). */
export function requiredApprovals(task) {
  const ops = new Set([...(task.approvalRequired || []), ...classifyRisk(task.instruction), ...classifyRisk(task.objective)]);
  for (const w of task.workItems || []) for (const op of classifyRisk(`${w.task} ${w.next}`)) ops.add(op);
  return SENSITIVE_OPS.map(([op]) => op).filter((op) => ops.has(op));
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
  const instructionOps = needsApproval(instruction);
  const itemOps = focus.flatMap((i) => itemRisk(i).sensitiveOps);
  const approval = SENSITIVE_OPS.map(([op]) => op).filter((op) => instructionOps.includes(op) || itemOps.includes(op));
  const objective =
    intent === "check"
      ? `Verify the current state of ${project.name} against GitHub/CI and update the records. Read-only: no code, config or deploy changes.`
      : focus.length
        ? `${project.name}: ${focus.map((i) => `${i.id} ${i.task}`).join(" + ")}${approval.length ? ` — agent part only (verify/prepare); ${approval.join(", ")} needs Sahil's approval` : ""}`
        : `${project.name}: no agent-executable item is ready — prepare the owner's next step and report blockers.`;
  return { project, intent, focus, ctx, approval, instructionOps, objective };
}
