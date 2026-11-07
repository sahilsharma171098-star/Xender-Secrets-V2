# Master Pending Tasks

One backlog across products. `MT-###` IDs are stable; existing `XEND-*` IDs are kept in the "Links" column so
nothing in `docs/TASKS.md` is duplicated. Status words as in `docs/MASTER_PROJECT_STATUS.md`.
Owner action items are marked **[Sahil]**. Last updated 2026-11-06 from current GitHub and read-only laptop metadata.

## P0 — SiteCheck Pro + PayU (XEND-EXT-PAY-001, issue #90)

| ID | Task | Status | Depends on | Evidence | Next action | Links |
| --- | --- | --- | --- | --- | --- | --- |
| MT-001 | Decide owner-only gate: main's owner pilot vs PR #96 canary email | CODE COMPLETE | — | both paths tested; #96 clean + CI green at `12c2f2c` | **[Sahil]** either set `WORKSPACE_OWNER_EMAIL` secret (no merge needed) or merge #96 and set `SITECHECK_PRO_CANARY_EMAIL`. Use one, not both | PR #96 |
| MT-002 | Merge payment fixes: lost-callback recovery + customer-safe callback pages + QA checklist | MERGED (PR #105) | PR #99 | Callback pages, self-serve recheck, and QA checklist merged; latest main Live E2E run `42174727707` succeeded | Owner canary and real payment evidence remain separate | G6, MT-014 |
| MT-014 | Failed PayU payment landed on a 404 (`/payment-failed` missing); ambiguous callbacks showed raw JSON | DONE (merged PR #105) | MT-002 | PR #105 merged 2026-11-04 | None for code; live payment behavior remains untested | G9 |
| MT-003 | Free Durable Object namespace capacity so PR previews build | PREVIEW VERIFIED; ACCOUNT COUNT UNVERIFIED | Sahil authorization for cleanup | PR #113 Workers preview build passed; prior cleanup reported 72 namespaces, not re-read here | If cleanup is still desired, recheck current ownership/data and obtain approval before removing any branch or namespace | XEND-CLEANUP-20261022 |
| MT-004 | Deploy main and rerun live gate without enabling public checkout | MAIN CHECKS PASSED | MT-002 | main `8a6e29f`; Xender Live E2E run `42174727707` succeeded | Confirm account-side checkout setting separately before any owner canary | G7 |
| MT-005 | Owner ₹499 canary purchase | BLOCKED | MT-001, MT-004 | — | **[Sahil]** follow `docs/SITECHECK_PRO_QA_CHECKLIST.md` sections 0–6 | G9 |
| MT-006 | Verify capture → ledger → licence → extension unlock → reinstall restore | TESTING PENDING | MT-005 | — | check PayU dashboard, `/api/sitecheck/entitlement`, generate key, restore after reinstall | G9 |
| MT-007 | Confirm webhook delivery format and `productinfo` round-trip | TESTING PENDING | MT-005 | handler accepts form-encoded only; productinfo has an em dash | if "Order mismatch"/415 seen, settle with MT-002 and fix in code | G8 |
| MT-008 | Real full refund → automatic revocation | TESTING PENDING | MT-006 | refund query in `/api/sitecheck/license/verify` | **[Sahil]** refund in PayU dashboard; verify Pro off within 15 min | G10 |
| MT-009 | Customer self-serve "re-check my payment" (no admin needed) | MERGED (PR #105) | MT-002 | PR #105 merged 2026-11-04 | Real payment testing remains pending | — |
| MT-010 | Chargeback path | RUNBOOK MERGED (PR #111); LIVE EVENT UNTESTED | — | Manual owner-only reconcile documented and regression-tested | Keep manual until a signed provider source exists; no real chargeback observed | G11 |
| MT-011 | GST receipt/invoice + refund terms review for ₹499 | TESTING PENDING | — | pages exist | review copy against actual PayU receipt after MT-005 | G12 |
| MT-012 | Chrome Web Store SiteCheck v2.0.0 submission | BLOCKED | MT-006–MT-011 | manifests 2.0.0; tests 28/28 | build zip, **[Sahil]** submit in dashboard, record approval | G13 |
| MT-013 | Public launch | NOT STARTED | all above | — | **[Sahil]** authorize `SITECHECK_PRO_CHECKOUT_ENABLED=true` | G14 |
| MT-015 | White-label copy/CSV + dismissible human-review suggestion (ships in 2.0.0) | MERGED (PR #106) | — | PR #106 merged 2026-11-04 | Build and submit store package only after owner review | — |
| MT-016 | v2.1: page-load metrics on device, Show on page, Pro white-label PDF | OPEN DRAFT (PR #108) | MT-012 approved | Draft PR #108 remains open | Hold pending 2.0.0 approval and owner review; update privacy/Pro copy before a store update | — |
| MT-017 | Launch on Product Hunt / Reddit | NOT STARTED | MT-012 approved **and** MT-006 passed | — | only then; ask for honest reviews, never offer anything in return (store policy) | G15 |

## P1 — AutoTube

| ID | Task | Status | Depends on | Evidence | Next action | Links |
| --- | --- | --- | --- | --- | --- | --- |
| MT-020 | Give Claude read/write access to private `autotube` repo | BLOCKED | Sahil | API 404 from this session | **[Sahil]** add repo to Claude's GitHub access | — |
| MT-021 | Reconcile local AutoTube content worktrees | IN PROGRESS; PRESERVED | — | Two AutoTube worktrees have uncommitted/untracked state; their contents were not opened or moved | Owner review and a safe content/source comparison before any sync | XEND-CLEANUP-20261022 |
| MT-022 | Merge state of AutoTube PR #8 (format) / #9 (retrofit) | DONE (both merged) | MT-020 | GitHub reports #8 and #9 merged; current draft retrofit is #13 | Keep #13 separate for current review; do not infer live publishing | XEND-YT-FORMAT-001 |
| MT-025 | AutoTube workflow reliability | NEEDS REVIEW | MT-020 | A successful main run was observed 2026-11-04; recent feature-branch runs include failures | Review current logs on open PRs #29 and #30 before merge; do not enable publishing | XEND-YT-01 |
| MT-023 | Hindi pipeline quality pass (voice, captions, music, thumbnails, QA gate) + one offline sample | NOT STARTED | MT-020 | — | render offline sample, review before any publish | XEND-YT-QUALITY-001 |
| MT-024 | US/UK English channel config inside AutoTube (no second engine) | NOT STARTED | MT-023 | — | channel profile + research-source rules | — |

## P2 — GridSnip OCR (after P0 gates)

| ID | Task | Status | Depends on | Evidence | Next action | Links |
| --- | --- | --- | --- | --- | --- | --- |
| MT-030 | Do not submit the old 1.0.0 zip | **[Sahil]** | — | 1.0.0 could not work at all | upload `gridsnip-1.1.0.zip` instead (MT-036) | R2, R3 |
| MT-031 | Move source into HQ (`projects/gridsnip/`), secret-scan, register in PROJECTS.md | OPEN PR #107 | — | GitHub PR #107 is open; store/live API state not verified | Review current PR checks and privacy disclosures before merge | R1 |
| MT-032 | Free tier design (BYO key only, or capped server proxy with cost approval) | CODE COMPLETE (BYO key) | MT-031 | placeholder key | pick one; listing must match | R2 |
| MT-033 | Paid tier via SiteCheck licence infra (INR PayU) — Gumroad placeholder removed | NOT STARTED (placeholder removed) | MT-006 | placeholder permalink | reuse `/api/sitecheck/license/*` pattern with product id `gridsnip` | R3 |
| MT-034 | Privacy policy page + CWS data disclosure ("Website content") | OPEN PR #107 | MT-031 | Proposed in PR #107; not yet confirmed live | Merge only after review, then verify the public page before store submission | R4 |
| MT-036 | GridSnip 1.1.0 store submission | BLOCKED | merge `claude/gridsnip-v1.1-20261104` (privacy page must be live) | zip + store kit on the laptop | **[Sahil]** test once with own Gemini key, upload zip, paste store answers, submit | R1–R5 |
| MT-035 | Replace `alert()`, error recovery, complex-table accuracy tests | CODE COMPLETE (live accuracy untested) | MT-031 | — | — | R5 |

## P3 — Website, Cloudflare, CI

| ID | Task | Status | Depends on | Evidence | Next action | Links |
| --- | --- | --- | --- | --- | --- | --- |
| MT-040 | Allow www.xendersecrets.com in Claude session egress so agents can smoke-test production directly | BLOCKED | Sahil | proxy `connect_rejected` | **[Sahil]** add domain in Claude settings → Capabilities | — |
| MT-041 | Reader/novel translation reliability | unverified | — | reported earlier | reproduce, then fix | XEND-READER-XH-002 |
| MT-042 | Claude executor OAuth secret | BLOCKED | Sahil | runs skipped | **[Sahil]** set `CLAUDE_CODE_OAUTH_TOKEN` repo secret | XEND-CLAUDE-EXECUTOR-001 |
| MT-043 | Move remaining inner pages to HUD shell | NOT STARTED | — | TASKS.md | — | XEND-HUD-001 |

## P4–P9 — not audited in this session (carried, not verified)

| ID | Task | Status | Next action | Links |
| --- | --- | --- | --- | --- |
| MT-050 | Shopify audit: products, supplier terms, shipping/returns, margins, checkout (India/US) | AUDITED 2026-11-04 (private report on laptop) | **[Sahil]** re-price or draft near-zero-margin gadgets, fix plug variants, one price list for website packages, confirm PayU app vs USD store currency | — |
| MT-060 | International payments: PayU intl application gaps; PayPal/Stripe eligibility for an India merchant | WAITING ON PAYU | request auto-closed 3 Nov (needs FIRC/invoices/CA-signed revenue); Sahil asked for an alternative path on 4 Nov; Stripe India is invite-only | — |
| MT-070 | Lead pipeline: enable digest cron and Command Center importer | BLOCKED | **[Sahil]** approval + Apps Script OAuth | XEND-HQ-01 |
| MT-071 | Outreach history + suppression check before any new sends | NOT STARTED | read Command Center | XEND-ACQ-001 |
| MT-080 | YouTube → Instagram/Facebook distribution with dedupe ledger | IN PROGRESS (per TASKS.md) | verify ledger fields: content ID, platform, status, URL, retries | XEND-IG-CROSSPOST-001 |
| MT-090 | Command Center: PR/CI/deploy/payment/licence status view on existing Sheet + Worker | NOT STARTED | reuse `/admin` MIS | XEND-OS-003 |
| MT-100 | Compliance: GST treatment, invoices, refund policy, CWS disclosures, data retention, backups | NOT STARTED | start with SiteCheck (MT-011) and GridSnip (MT-034) | — |

## HQ hygiene

| ID | Task | Status | Next action |
| --- | --- | --- | --- |
| MT-110 | Give Claude sessions GitHub write access to `Xender-Secrets-V2` and `autotube` | BLOCKED | **[Sahil]** connect GitHub to Claude with these repos |
| MT-120 | Review 24 open Xender HQ PRs and 3 open AutoTube PRs | INVENTORY REFRESHED; OWNER TRIAGE PENDING | See `MASTER_PROJECT_STATUS.md`; review each against current main and close only with owner approval |
| MT-121 | Select and update one canonical local HQ checkout | IN PROGRESS; NO FAST-FORWARD PERFORMED | GitHub main is `8a6e29f`; clean local main clones lag and four worktrees have uncommitted state. Select the canonical checkout, back up, and compare before any update (XEND-CLEANUP-20261022) |
