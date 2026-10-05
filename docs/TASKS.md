# Xender Secrets V2 — Shared AI Task Board

Statuses: `READY`, `IN_PROGRESS`, `REVIEW`, `BLOCKED`, `DONE`

## XEND-AI-001 — Establish shared ChatGPT + Claude workflow
Status: IN_PROGRESS
Owner: ChatGPT

Scope:
- Add shared repo instructions.
- Document architecture/current state.
- Establish task/handoff protocol.
- Prepare setup branch/PR without changing production behavior.

Acceptance:
- `AGENTS.md`, `CLAUDE.md`, architecture, state, and task docs exist.
- No production application code changed.
- Changes are reviewable through a PR.

## XEND-AUDIT-001 — Claude full repository audit
Status: READY
Owner: Claude

Instructions:
- Read `AGENTS.md`, `CLAUDE.md`, `docs/XENDER_ARCHITECTURE.md`, and `docs/CURRENT_STATE.md`.
- Inspect the current repository.
- Do not change production functionality during the audit.
- Report architecture risks, broken/incomplete flows, duplicated code, security concerns, performance issues, mobile UX issues, SEO issues, and test gaps.
- Prioritize findings as P0/P1/P2/P3.
- Where possible, point to exact files/routes.

Deliverable:
- Add `docs/CLAUDE_REPO_AUDIT.md` on a dedicated branch and open a PR.

## XEND-REVIEW-001 — Review Claude repository audit
Status: BLOCKED
Owner: ChatGPT
Blocked by: XEND-AUDIT-001

Scope:
- Review Claude audit against actual repository state.
- Remove false positives/duplicates.
- Convert validated findings into a prioritized implementation backlog.

## XEND-ACQ-001 — Zero-spend site review and acquisition workflow
Status: REVIEW
Owner: ChatGPT

Scope:
- Add a deterministic site-quality reviewer for locally saved public HTML.
- Document the discover -> review -> personalize -> preview -> close acquisition loop.
- Keep active prospect data out of the public repository.
- Execute a small evidence-based first-touch batch using connected tools.

Branch:
- `xend-acq-001-site-quality`

Acceptance:
- Site review detects common trust, mobile, metadata, CTA and unfinished-copy issues.
- The review command is exposed through package scripts.
- Acquisition workflow and authenticated action queue are documented.
- No paid Apollo credits, secrets or active prospect list are committed.
- Initial personalized outreach is labeled for follow-up in Gmail.

## Task creation rule
New work should receive a stable `XEND-...` ID before implementation when practical. Keep one primary owner per task and use PRs for handoff/review.
