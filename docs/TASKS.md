# Xender Secrets V2 — Shared AI Task Board

Statuses: `READY`, `IN_PROGRESS`, `REVIEW`, `BLOCKED`, `DONE`

## XEND-AI-001 — Establish shared ChatGPT + Claude workflow
Status: DONE
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
Status: REVIEW (revenue-path audit delivered in `docs/CLAUDE_REPO_AUDIT.md`, 2026-10-06)
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
Status: READY
Owner: ChatGPT

Scope:
- Review Claude audit against actual repository state.
- Remove false positives/duplicates.
- Convert validated findings into a prioritized implementation backlog.

## XEND-ACQ-001 — Zero-spend site review and acquisition workflow
Status: DONE
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

## XEND-READER-001 — Remove Render from the reader's critical path at ₹0
Status: DONE
Owner: Claude
Branch: `reader-static-edge`

Scope:
- Pre-generate Gutenberg chapters + catalog as static JSON; XH chapters via Worker `/api/reader/*`.
- Keep Render as automatic fallback and one-line rollback (`READER_PRIMARY`).
- Fix Live E2E (stale homepage assertions, deploy race) and add offline reader tests.

Acceptance:
- Offline tests pass; build workflow commits data with parity vs Render; E2E green after merge.

Open:
- Sahil: confirm whether XH permission allows storing text in this public repo.
- After ~2 weeks of healthy edge traffic, suspend the Render service.


## XEND-HANDOFF-001 — Recreate full Xender project context for Claude
Status: DONE
Owner: ChatGPT

Scope:
- Consolidate recoverable Xender history from project origin through current execution.
- Preserve business decisions, completed work, constraints, side tracks and current priorities.
- Add Claude bootstrap/read order so a fresh Claude session can resume without reconstructing chat history.
- Keep GitHub as the durable cross-agent memory layer.

Deliverables:
- docs/XENDER_PROJECT_MEMORY.md
- docs/XENDER_PROGRESS_LEDGER.md
- docs/XENDER_OPERATING_SYSTEM.md
- docs/CLAUDE_PROJECT_BOOTSTRAP.md
- CLAUDE.md updated to require these files before work.


## XEND-WARROOM-001 — 7-day zero-spend revenue sprint (Issues #8–#11)
Status: DONE for Day 1 (PR #18 content live on `main` as a400b29) · Owner: Claude · Branch: `claude/xend-warroom-001-revenue-engine`
Delivered: conversion homepage, lead capture v2, first-party events, private MIS, sales docs. See `docs/CLAUDE_WARROOM_PLAN.md`.
Next (Claude): XEND-DEV-002. Next (ChatGPT): CQ-001…005 in `docs/CHATGPT_ACTION_QUEUE.md`. Next (Sahil): secrets, merge, GST + payment terms.

## XEND-DEV-002 — Carry the new design + lead form to inner commercial pages
Status: REVIEW · Owner: Claude · Branch: `claude/xend-dev-002-commercial-pages` · PR #20 → `main`
Delivered: generator `scripts/build-commercial-pages.mjs` + `scripts/commercial/*` now produces home, pricing, about, contact, 6 industry (new: clinic) and 4 location pages + sitemap; thin city pages 301 → India page; canonical/sitemap fixed to final URLs; OG image; CI freshness check; QA checklist `docs/RELEASE_CHECKLIST.md`.
Scope: shared light header/footer, offer CTA and `data-lead-form` on `services.html`, 6 industry pages, 7 city pages; chat widget leads with free check.
Acceptance: funnel browser test extended to these pages; no overflow at 375px; live E2E green.

## XEND-SALES-002 — Client preview system (Issue #19)
Status: REVIEW · Owner: Claude · Branch: `claude/xend-sales-002-preview-system` (stacked on PR #20)
Delivered: 5 vertical previews (dental/clinic, real estate, professional services, fitness, restaurant), builder, admin-only short links `/p/<id>`, view tracking in MIS, expiry, draft banner. SOP: `docs/REVENUE_SPRINT.md`.
Also delivered: gym + restaurant landing pages, `review:site --message` free-check generator, MIS daily scorecard (MIS-001).

## CLAUDE-EXT-001 — Xender SiteCheck browser extension (Issue #25)
Status: REVIEW · Owner: Claude · Branch: `claude/ext-001-sitecheck`
Delivered: `extension/` (MV3 Chrome/Edge + Firefox build, 49 checks, scoring, popup), tests (unit, audit rules on 12 fixtures, real-extension E2E), reproducible packages, store kit (`extension/store/`), `/sitecheck` + `/sitecheck-privacy` pages.
Open (Sahil): submit to Edge Add-ons, then Firefox AMO (`extension/store/release-checklist.md`); Chrome registration fee (US$5 one-time) is approved by Sahil as of 6 October 2026; submit when the owner-side registration/payment step is completed. After each approval, set the store URL in `SITECHECK_STORES` and rebuild pages.
Next version candidates: highlight-on-page for issues, optional same-origin link status checks (explicit opt-in permission), page weight from Resource Timing, export to PDF, Hindi UI.

