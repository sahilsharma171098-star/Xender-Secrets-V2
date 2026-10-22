# Xender Secrets V2 — Shared AI Working Agreement

## Shared build home — Sahil's standing instruction (2026-10-22)
Every new build by ChatGPT/Codex, Claude or Gemini must be registered in this HQ, including work started in a separate chat. Read `PROJECTS.md`, `docs/BUILD_HOME.md`, `docs/TASKS.md` and `ops/HANDOFF.md` before implementation. Reuse the existing canonical project and deployment; do not create a parallel setup for the same purpose. Register a new project before building, with one canonical source location, task ID, owner and deployment target. Keep private source/data in its private repository/store and link only safe metadata here. Before ending work, update the project/task record and handoff with commit/PR, checks actually run, deployed status, blockers and next action. This is a shared record, not automatic synchronization of ChatGPT, Claude and Gemini chats.

This repository is the single source of truth for Xender Secrets V2.

For cross-business operations, read `docs/HQ_ARCHITECTURE.md` and `docs/operations/README.md`. Worker-first (XEND-HQ-01, decided 2026-10-22): the Cloudflare Worker owns inbound website leads. The private Command Center owns outreach, approvals, suppression and the cross-business task queue, and receives website leads one way only. GitHub owns code and versioned SOPs; Notion is navigation. No direct agent chat syncing is assumed. Automated queue mutations must use the installed Apps Script controller; until it is installed, Sahil is the sole dispatcher. Outreach limits live only in `src/outreach-policy.mjs`.

## Gemini and Google AI tools (Sahil approved, 2026-10-22)

Gemini is part of the shared ChatGPT/Codex + Claude + Gemini workflow. Use it when the task benefits from its capabilities or another agent is unavailable; it does not have to wait until both other agents fail. All agents use this HQ, one task owner, the same canonical source, branch/PR review and handoff rules.

When useful, use Google AI tools through an actually available, authorized connector, CLI or signed-in account. Choose the tool for the task (research, coding, document analysis or media generation); verify current availability, access, quota and cost before use. Existing subscription access does not imply API access or included API credits. Prefer existing included access or free allowance; any new paid API usage, credits or subscription requires Sahil's explicit spend approval. Never claim a tool is connected, invoked or successful without observing it.

Pass only the minimum task context. Keep secrets, private customer records and unrelated personal information out of prompts and public handoffs. Record tool/model used where observable, output/source location, checks, quota/access blockers and next action in the task handoff. Review and validate AI outputs before integrating them. This policy authorizes choosing useful tools; it does not install integrations or automatically synchronize accounts/chats.

## Roles
- ChatGPT: architecture, research, task design, code/PR review, regression/security checks, and implementation when useful.
- Claude: primary repo-level implementation agent for large multi-file coding tasks, testing, debugging, and PR preparation.
- Codex CLI / ChatGPT and Gemini CLI: implementation, research or review as the task requires; also provide failover when an agent is unavailable (see `ops/FAILOVER.md`). Same rules, same canonical sources; one owner per task.
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

## Shared tool execution
Use `ops/ai/README.md` and `ops/ai/tools.json` for the current Gemini, Antigravity, Nano Banana, Veo, NVIDIA and Grok routes and activation status. `npm run ai:doctor` checks this host; `npm run ai:prepare -- --kind <research|code|image|video> --task XEND-... --project <name> --brief-file <path>` creates a local prompt and receipt. Prepared is not executed. Use the verified shared Flow project for Xender images/videos, record actual outputs in the canonical project, and preserve current publishing/owner-approval safeguards. An unavailable route may be handed to another authorized agent, with the real tool recorded. Follow the documented pending checks; never mark desktop/API access as connected from a browser login.

NVIDIA and Grok are optional tools selected with `ai:prepare --tool nvidia|grok` for research or code. They share the same HQ context, output receipts and validation rules. Registration does not establish account/API access; honor their pending status and verify model, quota, license and cost before use. Do not replace another agent's authentication/backend with a third-party provider without explicit configuration.
