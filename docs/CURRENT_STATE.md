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
State: **LIVE on production** — PR #18's content was squash-committed to `main` as `a400b29` (2026-10-06 04:01Z); Live E2E on production passed (incl. `homepage_lead_form`, `lead_api_smoke`). PR #18 closed as shipped.
- Homepage rebuilt (light default, dark optional): ICP, ₹0 check / ₹999 / ₹1,999 / ₹3,499 / custom, labelled concept demos, process, FAQ, lead form `#start`.
- `src/growth.mjs` (wired into `AppState` + main fetch): `POST /api/lead` (v2, writes `growth_leads`), `POST /api/event` (aggregate `growth_daily`), `GET/PATCH /api/admin/leads[...]`, `/api/admin/report`, `/api/admin/leads.csv` — admin requires Worker secret `ADMIN_TOKEN` (503 until set). Optional Telegram alert via `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`. Additive tables only; legacy `leads` untouched.
- `public/xs-growth.js` on every public page; `public/admin.html` private MIS (noindex, robots-disallowed, no-store).
- Services form false-error bug fixed; contact page form added; CRM demo submissions flagged as test.
- Tests: `npm test` = 22 unit + reader browser (8) + commercial funnel browser (9), all passing locally; CI offline job runs the funnel test; live E2E adds `homepage_lead_form` and `lead_api_smoke` (test-flagged lead, no notification).
- Docs: CLAUDE_REPO_AUDIT, CLAUDE_WARROOM_PLAN, REVENUE_ARCHITECTURE, DATA_MEASUREMENT_PLAN, sales/SALES_PLAYBOOK, CHATGPT_ACTION_QUEUE (CQ-001…005 + Sahil actions).
- Blocked on Sahil: set `ADMIN_TOKEN`, merge, GST-inclusive/exclusive decision, payment terms approval.

## XEND-DEV-002 commercial pages (2026-10-06, Claude) — branch `claude/xend-dev-002-commercial-pages`, PR #20 → `main` (rebased onto a400b29)
- **Generated pages:** never hand-edit `public/index.html`, `services.html`, `about.html`, `contact.html`, the 6 `*-website-development.html` industry pages (CA, clinic, real estate, recruitment, consultant, coaching), `website-development-{gurugram,delhi,noida}.html` or `small-business-website-india.html`. Edit `scripts/commercial/{layout,blocks,pages}.mjs` then `npm run build:pages`. CI fails if output is stale.
- One design system (`home.css`, light default), one header/footer, one lead form (`#start`) on every commercial page; every page has ProfessionalService + FAQPage + Breadcrumb JSON-LD and OG image `og-xender.png`.
- SEO fixes: sitemap was invalid XML (literal `\n`) — now generated; canonical/og:url/sitemap use final extensionless URLs because Cloudflare `auto-trailing-slash` 307s `/x.html → /x`; Mumbai/Bangalore/Hyderabad/Pune pages removed with 301s in `public/_redirects`.
- Commercial pages no longer convert ₹ into foreign currency (₹999 ≈ $11 undercut the US$299 positioning); non-IN visitors see a US$299 note. Currency conversion remains on the shop (`catalog.html`); live E2E `currency_us` moved there.
- Old `script.js` chat widget no longer loads on commercial pages (it led with Shop/Novels).

## XEND-SALES-002 client previews (2026-10-06, Claude) — branch `claude/xend-sales-002-preview-system`, PR #21 stacked on PR #20 (Issue #19)
- `public/preview/preview-core.mjs` (shared by browser + Worker): `VERTICALS`, `sanitizeConfig` (single input gate), `renderPreview` (escaped output, mandatory draft banner).
- Worker: table `growth_previews`; `POST/GET /api/admin/previews`, `DELETE /api/admin/previews/:id` (ADMIN_TOKEN); public `GET /api/preview/:id` (counts views unless `?nocount=1`; 410 after expiry).
- Pages: `/preview-builder.html` (live draft via same-origin postMessage only), `/preview.html?id=` and short link `/p/:id` (`public/_redirects`). All noindex + robots-disallowed.
- MIS shows previews with views/last view. SOP + outreach guidance: `docs/REVENUE_SPRINT.md`.
- Same branch (PR #21) also adds: `gym-website-development.html` + `restaurant-website-development.html` (generated), `scripts/lib/free-check-message.mjs` (`npm run review:site -- page.html --message`), and "Copy daily scorecard" in `/admin.html`.

## Production verification + GST (2026-10-06 ~11:45 IST, Claude)
- `main` = fe5b892 (PR #20 squash) + 43e9eac (`secrets.required: ["ADMIN_TOKEN"]` in wrangler.jsonc). Live E2E on fe5b892 passed: commercial pages, Mumbai→India 301, lead smoke.
- Live E2E dispatched against production (run 37421027989): **lead capture works** (`lead_api_smoke` 201), but **`admin_auth_configured` failed — `/api/admin/report` returns 503**, i.e. the running Worker does not see a usable `ADMIN_TOKEN` (missing at runtime, or < 24 chars). PR #21 makes the 503 say which (`code: admin_token_missing | admin_token_too_short`) and trims copy-paste whitespace.
- Leads submitted meanwhile are stored safely in `growth_leads`; they become readable in `/admin.html` as soon as the secret is fixed. Nothing is lost.
- Optional full proof: add the same value as GitHub Actions secret `XENDER_ADMIN_TOKEN`; live E2E then runs `lead_admin_readback` (submit test lead on production → read it back via admin API).
- **GST approved:** all ₹ package prices are exclusive of 18% GST. Generated pages show "₹999 + 18% GST" with the incl.-GST total (₹1,178.82 / ₹2,358.82 / ₹4,128.82), an "Are prices inclusive of GST?" FAQ, and "+ GST" in titles, previews, free-check messages, builder pitch and quotes. MIS amounts are recorded excluding GST. US$ pricing unchanged (export of services; CA to confirm LUT).
