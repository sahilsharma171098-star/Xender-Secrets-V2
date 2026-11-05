#!/usr/bin/env node
// XEND-PM-001 — Xender AI Project Manager (CLI). See docs/XENDER_PM.md.
//
//   npm run pm -- status                      what is done / pending / blocked / needs you
//   npm run pm -- next                        the one next move (agent side + owner side)
//   npm run pm -- "Complete SiteCheck"        new bounded assignment, saved as PM-<PROJECT>-NNN
//   npm run pm -- brief <id> [--agent codex]  print the assignment prompt
//   npm run pm -- checkpoint <id> --done ".." --next ".." [--files a,b --tests ".." --commit sha --pr url --blocker ".." --status REVIEW] [--sync]
//   npm run pm -- handoff <id> --to gemini    continuation prompt for the next agent (saved to a file)
//   npm run pm -- resume <id> --agent codex   same, and marks the task as picked up
//   npm run pm -- sync-state [--prefer PM-X-001=local|remote]   share tasks/checkpoints via the state branch
//   npm run pm -- pull                        fetch shared tasks only (resume/handoff do this when a task is missing)
//   npm run pm -- dispatch <id> --agent claude [--execute] [--approve deploy,merge]   dry run unless allowed
//   npm run pm -- doctor | list | sync | mark MT-003 --status DONE --evidence ".."
import fs from "node:fs";
import path from "node:path";
import { pmRoot, isoNow, list, statePath } from "./lib/util.mjs";
import { syncState, pullState, isRepo } from "./lib/gitsync.mjs";
import { loadMemory, markItem, syncGithub } from "./lib/sources.mjs";
import { planAssignment } from "./lib/planner.mjs";
import { createTask, getTask, listTasks, addCheckpoint, saveTask, importSeed } from "./lib/store.mjs";
import { requiredApprovals } from "./lib/planner.mjs";
import { assignmentPrompt, continuationPrompt } from "./lib/prompts.mjs";
import { doctor, dispatch } from "./lib/agents.mjs";
import { renderStatus, renderNext } from "./lib/summary.mjs";
import { isMain } from "../lib/is-main.mjs";

const COMMANDS = new Set(["status", "next", "start", "brief", "checkpoint", "handoff", "resume", "dispatch", "doctor", "list", "sync", "sync-state", "pull", "mark", "help"]);
const MULTI = new Set(["files", "tests", "prefer", "approve"]);

export function parseArgs(argv) {
  const pos = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, inline] = a.slice(2).split("=", 2);
      const v = inline ?? (argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true);
      if (MULTI.has(k)) (flags[k] ||= []).push(v);
      else flags[k] = v;
    } else pos.push(a);
  }
  return { pos, flags };
}

function save(root, id, name, text) {
  const f = statePath(root, "tasks", `${id}.${name}.md`);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, text);
  return path.relative(root, f);
}

export async function main(argv, { env = process.env, out = (s) => console.log(s), git, health } = {}) {
  const root = pmRoot(env);
  let { pos, flags } = parseArgs(argv);
  let cmd = pos[0];
  if (!cmd) cmd = "help";
  else if (!COMMANDS.has(cmd)) {
    pos = ["start", ...pos]; // bare text = a new instruction: xender-pm "Complete SiteCheck"
    cmd = "start";
  }
  importSeed(root);
  const memory = () => loadMemory(root, { git });
  const cfg = () => memory().projects;
  // A fresh clone has no local task files: pull the shared state branch once, then retry.
  const task = (id) => {
    try {
      return getTask(root, id);
    } catch (e) {
      if (!isRepo(root)) throw e;
      const r = pullState(root, cfg(), { remote: flags.remote || "origin" });
      out(`Pulled shared PM state from ${r.branch}${r.sha ? ` @ ${r.sha.slice(0, 7)}` : " (branch not created yet)"}${r.conflicts.length ? ` - CONFLICT on ${r.conflicts.join(", ")}` : ""}`);
      return getTask(root, id);
    }
  };
  const share = () => {
    const prefer = Object.fromEntries(list(flags.prefer).map((x) => x.split("=")).filter(([k, v]) => k && /^(local|remote)$/.test(v)).map(([k, v]) => [k.toUpperCase(), v]));
    const r = syncState(root, cfg(), { remote: flags.remote || "origin", prefer, env });
    out(r.ok ? `Shared PM state on branch ${r.branch}${r.pushed ? ` - pushed ${r.sha.slice(0, 7)}` : " - already up to date"}${r.pulled?.length ? ` | pulled: ${r.pulled.join(", ")}` : ""}` : `NOT shared: ${r.reason}`);
    return r.ok ? 0 : 4;
  };
  const agentOf = (fallback) => String(flags.agent || flags.to || fallback || "claude").toLowerCase();

  switch (cmd) {
    case "help":
      out(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//   ")).map((l) => l.slice(5)).join("\n"));
      return 0;
    case "status":
      out(renderStatus(memory(), { only: pos[1], now: isoNow(env) }));
      return 0;
    case "next":
      out(renderNext(memory()));
      return 0;
    case "list": {
      const tasks = listTasks(root);
      out(tasks.length ? tasks.map((t) => `${t.id} [${t.status}] ${t.agent} - ${t.objective}`).join("\n") : "No saved tasks.");
      return 0;
    }
    case "start": {
      const instruction = pos.slice(1).join(" ").trim();
      if (!instruction) throw new Error('Give an instruction, e.g. xender-pm "Complete SiteCheck"');
      const m = memory();
      const plan = planAssignment(instruction, m, { limit: Number(flags.limit) || 2 });
      if (plan.error) {
        out(plan.error);
        return 2;
      }
      plan.sources = m.sources;
      const agent = agentOf();
      const { task, reused } = createTask(root, plan, { instruction, agent, env });
      const file = save(root, task.id, "assignment", assignmentPrompt(task, agent));
      out(`${reused ? "Existing open task reused (no duplicate created)" : "Saved new task"}: ${task.id} - ${task.projectName}`);
      out(`Objective: ${task.objective}`);
      out(`Work items: ${task.focus.join(", ") || "none agent-ready"}${task.approvalRequired.length ? ` | NEEDS YOUR APPROVAL: ${task.approvalRequired.join(", ")} — auto-run is refused until approved; paste the assignment for the safe verify/prepare part` : ""}`);
      out(`Your action items: ${task.ownerBlockers.length}`);
      out(`Assignment for ${agent}: ${file}`);
      out(`Next: paste that file into ${agent}, or run: npm run pm -- dispatch ${task.id} --agent ${agent}`);
      out(`Saved on this disk only. Share it with other machines/agents: npm run pm -- sync-state`);
      return 0;
    }
    case "brief": {
      const t = task(pos[1]);
      out(assignmentPrompt(t, agentOf(t.agent)));
      return 0;
    }
    case "checkpoint": {
      task(pos[1]);
      const t = addCheckpoint(root, pos[1], { ...flags, agent: flags.agent }, env);
      out(`Checkpoint saved for ${t.id} [${t.status}] - next: ${t.nextAction}`);
      if (flags.sync) return share();
      out("Saved locally. Add --sync (or run sync-state) so another machine can resume.");
      return 0;
    }
    case "handoff":
    case "resume": {
      const t = task(pos[1]);
      const agent = agentOf(t.agent);
      const prompt = continuationPrompt(t, agent);
      const file = save(root, t.id, `continue-${agent}`, prompt);
      if (cmd === "resume") {
        t.attempts.push({ at: isoNow(env), agent, mode: "resume", result: "prompt issued" });
        t.agent = agent;
        if (t.status === "INTERRUPTED" || t.status === "READY") t.status = "IN_PROGRESS";
        saveTask(root, t, env);
      }
      if (flags.quiet) out(`Continuation for ${agent}: ${file}`);
      else out(`${prompt}\n---\nSaved: ${file}`);
      return 0;
    }
    case "dispatch": {
      const m = memory();
      const t = task(pos[1]);
      const agent = agentOf(t.agent);
      if (flags.approved !== undefined) throw new Error(`--approved is no longer accepted. Name each approved operation, e.g. --approve ${requiredApprovals(t).join(",") || "deploy"}`);
      const cont = flags.continue || t.checkpoints.length > 0;
      const prompt = cont ? continuationPrompt(t, agent) : assignmentPrompt(t, agent);
      const r = await dispatch(root, m.agents, t.id, { agent, prompt, execute: !!flags.execute, approve: list(flags.approve).map((x) => x.toLowerCase()), allowUnknownAuth: !!flags["allow-unknown-auth"], env, health, timeoutMs: (Number(flags["timeout-min"]) || 45) * 60000, onLine: flags.verbose ? out : undefined });
      if (!r.executed) {
        const file = save(root, t.id, `${cont ? "continue" : "assignment"}-${agent}`, prompt);
        out(`Not executed: ${r.reason}\nWould run: ${r.command}\nPrompt saved: ${file}`);
        return 0;
      }
      out(`${agent} finished: exit ${r.exitCode}, checkpoints saved ${r.checkpointsSaved}, ${r.interrupted ? `INTERRUPTED (${r.interrupted}) - run: npm run pm -- handoff ${t.id} --to <other agent>` : r.done ? (t.intent === "check" ? "reported DONE (read-only run: no changes expected; review its findings)" : "reported DONE - review the PR") : "no DONE signal - check its work"}`);
      return r.interrupted ? 3 : 0;
    }
    case "doctor": {
      const rows = doctor(memory().agents);
      for (const r of rows) out(`${r.label.padEnd(18)} installed: ${r.installed ? "yes" : "no "}  sign-in: ${r.auth.padEnd(13)} ${r.version || ""}  ${r.detail}`);
      out(`Auto-execution: ${env.XENDER_PM_ALLOW_EXEC === "1" ? "ENABLED for this shell (XENDER_PM_ALLOW_EXEC=1)" : "off (default). Prompts are saved for copy-paste."}`);
      out("Usage limits: not readable through any official CLI interface; interrupted runs are detected and checkpointed instead.");
      return 0;
    }
    case "sync": {
      const r = await syncGithub(root, { env });
      out(r.ok ? `GitHub snapshot refreshed: ${r.snapshot.pulls.length} PRs, main ${r.snapshot.mainSha?.slice(0, 7)}` : `Not refreshed: ${r.reason}`);
      return 0;
    }
    case "sync-state":
      return share();
    case "pull": {
      const r = pullState(root, cfg(), { remote: flags.remote || "origin" });
      out(`Pulled from ${r.branch}${r.sha ? ` @ ${r.sha.slice(0, 7)}` : " (branch not created yet)"}: ${r.pulled.length} task(s) updated${r.conflicts.length ? `; CONFLICT on ${r.conflicts.join(", ")} (run sync-state --prefer <ID>=local|remote)` : ""}`);
      return r.conflicts.length ? 4 : 0;
    }
    case "mark": {
      const r = markItem(root, pos[1], flags.status || "DONE", flags.evidence, env);
      out(`${pos[1]} recorded as ${r.status} (${r.evidence})`);
      return 0;
    }
  }
  return 1;
}

if (isMain(import.meta.url)) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e) => {
      console.error(`xender-pm: ${e.message}`);
      process.exit(1);
    },
  );
}
