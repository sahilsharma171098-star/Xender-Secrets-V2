## XEND-AUTH-1101 — owner verification complete (2026-11-05)

Owner completed Google sign-in. Same Chrome profile /api/auth/me returned ok:true with the signed-in account (personal details excluded from this public record). Authenticated read-only PayU config recognized the existing owner pilot; independent anonymous config remains checkoutEnabled:false. Account UI shows signed-in navigation. No cookies/tokens inspected or copied, no payment initiated. Production version remains 7eba4890; no smoke regression or rollback. Runtime-tested source revision 3c02caf; later commits only record documentation.

---

## XEND-AUTH-1101 — 2026-11-05 Codex checkpoint

Issue #90 / PR #104 (draft). Source revision 3c02caf6d925a90c106db181fceb8a8eb4a2e402 deployed as 7eba4890-526b-47b6-bb2d-1f282b87026e, 100%, at 10:18 UTC. CI 42009141705 passed; unit 177/177, serial browser 27/27, isolated auth/canonical workerd 6/6, dry-run pass. Initial parallel browser GPU failure did not recur in isolated/serial runs.

New password hashes tagged at 100000; untagged legacy uses 180000 or fails closed with recovery guidance. Verified Google/OTP can recover same account; no password rewrite/reset, schema or entitlement migration. Production OTP unavailable. Password-only users without a verified recovery provider still require support.

Live anonymous health/providers/PayU config pass; auth/me 401 expected; public checkout false. All original encrypted secret binding names/types and 3 DO namespace IDs verified preserved; custom domains, preview flags and logging reconciled in config. Strict preflight halted on real config drift; after reconciliation, only empty DO optional-property diff remained and normal --keep-vars deploy was used after code/namespace review.

PENDING: owner completes Google account chooser in Chrome tab opened by this task; then inspect /api/auth/me in SAME browser session (never print cookies/tokens or put owner personal data in public evidence). Keep draft until authenticated proof. Issue receipt: https://github.com/sahilsharma171098-star/Xender-Secrets-V2/issues/90#issuecomment-6655483318 . Rollback baseline f906c15e-e744-4135-8a94-59b82f83049f; code rollback does not migrate tagged credentials or DB state. No regression observed; no rollback, payments/refunds or store publication.

---

# Handoff — read this after AGENTS.md

Generated 2026-11-05 05:09 UTC by **claude** with `npm run ops:handoff`. Everything above the notes section is rebuilt on each run.

## Where the work is
- Branch: `claude/xender-pm-mvp-v5yqxj`
- Last commits:
  - `48c9313 MT-010 (XEND-EXT-PAY-001, gate G11): SiteCheck Pro chargeback runbook + regression tests`
  - `b69d7c0 XEND-PM-001: Xender AI Project Manager MVP (xender-pm CLI) (#110)`
  - `3243cee XEND-CF-PREVIEW-001: record PR #109 live`
  - `d7d3ad3 Preview hygiene: SiteCheck owner pilot off in previews; GA only on production host (#109)`
  - `8b7aaab feat(sitecheck): white-label copied report and CSV, dismissible human-review suggestion (2.0.0) (#106)`

## Working-tree snapshot at generation
- ` M docs/PAYU_CHARGEBACK.md`
- ` M docs/SITECHECK_PRO_QA_CHECKLIST.md`
- ` M docs/TASKS.md`

## Open tasks (docs/TASKS.md)
- XEND-EXT-PAY-001 / MT-010 — SiteCheck Pro chargeback runbook (gate G11) (2026-11-05) — REVIEW (branch `claude/xender-pm-mvp-v5yqxj` restarted from main `b69d7c0`; PR pending Sahil review — not merged, not deployed)
- XEND-PM-001 — Xender AI Project Manager MVP (`xender-pm`) (2026-11-04) — REVIEW (branch `claude/xender-pm-mvp-v5yqxj`, [PR #110](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/pull/110); both review blockers from review 5774186840 fixed 2026-11-05; awaiting Sahil review/merge — not merged, not deployed)
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

### XEND-EXT-PAY-001 / MT-010 — chargeback runbook (2026-11-05)
- Owner: Claude, via PM task `PM-SITECHECK-002` (resumed from `xender-pm-state` on main `b69d7c0` after PR #110 merged). Branch `claude/xender-pm-mvp-v5yqxj` restarted from main.
- Added `docs/PAYU_CHARGEBACK.md`, `tests/unit/payu-chargeback.test.mjs` (4/4), and a QA checklist 5.4 link. Docs and tests only.
- Checks run: `npm test` unit 176/176 and browser 27/27; payu + licence group 36/36; `extension:lint` passed; `extension:test` 31/31; `check:pages` clean; `test:pm` 23/23. Browser suites need Playwright resolvable from the repo: this host has no `node_modules`, so the pre-installed `/opt/node-tools` copy was symlinked into git-ignored `node_modules/`.
- Policy decided by Sahil (PR #111 review, 2026-11-05): reply before PayU `Reply Before`; revoke only on `Closed Customer Favour`. Runbook updated. Open: G11 row in PR #100 to point here. No chargeback has occurred, so live verification of G11 is still pending.

### XEND-PM-001 — Xender AI Project Manager MVP (2026-11-04, review fixes 2026-11-05)
- Owner: Claude. Branch `claude/xender-pm-mvp-v5yqxj`, [PR #110](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/pull/110) (current main merged in, no force-push). Guide: `docs/XENDER_PM.md`. **Not merged, not deployed.**
- Review 5774186840 blockers: (1) approvals now come from the selected work items, not just the owner's words; `PM-SITECHECK-001` needs `--approve deploy,merge` before any auto-run (MT-004), and old task files are re-checked at dispatch. (2) State is local in git-ignored `ops/pm/state/` until `npm run pm -- sync-state`, which shares it on branch `xender-pm-state` with history-based conflict detection, a secret scan and fast-forward-only push; a fresh clone pulls it on `resume`.
- Real smoke test 2026-11-05 (`ops/pm/evidence/SMOKE-2026-11-05.md`): real Claude CLI read-only task `PM-SITECHECK-002` (MT-010) → checkpoint → `sync-state` (first real push, `xender-pm-state` @ `6c44adc`) → fresh clone resume → second real Claude run → fast-forward `a9a472f` → pull on the first clone. `main` untouched. Codex/Gemini not tested (not installed).
- Use it first: `npm run pm -- status` (a fresh clone pulls shared tasks on `resume`; `npm run pm -- pull` gets all). Resume: `npm run pm -- resume PM-SITECHECK-001 --agent <you>`. Next action there is MT-004 verify-only (Live E2E 41892558789 green on `d7d3ad3`), then MT-010 docs.
- Checks run 2026-11-05: xender-pm 22/22; unit 171/171; operations 40/40; `pm:demo` PASS; `check:pages` clean. Fresh-clone resume is tested against a local bare remote, not against GitHub.
- Not done: no Codex/Gemini run (CLIs absent on the cloud host); no non-read-only real agent run; PR CI ran offline checks only (live-e2e skipped on PRs); PR #100's backlog file still shows MT-002/003/009/014/015 as open (the PM shows them corrected).

### XEND-CF-PREVIEW-001 — Preview builds fail on the 100 Durable Object limit (2026-11-04)
- Owner: Claude. Cause read in the Cloudflare build log: code 10067, 99/100 DO namespaces used (3 production + 3 per stale branch preview). Production deploys fine.
- Done: GitHub auto-delete of merged branches ON. Pending Sahil: `bash ops/cleanup/delete-merged-branches-20261104.sh` (54 merged branches; previews auto-delete and free slots). Do not add a new Durable Object class until slots are freed.

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
