# Handoff — read this after AGENTS.md

Updated 22 October 2026 (IST) by **Codex** for PR #66. The current notes supersede historical task snapshots below.

## Where the work is
- Branch: `codex/shared-build-home-20261022` (PR #66; resume from current main after merge)
- Last commits:
  - `b2151fd Merge pull request #64 from sahilsharma171098-star/claude/xend-hq-01-audit-fixes`
  - `2f91e93 XEND-HQ-01 audit fixes: single-use approvals, gap check, cursor-ahead error`
  - `ac0de47 Merge pull request #63 from sahilsharma171098-star/claude/xend-hq-01-integration`
  - `325633d XEND-HQ-01: refresh ops/HANDOFF.md`
  - `56ed13d XEND-HQ-01: Worker-first HQ integration of PR #46 + PR #57`

## Historical working-tree snapshot (not current remote status)
- ` M PROJECTS.md`
- ` M docs/CURRENT_STATE.md`
- ` M docs/HQ_ARCHITECTURE.md`
- ` M docs/TASKS.md`

## Open tasks (docs/TASKS.md)
- XEND-HQ-01 — Worker-first HQ integration of PR #46 + PR #57 (2026-10-22) — BLOCKED (code merged/deployed via #63 and #64; importer activation pending)
- XEND-CLEANUP-20261022 — Back up and retire redundant setups — BLOCKED (Cloudflare cleanup complete; other account/laptop audits pending)
- XEND-YT-COURSE-001 — Free faceless YouTube course + YouTube CTA (2026-10-21) — UNKNOWN
- XEND-AGENT-REACH-001 — Local multi-platform prospect research (2026-10-11) — REVIEW (branch `chatgpt/xend-agent-reach-001`)
- XEND-ACQ-002 — No-website prospect finder + admin outreach list (2026-10-10) — REVIEW (branch `claude/acq-002-maps-prospects`)
- XEND-SHOWCASE-001 — Showcase catalog rebuild: studio design system, catalog, Studio page (2026-10-09) — REVIEW (branch `claude/xend-showcase-rebuild`)
- XEND-PORTFOLIO-002 — Sales portfolio, live demos and scroll-scrubbed site (2026-10-08) — REVIEW (branch `claude/project-thread-5ar4i7`)
- XEND-AUDIT-001 — Claude full repository audit — REVIEW (revenue-path audit delivered in `docs/CLAUDE_REPO_AUDIT.md`, 2026-10-06)
- XEND-REVIEW-001 — Review Claude repository audit — READY
- XEND-DEV-002 — Carry the new design + lead form to inner commercial pages — REVIEW · Owner: Claude · Branch: `claude/xend-dev-002-commercial-pages` · PR #20 → `main`
- XEND-SALES-002 — Client preview system (Issue #19) — REVIEW · Owner: Claude · Branch: `claude/xend-sales-002-preview-system` (stacked on PR #20)
- CLAUDE-EXT-001 — Xender SiteCheck browser extension (Issue #25) — REVIEW · Owner: Claude · Branch: `claude/ext-001-sitecheck`
- XEND-SEO-BLOG-001 — Contractor buyer guide (2026-10-14) — REVIEW · Owner: ChatGPT · Branch: `chatgpt/xend-growth-20261014`
- XEND-LOCAL-SETUP-001 — Current-main integration (2026-10-14) — REVIEW · Owner: ChatGPT · PR #45
- XEND-SALES-003 — Exact-brand previews integration (2026-10-14) — REVIEW · Owner: ChatGPT · PR #32

## How to resume
1. Read `AGENTS.md`, then this file, then the task's section in `docs/TASKS.md`.
2. Check out the branch above. Do not start a new branch for the same task.
3. Run `node --test tests/unit/*.test.mjs` before and after your change.
4. Before you stop: update the notes below, run `npm run ops:handoff -- --agent <you>`, commit.

## Notes from the last agent

- **Task:** XEND-HQ-BUILD-001, PR #66.
- **Done:** Added docs/BUILD_HOME.md and linked the shared build registration/reuse/handoff policy from AGENTS.md, CLAUDE.md and PROJECTS.md. All future builds must have a canonical source, task ID, owner and deployment record in HQ. Separate private repositories retain private source. No automatic chat synchronization is claimed.
- **Checks:** Documentation reviewed against HQ_ARCHITECTURE.md and registry; no runtime code changes. Automated gh-review-loop unavailable because gh CLI is not installed.
- **Cleanup completed:** Sahil approved the exact 34 previews. All deleted without force after fresh emptiness checks; all return 404. 75 empty namespaces removed (99 → 24). Three production namespaces and production deployment unchanged. Saved pre-cleanup backup and cleanup result retained.
- **Still pending:** EXPORT_TOKEN and Apps Script OAuth/import activation; real ThinkPad Episode Studio bundle and owner verification key; laptop/n8n/Render dependency audit. No queued video upload triggered. Global preview-build setting unchanged.
- **Next:** Start new build sessions from current main, read docs/BUILD_HOME.md and registry, assign one task owner, reuse existing sources and update handoff before stopping. Verify live PR states before acting on historical task-board entries.
- **Evidence:** HQ #63/#64/#65; AutoTube #3; Xender_Cloudflare_PreCleanup_2026-10-22.json; Xender_Cloudflare_Cleanup_Result_2026-10-22.json.
