# Xender Secrets V2 — Shared AI Task Board

## XEND-RECOVERY-001 — Consolidate scattered Xender work (2026-10-31)
Status: REVIEW (docs-only recovery board on branch `chatgpt/xend-recovery-20261031`; no production changes)
Owner: ChatGPT
- Dated evidence, full open-PR triage, active revenue/content lanes and explicit freeze decisions: [XENDER_RECOVERY_2026-10-31.md](XENDER_RECOVERY_2026-10-31.md).
- Reviewed GitHub repo/PR metadata for Xender and AutoTube on 2026-10-31. This does not establish fresh third-party platform access, provider credentials, payment flows, current CI or media publication.
- Open PRs are not mass-merged or deleted; compare current main and validate each change before selective closing/merging. Generated `ops/HANDOFF.md` remains an older snapshot pending local handoff regeneration.

## XEND-READER-XH-002 — Reader external API failure breaks live E2E (2026-10-29)
Status: OPEN / UNFIXED (Xender PR #85 documents the incident only)
Owner: Unassigned
- `reader_xh_and_translation_ui` timed out while the partner WordPress API at `xperimentalhamid.com` returned server errors on 2026-10-29; PR #85 contains no code fix.
- Next: read the exact workflow logs; separate deterministic reader/UI coverage from real partner availability; preserve validation of real application failures. Do not just silence the test, loosen guards or guess successful deployment.

## XEND-HUD-001 — Core pages rebuilt as one connected 3D story (2026-10-29)
Status: CODE_MERGED (PR #84 merged to main as `ebc6646`; production deploy recorded in PR #85; live reader E2E incident XEND-READER-XH-002 unresolved)
Owner: Claude
- What: home, studio, catalog (/portfolio), pricing (/services), about, FAQ, contact and a new /media page share one HUD shell: dark "story" chapters over a single three.js world (`public/xs/world.js`, scenes core/blueprint/build/ring/launch/globe), then white "paper" with the same content blocks as before. Generator: `scripts/commercial/hud.mjs` (shell), `scripts/commercial/media.mjs` + `media.json` (videos/Shorts/Reels snapshot, 27 Oct), page stories in `pages.mjs`.
- Kept: every lead form and its `data-cta`/offer contract (`xs-growth.js`), catalog filters/search/deep links/share (`portfolio.js`), JSON-LD, canonicals, sitemap, internal links to all industry/location/guide pages, GST display rules, US$299 note for international visitors, honest demo labels. Retired: the light/dark theme toggle (test replaced by a HUD test).
- Self-hosted: three.js r160 (MIT) at `/xs/vendor/`, Geist, Geist Mono, Instrument Serif, Noto Sans Devanagari (OFL, licences in `/fonts`). No third-party requests except lazy YouTube thumbnails on /media (same pattern as /faceless-youtube-course).
- Fallbacks: reduced motion, Save-Data, no WebGL or no JS → chapters render as static sections with screenshot collage; phones/low-power devices get "lite" 3D (no blur over canvas, 30fps cap, smaller textures).
- Not in this change: industry, location, guide, legal, tool, /hire and 404 pages keep the previous design until they move to the shell.

## XEND-YT-FORMAT-001 — One YouTube format for every agent + fix the existing videos (2026-10-27)
Status: PARTIAL (HQ PR #80, AutoTube #8/#9 merged; historical retrofit recorded, current publication and CQ-024 profile parity unverified)
Owner: Claude
- Why: channel CTR 1.7% and ~1:03 average view on 3.3K impressions (YouTube Studio, 27 Oct). Same-niche channels win with "X वाला महीने का कितना कमाता है? | The Economics of X" titles and light covers with one picture and one number. Topics were fine; packaging was not.
- Format: `docs/YOUTUBE_FORMAT.md` (public summary) → AutoTube `docs/CONTENT_FORMAT.md` (full spec) and `autotube/packaging.py` (code checks: `python -m autotube.packaging --format long|short "<title>"`). AGENTS.md, CLAUDE.md and GEMINI.md here and in AutoTube point to it; `ai:prepare` adds the format line for AutoTube/YouTube projects.
- New videos: AutoTube [PR #8](https://github.com/sahilsharma171098-star/autotube/pull/8) is **merged**, not a pending draft. Do not infer current live publishing without run/platform readback.
- Existing videos: AutoTube branch `claude/yt-retrofit-old-videos`, workflow "Retrofit existing videos". Backs up all 30 public/unlisted videos (snippet, status, thumbnail) before any change, renders covers for review, applies only with `apply: true` + approved cover sha256, idempotent, `rollback: true` restores the backup. Plan: 15 long videos (14 new titles + 15 covers + search lines), 13 Hindi Shorts retitled, horror story → unlisted, 2-second test upload → private, English pilot Short untouched. Nothing deleted.
- Applied 27 Oct 2026 (AutoTube [run 40460762967](https://github.com/sahilsharma171098-star/autotube/actions/runs/40460762967), draft [PR #9](https://github.com/sahilsharma171098-star/autotube/pull/9)): 30/30 changes in `data/retrofit/applied.json`. Checked on the public pages afterwards: all 27 new titles live, horror video unlisted, test upload private (login required), and each of the 15 live thumbnails matches its reviewed cover by pixel signature, not the old one. Plan locked again (`apply: false`). Rollback: set `rollback: true` in the plan.
- Next: Check CQ-024 cross-agent format profile status and current publish receipts; AutoTube #8/#9 are already merged. Observe CTR/AVD before changing formats or topics.

## XEND-CATALOG-IMMERSIVE-001 — Differentiated 3D concept lab (2026-10-24)
Status: DONE (phase 1: experimental lab only; phase 2 high-quality redesign remains separate)
Owner: ChatGPT
- Existing catalog remains canonical: 32 industries x 20 variants, 20 frontend, 20 backend and 20 full-stack samples; 11 standalone portfolio items retained. Repetition was confirmed from shared renderers, not AI model provenance.
- Backup ref: `backup/catalog-pre-immersive-20261024` at main commit `32a66622e6b3a9f2d183912484d92bdc0cab375f`.
- [PR #77](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/pull/77) merged to main as `c3b49845a42c76e24acffbd36520b2ebd7da7857`; Cloudflare deployment 2026-10-24 15:44 UTC (Worker version `bc9fc08f-fb86-456d-87a0-6ec8b7e1f125`); live `/immersive-lab` served successfully. Adds five procedural WebGL experiences for gym, fashion, cinema, property and restaurant; local-only selections; new non-destructive business catalog entry point; responsive controls and keyboard dropdown.
- [CI QA run](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/actions/runs/40108045028) PASS at exact PR head: Node regressions; real headless Chromium WebGL render and object interaction on desktop 1440x900 and mobile 390x844; zero browser JS errors; horizontal overflow and WebGL fallback tested; 20 screenshots available in run artifact. Stage images were visually inspected: **functional but simple block geometry**. No real booking/payments, external requests or real customer data.
- Follow-on production visual work is not done: custom/licensed 3D art, richer object motion, real workflow backends, accessibility/performance checks on physical devices, and selective upgrades across 640 business templates. Do not present five concept scenes as 640 redesigned premium sites. Keep old deep links intact and never delete until audited and backed up.

## XEND-CATALOG-IMMERSIVE-002 — Production-quality vertical rebuild (2026-10-24)
Status: PLANNED (phase 2 not implemented)
Owner: Unassigned
- Replace repetitive designs gradually, starting with gym, apparel, cinema bookings, real estate and restaurants. Each vertical requires its own art direction, interaction rules, licensing/asset receipts, meaningful customer workflow, performance budgets, mobile and keyboard QA, and accessible fallback.
- Reuse `/immersive-lab` prototype and stable catalog IDs without parallel deploy stacks; no 640-template deletion or fabricated portfolio claims. Publish production-grade upgrades only once validated, with explicit evidence and versioned backup.


## XEND-IG-CROSSPOST-001 — Publish existing YouTube content to Instagram (2026-10-24)
Status: IN_PROGRESS
Owner: ChatGPT
- Sahil authorized the existing public catalog on Xender Instagram and required the YouTube channel link in every caption.
- Live owner Studio: 21 public videos/Shorts, one unlisted excluded. Reconcile existing source links before reposting; preserve credits/disclosures and source media.
- Use the private batch/receipts in Command Center; public code/runbook: docs/operations/YOUTUBE_INSTAGRAM.md. No secret, private batch, unrelated backlog or account permission changes.
- Two recovered Shorts have source files; remaining source downloads and reviewed parts are tracked separately. Prepared/hosted is not posted.
- 2026-10-27: new Shorts get their Reel (cover as first frame) from AutoTube, off until Sahil adds the Instagram token secret and sets `instagram.publish: true` (AutoTube draft PR #14). Once on, ChatGPT stops posting new videos; Windsor posts must pass `cover_url`/`thumb_offset`.

## XEND-TASK-WORKSPACE-001 — Shared checkpoints, formats and content archive (2026-10-24)
Status: REVIEW (implementation/private indexes saved; publishing tested code via task PR)
Owner: ChatGPT
- Extend the existing private Command Center with workspace, versioned format, handoff and historical content indexes; keep OS Tasks canonical.
- Add dependency-free private task checkpoints, fixed profile hashes, artifact validation and resume after an agent limit. No provider/publisher calls from this engine.
- Import available historical upload/draft records with explicit source provenance, missing files and verification scope; never infer creator or fresh platform visibility.
- User authorized execution and publication of this setup. Current Google browser authentication and existing publishing approvals remain actual access boundaries.
- Validation: 129/129 unit/operations tests; exact Drive byte readback of demo checkpoint and archive; native Sheet indexes read back. 28 historical records and four private profiles saved. Synthetic saved-work resume passed with unchanged profile hash; silent 48.97-second preview is not publication-ready.
- Runbook: docs/TASK_WORKSPACES.md. Private content and workspace URLs remain outside this public repository.

## XEND-AI-HEALTH-001 — Record supplied ThinkPad health results (2026-10-24)
Status: DONE (sanitized supplied-report record published in merged PR #74; original local commit remains unreviewed)
Owner: ChatGPT
- Source: Sahil-supplied workstation summary, reported local commit 8c13d26; original branch/diff and private backup receipt unavailable to this reviewer. This is a scoped summary, not publication of that commit.
- Record reported desktop/login, backup and test outcomes with dated evidence scope; retain fresh model/API and Gemini skill-save blockers.
- Sahil explicitly instructed that fresh model/API execution and Gemini skill save stay pending; this batch contains no live trial or skill-save action.
- Independently checked PR #72 is a 50-file draft with multiple work areas; no footer/backlog changes imported.
- Deliverable: docs/AI_WORKSTATION_REPORTED_HEALTH_2026-10-24.md plus consistent HQ/registry records. Checks and draft PR evidence are recorded there; no merge, manual deployment or provider/media execution.

## XEND-HQ-REVIEW-002 — Reconcile Claude's shared AI setup audit (2026-10-24)
Status: DONE (repo audit fixes implemented and validated in PR #70; activation tasks below remain BLOCKED)
Owner: ChatGPT
- Reviewed source: Xender main `bf42de3153a2a9000fe150d5e06adfaeaa7cffcf` (PRs #66–#69); Claude's independent report was supplied by Sahil. No live provider execution was established by that review.
- Fix stale handoff/resume guidance at its generator; refresh one current notes block and include blocked AI/YouTube tasks.
- Date tool observations with reviewer and evidence scope; align all agent instructions; replace private Flow project pointers with the generic service entry point.
- Index YT-01/YT-03, correct ambiguous registration/test-count/course-status wording, and record the hosted Claude credential blocker.
- Local AutoTube changes described by Claude are outside this host; preserve them pending backup and comparison, not deletion by assumption.
- Validation: 120/120 unit/operations tests passed; host doctor exit 0 with zero API calls; SEO inventory 36 pages/zero problems; script syntax, workflow YAML, registry/agent consistency and diff checks passed. PR #70's operating-system and offline/browser/workerd CI checks passed on the implementation head. Details and remaining activation work: `docs/AI_SETUP_REVIEW_2026-10-24.md`. No provider credentials, queue activation, generation, manual deployment or publication is part of this remediation; inspect the PR for the final merge/automatic-build state.

## XEND-YT-01 — AutoTube canonical queue and Episode Studio handoff
Status: BLOCKED (queue code merged; actual ThinkPad Episode Studio bundle/adapter validation pending)
Owner: ChatGPT
- Canonical implementation: `sahilsharma171098-star/autotube`; [PR #1](https://github.com/sahilsharma171098-star/autotube/pull/1) merged 2026-10-22. Producers enqueue; AutoTube owns publishing, duplicate checks and output history.
- Follow-up safety code in AutoTube #2/#3 is merged; it supersedes the original typed-name approval gate. Do not use the old PR #1 approval flow.
- Claude reported 40/40 offline tests on AutoTube main `349b47f9ad3ef1d182ba58fdd591b8dbaf117212` on 2026-10-24; current validation is recorded in the review document.
- Next: preserve and inspect the real Episode Studio bundle on ThinkPad, compare its output with the adapter, review rights/final cut and validate a local dry run. Keep `publish_queue.enabled: false`.

## XEND-YT-03 — AutoTube shared quota and signed owner approval
Status: BLOCKED (safety code merged; owner verification key and reviewed Episode Studio bundle pending)
Owner: ChatGPT
- Canonical implementation: AutoTube [PR #2](https://github.com/sahilsharma171098-star/autotube/pull/2) (shared Shorts quota) and [PR #3](https://github.com/sahilsharma171098-star/autotube/pull/3) (signed, expiring, single-use approvals and durable upload reservation), merged 2026-10-22.
- Daily, external and queued Shorts share a channel quota; daily/reviewed workflows share `youtube-channel-publisher` concurrency. Reviewed publishing is main-only and manual; the queue is disabled.
- Claude reported 40/40 offline tests on `349b47f`; validation provenance and activation limits are in the review document. No live upload is implied by offline tests.
- Next: owner configures only the public verification key in the approved Actions setting, retains the private signing key outside repo/runner, and reviews the actual media bundle. Queue activation/upload needs its explicit owner authorization and signed content approval.

## XEND-CLAUDE-EXECUTOR-001 — Restore the hosted Claude review executor
Status: BLOCKED (repository OAuth secret missing/empty in the observed run)
Owner: Sahil
- [Run 40058321043](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/actions/runs/40058321043), 2026-10-24: checkout succeeded, `Verify Claude OAuth credential` failed; `Run Claude Code` was skipped.
- Required owner action: complete the existing Claude Code authorization flow and save its credential as the repository Actions secret `CLAUDE_CODE_OAUTH_TOKEN`; never put the value in chat, files, PRs or logs. Then rerun the failed review and inspect actual results.
- This is separate from the independent Claude review supplied by Sahil and does not block local repository checks.

## XEND-AI-NVIDIA-GROK-001 — Add NVIDIA and xAI/Grok (2026-10-22)
Status: BLOCKED (registry and selectable task routing delivered; account/model/quota activation pending)
Owner: ChatGPT
- Sahil confirmed xAI/Grok as the requested second provider.
- Register NVIDIA API Catalog/NIM and Grok as optional research/code tools; existing defaults remain.
- Add --tool selection with capability checks and preserved pending-access receipts.
- Validate routing and receipt preparation locally; no provider inference or billing changes.
- Account/credentials, model availability, quota and production licensing/cost must be verified before live use.

## XEND-AI-INTEGRATION-001 — Shared Google AI tool workspace (2026-10-22)
Status: BLOCKED (ThinkPad health report supplied; original evidence review, fresh model execution and Gemini skill save pending)
Owner: ChatGPT
- ChatGPT observed a signed-in Gemini browser with Pro/Argon options on 2026-10-22. Current session, quota, inference and API access have not been reverified; evidence scope is recorded in ops/ai/tools.json.
- Shared Flow project created: Xender HQ — Images & Video. HQ agent instruction saved; Nano Banana 2.1 and Veo 3.1 Fast defaults saved, one output per request. No generation performed.
- Registry, host doctor and local task brief/receipt commands implemented; 5 focused tests pass on the PR #69 setup. Doctor checks this host only and does not revalidate provider access.
- Follow-up supplied 2026-10-24: Antigravity 2.23.0 running/signed in with Google AI Pro entitlement; nine checkouts plus local AutoTube source backed up with reported integrity/sample-restore checks; a separate workspace verified main 9e21348. Local commit 8c13d26/full report/private receipt are unavailable to this reviewer. See docs/AI_WORKSTATION_REPORTED_HEALTH_2026-10-24.md. Do not infer that all old worktrees were synchronized or that a fresh model/API request succeeded. Standalone Gemini skill save remains unconfirmed.
- Historical health-record scope deferred fresh execution/skill save. Sahil subsequently authorized execution; current browser authentication is required before a new observation can replace old evidence. No fresh successful inference or skill save is established by the health report.
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
Status: BLOCKED (course page recorded live; channel profile-link completion unverified)
Owner: ChatGPT
- Course source was delivered on `claude/xend-yt-course-001`; this status tracks the remaining channel-profile CTA, not a missing page deployment.
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
