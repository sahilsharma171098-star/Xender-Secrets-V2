# Xender Secrets V2 — Current State

Snapshot date: 2026-10-06

## Source of truth
Repository: `sahilsharma171098-star/Xender-Secrets-V2`
Production/default branch: `main`
Main commit at AI-collaboration setup start:
`51536b836dfc11167b446ac3cf2e165dea086ba9`

## Current observed implementation
- Static production frontend under `public/`.
- Cloudflare Worker backend under `src/index.js`.
- Cloudflare Durable Objects with SQLite storage.
- Workers AI binding configured.
- Website/template catalogs and demo pages present.
- Account/community/ideas/articles/shop/novel surfaces present.
- Translation logic present in the Worker.
- GitHub Actions live E2E workflow present.
- Repository metadata reported zero open issues at the time of this snapshot.

## AI collaboration
Shared workflow is active so Claude and ChatGPT operate against the same GitHub source of truth.

Rules:
- Claude may implement on task branches and prepare PRs.
- ChatGPT may inspect the same repository, review diffs/PRs, design tasks, and implement where appropriate.
- No direct AI-to-AI connection is assumed; GitHub files, issues, branches, commits, and PRs are the handoff mechanism.

## Important
This document is a snapshot, not a replacement for inspecting current code. Update it after major merged changes.

## Reader backend (XEND-READER-001, branch `reader-static-edge`)
- Gutenberg novels and the novel catalog move to static JSON; XH partner chapters move to the
  Cloudflare Worker with edge caching; Render stays as automatic fallback until retired.
- Live E2E failures on 2026-10-05 were caused by stale homepage assertions after `83c033d`
  (not by Render) plus tests racing the Cloudflare deploy; both fixed on the same branch.


## Full Claude project handoff (2026-10-06)
- Added durable full-history project memory in docs/XENDER_PROJECT_MEMORY.md.
- Added done/in-progress/pending ledger in docs/XENDER_PROGRESS_LEDGER.md.
- Added six-department operating model in docs/XENDER_OPERATING_SYSTEM.md.
- Added fresh-session bootstrap in docs/CLAUDE_PROJECT_BOOTSTRAP.md.
- CLAUDE.md now requires these files in the startup read order.
- This memory layer summarizes recoverable discussions; it is not a verbatim transcript export.
- Current repository, PRs, issues, workflow runs and production behavior remain authoritative for implementation state.

## Recent merged implementation
- PR #14 XEND-ACQ-001: zero-spend site reviewer + acquisition workflow.
- PR #16 XEND-READER-001: static/edge reader modernization, Render fallback, reader/E2E test fixes.

## XEND-WARROOM-001 revenue engine (2026-10-06, Claude) — branch `claude/xend-warroom-001-revenue-engine`
State at handoff: **implemented and tested on the branch; PR #18 open; not yet merged/deployed.** Verify `main` before assuming it is live.
- Homepage rebuilt (light default, dark optional): ICP, ₹0 check / ₹999 / ₹1,999 / ₹3,499 / custom, labelled concept demos, process, FAQ, lead form `#start`.
- `src/growth.mjs` (wired into `AppState` + main fetch): `POST /api/lead` (v2, writes `growth_leads`), `POST /api/event` (aggregate `growth_daily`), `GET/PATCH /api/admin/leads[...]`, `/api/admin/report`, `/api/admin/leads.csv` — admin requires Worker secret `ADMIN_TOKEN` (503 until set). Optional Telegram alert via `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`. Additive tables only; legacy `leads` untouched.
- `public/xs-growth.js` on every public page; `public/admin.html` private MIS (noindex, robots-disallowed, no-store).
- Services form false-error bug fixed; contact page form added; CRM demo submissions flagged as test.
- Tests: `npm test` = 22 unit + reader browser (8) + commercial funnel browser (9), all passing locally; CI offline job runs the funnel test; live E2E adds `homepage_lead_form` and `lead_api_smoke` (test-flagged lead, no notification).
- Docs: CLAUDE_REPO_AUDIT, CLAUDE_WARROOM_PLAN, REVENUE_ARCHITECTURE, DATA_MEASUREMENT_PLAN, sales/SALES_PLAYBOOK, CHATGPT_ACTION_QUEUE (CQ-001…005 + Sahil actions).
- Blocked on Sahil: set `ADMIN_TOKEN`, merge, GST-inclusive/exclusive decision, payment terms approval.
