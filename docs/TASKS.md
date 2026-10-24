# Xender Secrets V2 — Shared AI Task Board

## XEND-CONSOLIDATION-20261024 — Multi-project inventory, worktree backup and registry consolidation (2026-10-24)
Status: REVIEW (PR branch `gemini/hq-consolidation-registry-20261024`)
Owner: Gemini
- Primary canonical repo `C:\Users\T14\Xender\Xender-Secrets-V2` synced via fast-forward merge with `origin/main` (`97f559f`). All 93 unit tests passing.
- Dirty worktrees backed up to private local path `C:\Users\T14\Documents\Codex\backups\2026-10-24_footer_worktrees_backup`.
- Secrets scan performed on both worktree patches: 0 secrets detected.
- Preserved useful footer changes in dedicated branches and draft PRs:
  - PR #71 (`codex/global-footer-production-20261018`): 28 commercial HTML pages + layout.mjs.
  - PR #72 (`codex/global-footer-20261018`): 26 commercial HTML pages + layout.mjs.
  Neither merged nor deployed per instruction.
- Process and health checks completed:
  - Local AI OS (`xender-hq`): installed (Python 3.12, SQLite `data/xender.db`), running (PID 7284, port 8787), connected (HTTP 200). `claude_sub` and `chatgpt_sub` working; gemini route flagged deprecated model `gemini-2.5-flash`.
  - Shared AI Hub: installed (Python 3.12, SQLite `archive.sqlite3`), running (PID 4436, port 8765), connected (HTTP 200, 71 chats synced).
- HQ project registry (`PROJECTS.md`) updated with canonical sources, duplicate copies, and laptop project mapping (Zerodha Swarm, Kite Paper Bot, Episode Studio bundle, Local AI OS, Shared AI Hub). No private code or data committed to public HQ.

## XEND-AI-INTEGRATION-001 — Shared Google AI tool workspace (2026-10-22)
Status: BLOCKED (workspace and routing implemented; Antigravity workstation activation and Gemini skill save unverified)
Owner: ChatGPT
- Gemini signed-in access verified; Pro/Argon options observed.
- Shared Flow project created: Xender HQ — Images & Video. HQ agent instruction saved; Nano Banana 2.1 and Veo 3.1 Fast defaults saved, one output per request. No generation performed.
- Registry, host doctor and local task brief/receipt commands implemented; 3 focused tests pass.
- Antigravity CLI absent in this Work host; actual ThinkPad installation/auth not inspected. Standalone Gemini xender-hq skill creation attempted, save unconfirmed. Repository instructions remain usable.
- No automatic API calls, topups, background scheduling or publication configured.
- Details and canonical links: ops/ai/README.md.

## XEND-HQ-GEMINI-001 — Include Gemini and Google AI tools (2026-10-22)
Status: DONE (documentation delivered on task branch; active on main after merge)
Owner: ChatGPT
- Include Gemini in shared startup, registration, canonical-source and handoff rules.
- Authorize choosing available Google AI tools when useful; verify access/quota/cost and validate outputs. Existing subscription access does not imply API credits.
- New paid spend requires approval; no credential, integration or runtime changes.
- Validation: reviewed documentation consistency and preserved existing private data and one-owner rules.

## XEND-HQ-BUILD-001 — One shared home for future AI builds (2026-10-22)
Status: DONE (documentation delivered in PR #66; active on main after merge)
Owner: ChatGPT

- Standing instruction from Sahil: register every future ChatGPT/Codex and Claude build in this HQ; reuse canonical source/deployment locations.
- Startup requirements added to AGENTS.md and CLAUDE.md; PROJECTS.md links docs/BUILD_HOME.md for registration and handoff.
- Shared records do not imply automatic chat synchronization or migration of private projects.
- Acceptance: instructions and documentation links reviewed; no runtime behavior changed. PR #66 activates the policy on main.

## XEND-HQ-01 — Worker-first HQ integration of PR #46 + PR #57 (2026-10-22)
Status: BLOCKED (code merged/deployed via #63 and #64; importer activation pending)
Owner: Claude builds, ChatGPT reviews

- Worker owns website leads; Command Center owns outreach, approvals and suppression; one-way pull export with retry, dedup and audit (`src/lead-export.mjs`, `operations/apps-script/LeadImport.gs`).
- Carried from #46: Command Center schema, `Queue.gs` lease controller, outreach gate (now with LEAD-02 pacing), SOPs, SEO inventory, operations CI.
- Carried from #57: `src/pipeline.mjs` daily queue, follow-up touches, "Aaj ka plan" in `/admin`, digest preview/send, `ops/` handoff, `GEMINI.md`, `PROJECTS.md`.
- Left out on purpose: n8n workflow, `services/amazon-spapi` copy (own repo), Worker cron (needs separate approval), dated reels note.
- Next activation steps: Cloudflare secret `EXPORT_TOKEN`; Apps Script install + OAuth; first manual import and parity check; then trigger. PR #46 and #57 are superseded. See `docs/HQ_ROLLOUT_2026-10-22.md`.
- Open decision: WhatsApp cold first-touch cap (25/day) vs the SOP rule that a public business number is not opt-in.

## XEND-CLEANUP-20261022 — Back up and retire redundant setups
Status: BLOCKED (Cloudflare preview cleanup complete; account/laptop audit for other setups pending)
Owner: ChatGPT

- Backup/configuration recovery file saved for 34 merged-PR previews; their owned namespaces were empty on inspection.
- Sahil explicitly approved the recorded 34 previews. All 34 deleted on 2026-10-22 after fresh empty-object checks, without force; all 34 now return Preview not found (404). 75 empty namespaces removed; total 99 → 24. Production deployment and three production namespaces unchanged. Pre-cleanup backup and completion report retained.
- Backup-branch auto builds suppressed for exactly two previews. Broad global suppression was rejected and not applied.
- ThinkPad folders, n8n instances, Render services and production namespaces remain retained pending dependency/data recovery checks.

Operational tasks are in the private `OS Tasks` tab; this file indexes technical work only. Use the same IDs in PRs and handoffs.

## XEND-YT-COURSE-001 — Free faceless YouTube course + YouTube CTA (2026-10-21)
- Status: done in branch `claude/xend-yt-course-001`.
- Page: `public/faceless-youtube-course.html`; short links `/yt`, `/course`.
- Next: add the course link to the YouTube channel's profile links (manual, YouTube Studio → Customization → Basic info → Links).

## XEND-AGENT-REACH-001 — Local multi-platform prospect research (2026-10-11)
Status: REVIEW (branch `chatgpt/xend-agent-reach-001`)
Owner: ChatGPT

- Add user-only Windows bootstrap for pinned Agent-Reach, read-only diagnostics, a single Facebook/Instagram OpenCLI research capture command and unit tests.
- Local-only output under gitignored `prospects-out/agent-reach`; public business evidence must be checked before private MIS import.
- Do not add a Cloudflare Worker dependency, log in automatically, copy cookies, send bulk DMs or bypass platform protections.
- Next: review PR, run safe bootstrap on ThinkPad, inspect `agent-reach doctor`, and separately approve needed desktop channel installs and Chrome extension setup.
- Setup guide: `docs/AGENT_REACH_XENDER.md`. No live machine install / capture / outreach completed in this PR.


## XEND-ACQ-002 — No-website prospect finder + admin outreach list (2026-10-10)
Status: REVIEW (branch `claude/acq-002-maps-prospects`)
Owner: Claude

- `scripts/prospecting/find-no-website.mjs` (local Playwright, visible browser, low volume) finds Google Maps listings without a website → `prospects-out/*.json|csv`, optional `--upload`. Starter queries in `queries.gurugram.txt`.
- `src/prospects.mjs`: new `growth_prospects` table (additive), import/upsert with de-dup, priority score, stages new → messaged → replied → interested → converted / not interested / skip, convert-to-lead. Admin-only routes under `/api/admin/prospects*`.
- `/admin`: Prospects section (import file, search, WhatsApp first-touch / with-preview templates, 25/day cap warning, follow-ups, convert). Daily scorecard outreach line is now automatic. `/preview-builder` accepts a prospect prefill and links the saved preview back.
- Tests: `tests/unit/prospects.test.mjs` (6) — unit suite 68/68; manual E2E of the admin flow against `wrangler dev` with Chrome.
- Open (Sahil): run the finder on the laptop for a first batch; message ≤25/day by hand.

## XEND-SHOWCASE-001 — Showcase catalog rebuild: studio design system, catalog, Studio page (2026-10-09)
Status: REVIEW (branch `claude/xend-showcase-rebuild`)
Owner: Claude

- New site-wide design system in `public/home.css` (direction explored in Google Stitch): charcoal default with warm-paper light mode, self-hosted Playfair Display + Inter (`public/fonts/`, OFL), hairline editorial layout, one saffron accent. Every generated page picks it up; theme default is now dark (`xs-theme=light` opts into light).
- Homepage is a price-free showcase: hero + real screenshot reel, two doors (Studio for brands → `/studio`, packages for local businesses → `/services`), 6 featured builds, capabilities (`#services`), industries, process, studio facts, guides, FAQ, one lead form. Pinned scroll scenes removed (no scroll-jacking).
- `/portfolio` is now the Catalog: real screenshots (`public/work/*.webp`, captured from the demos) instead of 11 live iframes, filters + search + empty state, 32 industry design directions, share box. New `/studio` page for the premium lane.
- Removed invented trust stats ("4.9★ Client trust", "24/7 Enquiries", "★ 4.9 local rating") from `template-preview.js`.
- Prices stay on `/services` (GST rules unchanged); showcase lead forms use price-free option labels.
- Tests: unit 62/62, browser 25/25 (incl. the 4 mobile-overflow/scroll failures that existed on `main`), axe WCAG 2.1 AA clean on 8 key pages in both themes at 1440/390.

## XEND-PORTFOLIO-002 — Sales portfolio, live demos and scroll-scrubbed site (2026-10-08)
Status: REVIEW (branch `claude/project-thread-5ar4i7`)
Owner: Claude

- `/portfolio` is now generated (`scripts/commercial/portfolio.mjs`, one data source with the homepage rail): 11 live builds across all 8 requested categories, honest labels (Xender product / Working demo / Concept demo), problem, features, tech, live iframe previews of the real demo pages, per-project share deep links (`#p-slug`), shareable filters (`?type=`), "Build something like this" pre-filling the quote form (`cta=portfolio-quote`, offer `custom-build`).
- Homepage: international-first hero with scroll-scrubbed device composition, pinned "what we build" layer stack (4 steps), horizontal work rail driven by vertical scroll. Header nav on every generated page: Portfolio, Services, Demos, Guides, About, Contact + "Get a quote".
- `home.js` scroll engine (XEND-MOTION-002): continuous `--p`/`--k` per `[data-scroll-scene]` (exit / pass / pin), off for reduced motion, Save-Data and ≤2-core devices; no-JS renders complete static content.
- Demos rebuilt: Forge Fitness gym site, Pulse Analytics dashboard, North Store cart, Slotly booking. `demo-ribbon.js` labels every demo and links back to a quote; hidden inside portfolio previews. `xs-growth.js` ignores framed page views.
- Tests: unit `tests/unit/portfolio-motion.test.mjs`; browser tests appended to `tests/commercial-funnel.test.mjs` (scroll scrub forward/reverse + sticky pinning, reduced motion, no-JS, filters/share/deep link/quote, mobile overflow, demo flows); live E2E `portfolio` check.

## XEND-PORTFOLIO-MOTION-001 — Client portfolio + scroll-led visuals (2026-10-08)
Status: DONE (merged as PR #39; superseded by XEND-PORTFOLIO-002)
Owner: ChatGPT

- Add indexable, shareable `/portfolio` with six truthfully labelled demos/product examples and direct demo links.
- Add accessible category filters, copy/share URL, international-friendly contact CTA and real existing demos.
- Add lightweight scroll-led showcase, motion reveals and graphical storytelling to the generated homepage and portfolio; reuse scroll motion on commercial pages through home.js.
- Honor reduced motion, avoid third-party animation SDKs and avoid fabricated client claims.
- Keep the homepage generator output synchronized, catalog nav updated and sitemap canonical.
- Acceptance: passing offline CI, production deployment confirmed, mobile/desktop smoke checks where possible.


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



## XEND-SEO-BLOG-001 — Contractor buyer guide (2026-10-14)
Status: REVIEW · Owner: ChatGPT · Branch: `chatgpt/xend-growth-20261014`

- Original roofing/contractor guide covering project evidence, services, service areas, quote forms, mobile launch checks and follow-up.
- Added through `scripts/commercial/articles.mjs`; regenerated article, homepage guide link, Guides hub and sitemap.
- Verified: `node scripts/build-commercial-pages.mjs --check`; `node --test --test-isolation=none tests/unit/seo.test.mjs` (17/17).
- Production publication is pending merge/deployment; indexing and ranking are not claimed.
- Existing task-board statuses are historical; live PR states must be checked separately.


## XEND-LOCAL-SETUP-001 — Current-main integration (2026-10-14)
Status: REVIEW · Owner: ChatGPT · PR #45

- Retargeted from the already-shipped #42 branch to main; preserved latest showcase homepage and SEO blog.
- Reapplied reviewed CLI guards, local doctor/dev/verification tooling, Playwright dependency and regression tests.
- Dropped only obsolete `.stack-stage` CSS because those classes no longer exist in current home.css.
- CI rerun required after integration. No local installation claimed; this Work session's terminal/browser are blocked by invalid Linux paths in Windows sandbox/runtime configuration.


## XEND-SALES-003 — Exact-brand previews integration (2026-10-14)
Status: REVIEW · Owner: ChatGPT · PR #32

- Preserved current prospect prefill and preview-to-prospect linking; added public logo URL and verified-issue input for personalised outreach drafts.
- Kept escaping, HTTP(S) URL sanitisation, admin-only share creation, expiry and explicit concept/not-official labels.
- Integrated on top of merged #45, preserving the Windows/local setup fixes and current showcase. CI rerun required; no customer preview or outbound message was automatically created.
