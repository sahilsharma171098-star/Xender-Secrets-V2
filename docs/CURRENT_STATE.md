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

## QA sweep fixes (2026-10-06, Claude) — branch `claude/qa-fixes`
- Full QA report: branch `claude/qa-deep-check` → `qa/QA_REPORT.md` (re-runnable read-only production crawl + feature checks via `.github/workflows/qa-deep-check.yml`).
- Fixed: community/ideas posts showed "Cannot read properties of null (reading 'reset')" after a successful publish (`e.currentTarget` read after `await`).
- Added generated `public/404.html` (was a blank page; `not_found_handling: "404-page"` had no file). Generated from `scripts/commercial/pages.mjs`, noindex, with lead form.
- Legacy-page header (script.js pages) collapses into the menu button between 801–1440px instead of overflowing; Community link no longer injected twice.
- `/api/quote` returns `note` (commerce demo showed "undefined"); demo-gym/local/pro back-links → `/website-catalog`; demo hero no longer overflows at 390px.
- Still open (not code): `ADMIN_TOKEN` < 24 chars on production; HTTP→HTTPS + apex→www redirects in Cloudflare; chapter translation 502 on production; social/OTP sign-in providers not configured.

## CLAUDE-EXT-001 Xender SiteCheck browser extension (2026-10-06, Claude) — branch `claude/ext-001-sitecheck` (Issue #25)
- New `extension/`: Manifest V3 extension for Chrome + Edge and Firefox 140+ from one source. 49 local checks (SEO, accessibility, usability, conversion heuristics, technical/security basics), deterministic 0–100 "Website Health Score" (`extension/docs/SCORING.md`, labelled "not a Lighthouse score"), Critical / Warnings / Recommendations with why + fix, copy report, free-audit CTA to `/sitecheck#start` (utm only, never the audited URL).
- Privacy: permissions `activeTab` + `scripting` only; no network requests, storage, analytics or remote code (enforced by `npm run extension:lint`). Firefox declares `data_collection_permissions: none`.
- Commands: `npm run extension:{build,package,lint,test,assets}`. Packages are reproducible zips in `extension/dist/` (git-ignored). CI offline job runs extension lint + tests (incl. a real-extension Chromium test).
- Store kit in `extension/store/` (Edge, Firefox, Chrome listings; privacy policy; permission justification; reviewer notes; release checklist with shortest submission steps; screenshots + promo tiles generated from real output on fictional demo pages).
- Site: generated `/sitecheck` (product page, "Coming soon" per store until a listing is live — flip `SITECHECK_STORES` in `scripts/commercial/pages.mjs`; B2B "custom browser extension" lead section → lead form with `custom-build` offer) and `/sitecheck-privacy` (rendered from `extension/store/privacy-policy.md`). Footer link "SiteCheck extension" on all generated pages.
- Publishing: Edge (free) and Firefox AMO (free) ready, blocked only on Sahil's account sign-in/agreements. Chrome package + listing ready; Sahil explicitly approved the one-time US$5 Chrome Web Store developer registration fee on 6 October 2026. No other paid extension spend is approved.
- Dogfood findings on our own site (not fixed here): `.kicker`/`.eyebrow` cyan (#0891b2) is 3.4–3.7:1 on white (below AA) site-wide; `website-catalog.html` mint text on light background is ~1.5:1; contact page jumps H1→H3; catalog/novels header pill overflows at 1280px (same as QA report).

## XEND-SEO-TRAFFIC-001 organic discovery (2026-10-06, Claude) — branch `claude/xend-seo-traffic-001`
- **GSC baseline (settled through 2026-10-03):** 28d clicks 0, impressions 0; `/` and `/services.html` indexed (crawled 2026-10-05); `/website-development-gurgaon.html` "URL unknown" because that URL never existed (real page: `/website-development-gurugram`); a mis-submitted sitemap entry for the homepage shows 1 error. Full table, priority URL list and Day 7/14/28 checkpoints (2026-10-13 / 10-20 / 11-03): `docs/SEO_TRAFFIC_PLAN.md`.
- Internal links on generated pages now point at final extensionless URLs (no more 307 hop per link); `scripts/commercial/layout.mjs` → `cleanLinks()`.
- Gurugram page targets "Gurgaon (Gurugram)"; `/website-development-gurgaon(.html)`, `-in-gurgaon`, `-in-gurugram` → 301 Gurugram; `-ncr`, `-delhi-ncr` → 301 Delhi.
- Location pages carry distinct local guides, areas served and city FAQs; homepage + pricing link all location pages; industry pages link all NCR pages. `Service` JSON-LD (provider `@id`) on industry + location pages; no ratings/reviews/street address (tested).
- Sitemap 52 → 44 URLs: 9 `demo-*` concept pages now `noindex,follow`; `/website-cost-calculator` added (had no robots meta). Canonicals added to privacy/terms/refund. Home title → "Website Development for Small Businesses from ₹999 + GST".
- IndexNow: key file `public/cdf3c21dd3122dca7cc50b92e6c6cfea.txt` (public by design), `scripts/seo/indexnow.mjs`, workflow `.github/workflows/indexnow.yml` (runs after sitemap changes on `main`, verifies the live key first).
- Tests: `tests/unit/seo.test.mjs` (10 crawl/index invariants). Local test server now mirrors Cloudflare's extensionless serving.
- Still open (not code): apex `xendersecrets.com` serves 200 instead of 301 → www (verified 2026-10-06) — CQ-015; GSC write actions — CQ-010; Bing — CQ-011; Google Business Profile — CQ-012.
