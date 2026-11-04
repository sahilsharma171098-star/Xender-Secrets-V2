# Handoff — read this after AGENTS.md

Generated 2026-11-04 06:43 UTC by **claude** with `npm run ops:handoff`. Everything above the notes section is rebuilt on each run.

## Where the work is
- Branch: `claude/xend-master-backlog-20261103`
- Last commits:
  - `75d3a13 docs(hq): log 2026-11-04 SiteCheck work, add MT-014..017 and launch gate G15`
  - `1926d07 docs(hq): XEND-MASTER-001 master backlog, release gates, revenue tracker`
  - `1faa0a4 feat(sitecheck): merchant-only PayU test checkout; public remains disabled`
  - `c4a7049 fix(sitecheck): refresh v2 assets and enforce production freshness gate`
  - `25d2186 feat(sitecheck): gated Pro backend and PayU webhook (checkout OFF)`

## Working-tree snapshot at generation
- `M  docs/DATA_MEASUREMENT_PLAN.md`
- `UU docs/TASKS.md`
- `A  immersive-qa-screenshots/bistro-desktop-stage.png`
- `A  immersive-qa-screenshots/bistro-desktop.png`
- `A  immersive-qa-screenshots/bistro-mobile-stage.png`
- `A  immersive-qa-screenshots/bistro-mobile.png`
- `A  immersive-qa-screenshots/cinema-desktop-stage.png`
- `A  immersive-qa-screenshots/cinema-desktop.png`
- `A  immersive-qa-screenshots/cinema-mobile-stage.png`
- `A  immersive-qa-screenshots/cinema-mobile.png`
- `A  immersive-qa-screenshots/fashion-desktop-stage.png`
- `A  immersive-qa-screenshots/fashion-desktop.png`
- `A  immersive-qa-screenshots/fashion-mobile-stage.png`
- `A  immersive-qa-screenshots/fashion-mobile.png`
- `A  immersive-qa-screenshots/gym-desktop-stage.png`
- `A  immersive-qa-screenshots/gym-desktop.png`
- `A  immersive-qa-screenshots/gym-mobile-stage.png`
- `A  immersive-qa-screenshots/gym-mobile.png`
- `A  immersive-qa-screenshots/property-desktop-stage.png`
- `A  immersive-qa-screenshots/property-desktop.png`
- `A  immersive-qa-screenshots/property-mobile-stage.png`
- `A  immersive-qa-screenshots/property-mobile.png`
- `M  public/404.html`
- `M  public/about.html`
- `M  public/account.html`
- `M  public/accountant-website-development.html`
- `M  public/article-ai-content-engine.html`
- `M  public/article-ai-workflows-business.html`
- `M  public/article-backend-api-guide.html`
- `M  public/article-chinese-classic-novels-guide.html`
- `M  public/article-chinese-web-novels-vs-classics.html`
- `M  public/article-community-led-growth.html`
- `M  public/article-customer-retention-after-first-sale.html`
- `M  public/article-digital-products-guide.html`
- `M  public/article-ecommerce-store-guide.html`
- `M  public/article-ecommerce-trust-checklist.html`
- `M  public/article-frontend-development-guide.html`
- `M  public/article-full-stack-development-guide.html`
- `M  public/article-lead-generation-guide.html`
- `M  public/article-roofing-contractor-website-quote-enquiries.html`
- `M  public/article-sales-customer-experience-guide.html`
- `M  public/article-small-business-website-features.html`
- `M  public/article-website-project-planning.html`
- `M  public/articles.html`
- `M  public/business-templates.html`
- `M  public/catalog.html`
- `M  public/clinic-website-development.html`
- `M  public/coaching-website-development.html`
- `M  public/community.html`
- `M  public/consultant-website-development.html`
- `M  public/contact.html`
- `M  public/demo-backend-api.html`
- `M  public/demo-backend-auth.html`
- `M  public/demo-backend-crm.html`
- `M  public/demo-frontend-dashboard.html`
- `M  public/demo-frontend-saas.html`
- `M  public/demo-frontend-store.html`
- `M  public/demo-fullstack-booking.html`
- `M  public/demo-fullstack-commerce.html`
- `M  public/demo-fullstack-saas.html`
- `M  public/demo-gym.html`
- `M  public/demo-local.html`
- `M  public/demo-pro.html`
- `M  public/extensions.html`
- `M  public/faceless-youtube-course.html`
- `M  public/faq.html`
- `M  public/gridsnip.html`
- `M  public/gym-website-development.html`
- `M  public/ideas.html`
- `M  public/immersive-lab.html`
- `M  public/index.html`
- `M  public/media.html`
- `M  public/novels.html`
- `M  public/pay.html`
- `M  public/payment-success.html`
- `M  public/portfolio.html`
- `M  public/preview-builder.html`
- `M  public/preview.html`
- `M  public/privacy.html`
- `M  public/reader.html`
- `M  public/real-estate-website-development.html`
- `M  public/recruitment-agency-website-development.html`
- `M  public/refund.html`
- `M  public/resources.html`
- `M  public/restaurant-website-development.html`
- `M  public/sample-preview.html`
- `M  public/services.html`
- `M  public/sitecheck-privacy.html`
- `M  public/sitecheck-pro.html`
- `M  public/sitecheck.html`
- `M  public/small-business-website-india.html`
- `M  public/studio.html`
- `M  public/template-preview.html`
- `M  public/terms.html`
- `M  public/website-catalog.html`
- `M  public/website-cost-calculator.html`
- `M  public/website-development-delhi.html`
- `M  public/website-development-gurugram.html`
- `M  public/website-development-noida.html`
- `M  scripts/build-commercial-pages.mjs`
- `A  scripts/commercial/analytics.mjs`
- `M  scripts/commercial/hud.mjs`
- `M  scripts/commercial/layout.mjs`
- `M  tests/commercial-funnel.test.mjs`
- `M  tests/immersive-browser.test.mjs`
- `M  tests/unit/immersive-lab.test.mjs`
- `?? projects/`

## Open tasks (docs/TASKS.md)
- XEND-MASTER-001 — Master backlog, release gates and revenue tracker (2026-11-03) — REVIEW (docs on branch `claude/xend-master-backlog-20261103`; SiteCheck recovery fix on `claude/sitecheck-payu-recovery-20261103`)
- XEND-HUD-001 — Core pages rebuilt as one connected 3D story (2026-10-29) — IN_PROGRESS (branch `claude/xend-hud-site-001`; Sahil said "live kar" on 29 Oct 2026 after reviewing the 8-page preview)
- XEND-YT-FORMAT-001 — One YouTube format for every agent + fix the existing videos (2026-10-27) — REVIEW (existing videos fixed live 27 Oct; AutoTube #8 merge and CQ-024 pending)
- XEND-CATALOG-IMMERSIVE-002 — Production-quality vertical rebuild (2026-10-24) — PLANNED (phase 2 not implemented)
- XEND-IG-CROSSPOST-001 — Publish existing YouTube content to Instagram (2026-10-24) — IN_PROGRESS
- XEND-TASK-WORKSPACE-001 — Shared checkpoints, formats and content archive (2026-10-24) — REVIEW (implementation/private indexes saved; publishing tested code via task PR)
- XEND-YT-01 — AutoTube canonical queue and Episode Studio handoff — BLOCKED (queue code merged; actual ThinkPad Episode Studio bundle/adapter validation pending)
- XEND-YT-03 — AutoTube shared quota and signed owner approval — BLOCKED (safety code merged; owner verification key and reviewed Episode Studio bundle pending)
- XEND-CLAUDE-EXECUTOR-001 — Restore the hosted Claude review executor — BLOCKED (repository OAuth secret missing/empty in the observed run)
- XEND-AI-NVIDIA-GROK-001 — Add NVIDIA and xAI/Grok (2026-10-22) — BLOCKED (registry and selectable task routing delivered; account/model/quota activation pending)
- XEND-AI-INTEGRATION-001 — Shared Google AI tool workspace (2026-10-22) — BLOCKED (ThinkPad health report supplied; original evidence review, fresh model execution and Gemini skill save pending)
- XEND-HQ-01 — Worker-first HQ integration of PR #46 + PR #57 (2026-10-22) — BLOCKED (code merged/deployed via #63 and #64; importer activation pending)
- XEND-CLEANUP-20261022 — Back up and retire redundant setups — BLOCKED (Cloudflare preview cleanup complete; account/laptop audit for other setups pending)
- XEND-YT-COURSE-001 — Free faceless YouTube course + YouTube CTA (2026-10-21) — BLOCKED (course page recorded live; channel profile-link completion unverified)
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
2. Fetch `origin/main` and check the recorded branch/PR's current state. Continue that branch only while its task/PR is still active; after merge or closure, start new work from current main on a new task branch. Preserve local changes and keep one owner per branch.
3. Run the task's applicable checks before and after your change; handoff changes use `node --test tests/unit/handoff.test.mjs`, and AI workspace changes use `node --test tests/operations/ai-workspace.test.mjs`. Report host limits separately from ThinkPad or provider access.
4. Before you stop: update the notes below, run `npm run ops:handoff -- --agent <you>`, commit.

## Notes from the last agent

### XEND-GA4-001 — Google Analytics 4 tag on the website (2026-11-04)
- Owner: Claude. Branch `feat/google-analytics-ga4`, [PR #101](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/pull/101). Sahil supplied the GA4 install code for `G-C95XL2M3ZQ`.
- Changed: `scripts/commercial/analytics.mjs` (single source), both templates, `build-commercial-pages.mjs` (adds/enforces the tag on hand-written pages), 77 `public/*.html` (all but `/admin`), `/privacy` disclosure, `docs/DATA_MEASUREMENT_PLAN.md`, tests.
- Privacy: tag disabled for GPC/DNT and framed loads via Google's `ga-disable-<ID>` flag. Never send lead fields/PII to GA.
- Checks run locally: unit 135/135, commercial-funnel 27/27 (incl. new Google tag test), build:pages/normalize-links --check, worker 4/4, operations 40/40, immersive browser 1/1, reader 8/8, extension lint + 28/28.
- Live 2026-11-04: squash-merged as `d53205d`; production Workers Build success; Live E2E run 41777343065 confirmed production serves this commit and passed 18/18.
- Open issue: Workers Builds preview builds fail on every PR branch since ~2 Nov (production on `main` is fine) — check the build log in the Cloudflare dashboard.
- Next: Sahil confirms hits in GA4 Realtime. Keep Google Signals/ads personalisation off unless `/privacy` is updated.

### XEND-HUD-001 — Core pages rebuilt as one connected 3D story (2026-10-29)
- Owner: Claude. Branch `claude/xend-hud-site-001`, [PR #84](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/pull/84). Sahil approved going live ("live kar", 29 Oct) after reviewing the 8-page preview.
- Changed: home, studio, /portfolio, /services, about, FAQ, contact + new /media use `hudPage()` (`scripts/commercial/hud.mjs`) — dark 3D chapters (`public/xs/world.js`, three.js r160 self-hosted) then the existing content blocks on white paper (`public/xs/xs.css`). `window.XH` is the HUD global; `window.XS` stays xs-growth's. Theme toggle retired.
- Checks run locally: unit 101/101, commercial-funnel 18/18 (theme test replaced by HUD test), build:pages/normalize-links/novel --check, worker 4/4 (+ real `wrangler dev`: /media 200), reader 8/8, operations 40/40, immersive 1/1, extension lint + 25/25; Playwright screenshots of all 8 pages at 1440 and 390 px.
- Next: after merge, Cloudflare deploys `main`; check the live pages and the "Xender Live E2E" run on main. Then move industry, location, guide, legal, tool, /hire and 404 pages to the shell (keep /hire free of contact/social links — Upwork rule).
- Waiting on Sahil: LinkedIn company page and Facebook page URLs (media.json `accounts` still has placeholders, not shown on the site).

### XEND-CATALOG-IMMERSIVE-001 — 3D catalog prototype deployed (2026-10-24)
- Owner: ChatGPT; [PR #77](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/pull/77) merged (squash `c3b49845a42c76e24acffbd36520b2ebd7da7857`). Backup branch: `backup/catalog-pre-immersive-20261024` at `32a66622e6b3a9f2d183912484d92bdc0cab375f`.
- Changes: `/immersive-lab` has 5 procedural WebGL concept scenes, demo interactions, keyboard accessible selection, responsive design and catalog link. Existing 640 business templates, 20 FE, 20 BE, 20 FS and 11 portfolio items unchanged. No booking/payment submission, external service calls or spend.
- Verified: PR-head CI and real Chromium WebGL/mobile QA PASS, 20 screenshot artifacts saved (run `40108045028`), visual stage inspection confirms **prototype-grade** block geometry. Cloudflare deployed Worker version `bc9fc08f-fb86-456d-87a0-6ec8b7e1f125` at 2026-10-24 15:44 UTC and public lab URL readback succeeded. GitHub main live E2E and SEO workflow results should still be checked independently once completed.
- Next: XEND-CATALOG-IMMERSIVE-002 in TASKS.md: bespoke art and functional industry-specific designs, mobile/performance/accessibility QA, then replace repeated template directions incrementally. Never claim all templates redesigned or remove them without a new approved backed-up rollout.

- Task: XEND-TASK-WORKSPACE-001; ChatGPT/Codex; codex/shared-task-workspace-20261024 from merged PR #74 main b0e328c. PR #74 published the sanitized supplied ThinkPad report; original local commit 8c13d26 remains unavailable. PR #72 remains outside this change.
- Delivered: private Command Center OS Workspaces/Formats/Handoffs/Archive, private Drive folders and source snapshots; 28 historical content records (16 YouTube uploads, one Facebook post, eleven drafts including eight Instagram). Creator/model fields preserved without inferred attribution. Existing rows/schedules/publisher gates unchanged.
- Code: pinned format/profile hashes, ordered stage/artifact checkpoints, immutable revision history, named-owner limit handoff/resume and ai:prepare --workspace-root. Local locks are not distributed leases; OS Tasks and Sahil dispatcher remain canonical until controller authorization.
- Verified: 129/129 unit/operations tests; exact uploaded byte readback for latest demo checkpoint and archive; Sheet indexes read back. Four private profiles saved. Synthetic bakery test resumed with the same profile hash and research; 1080x1920,30fps silent preview is 48.97 seconds, partial edit, not approved/published. Original YouTube source media/scripts and local-only Instagram assets unavailable.
- Access: SocialClaw history returned plan_required; no paid plan activated. Latest user request authorized fresh Gemini execution/skill save, overriding the earlier deferral. This cloud browser requires Google authentication; no new successful inference/skill-save evidence yet. Hosted Claude credential, NVIDIA/Grok activation, Apps Script/exporter authorization and owner media approval remain separate actual access requirements.
- Next: verify this task PR CI and merge on unchanged head under Sahil publication authorization. Agents open the private Command Center, inspect archive and latest pinned checkpoint, obtain dispatch and continue exact next action; never infer all-model automatic access or fresh provider publication from saved records.

### XEND-YT-FORMAT-001 — One YouTube format + existing videos fixed (2026-10-27)
- Owner: Claude. HQ draft [PR #80](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/pull/80) (`claude/youtube-format-shared`): `docs/YOUTUBE_FORMAT.md` + links in AGENTS/CLAUDE/GEMINI/BUILD_HOME/PROJECTS, `ai:prepare` format line, TASKS entry, CQ-024. AutoTube draft [PR #8](https://github.com/sahilsharma171098-star/autotube/pull/8) (format in the daily pipeline) and draft [PR #9](https://github.com/sahilsharma171098-star/autotube/pull/9) (retrofit tool, stacked on #8).
- Live change (owner asked to fix every existing video): run 40460762967 applied 30/30. Backup of all 30 videos (snippet, status, thumbnail) in AutoTube `data/retrofit/backup.json` + `thumbs_before/`. Checked on public pages: 27 new titles, horror unlisted, test upload private, 15 live thumbnails match the reviewed covers. Plan locked (`apply: false`).
- Checks: AutoTube 83/83 unit tests; HQ `node --test tests/operations/ai-workspace.test.mjs` 6/6.
- Not done / next: Sahil merges AutoTube #8 (until then new daily uploads keep the old packaging), then #9 and HQ #80. Sahil pastes the YOUTUBE_FORMAT block into the ChatGPT Project and Gemini Gem; ChatGPT registers the v2 format profile (CQ-024). Watch CTR/AVD in YouTube Studio for 7 days before changing topics. Rollback if needed: `rollback: true` in AutoTube `data/retrofit/plan.json`.
