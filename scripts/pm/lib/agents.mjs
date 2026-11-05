// XEND-PM-001 — coding-agent adapters: detect, check sign-in, optionally dispatch.
//
// Only official CLIs (Claude Code, Codex CLI, Gemini CLI). Sign-in is checked with each CLI's own
// status command; credential files are never read. Quotas are NOT read: no official interface
// exposes subscription limits, so interruptions are detected from the run's exit/output instead.
import { spawn, spawnSync } from "node:child_process";
import { redact } from "./util.mjs";
import { addCheckpoint, getTask, saveTask } from "./store.mjs";
import { requiredApprovals } from "./planner.mjs";

function runQuiet(bin, args, { timeout = 15000, spawnImpl = spawnSync } = {}) {
  const r = spawnImpl(bin, args, { encoding: "utf8", timeout, stdio: ["ignore", "pipe", "pipe"] });
  return { code: r.status, error: r.error, out: `${r.stdout || ""}${r.stderr || ""}`.trim() };
}

export function checkAgent(name, spec, opts = {}) {
  const v = runQuiet(spec.bin, spec.versionArgs || ["--version"], opts);
  if (v.error?.code === "ENOENT" || (v.code == null && v.error)) {
    return { name, label: spec.label, installed: false, version: null, auth: "n/a", detail: `not installed — ${spec.install}` };
  }
  const version = (v.out.split("\n")[0] || "").slice(0, 80);
  if (!spec.authArgs) {
    return { name, label: spec.label, installed: v.code === 0, version, auth: "unknown", detail: "CLI has no sign-in status command; run it once interactively to sign in" };
  }
  const a = runQuiet(spec.bin, spec.authArgs, opts);
  let auth = a.code === 0 ? "verified" : "not signed in";
  try {
    const j = JSON.parse(a.out);
    if (typeof j.loggedIn === "boolean") auth = j.loggedIn ? "verified" : "not signed in";
  } catch {
    if (a.code === 0 && /not logged in|not signed in|logged out/i.test(a.out)) auth = "not signed in";
  }
  if (a.code == null) auth = "unknown"; // timed out
  return { name, label: spec.label, installed: true, version, auth, detail: auth === "verified" ? "ready" : `sign in with: ${spec.install}` };
}

export function doctor(cfg, opts = {}) {
  return Object.entries(cfg.agents || {}).map(([name, spec]) => checkAgent(name, spec, opts));
}

export function buildCommand(spec, prompt) {
  return { bin: spec.bin, args: spec.execArgs.map((a) => (a === "{prompt}" ? prompt : a)) };
}

/** Parses XPM-CHECKPOINT / XPM-DONE lines emitted by an agent. Bad JSON is ignored, never executed. */
export function parseSignals(text) {
  const out = [];
  for (const line of String(text).split("\n")) {
    const m = line.match(/^\s*(XPM-CHECKPOINT|XPM-DONE)\s+(\{.*\})\s*$/);
    if (!m) continue;
    try {
      const data = JSON.parse(m[2]);
      if (data && typeof data === "object" && !Array.isArray(data)) out.push({ kind: m[1], data });
    } catch {
      /* ignore malformed */
    }
  }
  return out;
}

export function detectInterruption({ code, timedOut, output }, patterns = []) {
  if (timedOut) return "timed out";
  const hit = patterns.find((p) => String(output).toLowerCase().includes(p.toLowerCase()));
  if (code !== 0) return hit ? `exit ${code}: "${hit}"` : `exit ${code}`;
  if (hit && !/XPM-DONE/.test(output)) return `output mentions "${hit}"`;
  return null;
}

const pick = (d) => ({ done: d.done, next: d.next, files: d.files, tests: d.tests, commit: d.commit, pr: d.pr, blocker: d.blocker, note: d.note });

/**
 * Dispatch a prompt to an agent CLI.
 * Default is a dry run. Real execution needs ALL of: execute=true, XENDER_PM_ALLOW_EXEC=1,
 * CLI installed + signed in (or allowUnknownAuth for CLIs without a status command), and an explicit
 * `approve` list naming EVERY sensitive operation the task contains. The list is recomputed from the
 * task's instruction, objective and work items at dispatch time, so an old task file whose stored
 * approvalRequired is empty cannot slip a deploy/merge/payment step through.
 */
export async function dispatch(root, cfg, taskId, { agent, prompt, execute = false, approve = [], allowUnknownAuth = false, timeoutMs = 45 * 60 * 1000, env = process.env, health, spawnImpl = spawn, onLine } = {}) {
  const task = getTask(root, taskId);
  const spec = cfg.agents?.[agent];
  if (!spec) throw new Error(`Unknown agent "${agent}". Known: ${Object.keys(cfg.agents || {}).join(", ")}`);
  // Read-only (check) tasks get the CLI's tool restriction; without a verified one they never auto-run.
  const readOnly = task.intent === "check";
  const cmd = buildCommand(spec, prompt);
  if (readOnly && spec.readOnlyArgs) cmd.args.push(...spec.readOnlyArgs);
  const preview = `${cmd.bin} ${cmd.args.map((a) => (a === prompt ? '"<prompt>"' : a)).join(" ")}`;
  const refuse = (reason) => {
    task.attempts.push({ at: new Date().toISOString(), agent, mode: "dry-run", result: "not executed", reason });
    task.agent = agent;
    saveTask(root, task, env);
    return { executed: false, reason, command: preview };
  };
  if (!execute) return refuse("dry run (default) — paste the prompt into the agent, or re-run with --execute");
  if (env.XENDER_PM_ALLOW_EXEC !== "1") return refuse("execution disabled: set XENDER_PM_ALLOW_EXEC=1 after `xender-pm doctor` shows the agent ready");
  const needed = requiredApprovals(task);
  const missing = needed.filter((op) => !approve.includes(op));
  if (missing.length) {
    const items = (task.workItems || []).filter((w) => (w.sensitiveOps || []).some((op) => missing.includes(op))).map((w) => w.id);
    return refuse(`owner approval required for: ${missing.join(", ")}${items.length ? ` (${items.join(", ")})` : ""}. Paste the prompt for a verify/prepare-only run, or re-run with --approve ${needed.join(",")} only after Sahil says yes`);
  }
  if (readOnly && !spec.readOnlyArgs) return refuse(`${spec.label} has no verified read-only mode in ops/pm/agents.json (readOnlyArgs); paste the prompt instead`);
  const h = health || checkAgent(agent, spec);
  if (!h.installed) return refuse(`${spec.label} not installed`);
  if (h.auth === "not signed in" || (h.auth !== "verified" && !allowUnknownAuth)) return refuse(`${spec.label} sign-in ${h.auth}`);

  task.status = "IN_PROGRESS";
  task.agent = agent;
  if (needed.length) task.approvalsGranted = [...(task.approvalsGranted || []), { at: new Date().toISOString(), ops: needed, via: "--approve (owner)" }];
  saveTask(root, task, env);
  let output = "";
  let buffered = "";
  let saved = 0;
  let done = null;
  const handleLine = (line) => {
    onLine?.(line);
    for (const s of parseSignals(line)) {
      if (s.kind === "XPM-DONE") done = s.data;
      // Persist immediately: if the agent is killed one second later the milestone is still saved.
      addCheckpoint(root, taskId, { ...pick(s.data), agent, source: s.kind === "XPM-DONE" ? "agent-done" : "agent-stream", status: s.kind === "XPM-DONE" ? "REVIEW" : undefined }, env);
      saved++;
    }
  };
  const result = await new Promise((resolve) => {
    const child = spawnImpl(cmd.bin, cmd.args, { cwd: env.XENDER_PM_WORKDIR || root, stdio: ["ignore", "pipe", "pipe"], env });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);
    const onData = (d) => {
      const s = d.toString();
      output += s;
      buffered += s;
      const lines = buffered.split("\n");
      buffered = lines.pop();
      lines.forEach(handleLine);
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", (d) => (output += d.toString()));
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ code: -1, timedOut, error: e.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (buffered) handleLine(buffered);
      resolve({ code, timedOut });
    });
  });

  const interrupted = detectInterruption({ code: result.code, timedOut: result.timedOut, output }, cfg.interruptPatterns);
  const tail = redact(output.split("\n").filter(Boolean).slice(-6).join(" ⏎ ")).slice(0, 600);
  const fresh = getTask(root, taskId);
  fresh.attempts.push({ at: new Date().toISOString(), agent, mode: readOnly ? "execute-read-only" : "execute", result: interrupted ? "interrupted" : done ? "done" : "exited", reason: interrupted || null, checkpointsSaved: saved, approvedOps: needed });
  saveTask(root, fresh, env);
  if (interrupted) {
    addCheckpoint(root, taskId, { status: "INTERRUPTED", agent, source: "manager", blocker: `${spec.label} session stopped (${interrupted})`, note: `output tail: ${tail}`, notes: `Previous ${spec.label} run stopped: ${interrupted}. Resume from the last checkpoint; do not redo saved steps.` }, env);
  } else if (!done) {
    addCheckpoint(root, taskId, { status: "IN_PROGRESS", agent, source: "manager", note: `${spec.label} exited 0 without XPM-DONE; verify its work before continuing. Tail: ${tail}` }, env);
  }
  return { executed: true, command: preview, exitCode: result.code, interrupted, done: !!done, checkpointsSaved: saved };
}
