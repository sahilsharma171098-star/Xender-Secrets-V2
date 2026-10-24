# AI failover runbook (XEND-HQ-001)

Claude is the lead agent for repo work. When Claude can't continue — usage limit, outage, or
Sahil wants a second opinion — the work moves to another AI **through this repository**, not
through any AI-to-AI connection. The repo holds the memory, the task board and the handoff note,
so any agent that can read files can pick up where the last one stopped.

| Order | Agent | How it gets the rules | Typical use |
| --- | --- | --- | --- |
| 1 | Claude (Claude Code, `@claude` on GitHub) | `CLAUDE.md` → `AGENTS.md` | lead: multi-file builds, tests, PRs |
| 2 | Codex CLI / ChatGPT | `AGENTS.md` (Codex reads it automatically) | continue the same branch, reviews |
| 3 | Gemini / Gemini CLI | `GEMINI.md` → `AGENTS.md` → `docs/BUILD_HOME.md` | research, coding or review when useful; also failover |

The order above is the default failover order, not a restriction on choosing Gemini for a suitable task. Google AI tools follow the access/cost/validation policy in `docs/BUILD_HOME.md`.

Using an agent through Sahil's own subscriptions is fine. Do not add paid API keys, and never
put any key or token in this repository.

## When an agent has to stop

1. Commit (or stash) the work on the task branch — never on `main`.
2. Fill in the **Notes from the last agent** section of `ops/HANDOFF.md`: task ID, what is done,
   the very next step, risks, anything waiting on Sahil.
3. `npm run ops:handoff -- --agent <claude|codex|gemini|chatgpt>` — refreshes branch, recent
   commits, uncommitted files and open tasks around your notes.
4. Commit `ops/HANDOFF.md` and push the branch.

## Taking over (Sahil, on the laptop)

Read `ops/HANDOFF.md`, fetch `origin/main`, and check the recorded task/PR's actual state before choosing a branch. Continue the existing branch only while the task/PR is active and its previous owner has handed it over. After merge or closure, start new work from current main on a new task branch. Preserve local changes; do not reset a dirty checkout or revive a merged branch because an old handoff names it. Use a separate worktree when needed.

First message to the new agent:

> Read AGENTS.md and ops/HANDOFF.md. Check the task/PR state and choose the active branch or a new branch from current main after merge. Preserve local changes and keep one owner per branch.
> Run the task's applicable checks before and after. Before you stop, update the notes and run
> `npm run ops:handoff -- --agent <your name>`, then commit.

When Claude is back, give it the same message. It picks up from the new notes.

## Before you commit (any agent)

This repo is public. Before adding a folder from a laptop or another repo, scan it:

```bash
git diff --cached --name-only        # nothing like .env, *.sqlite, credentials*, *.pem, *.key
git diff --cached | grep -nEi "api[_-]?key|secret|token|password|refresh|BEGIN .*PRIVATE KEY|\b[6-9][0-9]{9}\b" | head
```

Anything that looks like a key or a personal phone number/email stays out of the commit. If a
secret was ever committed, rotating it at the provider is the fix; deleting the line is not.
