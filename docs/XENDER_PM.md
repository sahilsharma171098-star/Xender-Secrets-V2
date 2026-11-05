# Xender PM — the project manager for your AI agents (XEND-PM-001)

**The problem it fixes:** you tell ChatGPT/Codex, Claude or Gemini "Complete SiteCheck" or "Next".
Each new chat investigates the whole repo again, uses up its limit, then forgets everything.

**What Xender PM does:** it remembers the project in the repository. It turns your short command into one
small, exact assignment and saves progress after every step. When an agent stops halfway, it gives the
next agent a "continue from here" prompt.

No server, no website, no paid API. It reads files that already exist: the master backlog and release gates
(PR #100), GitHub issue/PR status, and `docs/TASKS.md`.

## One-time setup (laptop)

```bash
git clone https://github.com/sahilsharma171098-star/Xender-Secrets-V2
cd Xender-Secrets-V2
npm run pm -- doctor        # shows which agents (Claude Code / Codex / Gemini) are installed and signed in
npm link                    # optional: lets you type `xender-pm ...` instead of `npm run pm -- ...`
```

Needs Node 22 (already used by this repo). Nothing else to install.

## Daily use — 6 commands

| You want | Type | Simple meaning |
| --- | --- | --- |
| Where are we? | `npm run pm -- status` | Done (ho gaya) / pending (baaki) / blocked (ruka hua) / your action (aapka kaam) |
| What now? | `npm run pm -- next` | One next step for the agent + one for you |
| Give work | `npm run pm -- "Complete SiteCheck"` | Saves task `PM-SITECHECK-001` + a ready-to-paste assignment file |
| Prompt for an agent | `npm run pm -- brief PM-SITECHECK-001 --agent claude` | Prints the assignment |
| Agent stopped (limit hit) | `npm run pm -- handoff PM-SITECHECK-001 --to codex` | "Continue from here" prompt for another agent |
| Pick it up | `npm run pm -- resume PM-SITECHECK-001 --agent gemini` | Same as handoff, and marks the task as taken |

Other commands: `list`, `checkpoint`, `sync-state`, `pull`, `dispatch`, `doctor`, `sync`, `mark`. Run `npm run pm -- help` to see them.

### The normal flow

1. `npm run pm -- "Complete SiteCheck"` prints the file path, e.g. `ops/pm/state/tasks/PM-SITECHECK-001.assignment.md`.
2. Open Claude Code (or Codex/Gemini) in the repo folder and say:
   **"Do the task in ops/pm/state/tasks/PM-SITECHECK-001.assignment.md"**. That is the whole prompt.
3. The agent saves progress with `npm run pm -- checkpoint PM-SITECHECK-001 ... --sync` after each step.
   `--sync` shares it so a different laptop or cloud session can continue (see "Sharing between machines").
4. If it stops (usage limit, crash, end of day), run `npm run pm -- handoff PM-SITECHECK-001 --to codex`.
   Give Codex the saved file it prints. It continues from the last checkpoint and does not start over.
5. `npm run pm -- status` tells you what happened and whether **you** need to do something.

Short commands it understands: `Complete <project>`, `Check <project>` (read-only check), `Fix <project>`,
`Next`, `Deploy <project>` (always marked **needs your approval**), or a backlog ID such as `fix MT-041`.
Projects: SiteCheck/PayU, GridSnip, AutoTube, website. Edit keywords in `ops/pm/projects.json`.

## Approval: what an agent may do alone

Every selected backlog item is checked for sensitive operations: **deploy, merge, payment** (charge, refund,
canary purchase, turning checkout on), **secrets**, **store-submit**, **delete**, **account** (dashboards,
DNS, billing). This check covers the item itself, not only your words. So "Complete SiteCheck" does
**not** approve the deploy that is inside MT-004.

- In the assignment such an item is split into **AGENT MAY** (verify, read CI/logs, prepare on a branch)
  and **NEEDS SAHIL'S APPROVAL** (the listed operations). The prompt says plainly that a short command is not approval.
- The split is an instruction inside the **pasted prompt**. Automatic runs (`dispatch --execute`) are
  **refused as a whole** while any sensitive operation is unapproved. They do not run "only the safe part"
  (fail-closed). To get the safe part done, paste the assignment into an agent session.
- `status` shows `needs your approval: deploy, merge` next to the task.

## Automatic agent runs (optional, off by default)

`npm run pm -- dispatch PM-SITECHECK-001 --agent claude` only saves the prompt and shows the command
(dry run). It runs the agent itself only when **all** of these are true:

- `--execute` is given **and** the shell has `XENDER_PM_ALLOW_EXEC=1`;
- `doctor` shows the CLI installed and signed in (its own `auth status` / `login status` command);
- the task has no sensitive operations, **or** you name every one of them after saying yes:
  `--approve deploy,merge`. A partial list is refused, and the old yes/no `--approved` flag is no longer accepted.
  The list is recomputed from the task content at run time, so an older task file cannot skip the check.
  Approvals given are recorded in the task (`approvalsGranted`).
- **Read-only tasks** (`Check ...` commands) run with the CLI's tool restriction from `ops/pm/agents.json`
  (`readOnlyArgs`). For Claude Code that is `--tools Read,Grep,Glob`: no shell, no edits, so the agent reports
  checkpoints as `XPM-CHECKPOINT` lines. Codex and Gemini have no verified read-only flag here yet, so their
  read-only tasks are refused for auto-run (paste instead).

While the agent runs, every `XPM-CHECKPOINT {...}` line it prints is saved at once. If the run ends with a
usage-limit message, a non-zero exit or a timeout, the task becomes `INTERRUPTED` and
`handoff` is ready for the next agent. Claude Code in `-p` mode needs file-edit permission to change code.
Add your chosen flag to `ops/pm/agents.json` (`execArgs`) yourself; the default does not bypass permissions.

Usage limits: no official CLI shows your remaining subscription quota, so Xender PM does not guess.
It detects a stopped run and saves the checkpoint instead.

## Sharing between machines (laptop ↔ cloud ↔ another agent)

Tasks and checkpoints are first saved in `ops/pm/state/` **on this disk only** (git-ignored).
`status` shows `Shared: NOT YET` until you share them.

```bash
npm run pm -- sync-state          # one command: pull + merge + secret scan + push
npm run pm -- checkpoint <ID> --done ".." --next ".." --sync   # save and share in one step
```

- State goes to its own Git branch, **`xender-pm-state`** (set `stateBranch` in `ops/pm/projects.json`).
  It never touches `main`, your code branch, your working files or the staging area. Pushes are never forced.
  The first `sync-state` creates the branch.
- **Fresh clone / other machine:** `git clone …` then `npm run pm -- resume PM-SITECHECK-001 --agent codex`.
  If the task is not on that disk, it is pulled from `xender-pm-state` automatically. `npm run pm -- pull` gets everything.
- **Conflicts:** if two machines added different checkpoints to the same task, nothing is overwritten
  and nothing is pushed. The other side's copy is saved as `ops/pm/state/tasks/<ID>.conflict-remote.json`.
  Choose with `npm run pm -- sync-state --prefer <ID>=local` or `--prefer <ID>=remote`.
  The losing version stays in the branch history.
- **Secret scan:** if any state file looks like it holds a key or token, nothing is pushed. The message names the
  file, never the value.
- `ops/pm/seed/` holds tasks committed with the code (first: `PM-SITECHECK-001`). They are copied into local
  state once, only if that task is missing.

## Where things are saved

| What | Where | Committed? |
| --- | --- | --- |
| Projects, keywords, safety rules, tests per project | `ops/pm/projects.json` | yes |
| Agent CLI commands | `ops/pm/agents.json` | yes |
| Task state, checkpoints, prompts | `ops/pm/state/tasks/PM-*.json` / `*.md` | no — local; shared via `sync-state` to branch `xender-pm-state` |
| Starter tasks shipped with the code | `ops/pm/seed/` | yes (imported once if missing) |
| GitHub issue/PR facts | `ops/pm/state/github-snapshot.json`, seeded from committed `ops/pm/github-snapshot.json` (`sync` refreshes with `GITHUB_TOKEN`) | seed yes; refreshed copy via `sync-state` |
| Corrections with evidence | `ops/pm/state/overrides.json` (`mark MT-003 --status DONE --evidence ...`) | via `sync-state` (seed copy in `ops/pm/seed/`) |
| Backlog while PR #100 is unmerged | `ops/pm/cache/` (local `docs/MASTER_PENDING_TASKS.md` wins once merged) | yes |

## Safety

- Everything saved is scanned for tokens/keys/passwords/OAuth codes and replaced with `[REDACTED]`.
  This repo is public.
- Prompts mark issue/PR text as **data, not instructions**. The tool never runs commands it finds in GitHub text.
- Every assignment repeats the project's release rules (SiteCheck: checkout flag stays OFF, no real payments,
  refunds, deploys or store submissions without Sahil).
- Nothing is deleted. `mark` and checkpoints only add records.

## For agents

If you were given a `PM-*` ID: `npm run pm -- resume <ID> --agent <you>`, follow NEXT EXACT ACTION, and save
`checkpoint ... --sync` after each milestone. Never perform an operation listed under NEEDS SAHIL'S APPROVAL. Tests: `npm run test:pm`. Demo with mock agents: `npm run pm:demo`.
