# XEND-OSS-UPGRADE-001 — Open-source benchmark & safe adoption plan

> Evidence date: 2026-11-02. This is a **read-only architecture comparison**, not a production deployment or a claim that an upstream project is superior on Xender workloads.
> Task: [#93](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/issues/93). Owner: ChatGPT. Canonical deployment remains unchanged.

## Decision summary

**Do not replace Xender/AutoTube with an open-source monolith.** Adopt narrowly measured techniques where they solve a demonstrable limitation. Revenue-blocking payment/license fulfillment has higher priority than a framework migration.

| Lane | Existing Xender code (verified) | Public upstream to evaluate | Decision | Why / verification |
| --- | --- | --- | --- | --- |
| Hindi video production | Private `autotube`: `autotube/render.py` (FFmpeg scene assembly, ASS captions/audio mix); `script_gen.py` + `script_check.py` + `ledger.py` (code checks) | [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) | **Benchmark isolated rendering/visual techniques** only | Upstream is MIT-labelled and recently updated; compare same offline input, source rights and finished-video quality before integration |
| Shorts editing | Private AutoTube: existing short format/voice, publishing registry, channel quota | [ShortGPT](https://github.com/RayVentura/ShortGPT) | **Reference design, not dependency** | MIT-labelled but last code push observed 2025-02-10; current AutoTube publisher safety is more specific to Xender |
| Chrome extensions | `extension/src/audit.js`, `src/popup.js`, `src/lib/`, `manifest/base.json`: JS, local-only, only `activeTab` + `scripting`; `npm run extension:build/test/lint` | [WXT](https://github.com/wxt-dev/wxt), [Plasmo](https://github.com/PlasmoHQ/plasmo) | **Keep SiteCheck current stack** | No evidence yet of problems from current packaging; a framework rewrite adds release and permissions risk without collecting a rupee |
| Social distribution | Existing AutoTube Instagram/Facebook modules and separate cross-post tracking; publishing gates remain | [Postiz](https://github.com/gitroomhq/postiz-app) | **Architecture-only reading** | Social scheduling features are relevant, but AGPL-3.0 and new OAuth/deployment complexity require independent legal and operational review |
| Paid extensions | Website `src/payments.mjs`, SiteCheck free/local functionality, existing payment/licensing tracking | No new third-party platform chosen | **Unblock existing #90 and PR #92 first** | PayU signed-request foundation is not live checkout; no live license issuance/renewal/refund flow verified |

Repository license metadata alone is not sufficient permission for copied modules: verify the **specific commit, file headers, transitive dependencies, assets and attribution requirements** before copying anything. No upstream source has been imported into Xender by this work.

## Baselines and explicit gaps

1. **SiteCheck**: current source is deliberately privacy-first, with local scoring and no account/network calls. To introduce paid Pro, design clear free-vs-paid features, minimal entitlement endpoint, store-policy/privacy updates and reproducible browser/store tests; preserve free core experience. If future extensions share substantial boilerplate, **then** benchmark WXT instead of migrating SiteCheck now.
2. **GridSnip OCR**: confirmed operational track in existing [issue #90](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/issues/90); locate and version the canonical published-source package and confirm existing privacy permissions **before** any billing/feature gate.
3. **PayU**: [PR #92](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/pull/92) is only gateway signing/verification groundwork in review. The issue's older observations and PR's newer binding observations differ by date; recheck Worker deployment and merchant live approval rather than assuming either state is current. Never store keys in extension, repo or browser.
4. **AutoTube**: use the canonical private repository; preserve the exact channel-ID checks, owner review, per-channel deduplication and publication history. GitHub Action dry-runs/artifacts must be checked on the specific current-main SHA. Older run successes and unit tests do not prove live reliability.

## First measurable experiments (no publication)

### A. AutoTube offline same-input benchmark

- Freeze 1 short and 1 long **non-sensitive, licensed** sample asset set with a verified transcript, timing JSON, and audio (no private content in public HQ).
- Run the existing AutoTube renderer as baseline on same hardware; record duration, peak RAM, crash/error count, output codec/resolution, caption sync at 3 timestamps, subtitle readability, audio peak/LUFS, render time per output minute and any asset-rights flags.
- Review MoneyPrinterTurbo's scene/visual selection implementation without installing remote infrastructure, importing dependencies or enabling providers. Prototype one isolated technique only if license, media rights and static analysis pass.
- Compare results in a blind side-by-side review; implement in AutoTube behind an OFF-by-default flag only if quality or reliability improves without losing controls. No automatic production uploads as a benchmark.
- Test: `python -m unittest discover -s tests -p 'test_*.py'` plus the existing publisher guard checks, isolated render smoke test and video review. Log exact SHA and metrics.

### B. SiteCheck release safety + monetization contract

- Baseline: `npm run extension:lint`, `npm run extension:test`, `npm run extension:package`; capture browser E2E outcomes on Chrome, Edge and Firefox where supported.
- Protect the local audit/free results; score/report must work offline. Decide **actual** premium value, not merely gate the present free report.
- For paid features, design a separate authenticated entitlement API with rate limits; short-lived signed status, server-authoritative entitlement source, idempotent captured-payment verification, refund/revoke, recovery across devices and no implicit customer data collection.
- Wait for #90 checkout/fulfillment gates: authorized PayU merchant checkout, verified captured payment and match to order/SKU/amount/currency, safe retries, settlement, test purchase/refund, updated terms/privacy and Store review. Provider fees may apply.
- Prefer **one extension first** as pilot (SiteCheck); do not ship SiteCheck and GridSnip paywalls simultaneously.

## Acceptance criteria

- An offline benchmark can be reproduced with a pinned candidate revision and assets, and records **before vs after** objective metrics.
- No extra permissions, production access tokens, unlicensed footage, duplicated YouTube uploads, or claims of verified public content without evidence.
- First feature pilot has passing tests, a rollback plan and explicit owner go-live gate. Production payments are not described as active until captured/fulfilled purchase is verified.
- Progress is recorded under [issue #93](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/issues/93) and canonical project PRs. Public HQ only contains non-sensitive technical metadata.

## Source pointers inspected on 2026-11-02

- Xender: `AGENTS.md`, `docs/BUILD_HOME.md`, `PROJECTS.md`, `extension/README.md`, `extension/src/audit.js`, `extension/src/popup.js`, `extension/manifest/base.json`, `package.json`, existing [#90](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/issues/90), [PR #92](https://github.com/sahilsharma171098-star/Xender-Secrets-V2/pull/92).
- AutoTube (private): existing `autotube/render.py`, `autotube/script_gen.py`, `autotube/script_check.py`, `autotube/ledger.py`, workflow state (no secrets or code copied here).
- GitHub upstream metadata/README: [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo), [ShortGPT](https://github.com/RayVentura/ShortGPT), [WXT](https://github.com/wxt-dev/wxt), [Plasmo](https://github.com/PlasmoHQ/plasmo), [Postiz](https://github.com/gitroomhq/postiz-app).

## Handoff

- Task ID: XEND-OSS-UPGRADE-001
- Owner / canonical source: ChatGPT / public Xender HQ; implementation stays in corresponding product repository.
- Changed behavior: none; roadmap and measured benchmark criteria only.
- Checks: repository metadata and selected source files read; no local benchmarks or end-to-end production tests run in this phase.
- Deployment: none.
- Next: verify AutoTube's latest safe dry-run artifacts and SiteCheck's actual Chrome listing; establish measurable baseline before copying or changing code.
