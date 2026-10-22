# Xender Secrets V2 — Shared AI Working Agreement

## Shared build home — Sahil's standing instruction (2026-10-22)
Every new build by ChatGPT/Codex or Claude must be registered in this HQ, including work started in a separate chat. Read `PROJECTS.md`, `docs/BUILD_HOME.md`, `docs/TASKS.md` and `ops/HANDOFF.md` before implementation. Reuse the existing canonical project and deployment; do not create a parallel setup for the same purpose. Register a new project before building, with one canonical source location, task ID, owner and deployment target. Keep private source/data in its private repository/store and link only safe metadata here. Before ending work, update the project/task record and handoff with commit/PR, checks actually run, deployed status, blockers and next action. This is a shared record, not automatic synchronization of ChatGPT and Claude chats.

This repository is the single source of truth for Xender Secrets V2.

For cross-business operations, read `docs/HQ_ARCHITECTURE.md` and `docs/operations/README.md`. Worker-first (XEND-HQ-01, decided 2026-10-22): the Cloudflare Worker owns inbound website leads. The private Command Center owns outreach, approvals, suppression and the cross-business task queue, and receives website leads one way only. GitHub owns code and versioned SOPs; Notion is navigation. No direct agent chat syncing is assumed. Automated queue mutations must use the installed Apps Script controller; until it is installed, Sahil is the sole dispatcher. Outreach limits live only in `src/outreach-policy.mjs`.

## Roles
- ChatGPT: architecture, research, task design, code/PR review, regression/security checks, and implementation when useful.
- Claude: primary repo-level implementation agent for large multi-file coding tasks, testing, debugging, and PR preparation.
- Codex CLI and Gemini CLI: fallback implementation agents when Claude is unavailable (see `ops/FAILOVER.md`). Same rules, same branches.
- GitHub: handoff layer between the agents. Do not assume direct agent-to-agent chat.
- One owner per batch: two agents never edit the same branch at the same time.

## Xender HQ
`PROJECTS.md` lists the projects by department and where each one lives. Some live in their own repos (AutoTube, Amazon SP-API connector).
When you stop mid-task, leave `ops/HANDOFF.md` updated (`npm run ops:handoff -- --agent <name>`) so the next agent can resume.

## Required workflow
1. Read this file, `CLAUDE.md` (when using Claude), `PROJECTS.md`, `ops/HANDOFF.md`, `docs/XENDER_ARCHITECTURE.md`, `docs/CURRENT_STATE.md`, and `docs/TASKS.md`.
2. Inspect the relevant existing implementation before changing code.
3. Work on a task branch; do not edit production blindly.
4. Preserve existing functionality unless the task explicitly replaces it.
5. Run applicable tests/checks before proposing merge.
6. Summarize changed files, behavior, risks, and tests in the PR.
7. Update `docs/CURRENT_STATE.md` and `docs/TASKS.md` when a major feature or architecture decision changes project state.

## Safety and quality rules
- Never commit secrets, API keys, tokens, cookies, credentials, or private user data.
- This repository is public: no `.env` files, private CRM data, queue credentials, or personal phone numbers/emails of customers, prospects or suppliers, not even in commit history.
- Do not weaken authentication, authorization, validation, or security controls to make a test pass.
- Do not force-push or rewrite `main`.
- Prefer small, reviewable changes over unrelated refactors.
- Keep mobile usability and production compatibility in scope.
- Only import third-party content where authorization is documented and the requested scope matches that authorization. Do not bypass access controls.
- Do not represent demo/portfolio work as paid client work unless verified.

## Handoff protocol
Use task IDs from `docs/TASKS.md`.

A handoff should contain:
- Task ID
- Branch/PR
- What changed
- Tests/checks performed
- Known risks or unresolved items
- Recommended next action

ChatGPT reviews implementation/PRs; Claude should address review findings on the same task branch where practical.
