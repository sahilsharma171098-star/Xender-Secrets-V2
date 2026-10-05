# Xender Secrets V2 — Shared AI Working Agreement

This repository is the single source of truth for Xender Secrets V2.

## Roles
- ChatGPT: architecture, research, task design, code/PR review, regression/security checks, and implementation when useful.
- Claude: primary repo-level implementation agent for large multi-file coding tasks, testing, debugging, and PR preparation.
- GitHub: handoff layer between the agents. Do not assume direct agent-to-agent chat.

## Required workflow
1. Read this file, `CLAUDE.md` (when using Claude), `docs/XENDER_ARCHITECTURE.md`, `docs/CURRENT_STATE.md`, and `docs/TASKS.md`.
2. Inspect the relevant existing implementation before changing code.
3. Work on a task branch; do not edit production blindly.
4. Preserve existing functionality unless the task explicitly replaces it.
5. Run applicable tests/checks before proposing merge.
6. Summarize changed files, behavior, risks, and tests in the PR.
7. Update `docs/CURRENT_STATE.md` and `docs/TASKS.md` when a major feature or architecture decision changes project state.

## Safety and quality rules
- Never commit secrets, API keys, tokens, cookies, credentials, or private user data.
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
