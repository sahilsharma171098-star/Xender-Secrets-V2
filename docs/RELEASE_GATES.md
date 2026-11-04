# Release Gates

A gate is passed only with evidence a reviewer can re-check (run ID, commit SHA, dashboard record, screenshot
path). CI green is never proof of a real payment or a store approval. Update the row; never delete history.

## SiteCheck Pro — ₹499 one-time (PayU India, GST included)

Configuration that must stay true until G12: `SITECHECK_PRO_CHECKOUT_ENABLED` unset/`false` in production.

| # | Gate | Status | Evidence / how to check |
| --- | --- | --- | --- |
| G1 | Server-fixed price: ₹499.00 = ₹422.88 + ₹76.12 GST; browser cannot change amount | PASS (code + tests) | `src/payments.mjs` offer `sitecheck-pro-onetime`; `tests/unit/payu-*.test.mjs`; spoofed amount rejected in `payu-payment-flow` test |
| G2 | Request hash `key|txnid|amount|productinfo|firstname|email|udf1..5||||||SALT`, reverse hash, `verify_payment` hash | PASS (code review vs PayU docs + tests) | `src/payu-gateway.mjs`; reviewed 2026-11-03 |
| G3 | Fulfilment only after PayU `verify_payment` says `success` + `captured` + exact amount + matching txn/email/SKU | PASS (code + tests) | `isCapturedMatchingOrder`; test "does not fulfill if verify_payment reports pending" |
| G4 | Idempotent fulfilment, one entitlement per txn, replay safe | PASS (tests) | ledger `settle` + `extension_entitlements.txnid UNIQUE`; replay test |
| G5 | Account ownership: purchase email must equal signed-in Xender account; licence bound to account | PASS (tests) | `/api/payu/initiate` 401 on mismatch; `sitecheck_order_accounts` |
| G6 | Recovery when callback and webhook are both lost | PASS (deployed, not yet exercised with real money) | `POST /api/payu/admin/verify` merged as PR #99 (`8eef28c`); Live E2E #272 green. Customer self-serve recheck (MT-009) in review on `claude/sitecheck-payu-recheck-20261104` |
| G7 | Public checkout OFF; only owner account can buy | PASS in production for anonymous visitors | Live E2E run 41485101193 asserts `checkoutEnabled=false`. Owner path needs **one** of: `WORKSPACE_OWNER_EMAIL` secret (main already has `SITECHECK_PRO_OWNER_PILOT=true`) **or** PR #96 + `SITECHECK_PRO_CANARY_EMAIL` |
| G8 | PayU webhook actually delivered, form-encoded, hash-valid | TESTING PENDING | Webhook created by merchant 2026-11-02 for `/api/payu/webhook`. Handler only accepts `application/x-www-form-urlencoded` — confirm PayU's real delivery format in the canary |
| G9 | Real ₹499 owner purchase → captured in PayU dashboard → ledger `captured` → licence issued → extension unlocks → survives reinstall | TESTING PENDING (owner must pay) | record txnid, PayU dashboard status, licence restore result here |
| G10 | Real full refund → PayU refund query success → Pro revoked within 15 min on next verify; partial refund keeps Pro | TESTING PENDING (owner must refund) | `/api/sitecheck/license/verify` refund check |
| G11 | Chargeback | NOT STARTED (manual only) | `POST /api/payu/admin/reconcile {reason:"chargeback"}` after PayU dashboard check; no signed chargeback webhook yet |
| G12 | GST receipt/invoice, refund terms on `/sitecheck-pro` and `/refund`, support contact | TESTING PENDING | pages exist (`public/sitecheck-pro.html`, `refund.html`, `sitecheck-privacy.html`); content not re-reviewed this session |
| G13 | Chrome Web Store: v2.0.0 zip from `npm run extension:package`, permissions/privacy disclosures match code, listing approved and public | BLOCKED behind G9–G12 | record item version + approval date |
| G14 | Launch: owner authorizes `SITECHECK_PRO_CHECKOUT_ENABLED=true`; first-order monitoring; rollback = unset flag | NOT STARTED | — |
| G15 | Promotion (Product Hunt, Reddit, communities) only after G13 approval and G9 pass; review requests without incentives | NOT STARTED | — |

Customer-facing callback pages (failed / pending / verified) are fixed on `claude/sitecheck-payu-recovery-20261103`
(`6fa5fc6`). Run the owner canary with `docs/SITECHECK_PRO_QA_CHECKLIST.md` (same branch).

Watch item for G9: `productinfo` is `SiteCheck Pro — One-time License` (contains an em dash). The callback
compares PayU's echoed `productinfo` byte-for-byte. If PayU alters non-ASCII text, a captured payment would be
rejected as "Order mismatch" and must be settled with G6. Check this first in the canary.

## GridSnip OCR — Chrome Web Store

| # | Gate | Status | Evidence |
| --- | --- | --- | --- |
| R1 | Source registered in HQ (no orphan copy in Antigravity scratch) | IN REVIEW | `projects/gridsnip/` + PROJECTS.md row on `claude/gridsnip-v1.1-20261104` (push pending) |
| R2 | Free tier works with no user key, or listing stops promising it | FAIL | `background.js` uses `"YOUR_GEMINI_API_KEY"` fallback |
| R3 | Any paid tier has a working purchase + licence check | FAIL | `popup.js` Gumroad verify uses `product_permalink=YOUR_PRODUCT`; `$14` alert |
| R4 | Data-use disclosure: "Website content" (selected region sent to Google Gemini) + privacy policy URL | IN REVIEW | `/gridsnip-privacy` + `projects/gridsnip/store/permission-justification.md` on the GridSnip branch |
| R5 | No `alert()` dialogs, graceful OCR/API errors | FAIL | `background.js` injects `alert()` |
