#!/usr/bin/env node
// XEND-PM-001 — Xender AI Project Manager (CLI). See docs/XENDER_PM.md.
//
//   npm run pm -- status                      what is done / pending / blocked / needs you
//   npm run pm -- next                        the one next move (agent side + owner side)
//   npm run pm -- "Complete SiteCheck"        new bounded assignment, saved as PM-<PROJECT>-NNN
//   npm run pm -- brief <id> [--agent codex]  print the assignment prompt
//   npm run pm -- checkpoint <id> --done ".." --next ".." [--files a,b --tests ".." --commit sha --pr url --blocker ".." --status REVIEW]
//   npm run pm -- handoff <id> --to gemini    continuation prompt for the next agent (saved to a file)
//   npm run pm -- resume <id> --agent codex   same, and marks the task as picked up
//   npm run pm -- dispatch <id> --agent claude [--execute] [--continue]   dry run unless allowed
//   npm run pm -- doctor | list | sync | mark MT-003 --status DONE --evidence ".."
import fs from "node:fs";
import path from "node:path";
import { pmRoot, isoNow } from "./lib/util.mjs";
import { loadMemory, markItem, syncGithub } from "./lib/sources.mjs";
import { planAssignment } from "./lib/planner.mjs";
import { createTask, getTask, listTasks, addCheckpoint, saveTask } from "./lib/store.mjs";
import { assignmentPrompt, continuationPrompt } from "./lib/prompts.mjs";
import { doctor, dispatch } from "./lib/agents.mjs";
import { renderStatus, renderNext } from "./lib/summary.mjs";
import { isMain } from "../lib/is-main.mjs";

const COMMANDS = new Set(["status", "next", "start", "brief", "checkpoint", "handoff", "resume", "dispatch", "doctor", "list", "sync", "mark", "help"]);
const MULTI = new Set(["files", "tests"]);

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
  const f = path.join(root, "ops/pm/tasks", `${id}.${name}.md`);
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
  const memory = () => loadMemory(root, { git });
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
      out(`Work items: ${task.focus.join(", ") || "none agent-ready"}${task.approvalRequired.length ? ` | NEEDS YOUR APPROVAL: ${task.approvalRequired.join(", ")}` : ""}`);
      out(`Your action items: ${task.ownerBlockers.length}`);
      out(`Assignment for ${agent}: ${file}`);
      out(`Next: paste that file into ${agent}, or run: npm run pm -- dispatch ${task.id} --agent ${agent}`);
      return 0;
    }
    case "brief": {
      const t = getTask(root, pos[1]);
      out(assignmentPrompt(t, agentOf(t.agent)));
      return 0;
    }
    case "checkpoint": {
      const t = addCheckpoint(root, pos[1], { ...flags, agent: flags.agent }, env);
      out(`Checkpoint saved for ${t.id} [${t.status}] - next: ${t.nextAction}`);
      return 0;
    }
    case "handoff":
    case "resume": {
      const t = getTask(root, pos[1]);
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
      const t = getTask(root, pos[1]);
      const agent = agentOf(t.agent);
      const cont = flags.continue || t.checkpoints.length > 0;
      const prompt = cont ? continuationPrompt(t, agent) : assignmentPrompt(t, agent);
      const r = await dispatch(root, m.agents, t.id, { agent, prompt, execute: !!flags.execute, approved: !!flags.approved, allowUnknownAuth: !!flags["allow-unknown-auth"], env, health, timeoutMs: (Number(flags["timeout-min"]) || 45) * 60000, onLine: flags.verbose ? out : undefined });
      if (!r.executed) {
        const file = save(root, t.id, `${cont ? "continue" : "assignment"}-${agent}`, prompt);
        out(`Not executed: ${r.reason}\nWould run: ${r.command}\nPrompt saved: ${file}`);
        return 0;
      }
      out(`${agent} finished: exit ${r.exitCode}, checkpoints saved ${r.checkpointsSaved}, ${r.interrupted ? `INTERRUPTED (${r.interrupted}) - run: npm run pm -- handoff ${t.id} --to <other agent>` : r.done ? "reported DONE - review the PR" : "no DONE signal - check its work"}`);
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
