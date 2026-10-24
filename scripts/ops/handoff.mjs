// XEND-HQ-001 — AI failover handoff.
//
// When one AI (Claude, Codex, Gemini, ChatGPT) has to stop mid-task — usage limit, crash, end of
// day — run `npm run ops:handoff` and commit ops/HANDOFF.md. The next AI reads AGENTS.md and that
// file and carries on. The repo is the memory; no agent-to-agent connection is needed.
//
// The generated part (branch, commits, uncommitted files, open tasks) is rebuilt every run.
// The "Notes from the last agent" section is written by the agent and kept between runs.
//
//   npm run ops:handoff                       # refresh ops/HANDOFF.md
//   npm run ops:handoff -- --agent codex      # record who is handing over
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isMain } from "../lib/is-main.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = path.join(ROOT, "ops", "HANDOFF.md");
const NOTES = "## Notes from the last agent";
const NOTES_TEMPLATE = `${NOTES}

<!-- Replace this before you stop. Keep it short and concrete. -->
- **Task:** (task ID from docs/TASKS.md)
- **Done so far:**
- **Next step:** (the very next command or edit)
- **Watch out for:**
- **Waiting on Sahil:**
`;

/** Open tasks from docs/TASKS.md: every "## ID — title" whose Status line is not DONE. */
export function openTasks(md) {
  const out = [];
  const blocks = String(md || "").split(/^## /m).slice(1);
  for (const b of blocks) {
    const title = b.split("\n")[0].trim();
    if (!/^[A-Z][A-Z0-9-]*-\d+/.test(title)) continue; // skip "Task creation rule" and similar
    const status = (b.match(/^Status:\s*(.+)$/m) || [])[1]?.trim() || "UNKNOWN";
    if (/^DONE\b/i.test(status)) continue;
    out.push({ title, status });
  }
  return out;
}

/** Keeps the agent-written notes section from an existing HANDOFF.md. */
export function keptNotes(existing) {
  const i = String(existing || "").indexOf(NOTES);
  return i >= 0 ? existing.slice(i).trimEnd() + "\n" : NOTES_TEMPLATE;
}

export function renderHandoff({ now, agent, branch, commits, dirty, tasks, notes }) {
  const list = (a, empty, pad = "") => (a.length ? a.map((x) => `${pad}- ${x}`).join("\n") : `${pad}- ${empty}`);
  return `# Handoff — read this after AGENTS.md

Generated ${now}${agent ? ` by **${agent}**` : ""} with \`npm run ops:handoff\`. Everything above the notes section is rebuilt on each run.

## Where the work is
- Branch: \`${branch}\`
- Last commits:
${list(commits.map((c) => `\`${c}\``), "none", "  ")}

## Uncommitted changes
${list(dirty.map((d) => `\`${d}\``), "none — working tree clean")}

## Open tasks (docs/TASKS.md)
${list(tasks.map((t) => `${t.title} — ${t.status}`), "none")}

## How to resume
1. Read \`AGENTS.md\`, then this file, then the task's section in \`docs/TASKS.md\`.
2. Fetch \`origin/main\` and check the recorded branch/PR's current state. Continue that branch only while its task/PR is still active; after merge or closure, start new work from current main on a new task branch. Preserve local changes and keep one owner per branch.
3. Run the task's applicable checks before and after your change; handoff changes use \`node --test tests/unit/handoff.test.mjs\`, and AI workspace changes use \`node --test tests/operations/ai-workspace.test.mjs\`. Report host limits separately from ThinkPad or provider access.
4. Before you stop: update the notes below, run \`npm run ops:handoff -- --agent <you>\`, commit.

${notes}`;
}

// trimEnd, not trim: `git status --porcelain` lines start with a meaningful space.
const git = (...args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trimEnd(); } catch { return ""; } };

function main() {
  const argv = process.argv.slice(2);
  const ai = argv.indexOf("--agent");
  const agent = ai >= 0 ? String(argv[ai + 1] || "").slice(0, 40) : "";
  const existing = fs.existsSync(FILE) ? fs.readFileSync(FILE, "utf8") : "";
  const tasksMd = fs.existsSync(path.join(ROOT, "docs", "TASKS.md")) ? fs.readFileSync(path.join(ROOT, "docs", "TASKS.md"), "utf8") : "";
  const text = renderHandoff({
    now: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
    agent,
    branch: git("rev-parse", "--abbrev-ref", "HEAD") || "unknown",
    commits: git("log", "-5", "--format=%h %s").split("\n").filter(Boolean),
    dirty: git("status", "--porcelain").split("\n").filter(Boolean).filter((l) => !/ops\/HANDOFF\.md$/.test(l)),
    tasks: openTasks(tasksMd),
    notes: keptNotes(existing),
  });
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, text);
  console.log(`Wrote ${path.relative(ROOT, FILE)} — fill in the notes section, then commit it.`);
}

if (isMain(import.meta.url)) main();
