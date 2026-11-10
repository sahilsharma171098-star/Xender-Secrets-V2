# SiteCheck Pro (India INR) — PayU release handoff

Scope: SiteCheck only; GridSnip is Phase 2. Implementation is on main. Historical PR #92 notes below are superseded by docs/SITECHECK_LAUNCH_2026-11-05.md. Public paid checkout remains OFF.

## Product and payment implementation

- SiteCheck Pro SKU: \`sitecheck-pro-onetime\`, **₹499 inclusive of 18% GST**, one-time purchase. Free 49-check audit and plain text copy stay free.
- Website: \`/sitecheck-pro\` shows pricing, an optional PayU purchase form (disabled by default), and authenticated license-key generation/recovery for the **same Xender account ID that initiated the purchase**. The user must be signed in before checkout; the buyer email is locked to the account email.
- Server-generated, signed PayU hosted checkout fields and transaction/order ledger in \`APP_STATE\` (Durable Object SQLite); PayU Salt stays in Worker secrets.
- PayU callback and \`/api/payu/webhook\`: validate PayU reverse SHA-512, exact persisted txnid/email/offer/amount, and authoritative \`verify_payment\` with \`success/captured\` before idempotent settlement and SiteCheck entitlement issuance.
- \`/api/sitecheck/license/issue\`: same-origin, authenticated account POST; rotates a random 256-bit bearer key and stores only its SHA-256 hash. Old key is invalidated by rotation; no key is sent to the user except on issuance.
- \`/api/sitecheck/license/verify\`: scoped extension origin/host; checks live paid, captured and non-revoked entitlements; never returns customer email/PayU ID, only \`{ok,product,pro}\`.
- \`getAllRefundsFromTxnIds\`: a **read-only, PayU-authoritative** refund query on license verification at most once per 15 minutes per transaction; successful **full refunds** revoke Pro idempotently. A partial refund alone does not revoke. If PayU is unavailable, the license check fails closed (free auditing remains available).
- Admin-only manual reconciliation route remains for independently verified refund/chargeback events; it does not initiate financial transactions.
- Existing Razorpay website package endpoints remain; SiteCheck SKU is explicitly excluded from Razorpay checkout.
- \`SITECHECK_PRO_CHECKOUT_ENABLED\` Worker environment flag defaults to **OFF**. It must stay off until final verification.

## Extension 2.0.0 (not published)

- Retains all local free checks/text exports. Optional paid feature: local priority CSV export (no report upload), with spreadsheet-formula-injection protection.
- Enters/saves an activation key to browser **local** extension storage and verifies against the Xender HTTPS license endpoint; a restart rechecks current entitlement, and refund locks the paid feature.
- New permissions: \`activeTab\`, \`scripting\`, \`storage\`, \`host_permissions\` restricted to \`https://www.xendersecrets.com/*\`. Update store reviewers' notes and Firefox optional authentication information disclosure.
- \`/sitecheck\` and \`/sitecheck-privacy\` are now maintained independently of the legacy generated commercial templates to avoid overwriting Pro disclosures.

## Automated verification

Required checks on PR HEAD:
- \`npm test\`
- \`npm run check:pages\`
- \`npm run extension:lint\`
- \`npm run extension:test\`
- \`npm run extension:package\`
- Worker/real-browser tests where configured.
- Dedicated unit tests: payment ledger idempotency, server-side PayU signing, spoofed webhook rejection, paid SKU authorization, hashed key rotation, no unpaid access, CSV safety, full refund revocation, partial refund preservation.
- The automated CI is **not** proof of a real merchant payment or Chrome Web Store approval. Check GitHub workflow results for the latest commit; do not rely on results for earlier commits.

## Manual real-payment and deployment gates (still REQUIRED)

1. Configure **PayU payment webhooks** in the merchant dashboard for successful (and optionally failed) payments, using \`https://www.xendersecrets.com/api/payu/webhook\`. A valid reverse-hashed webhook is only a trigger; the server still calls \`verify_payment\`. PayU may require merchant-side webhook configuration.
2. On an isolated, authorized verification deployment/configuration (not production sales), turn on the SiteCheck checkout flag **only** for the test. Complete an explicitly authorized INR ₹499 test purchase using the same signed-in account. Confirm transaction captured in merchant dashboard, ledger captured, one entitlement issued, and no duplicate grants on webhook replay.
3. Restore across popup restart/reinstall using generated license; download a safe CSV from a real audited page. Confirm free features continue without a license.
4. Issue an authorized **full refund through PayU** for that purchase; confirm PayU refund query returns success and Pro revokes at next reconciliation. Also test a partial refund and failed/pending status without inappropriate revocation.
5. Verify GST receipt/invoice handling, bank settlement, support instructions, checkout retry/error handling, and refund/chargeback escalation. A chargeback webhook with merchant-verified signature is **not yet configured**; admin manual verification applies for now.
6. After real payment, restore and refund gates pass, submit the tested v2.0.0 candidate with accurate disclosures and private reviewer access. Public checkout stays OFF during store review. Actual store approval, settlement/receipt evidence and a later explicit owner launch decision are required before enabling public paid checkout. Inspect current Cloudflare build integration before any merge.
7. Monitor first captured orders, licensing 5xx and refund events. Roll back checkout flag if fulfillment fails. Do not claim international acceptance; PayU USD/GBP approval is separate.

No real payment, refund, merchant webhook setup, merchant dashboard settlement, GitHub merge, Worker deploy, or Chrome Web Store publication has been performed by this PR implementation.

Official PayU references:
- https://docs.payu.in/reference/verify_payment_api
- https://docs.payu.in/reference/get_all_refunds_from_transaction_ids_api
- https://docs.payu.in/docs/create-a-new-webhook
- https://docs.payu.in/docs/hashing-request-and-response
