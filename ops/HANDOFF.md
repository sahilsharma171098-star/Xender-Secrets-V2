# Handoff — read this after AGENTS.md

Generated 2026-10-16 07:42 UTC by **claude** with `npm run ops:handoff`. Everything above the notes section is rebuilt on each run.

## Where the work is
- Branch: `claude/xend-hq-001`
- Last commits:
  - `d393bd1 XEND-HQ-001: HQ layer — project registry, AI failover runbook and handoff file`
  - `9b7049d XEND-HQ-001: lead pipeline automation — daily queue, auto follow-ups, Telegram digest`
  - `b59f4e0 XEND-HQ-001: bring Amazon SP-API connector into services/amazon-spapi`
  - `7ee3e7a XEND-SALES-003: exact-brand prospect previews (#32)`

## Uncommitted changes
- none — working tree clean

## Open tasks (docs/TASKS.md)
- XEND-HQ-001 — Xender HQ: one repo for every project + lead pipeline automation (2026-10-16) — REVIEW (branch `claude/xend-hq-001`)
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

- **Task:** XEND-HQ-001 — Xender HQ merge + lead pipeline automation
- **Done so far:** Amazon connector in `services/amazon-spapi/`; lead pipeline (`src/pipeline.mjs`, admin "Aaj ka plan", Telegram cron); HQ docs (`PROJECTS.md`, `ops/FAILOVER.md`, `GEMINI.md`); tests green.
- **Next step:** once Sahil grants folder access, list `~/Xender`, `~/source` and `~/.n8n`; secret-scan each Xender project; copy into `projects/<name>/`; export n8n workflows without credentials into `automation/n8n/`; add rows to `PROJECTS.md`.
- **Watch out for:** this repo is public — no `.env`, n8n `database.sqlite`/`config` (holds the encryption key), credentials, or personal phone numbers/emails. PolicyBazaar work and trading tools are not Xender projects; keep them out.
- **Waiting on Sahil:** folder access on the laptop; `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` in Cloudflare; confirm `CONNECTOR_API_KEY` on Render.
