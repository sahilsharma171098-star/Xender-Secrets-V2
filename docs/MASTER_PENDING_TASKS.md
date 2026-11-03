# Master Pending Tasks

One backlog across products. `MT-###` IDs are stable; existing `XEND-*` IDs are kept in the "Links" column so
nothing in `docs/TASKS.md` is duplicated. Status words as in `docs/MASTER_PROJECT_STATUS.md`.
Owner action items are marked **[Sahil]**. Last updated 2026-11-03.

## P0 — SiteCheck Pro + PayU (XEND-EXT-PAY-001, issue #90)

| ID | Task | Status | Depends on | Evidence | Next action | Links |
| --- | --- | --- | --- | --- | --- | --- |
| MT-001 | Decide owner-only gate: main's owner pilot vs PR #96 canary email | CODE COMPLETE | — | both paths tested; #96 clean + CI green at `12c2f2c` | **[Sahil]** either set `WORKSPACE_OWNER_EMAIL` secret (no merge needed) or merge #96 and set `SITECHECK_PRO_CANARY_EMAIL`. Use one, not both | PR #96 |
| MT-002 | Push lost-callback recovery (`/api/payu/admin/verify`) and open PR | CODE COMPLETE | write access or Sahil push | `708e876`; unit 136/136; merges with #96 | push branch `claude/sitecheck-payu-recovery-20261103`, open PR, merge before the canary | G6 |
| MT-003 | Free Durable Object namespace capacity (99/100) so PR previews build | BLOCKED | Sahil authorization | PR #96 handoff, build `ab36ba2b…` error 10067 | list namespaces in Cloudflare dashboard, identify ones left by deleted previews, back up, **[Sahil]** approve deletion of ≥2 | XEND-CLEANUP-20261022 |
| MT-004 | Deploy main (+MT-002) to production, keep checkout flag OFF, re-run live gate | DEPLOYMENT PENDING | MT-002 | last deploy `1faa0a4` verified by run 41485101193 | merge → Cloudflare auto-deploy → confirm "Xender Live E2E" green on the new SHA | G7 |
| MT-005 | Owner ₹499 canary purchase | BLOCKED | MT-001, MT-004 | — | **[Sahil]** sign in at `/sitecheck-pro` with the owner account and pay ₹499. Record txnid | G9 |
| MT-006 | Verify capture → ledger → licence → extension unlock → reinstall restore | TESTING PENDING | MT-005 | — | check PayU dashboard, `/api/sitecheck/entitlement`, generate key, restore after reinstall | G9 |
| MT-007 | Confirm webhook delivery format and `productinfo` round-trip | TESTING PENDING | MT-005 | handler accepts form-encoded only; productinfo has an em dash | if "Order mismatch"/415 seen, settle with MT-002 and fix in code | G8 |
| MT-008 | Real full refund → automatic revocation | TESTING PENDING | MT-006 | refund query in `/api/sitecheck/license/verify` | **[Sahil]** refund in PayU dashboard; verify Pro off within 15 min | G10 |
| MT-009 | Customer self-serve "re-check my payment" (no admin needed) | NOT STARTED | MT-002 | — | signed-in route that runs the MT-002 logic for the caller's own pending orders only | — |
| MT-010 | Chargeback path | NOT STARTED | — | manual reconcile only | document PayU chargeback notification; keep manual until signed source exists | G11 |
| MT-011 | GST receipt/invoice + refund terms review for ₹499 | TESTING PENDING | — | pages exist | review copy against actual PayU receipt after MT-005 | G12 |
| MT-012 | Chrome Web Store SiteCheck v2.0.0 submission | BLOCKED | MT-006–MT-011 | manifests 2.0.0; tests 28/28 | build zip, **[Sahil]** submit in dashboard, record approval | G13 |
| MT-013 | Public launch | NOT STARTED | all above | — | **[Sahil]** authorize `SITECHECK_PRO_CHECKOUT_ENABLED=true` | G14 |

## P1 — AutoTube

| ID | Task | Status | Depends on | Evidence | Next action | Links |
| --- | --- | --- | --- | --- | --- | --- |
| MT-020 | Give Claude read/write access to private `autotube` repo | BLOCKED | Sahil | API 404 from this session | **[Sahil]** add repo to Claude's GitHub access | — |
| MT-021 | Reconcile laptop checkout (detached at `lab-out/final-biryani`, untracked `autotube/`, `final_720p.mp4`) | NOT STARTED | — | observed 2026-11-03 | inspect untracked folder before any pull; back up; never discard | XEND-CLEANUP-20261022 |
| MT-022 | Merge state of AutoTube PR #8 (format) / #9 (retrofit) | unverified | MT-020 | TASKS.md says Sahil merge pending | check, then merge or close | XEND-YT-FORMAT-001 |
| MT-023 | Hindi pipeline quality pass (voice, captions, music, thumbnails, QA gate) + one offline sample | NOT STARTED | MT-020 | — | render offline sample, review before any publish | XEND-YT-QUALITY-001 |
| MT-024 | US/UK English channel config inside AutoTube (no second engine) | NOT STARTED | MT-023 | — | channel profile + research-source rules | — |

## P2 — GridSnip OCR (after P0 gates)

| ID | Task | Status | Depends on | Evidence | Next action | Links |
| --- | --- | --- | --- | --- | --- | --- |
| MT-030 | Stop/withdraw store submission until fixed | **[Sahil]** | — | broken free tier + placeholder paywall | cancel review if submitted | R2, R3 |
| MT-031 | Move source into HQ (`projects/gridsnip/`), secret-scan, register in PROJECTS.md | NOT STARTED | — | only in Antigravity scratch | copy, commit on branch | R1 |
| MT-032 | Free tier design (BYO key only, or capped server proxy with cost approval) | NOT STARTED | MT-031 | placeholder key | pick one; listing must match | R2 |
| MT-033 | Paid tier via SiteCheck licence infra (INR PayU), remove Gumroad placeholder | NOT STARTED | MT-006 | placeholder permalink | reuse `/api/sitecheck/license/*` pattern with product id `gridsnip` | R3 |
| MT-034 | Privacy policy page + CWS data disclosure ("Website content") | NOT STARTED | — | — | add `/gridsnip-privacy` | R4 |
| MT-035 | Replace `alert()`, error recovery, complex-table accuracy tests | NOT STARTED | MT-031 | — | — | R5 |

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
| MT-050 | Shopify audit: products, supplier terms, shipping/returns, margins, checkout (India/US) | NOT STARTED | read-only audit via Shopify connector | — |
| MT-060 | International payments: PayU intl application gaps; PayPal/Stripe eligibility for an India merchant | NOT STARTED | collect current application status from Sahil/Gmail; no new accounts | — |
| MT-070 | Lead pipeline: enable digest cron and Command Center importer | BLOCKED | **[Sahil]** approval + Apps Script OAuth | XEND-HQ-01 |
| MT-071 | Outreach history + suppression check before any new sends | NOT STARTED | read Command Center | XEND-ACQ-001 |
| MT-080 | YouTube → Instagram/Facebook distribution with dedupe ledger | IN PROGRESS (per TASKS.md) | verify ledger fields: content ID, platform, status, URL, retries | XEND-IG-CROSSPOST-001 |
| MT-090 | Command Center: PR/CI/deploy/payment/licence status view on existing Sheet + Worker | NOT STARTED | reuse `/admin` MIS | XEND-OS-003 |
| MT-100 | Compliance: GST treatment, invoices, refund policy, CWS disclosures, data retention, backups | NOT STARTED | start with SiteCheck (MT-011) and GridSnip (MT-034) | — |

## HQ hygiene

| ID | Task | Status | Next action |
| --- | --- | --- | --- |
| MT-110 | Give Claude sessions GitHub write access to `Xender-Secrets-V2` and `autotube` | BLOCKED | **[Sahil]** connect GitHub to Claude with these repos |
| MT-120 | Keep/close decision for 20 open PRs (list in MASTER_PROJECT_STATUS) | NOT STARTED | triage after MT-110; close only with Sahil's OK |
| MT-121 | Update local laptop checkout of HQ repo (behind origin at `ebc6646`) | NOT STARTED | `git fetch` on the laptop before local work |
