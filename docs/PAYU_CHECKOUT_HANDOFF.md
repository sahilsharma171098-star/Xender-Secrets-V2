## Further implementation — 2026-11-02

- Added extension entitlement SQLite storage keyed by transaction and email. No paid extension SKU is enabled or granted yet.
- Added authenticated operator-only POST /api/payu/admin/reconcile, allowing already verified refunds/chargebacks to revoke matching entitlements and mark the transaction reversed. This does not call PayU refund API or automatically detect refunds.
- Added idempotent refund handling and SQLite ledger tests, including unauthenticated reconciliation checks.
- The four accessible GitHub repositories (autotube, autotube-legal, Xender-Secrets-V2, xender-amazon-spapi) do not reveal a canonical GridSnip source repository. Need original source or release package before responsibly shipping GridSnip paid gating.
- Newest commits have no confirmed test run yet; earlier Xender Live E2E success was not an end-to-end payment test.

Mandatory remaining gates: PayU real captured checkout, automated refund reconciliation, authenticated entitlement restore API and extension UI, price/benefit definition for both products, GridSnip source, Chrome Web Store review, bank settlement confirmation. Keep PR draft; do not deploy.

## Implementation update — 2026-11-02

On this draft branch, PayU INR website package checkout is now wired in code (not deployed):
- POST /api/payu/initiate generates server-priced transaction, persists to APP_STATE SQLite ledger and returns signed PayU fields.
- Browser /pay submits a normal HTML form to PayU; existing Razorpay API endpoints remain untouched.
- POST /api/payu/callback checks reverse SHA-512, ledger order/email/SKU/amount, and PayU verify_payment captured status before updating ledger.
- Public direct ledger access blocked in Worker; /api/payu/status requires authentication and is not yet implemented.
- Static success page no longer claims verification based solely on visiting a URL.
- Unit tests added but CI status for latest commit not yet confirmed.

**NOT RELEASE-READY:**
- PayU documentation/merchant-specific callback payload and live verify_payment response still need an end-to-end sandbox/nominal transaction check.
- Need authenticated customer order lookup, refund/chargeback reconciliation, real GST invoice delivery and operational alerts.
- SiteCheck and GridSnip OCR paid SKUs, actual gated features, entitlement restore/revoke, Chrome Web Store updates, and GridSnip source integration are NOT implemented. Do not sell Pro licenses yet.
- Need comprehensive failure/replay/concurrency tests, static page build consistency, local tests, and manual captured payment proof before any merge/deploy.
- Existing PayU keys are Cloudflare secrets; no secret values copied into GitHub.

# PayU India hosted checkout — implementation gate (2026-11-02)

Issue: #90 — XEND-EXT-PAY-001. This branch establishes hashing and authoritative verification primitives ONLY. **It does not enable or deploy payment collection or extension Pro entitlements.**

## Verified live configuration
- Cloudflare Worker: xender-secrets-v2.
- Secret binding NAMES verified through Cloudflare (values never retrieved): PAYU_KEY and PAYU_SALT.
- Existing /pay website checkout uses Razorpay, and /api/payments/* routes currently use RAZORPAY_* credentials. These are not replaced or disabled by this branch.
- PayU merchant account activation and a ₹20 **payment-handle** transaction have been observed; **this is not evidence of a captured website checkout transaction**.
- International PayU approval / multicurrency is separate and not complete.

## New code
- src/payu-gateway.mjs — canonical SHA-512 request signing; constant-time reverse-hash validation including additional-charge callback; verify_payment API request; captured/amount/txnid comparison.
- tests/unit/payu-gateway.test.mjs — hash, tampering, amount matching, verification request tests.
- No browser code or route invokes these helpers yet, hence no traffic or billing impact.

## Safe rollout plan (not yet complete)
1. Persist a server-authoritative order and generated **unique txnid** in the existing APP_STATE SQLite-backed Durable Object before issuing a signed checkout form. Prevent duplicate orders/fulfillment. Never trust a browser-provided amount or SKU price.
2. Add POST /api/payu/initiate with same-origin CSRF policy. It must require the existing quote/scope-confirmed package, valid name, email and phone. Use only approved domestic INR SKUs.
3. In /pay front-end, detect PayU as the intended provider and browser-POST a hidden form to https://secure.payu.in/_payment using server-signed fields. Never send PAYU_SALT to the browser, and never use fetch/XHR to submit to PayU.
4. POST /api/payu/callback must accept PayU form-encoded return; verify reverse hash, look up the persisted txnid, validate matching amount/merchant key/SKU/email, and reconcile with PayU's authoritative verify_payment endpoint. Do NOT fulfill when verification is unavailable or status is only authorized/pending.
5. Persist payment-id and captured state transactionally with idempotency; do not re-issue licenses on webhook retries. Add refund/chargeback handling and invoice/receipt workflow.
6. Define **real** GridSnip and SiteCheck paid SKUs + free/paid feature differences before granting extension entitlements. Their existing v1.0.0 packages are free. Restore entitlements across browsers/reinstall; update privacy disclosures for identity and network calls.
7. Tests: forged hash, reused txnid, price tampering, duplicate callback, wrong merchant, PayU API 5xx, partial payment, currency mismatch, expired pending, refund/revoke, fallback behavior.
8. Run local tests and manual real checkout (nominal amount) in a gated environment. Verify PayU dashboard shows CAPTURED, record issued, returning user can access entitlement, and bank settlement completes. Only after that explicitly deploy the Worker and submit extension updates.

## Safety notes
- Secrets must stay in Cloudflare encrypted bindings, never in repo, browser code, logs, issue, or PR.
- A public PAYU_KEY is normal for the browser POST; PAYU_SALT is never public.
- Do not remove or alter unrecognized Cloudflare secret bindings without tracing their owner first.
- Do not claim checkout/revenue is live from mere secret presence.
- PayU reference: https://docs.payu.in/docs/hashing-request-and-response and https://docs.payu.in/reference/verify_payment_api.
