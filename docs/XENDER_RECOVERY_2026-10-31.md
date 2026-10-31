# Xender recovery board — verified GitHub inventory (2026-10-31)

Task: **XEND-RECOVERY-001** · Owner: ChatGPT · Scope: **documentation-only / no deployment**.
This dated, reviewable inventory reconciles GitHub metadata; it is **not** evidence that external accounts, devices, payment flows, deployments or social posts were freshly tested. The canonical task details remain in [TASKS.md](TASKS.md) and source locations in [PROJECTS.md](../PROJECTS.md). If there is a conflict, use a fresh PR/commit/live verification rather than old handoff text.

## Decision: two active business lanes

1. **Revenue-first website services** — stabilize the commercial site, verify lead form → proposal → checkout → delivery and work qualified leads. No claim of a completed first payment.
2. **Keep the existing content pipeline healthy** — preserve AutoTube production behavior; reconcile actual YouTube/Instagram/Facebook publish receipts and safety gating before activation.

Everything else is **HOLD, not deleted**, until the above lanes have a verified owner, clear status and a measurable reason to expand. No subscription upgrade, new parallel Jarvis/HQ, repo cloning or mass cleanup is needed to classify the current work.

## Repositories and ownership

| Canonical repository | Purpose | Verified snapshot / next check |
| --- | --- | --- |
| `Xender-Secrets-V2` (this public repo) | Site, Worker, admin, HQ, extension code/docs | Main includes merged HUD PR #84 (merge commit `ebc6646`); open PR #85 only documents live reader test incident |
| `autotube` (private) | Video packaging, generation, publishing/retrofit | PRs #1–#12 and #14–#20 merged; #13 open/draft. Merged code does **not** prove live provider publication |
| `xender-amazon-spapi` | Amazon seller connector | Repository exists; deployment, authorization and orders not checked in this audit |
| `autotube-legal` | Separate legal/support repository | Repository exists; content and current use not reviewed |

GitHub access is a repository snapshot, not an inventory of local Windows folders, Shopify, PayU, Instagram, YouTube Studio or Cloudflare settings.

## Verified completed code / historical evidence (do not reopen automatically)

- **Commercial/HUD website:** [PR #84](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/pull/84) merged on main; [PR #85](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/pull/85) records production deployment and a *separate* reader E2E failure (no code fix in #85). The incident remains open.
- **3D concept lab:** [PR #77](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/pull/77) merged; five prototype scenes, **not** full client-grade templates. Expanding 640 templates is not a completed deliverable.
- **HQ and lead infrastructure:** [PRs #63–#70](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/pulls?q=is%3Apr+is%3Aclosed) contain merged architecture/tool routing work; exporter Apps Script authorization/import parity remain unverified/blocked.
- **YouTube format and code:** HQ [PR #80](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/pull/80) merged. AutoTube PRs #8/#9 (format/retrofit) and #16–#20 (quality, music and runtime safeguards) are **merged**, despite stale TASKS/HANDOFF text calling #8/#9 drafts. AutoTube #13 remains open draft.
- **Crosspost integration:** HQ [PR #82](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/pull/82) and AutoTube #14/#15 merged. Instagram/Facebook publish flags, token setup, complete backfill and current delivery receipts were **not checked** here; code existence != posting.

## Highest-priority blockers

| Order | Task | Status / minimal next action |
| --- | --- | --- |
| P0 | **XEND-READER-XH-002** | Open incident: `reader_xh_and_translation_ui` timeout; external WordPress API `xperimentalhamid.com` returned server errors on 2026-10-29, per PR #85. Isolate/mock external API for deterministic E2E while separately testing real integration; do **not** merely increase timeout or hide application errors. Capture actual failing log first. |
| P0 | **Lead-to-payment proof** | Verify current conversion pages, lead routing, quoting, GST display, gateway credentials in provider secret store, test transactions and reconciliation with no live customer impact. Old Razorpay draft #44 and requested PayU integration must not be assumed production-ready. |
| P1 | **AutoTube publication parity** | Check current runs, actual video IDs/visibility and Instagram receipts; preserve quota, signed approval, duplicate protection and publish-off gates. Do not trigger mass uploads. |
| P1 | **HQ status drift** | TASKS/HANDOFF still include `IN_PROGRESS` for merged HUD and `draft` for merged AutoTube #8/#9; use current GitHub PR evidence, then regenerate handoff using the existing script when a validated local checkout is available. |
| P1 | **Lead import activation** | Existing Worker feed exists; Apps Script OAuth, EXPORT_TOKEN and first parity/import were documented as blocked. No automatic import claims. |

## Open Xender HQ PRs — triage, not mass merge

**Active incident / immediate:** #85 reader incident documentation (does not fix E2E).

**Review when on active lane:** #83 YouTube quality doc handoff (AutoTube source PRs already merged); #73 local inventory mapping (cannot independently verify laptop); #44 Razorpay persistence (draft, gateway overlap/financial safety); #29 QA suite (may overlap newer tests); #23 LinkedIn and #24 Instagram handoffs (historical content/lead relevance must be checked).

**Hold separate features:** #81 Canva integration (draft); #79 Forge Fitness standalone prototype (draft); #59 Chrome extension releases (draft); #58 Recorder source import; #41 AI website builder.

**Potential overlap — compare changes before closure:** #71 and #72 both footer/WIP (one includes unrelated files); #27 SiteCheck extension PR versus merged #28. Do not assume equivalent diffs, close or delete source branches without validation.

There were **15 open Xender HQ PRs** in the GitHub snapshot on 2026-10-31, and **1 open AutoTube PR** (#13). "Open" does not necessarily mean unimplemented; each branch requires a changed-file and current-main comparison before merge/closure.

## Cross-platform work not verified by this GitHub-only audit

- Shopify store: live products, supplier written approval, inventory, shipping, tax, returns and checkout.
- PayU onboarding / integration: real website payment processing, webhook signatures, reconciliation.
- YouTube/Instagram/Facebook: actual current posts, queue, tokens and receipts, beyond source/older records.
- Local ThinkPad: Episode Studio bundle, trading bots, multiple worktrees/backups and old source copies.
- Cloudflare / Render / Google Sheets: currently installed secrets, cron, import status, cost and live service health.

Do **not** publish sensitive records in this public repository. Verify through authorized services; store credentials only in secret stores.

## Safe cleanup protocol

1. Preserve `main`, production, secrets, live accounts and all existing source branches. Nothing is deleted by this board.
2. For each open PR: compare with **current main**, identify superseded code, run tests, check deployment impact, then selectively merge or close with a reason and backup pointers.
3. For completed work: record actual merged commit/CI/production evidence. Code-only, deployed, activated and published are **different** states.
4. Update `PROJECTS.md`, `TASKS.md`, and `ops/HANDOFF.md` only with dated facts; regenerate generated handoff locally rather than rewriting its generated snapshot manually.
5. No silent charges, live payment/order mutations, uploads, bulk outreach, repository deletion, branch deletion or provider credential changes as part of documentation cleanup.

### Resume handoff

- Task: XEND-RECOVERY-001; owner ChatGPT; branch `chatgpt/xend-recovery-20261031`.
- Changed behavior: none; docs/status reconciliation only.
- Source: GitHub repository and PR metadata checked 2026-10-31. External/live integrations **not** checked.
- Checks: repository/PR state cross-check and document-level consistency; **no local test runner or production smoke test**.
- Next: land the docs-only PR after review, inspect #85 test/log and current site conversion path, then inspect publishing receipts; reconcile and close/merge only individually verified PRs.
