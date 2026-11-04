#!/usr/bin/env node
// XEND-PM-001 — acceptance demo: `npm run pm:demo`.
// Uses the REAL backlog, release gates and GitHub snapshot, copied into a throwaway folder.
// The coding agents are a MOCK CLI (tests/fixtures/pm/mock-agent.mjs): the interruption, the
// checkpoints it emits and the final "DONE" are simulated and are never written to ops/pm/tasks.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { REPO_ROOT } from "./lib/util.mjs";
import { isMain } from "../lib/is-main.mjs";

const CLI = path.join(REPO_ROOT, "scripts/pm/xender-pm.mjs");
const MOCK = path.join(REPO_ROOT, "tests/fixtures/pm/mock-agent.mjs");

export function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "xender-pm-demo-"));
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.mkdirSync(path.join(root, "ops/pm"), { recursive: true });
  for (const f of ["projects.json", "github-snapshot.json", "overrides.json"]) {
    const src = path.join(REPO_ROOT, "ops/pm", f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(root, "ops/pm", f));
  }
  fs.cpSync(path.join(REPO_ROOT, "ops/pm/cache"), path.join(root, "ops/pm/cache"), { recursive: true });
  for (const d of ["TASKS.md", "MASTER_PENDING_TASKS.md", "RELEASE_GATES.md"]) {
    const src = path.join(REPO_ROOT, "docs", d);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(root, "docs", d));
  }
  const agents = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "ops/pm/agents.json"), "utf8"));
  for (const a of Object.values(agents.agents)) {
    a.bin = process.execPath;
    a.execArgs = [MOCK, "{prompt}"];
    a.versionArgs = ["--version"];
    a.authArgs = ["-e", "console.log(JSON.stringify({loggedIn:true}))"]; // mock sign-in check
  }
  fs.writeFileSync(path.join(root, "ops/pm/agents.json"), JSON.stringify(agents, null, 2));
  return root;
}

function step(root, title, args, env = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", env: { ...process.env, XENDER_PM_HOME: root, ...env } });
  return { title, cmd: `xender-pm ${args.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")}`, code: r.status, out: (r.stdout + r.stderr).trim() };
}

export function runDemo() {
  const root = makeSandbox();
  const exec = { XENDER_PM_ALLOW_EXEC: "1" };
  const steps = [
    step(root, "1-4. Owner command → issue #90 + PRs → completed work and blockers → Claude assignment saved", ["Complete SiteCheck."]),
    step(root, "5-6. Claude Code session (SIMULATED) saves milestones, then hits its usage limit", ["dispatch", "PM-SITECHECK-001", "--agent", "claude", "--execute"], { ...exec, MOCK_AGENT_MODE: "interrupt" }),
    step(root, "7-8. Fresh process: continuation for Codex built only from the saved checkpoint", ["handoff", "PM-SITECHECK-001", "--to", "codex"]),
    step(root, "     Codex session (SIMULATED) continues from the checkpoint and reports DONE", ["dispatch", "PM-SITECHECK-001", "--agent", "codex", "--execute"], { ...exec, MOCK_AGENT_MODE: "done", MOCK_REQUIRE_CONTINUATION: "1" }),
    step(root, "9. Owner status summary", ["status", "SITECHECK"]),
  ];
  const assignment = fs.readFileSync(path.join(root, "ops/pm/tasks/PM-SITECHECK-001.assignment.md"), "utf8");
  const task = JSON.parse(fs.readFileSync(path.join(root, "ops/pm/tasks/PM-SITECHECK-001.json"), "utf8"));
  fs.rmSync(root, { recursive: true, force: true });
  return { steps, assignment, task };
}

if (isMain(import.meta.url)) {
  const { steps, assignment, task } = runDemo();
  const show = process.argv.includes("--full");
  console.log("XENDER PM ACCEPTANCE DEMO — real repo metadata, SIMULATED agents (no real agent, payment or deploy)\n");
  for (const s of steps) {
    console.log(`### ${s.title}\n$ ${s.cmd}   (exit ${s.code})`);
    const lines = s.out.split("\n");
    console.log(show || lines.length <= 30 ? s.out : `${lines.slice(0, 22).join("\n")}\n  ... (${lines.length - 22} more lines; --full to show)`);
    console.log("");
  }
  console.log(`### Claude assignment (first 25 lines of ${assignment.split("\n").length})\n${assignment.split("\n").slice(0, 25).join("\n")}\n`);
  console.log(`### Final task record: status ${task.status}, agent ${task.agent}, checkpoints ${task.checkpoints.length}, attempts ${task.attempts.map((a) => `${a.agent}:${a.result}`).join(" → ")}`);
  const ok = steps.every((s, i) => (i === 1 ? s.code === 3 : s.code === 0)) && task.status === "REVIEW";
  console.log(ok ? "\nRESULT: PASS" : "\nRESULT: FAIL");
  process.exit(ok ? 0 : 1);
}
