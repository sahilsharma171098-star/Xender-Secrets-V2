// XEND-PM-001 — Xender AI Project Manager (scripts/pm). Agents and GitHub are mocked; the backlog,
// release gates and GitHub snapshot are the real committed records in ops/pm/.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { main } from "../../scripts/pm/xender-pm.mjs";
import { splitRow, parseBacklog, loadMemory, syncGithub, markItem } from "../../scripts/pm/lib/sources.mjs";
import { matchProject, needsApproval, detectIntent, classifyRisk, requiredApprovals } from "../../scripts/pm/lib/planner.mjs";
import { stateBranch, syncState, compareTasks } from "../../scripts/pm/lib/gitsync.mjs";
import { getTask, addCheckpoint } from "../../scripts/pm/lib/store.mjs";
import { parseSignals, detectInterruption, checkAgent } from "../../scripts/pm/lib/agents.mjs";
import { redact } from "../../scripts/pm/lib/util.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLI = path.join(REPO, "scripts/pm/xender-pm.mjs");
const MOCK = path.join(REPO, "tests/fixtures/pm/mock-agent.mjs");
const noGit = () => null; // force the committed cache: tests must not depend on fetched refs
const READY = { installed: true, auth: "verified" };

function sandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "xpm-"));
  fs.mkdirSync(path.join(root, "ops"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  for (const f of ["projects.json", "agents.json", "github-snapshot.json"]) {
    fs.mkdirSync(path.join(root, "ops/pm"), { recursive: true });
    fs.copyFileSync(path.join(REPO, "ops/pm", f), path.join(root, "ops/pm", f));
  }
  fs.cpSync(path.join(REPO, "ops/pm/cache"), path.join(root, "ops/pm/cache"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs/TASKS.md"), "# Board\n\n## XEND-EXT-PAY-001 — SiteCheck payments\nStatus: IN_PROGRESS\n");
  fs.writeFileSync(path.join(root, ".gitignore"), "ops/pm/state/\n");
  // Point every agent adapter at the mock CLI.
  const agents = JSON.parse(fs.readFileSync(path.join(root, "ops/pm/agents.json"), "utf8"));
  for (const a of Object.values(agents.agents)) {
    a.bin = process.execPath;
    a.execArgs = [MOCK, "{prompt}"];
  }
  fs.writeFileSync(path.join(root, "ops/pm/agents.json"), JSON.stringify(agents));
  return root;
}

async function run(root, argv, extraEnv = {}) {
  const lines = [];
  const env = { ...process.env, XENDER_PM_HOME: root, XENDER_PM_NOW: "2026-11-04T19:00:00.000Z", XENDER_PM_ALLOW_EXEC: "", ...extraEnv };
  const code = await main(argv, { env, out: (s) => lines.push(s), git: noGit, health: READY });
  return { code, text: lines.join("\n") };
}

test("table rows keep pipes inside code spans", () => {
  assert.deepEqual(splitRow("| G2 | hash `a|b|c` | PASS |"), ["G2", "hash `a|b|c`", "PASS"]);
});

test("backlog parser reads the real PR #100 backlog", () => {
  const md = fs.readFileSync(path.join(REPO, "ops/pm/cache/MASTER_PENDING_TASKS.md"), "utf8");
  const items = parseBacklog(md);
  assert.ok(items.length >= 40);
  const mt5 = items.find((i) => i.id === "MT-005");
  assert.equal(mt5.category, "blocked");
  assert.equal(mt5.ownerAction, true);
  assert.deepEqual(mt5.dependsOn, ["MT-001", "MT-004"]);
});

test("reconciliation upgrades rows whose PR GitHub shows merged, and flags the conflict", () => {
  const m = loadMemory(sandbox(), { git: noGit });
  const byId = Object.fromEntries(m.items.map((i) => [i.id, i]));
  for (const id of ["MT-002", "MT-009", "MT-014", "MT-015"]) assert.equal(byId[id].category, "done", id);
  assert.match(byId["MT-002"].status, /PR #105 merged/);
  assert.ok(m.conflicts.some((c) => c.id === "MT-015"));
  assert.equal(byId["MT-004"].ready, true); // its dependency MT-002 is now done
  assert.equal(byId["MT-005"].ready, false); // owner purchase
  assert.equal(byId["MT-016"].prs[0].number, 108);
});

test("mark records an evidence-backed override and refuses without evidence", () => {
  const root = sandbox();
  assert.throws(() => markItem(root, "MT-003", "DONE", ""), /evidence/);
  markItem(root, "MT-003", "DONE", "XEND-CF-PREVIEW-001: 72/100 namespaces, preview build d0d00436 green");
  const m = loadMemory(root, { git: noGit });
  assert.equal(m.items.find((i) => i.id === "MT-003").category, "done");
});

test("short owner commands map to the right project and intent", () => {
  const m = loadMemory(sandbox(), { git: noGit });
  assert.equal(matchProject("Complete SiteCheck.", m).project.key, "SITECHECK");
  assert.equal(matchProject("Complete SiteCheck payments", m).project.key, "SITECHECK");
  assert.equal(matchProject("gridsnip next", m).project.key, "GRIDSNIP");
  assert.equal(matchProject("fix MT-041", m).project.key, "WEBSITE");
  assert.equal(matchProject("autotube ka video check karo", m).project.key, "AUTOTUBE");
  assert.equal(matchProject("hello there", m).project, null);
  assert.equal(detectIntent("Check now"), "check");
  assert.equal(detectIntent("Fix this"), "fix");
  assert.deepEqual(needsApproval("Deploy SiteCheck"), ["deploy"]);
});

test("unknown instruction asks which project instead of guessing", async () => {
  const r = await run(sandbox(), ["do the thing"]);
  assert.equal(r.code, 2);
  assert.match(r.text, /Known projects: SITECHECK/);
});

test("secrets never reach saved task files", () => {
  assert.equal(redact("token=ghp_abcdefghijklmnopqrstuvwxyz0123"), "token=[REDACTED]");
  assert.match(redact("Authorization: Bearer abcdefghijklmnopqrstuvwx"), /\[REDACTED\]/);
  assert.match(redact("/callback?code=4/0AbCdEfGhIjKlMn&state=xyzxyzxyzxyz"), /code=\[REDACTED\]&state=\[REDACTED\]/);
  assert.match(redact("salt: s3cr3tSaltValue"), /salt: \[REDACTED\]/);
});

test("agent signal parsing ignores malformed lines and detects interruptions", () => {
  const s = parseSignals('noise\nXPM-CHECKPOINT {"done":"a"}\nXPM-CHECKPOINT {bad\nXPM-DONE {"done":"b"}\nXPM-DONE ["x"]');
  assert.deepEqual(s.map((x) => x.kind), ["XPM-CHECKPOINT", "XPM-DONE"]);
  const pats = ["usage limit", "429"];
  assert.match(detectInterruption({ code: 1, output: "Usage limit reached" }, pats), /usage limit/);
  assert.equal(detectInterruption({ code: 0, output: 'XPM-DONE {"done":"x"}' }, pats), null);
  assert.equal(detectInterruption({ code: 0, timedOut: true, output: "" }, pats), "timed out");
});

test("doctor reports missing and signed-out CLIs without reading credentials", () => {
  const enoent = () => ({ status: null, error: Object.assign(new Error("x"), { code: "ENOENT" }) });
  assert.equal(checkAgent("codex", { label: "Codex", bin: "codex", authArgs: ["login", "status"], install: "npm i -g @openai/codex" }, { spawnImpl: enoent }).installed, false);
  const fake = (bin, args) => (args[0] === "--version" ? { status: 0, stdout: "2.1.0\n" } : { status: 0, stdout: '{"loggedIn": false}' });
  assert.equal(checkAgent("claude", { label: "Claude", bin: "claude", authArgs: ["auth", "status"] }, { spawnImpl: fake }).auth, "not signed in");
  const noStatus = () => ({ status: 0, stdout: "0.9.0" });
  assert.equal(checkAgent("gemini", { label: "Gemini", bin: "gemini", authArgs: null }, { spawnImpl: noStatus }).auth, "unknown");
});

test("dispatch is a dry run unless explicitly allowed; approval words block execution", async () => {
  const root = sandbox();
  await run(root, ["Complete SiteCheck"]);
  let r = await run(root, ["dispatch", "PM-SITECHECK-001", "--agent", "claude"]);
  assert.match(r.text, /Not executed: dry run/);
  r = await run(root, ["dispatch", "PM-SITECHECK-001", "--agent", "claude", "--execute"]);
  assert.match(r.text, /execution disabled/);
  await run(root, ["Deploy SiteCheck"]);
  const deployTask = getTask(root, "PM-SITECHECK-002");
  assert.ok(deployTask.approvalRequired.includes("deploy"));
  r = await run(root, ["dispatch", "PM-SITECHECK-002", "--agent", "claude", "--execute"], { XENDER_PM_ALLOW_EXEC: "1" });
  assert.match(r.text, /owner approval required for: deploy/);
  assert.equal(getTask(root, "PM-SITECHECK-002").status, "READY");
  await assert.rejects(run(root, ["dispatch", "PM-SITECHECK-002", "--agent", "claude", "--execute", "--approved"], { XENDER_PM_ALLOW_EXEC: "1" }), /--approved is no longer accepted/);
});

test("repeating the same command reuses the open task (no duplicates)", async () => {
  const root = sandbox();
  await run(root, ["Complete SiteCheck"]);
  const r = await run(root, ["Complete", "SiteCheck"]);
  assert.match(r.text, /reused/);
  assert.equal(fs.readdirSync(path.join(root, "ops/pm/state/tasks")).filter((f) => f.endsWith(".json")).length, 1);
});

test("manual checkpoints fold into task state and are redacted", async () => {
  const root = sandbox();
  await run(root, ["Complete SiteCheck"]);
  await run(root, ["checkpoint", "PM-SITECHECK-001", "--done", "ran tests with token=ghp_abcdefghijklmnopqrstuvwxyz0123", "--files", "a.mjs,b.mjs", "--files", "c.mjs", "--tests", "unit 150/150", "--next", "open PR", "--status", "in_progress"]);
  const t = getTask(root, "PM-SITECHECK-001");
  assert.equal(t.status, "IN_PROGRESS");
  assert.deepEqual(t.changedFiles, ["a.mjs", "b.mjs", "c.mjs"]);
  assert.equal(t.nextAction, "open PR");
  assert.ok(!fs.readFileSync(path.join(root, "ops/pm/state/tasks/PM-SITECHECK-001.json"), "utf8").includes("ghp_"));
  assert.throws(() => addCheckpoint(root, "PM-SITECHECK-001", { status: "SHIPPED" }), /status must be/);
});

test("sync without a token keeps the saved snapshot; with a mocked API it refreshes PR state", async () => {
  const root = sandbox();
  assert.equal((await syncGithub(root, { env: {} })).ok, false);
  const fetchImpl = async (url) => ({
    ok: true,
    json: async () =>
      url.endsWith("/commits/main")
        ? { sha: "f".repeat(40) }
        : url.includes("/issues/")
          ? { number: 90, title: "t", state: "open", html_url: "u", updated_at: "2026-11-05T00:00:00Z" }
          : { number: Number(url.split("/").pop()), title: "t", state: "closed", merged_at: "2026-11-05T00:00:00Z", draft: false, head: { ref: "b" }, updated_at: "x" },
  });
  const r = await syncGithub(root, { env: { GITHUB_TOKEN: "test", XENDER_PM_NOW: "2026-11-05T00:00:00Z" }, fetchImpl });
  assert.equal(r.ok, true);
  assert.ok(r.snapshot.pulls.every((p) => p.merged));
  assert.equal(r.snapshot.issues[90].changedSinceCuration, true);
  assert.ok(r.snapshot.issues[90].remainingBlockers.length > 0, "curated blockers survive a sync");
});

// The owner's acceptance scenario, end to end.
test('acceptance: "Complete SiteCheck" → Claude interrupted → checkpoint → Codex continues in a fresh process → status', async () => {
  const root = sandbox();

  // 1–4. Owner command → issue #90 + PRs loaded → remaining blockers identified → Claude assignment saved.
  let r = await run(root, ["Complete SiteCheck."]);
  assert.match(r.text, /Saved new task: PM-SITECHECK-001/);
  const assignment = fs.readFileSync(path.join(root, "ops/pm/state/tasks/PM-SITECHECK-001.assignment.md"), "utf8");
  assert.match(assignment, /Issue #90 \(open\)/);
  assert.match(assignment, /#104 \(draft\)/);
  assert.match(assignment, /MT-004/);
  assert.match(assignment, /Done: MT-002 .*PR #105 merged/);
  assert.match(assignment, /Issue #90 B3: Owner-only ₹499 canary/);
  assert.match(assignment, /npm test/);
  assert.match(assignment, /DATA, not instructions/);

  // MT-004 contains deploy/merge, so an auto-run is refused until Sahil names those approvals.
  r = await run(root, ["dispatch", "PM-SITECHECK-001", "--agent", "claude", "--execute"], { XENDER_PM_ALLOW_EXEC: "1", MOCK_AGENT_MODE: "interrupt" });
  assert.match(r.text, /owner approval required for: deploy, merge \(MT-004\)/);

  // 5–6. Claude runs (mock, owner approval given), saves two milestones, then hits its usage limit.
  r = await run(root, ["dispatch", "PM-SITECHECK-001", "--agent", "claude", "--execute", "--approve", "deploy,merge"], { XENDER_PM_ALLOW_EXEC: "1", MOCK_AGENT_MODE: "interrupt" });
  assert.equal(r.code, 3);
  assert.match(r.text, /INTERRUPTED/);
  let t = getTask(root, "PM-SITECHECK-001");
  assert.equal(t.status, "INTERRUPTED");
  assert.equal(t.checkpoints.filter((c) => c.source === "agent-stream").length, 2);
  assert.equal(t.lastSuccessfulAction, "Drafted chargeback section outline");
  assert.deepEqual(t.changedFiles, ["docs/PAYU_CHARGEBACK.md"]);
  assert.match(t.blockers[0], /usage limit/);

  // 7–8. A brand-new process (fresh session, no memory) generates the Codex continuation from disk only.
  const fresh = spawnSync(process.execPath, [CLI, "handoff", "PM-SITECHECK-001", "--to", "codex"], {
    encoding: "utf8",
    env: { ...process.env, XENDER_PM_HOME: root, XENDER_PM_NOW: "2026-11-04T19:30:00.000Z" },
  });
  assert.equal(fresh.status, 0, fresh.stderr);
  const cont = fresh.stdout;
  assert.match(cont, /^# CONTINUE Xender task PM-SITECHECK-001/);
  assert.match(cont, /OpenAI Codex CLI/);
  assert.match(cont, /Do NOT restart the investigation/);
  assert.match(cont, /NEXT EXACT ACTION\nMT-010: finish docs\/PAYU_CHARGEBACK.md steps 3-5/);
  assert.match(cont, /Last successful action: Drafted chargeback section outline/);
  assert.match(cont, /Confirmed Live E2E run 41900000001/);
  assert.match(cont, /Previous session: claude execute → interrupted/);
  assert.match(cont, /APPROVAL REQUIRED — not granted by this assignment: deploy, merge/);
  assert.ok(fs.existsSync(path.join(root, "ops/pm/state/tasks/PM-SITECHECK-001.continue-codex.md")));

  // Codex (mock) receives the continuation, finishes and reports DONE.
  r = await run(root, ["dispatch", "PM-SITECHECK-001", "--agent", "codex", "--execute", "--approve", "deploy,merge"], { XENDER_PM_ALLOW_EXEC: "1", MOCK_AGENT_MODE: "done", MOCK_REQUIRE_CONTINUATION: "1" });
  assert.equal(r.code, 0, r.text);
  t = getTask(root, "PM-SITECHECK-001");
  assert.equal(t.status, "REVIEW");
  assert.equal(t.commit, "abc1234");
  assert.match(t.pr, /pull\/999/);
  assert.equal(t.agent, "codex");

  // 9. Concise status for the owner.
  r = await run(root, ["status"]);
  assert.match(r.text, /PM-SITECHECK-001 \[REVIEW\] codex/);
  assert.match(r.text, /Owner action needed\? YES/);
  assert.ok(r.text.split("\n").length < 60);
});

// ---- Review blocker 1 (PR #110): a short command must never authorize a sensitive step ----

test("risk classifier flags sensitive operations in work items, not only in the owner's words", () => {
  assert.deepEqual(classifyRisk("Deploy main (+MT-002) to production, keep checkout flag OFF"), ["deploy"]);
  assert.deepEqual(classifyRisk("after the follow-up PR merges, confirm Live E2E"), ["merge"]);
  assert.deepEqual(classifyRisk("refund in PayU dashboard"), ["payment", "account"]);
  assert.deepEqual(classifyRisk("set SITECHECK_PRO_CHECKOUT_ENABLED=true"), ["payment"]);
  assert.deepEqual(classifyRisk("rotate the Google OAuth client secret"), ["secrets"]);
  assert.deepEqual(classifyRisk("build zip, submit in dashboard"), ["store-submit", "account"]);
  assert.deepEqual(classifyRisk("document PayU chargeback notification; keep manual"), []);
  assert.deepEqual(classifyRisk("Complete SiteCheck"), []);
});

test('regression: "Complete SiteCheck" does not auto-authorize the deployment inside MT-004', async () => {
  const root = sandbox();
  await run(root, ["Complete SiteCheck"]);
  const t = getTask(root, "PM-SITECHECK-001");
  assert.deepEqual(t.approvalRequired, ["deploy", "merge"]);
  const mt4 = t.workItems.find((w) => w.id === "MT-004");
  const mt10 = t.workItems.find((w) => w.id === "MT-010");
  assert.equal(mt4.risk, "sensitive");
  assert.deepEqual(mt4.sensitiveOps, ["deploy", "merge"]);
  assert.match(mt4.agentScope, /Prepare and verify only.*Do NOT perform: deploy, merge/);
  assert.equal(mt10.risk, "safe");

  const brief = fs.readFileSync(path.join(root, "ops/pm/state/tasks/PM-SITECHECK-001.assignment.md"), "utf8");
  assert.match(brief, /MT-004[\s\S]*NEEDS SAHIL'S APPROVAL: deploy, merge/);
  assert.match(brief, /"Complete SiteCheck" is NOT approval/);

  const env = { XENDER_PM_ALLOW_EXEC: "1", MOCK_AGENT_MODE: "done" };
  let r = await run(root, ["dispatch", "PM-SITECHECK-001", "--agent", "claude", "--execute"], env);
  assert.match(r.text, /Not executed: owner approval required for: deploy, merge \(MT-004\)/);
  r = await run(root, ["dispatch", "PM-SITECHECK-001", "--agent", "claude", "--execute", "--approve", "merge"], env);
  assert.match(r.text, /owner approval required for: deploy \(MT-004\)/);
  assert.equal(getTask(root, "PM-SITECHECK-001").status, "READY", "agent never started");
  assert.ok(getTask(root, "PM-SITECHECK-001").attempts.every((a) => a.mode === "dry-run"));

  // An old task file saved before this fix (approvalRequired: [], no risk fields) is still gated.
  const file = path.join(root, "ops/pm/state/tasks/PM-SITECHECK-001.json");
  const legacy = JSON.parse(fs.readFileSync(file, "utf8"));
  legacy.approvalRequired = [];
  legacy.workItems = legacy.workItems.map(({ id, task, status, next, evidence, gates }) => ({ id, task, status, next, evidence, gates }));
  fs.writeFileSync(file, JSON.stringify(legacy));
  assert.deepEqual(requiredApprovals(legacy), ["deploy", "merge"]);
  r = await run(root, ["dispatch", "PM-SITECHECK-001", "--agent", "claude", "--execute"], env);
  assert.match(r.text, /owner approval required for: deploy, merge/);

  // Explicit, complete approval is the only way through, and it is recorded.
  r = await run(root, ["dispatch", "PM-SITECHECK-001", "--agent", "claude", "--execute", "--approve", "deploy,merge"], env);
  assert.match(r.text, /reported DONE/);
  const done = getTask(root, "PM-SITECHECK-001");
  assert.deepEqual(done.attempts.at(-1).approvedOps, ["deploy", "merge"]);
  assert.deepEqual(done.approvalsGranted.at(-1).ops, ["deploy", "merge"]);
});

// ---- Review blocker 2 (PR #110): handoff must work across machines, not just on one disk ----

const G = { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid" };
function sh(cwd, ...args) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, ...G } });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
}
/** A bare "GitHub" remote with the project on main, plus machine A's clone. */
function remoteAndClone() {
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), "xpm-remote-"));
  sh(bare, "init", "--quiet", "--bare", "-b", "main");
  const a = sandbox();
  sh(a, "init", "--quiet", "-b", "main");
  sh(a, "add", "-A");
  sh(a, "commit", "--quiet", "-m", "project");
  sh(a, "remote", "add", "origin", bare);
  sh(a, "push", "--quiet", "origin", "main");
  return { bare, a };
}
function freshClone(bare) {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "xpm-clone-")), "repo");
  sh(path.dirname(dir), "clone", "--quiet", bare, dir);
  return dir;
}
const cli = (root, args, env = {}) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", env: { ...process.env, ...G, XENDER_PM_HOME: root, ...env } });

test("state branch name can never be main/master or unsafe", () => {
  assert.equal(stateBranch({}), "xender-pm-state");
  for (const b of ["main", "master", "HEAD", "-x", "a..b", "a b"]) assert.throws(() => stateBranch({ stateBranch: b }));
  assert.equal(syncState(sandbox(), {}).ok, false, "not a git repo: refuses, stays local");
});

test("task history merge: longer history wins, diverged history is a conflict", () => {
  const base = { checkpoints: [{ at: "1", done: "a" }], attempts: [] };
  const ahead = { checkpoints: [{ at: "1", done: "a" }, { at: "2", done: "b" }], attempts: [] };
  const other = { checkpoints: [{ at: "1", done: "a" }, { at: "3", done: "c" }], attempts: [] };
  assert.equal(compareTasks(base, ahead), "remote");
  assert.equal(compareTasks(ahead, base), "local");
  assert.equal(compareTasks(ahead, other), "conflict");
});

test("regression: checkpoint on machine A → resume from a FRESH CLONE on machine B (separate process)", async () => {
  const { bare, a } = remoteAndClone();
  const mainBefore = sh(bare, "rev-parse", "main");
  await run(a, ["Complete SiteCheck"]);
  let r = cli(a, ["checkpoint", "PM-SITECHECK-001", "--agent", "claude", "--done", "Confirmed Live E2E 41892558789 green", "--next", "MT-010: write docs/PAYU_CHARGEBACK.md", "--files", "docs/PAYU_CHARGEBACK.md", "--sync"]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /Shared PM state on branch xender-pm-state - pushed [0-9a-f]{7}/);
  assert.equal(sh(bare, "rev-parse", "main"), mainBefore, "main is never written");
  assert.equal(sh(a, "status", "--porcelain"), "", "working tree and index untouched");
  assert.equal(sh(a, "rev-parse", "--abbrev-ref", "HEAD"), "main");
  assert.match(sh(bare, "ls-tree", "-r", "--name-only", "xender-pm-state"), /tasks\/PM-SITECHECK-001\.json/);

  const b = freshClone(bare);
  assert.equal(fs.existsSync(path.join(b, "ops/pm/state")), false, "fresh clone has no local state");
  r = cli(b, ["handoff", "PM-SITECHECK-001", "--to", "codex"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Pulled shared PM state from xender-pm-state @ [0-9a-f]{7}/);
  assert.match(r.stdout, /# CONTINUE Xender task PM-SITECHECK-001/);
  assert.match(r.stdout, /Last successful action: Confirmed Live E2E 41892558789 green/);
  assert.match(r.stdout, /NEXT EXACT ACTION\nMT-010: write docs\/PAYU_CHARGEBACK.md/);
  assert.match(r.stdout, /Changed files so far: docs\/PAYU_CHARGEBACK.md/);

  // B continues and shares; A pulls B's progress (fast-forward, no conflict).
  r = cli(b, ["checkpoint", "PM-SITECHECK-001", "--agent", "codex", "--done", "Wrote chargeback doc", "--next", "open PR", "--sync"]);
  assert.equal(r.status, 0, r.stdout);
  r = cli(a, ["pull"]);
  assert.match(r.stdout, /1 task\(s\) updated/);
  assert.equal(getTask(a, "PM-SITECHECK-001").lastSuccessfulAction, "Wrote chargeback doc");
});

test("regression: concurrent checkpoints are detected as a conflict, nothing is overwritten or pushed", async () => {
  const { bare, a } = remoteAndClone();
  await run(a, ["Complete SiteCheck"]);
  assert.equal(cli(a, ["sync-state"]).status, 0);
  const b = freshClone(bare);
  assert.equal(cli(b, ["pull"]).status, 0);

  assert.equal(cli(a, ["checkpoint", "PM-SITECHECK-001", "--done", "A did X", "--sync"]).status, 0);
  const remoteAfterA = sh(bare, "rev-parse", "xender-pm-state");
  let r = cli(b, ["checkpoint", "PM-SITECHECK-001", "--done", "B did Y", "--sync"]);
  assert.equal(r.status, 4);
  assert.match(r.stdout, /NOT shared: conflict on PM-SITECHECK-001/);
  assert.equal(sh(bare, "rev-parse", "xender-pm-state"), remoteAfterA, "remote unchanged");
  assert.equal(getTask(b, "PM-SITECHECK-001").lastSuccessfulAction, "B did Y", "local work kept");
  assert.ok(fs.existsSync(path.join(b, "ops/pm/state/tasks/PM-SITECHECK-001.conflict-remote.json")));

  r = cli(b, ["sync-state", "--prefer", "PM-SITECHECK-001=remote"]);
  assert.equal(r.status, 0, r.stdout);
  assert.equal(getTask(b, "PM-SITECHECK-001").lastSuccessfulAction, "A did X");
  assert.ok(!fs.existsSync(path.join(b, "ops/pm/state/tasks/PM-SITECHECK-001.conflict-remote.json")));
});

test("regression: sync-state refuses to push state that contains a credential", async () => {
  const { bare, a } = remoteAndClone();
  await run(a, ["Complete SiteCheck"]);
  const file = path.join(a, "ops/pm/state/tasks/PM-SITECHECK-001.json");
  const t = JSON.parse(fs.readFileSync(file, "utf8"));
  t.nextAgentNotes = "use ghp_abcdefghijklmnopqrstuvwxyz0123456789"; // bypasses redact(), e.g. a hand edit
  fs.writeFileSync(file, JSON.stringify(t));
  const r = cli(a, ["sync-state"]);
  assert.equal(r.status, 4);
  assert.match(r.stdout, /NOT shared: possible credential in state.*tasks\/PM-SITECHECK-001\.json/);
  assert.ok(!r.stdout.includes("ghp_"), "the value itself is never printed");
  assert.equal(spawnSync("git", ["rev-parse", "--verify", "--quiet", "refs/heads/xender-pm-state"], { cwd: bare }).status, 1, "nothing pushed");
});

test("committed seed tasks are imported once and never overwrite newer local progress", async () => {
  const root = sandbox();
  fs.cpSync(path.join(REPO, "ops/pm/seed"), path.join(root, "ops/pm/seed"), { recursive: true });
  let r = await run(root, ["status"]);
  assert.match(r.text, /PM-SITECHECK-001 \[READY\].*needs your approval: deploy, merge/);
  assert.match(r.text, /Shared: NOT YET - tasks are on this disk only/);
  await run(root, ["checkpoint", "PM-SITECHECK-001", "--done", "local progress"]);
  r = await run(root, ["status"]);
  assert.equal(getTask(root, "PM-SITECHECK-001").lastSuccessfulAction, "local progress");
  assert.equal(loadMemory(root, { git: noGit }).items.find((i) => i.id === "MT-003").category, "done", "seed override imported");
});
