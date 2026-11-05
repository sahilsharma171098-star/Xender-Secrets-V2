// XEND-PM-001 — task state.
// Local working copy: ops/pm/state/tasks/<ID>.json (git-ignored, written atomically).
// It is LOCAL until `xender-pm sync-state` pushes it to the shared state branch (see gitsync.mjs);
// a fresh clone pulls it from there automatically on resume/handoff/brief.
import fs from "node:fs";
import path from "node:path";
import { readJson, writeJson, redact, isoNow, list, statePath } from "./util.mjs";
import { itemRisk } from "./planner.mjs";

export const STATUSES = ["READY", "IN_PROGRESS", "INTERRUPTED", "BLOCKED", "REVIEW", "DONE"];

const dir = (root) => statePath(root, "tasks");
export const taskFile = (root, id, suffix = "json") => path.join(dir(root), `${id}.${suffix}`);

/** One-time import of tasks committed under ops/pm/seed/ (never overwrites local state). */
export function importSeed(root) {
  const seed = path.join(root, "ops/pm/seed");
  const imported = [];
  if (fs.existsSync(path.join(seed, "tasks"))) {
    for (const f of fs.readdirSync(path.join(seed, "tasks"))) {
      const dest = path.join(dir(root), f);
      if (fs.existsSync(dest)) continue;
      fs.mkdirSync(dir(root), { recursive: true });
      fs.copyFileSync(path.join(seed, "tasks", f), dest);
      if (f.endsWith(".json")) imported.push(f.replace(/\.json$/, ""));
    }
  }
  const so = readJson(path.join(seed, "overrides.json"));
  if (so) {
    const file = statePath(root, "overrides.json");
    const cur = readJson(file, {});
    const merged = { ...so, ...cur };
    if (Object.keys(merged).length !== Object.keys(cur).length) writeJson(file, merged);
  }
  return imported;
}
const file = (root, id) => path.join(dir(root), `${id}.json`);

export function listTasks(root) {
  if (!fs.existsSync(dir(root))) return [];
  return fs
    .readdirSync(dir(root))
    .filter((f) => /^PM-.+\.json$/.test(f))
    .map((f) => readJson(path.join(dir(root), f)))
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function getTask(root, id) {
  const t = readJson(file(root, String(id).toUpperCase()));
  if (!t) throw new Error(`No task ${id}. Run \`xender-pm list\` to see saved tasks.`);
  return t;
}

export function saveTask(root, task, env = process.env) {
  task.updatedAt = isoNow(env);
  const clean = redact(task);
  writeJson(file(root, task.id), clean);
  return clean;
}

function nextId(root, key) {
  const n = listTasks(root)
    .filter((t) => t.project === key)
    .map((t) => Number(t.id.split("-").pop()) || 0);
  return `PM-${key}-${String(Math.max(0, ...n) + 1).padStart(3, "0")}`;
}

/** Same project + same focus items + still open → reuse instead of creating a duplicate. */
export function findDuplicate(root, key, focusIds, intent) {
  const want = [...focusIds].sort().join(",");
  return listTasks(root).find(
    (t) => t.project === key && t.status !== "DONE" && t.intent === intent && [...(t.focus || [])].sort().join(",") === want,
  );
}

export function createTask(root, plan, { instruction, agent = "claude", env = process.env } = {}) {
  const focusIds = plan.focus.map((i) => i.id);
  const dup = findDuplicate(root, plan.project.key, focusIds, plan.intent);
  if (dup) return { task: dup, reused: true };
  const ctx = plan.ctx;
  const now = isoNow(env);
  const task = {
    id: nextId(root, plan.project.key),
    project: plan.project.key,
    projectName: plan.project.name,
    instruction,
    intent: plan.intent,
    objective: plan.objective,
    agent,
    status: "READY",
    approvalRequired: plan.approval,
    approvalNote: plan.approval.length
      ? `Agent auto-run needs \`--approve ${plan.approval.join(",")}\` given only after Sahil says yes. Without it the agent does the verify/prepare part only.`
      : "",
    createdAt: now,
    updatedAt: now,
    focus: focusIds,
    workItems: plan.focus.map((i) => ({ id: i.id, task: i.task, status: i.status, next: i.next, evidence: i.evidence, gates: i.gates, ...itemRisk(i) })),
    // Findings = the investigation already done. Continuations reuse these instead of re-reading the repo.
    findings: [
      ...(ctx.issue ? [`Issue #${ctx.issue.number} (${ctx.issue.state}) "${ctx.issue.title}" — last updated ${ctx.issue.updatedAt}.`] : []),
      ...(ctx.issue?.verified || []).map((v) => `Verified (issue): ${v}`),
      ...ctx.completed.map((i) => `Done: ${i.id} ${i.task} — ${i.status}`),
    ],
    openPrs: ctx.openPrs.map((p) => ({ number: p.number, title: p.title, draft: p.draft, head: p.head })),
    gates: ctx.gates.map((g) => ({ id: g.id, status: g.status, gate: g.gate })),
    ownerBlockers: [
      ...ctx.owner.map((i) => `${i.id}: ${i.next || i.task}`),
      ...(ctx.issue?.remainingBlockers || []).filter((b) => /sahil/i.test(b.owner)).map((b) => `Issue #${ctx.issue.number} ${b.id}: ${b.text}`),
    ],
    waiting: ctx.waiting.map((i) => `${i.id} waits on ${i.waitingOn.join(", ") || i.dependsText}`),
    files: plan.project.files,
    tests: plan.project.tests,
    safety: plan.project.safety,
    sources: { ...plan.sources },
    checkpoints: [],
    lastSuccessfulAction: null,
    changedFiles: [],
    commit: null,
    pr: null,
    testResults: [],
    blockers: [],
    nextAction: plan.focus[0] ? `${plan.focus[0].id}: ${plan.focus[0].next || plan.focus[0].task}` : "Report owner blockers; no code change.",
    nextAgentNotes: "",
    attempts: [],
  };
  return { task: saveTask(root, task, env), reused: false };
}

/**
 * Adds a checkpoint and folds it into the task's current state.
 * Accepts { status, done, next, files, commit, pr, tests, blocker, note, finding, agent }.
 */
export function addCheckpoint(root, id, cp, env = process.env) {
  const task = getTask(root, id);
  const status = cp.status ? String(cp.status).toUpperCase() : null;
  if (status && !STATUSES.includes(status)) throw new Error(`status must be one of ${STATUSES.join(", ")}`);
  const entry = redact({
    at: isoNow(env),
    agent: cp.agent || task.agent,
    status: status || task.status,
    done: cp.done || null,
    next: cp.next || null,
    files: list(cp.files),
    commit: cp.commit || null,
    pr: cp.pr || null,
    tests: list(cp.tests),
    blocker: cp.blocker || null,
    note: cp.note || null,
    source: cp.source || "manual",
  });
  task.checkpoints.push(entry);
  if (status) task.status = status;
  if (entry.done) task.lastSuccessfulAction = entry.done;
  if (entry.next) task.nextAction = entry.next;
  for (const f of entry.files) if (!task.changedFiles.includes(f)) task.changedFiles.push(f);
  if (entry.commit) task.commit = entry.commit;
  if (entry.pr) task.pr = entry.pr;
  for (const t of entry.tests) task.testResults.push({ at: entry.at, result: t });
  if (entry.blocker) task.blockers.push(entry.blocker);
  if (cp.finding) task.findings.push(redact(cp.finding));
  if (cp.notes) task.nextAgentNotes = redact(cp.notes);
  return saveTask(root, task, env);
}
