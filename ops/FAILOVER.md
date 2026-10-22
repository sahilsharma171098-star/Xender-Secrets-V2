# AI failover runbook (XEND-HQ-001)

Claude is the lead agent for repo work. When Claude can't continue — usage limit, outage, or
Sahil wants a second opinion — the work moves to another AI **through this repository**, not
through any AI-to-AI connection. The repo holds the memory, the task board and the handoff note,
so any agent that can read files can pick up where the last one stopped.

| Order | Agent | How it gets the rules | Typical use |
| --- | --- | --- | --- |
| 1 | Claude (Claude Code, `@claude` on GitHub) | `CLAUDE.md` → `AGENTS.md` | lead: multi-file builds, tests, PRs |
| 2 | Codex CLI / ChatGPT | `AGENTS.md` (Codex reads it automatically) | continue the same branch, reviews |
| 3 | Gemini CLI | `GEMINI.md` → `AGENTS.md` | continue when both above are unavailable |

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

```bash
cd Xender-Secrets-V2
git fetch && git checkout <branch from ops/HANDOFF.md>
codex        # or: gemini
```

First message to the new agent:

> Read AGENTS.md and ops/HANDOFF.md. Continue the task in the notes on this branch.
> Run the unit tests before and after. Before you stop, update the notes and run
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
