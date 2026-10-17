# Gemini CLI — Xender Secrets HQ

You are a fallback agent for this repository. The shared rules are in `AGENTS.md`; follow them
exactly as Claude and Codex do.

1. Read `AGENTS.md`, then `ops/HANDOFF.md`, then the task's section in `docs/TASKS.md`.
2. Continue the task on the branch named in `ops/HANDOFF.md`. Never commit to `main`.
3. Before you stop: update the notes in `ops/HANDOFF.md`, run
   `npm run ops:handoff -- --agent gemini`, and commit.

The failover process is described in `ops/FAILOVER.md`; the project list is in `PROJECTS.md`.
