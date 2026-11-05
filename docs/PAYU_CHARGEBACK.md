# SiteCheck Pro — PayU chargeback runbook (MT-010, gate G11)

**Who:** Sahil only. This is a production write with real customer and money consequences. Agents may read
and prepare this runbook; they never run step 3.
**Status:** manual process. No signed chargeback webhook exists. Nothing in this runbook refunds, charges
or changes public checkout (`SITECHECK_PRO_CHECKOUT_ENABLED` stays as it is).

## What the code does today (verified in source, tested in `tests/unit/payu-chargeback.test.mjs`)

| Fact | Where |
| --- | --- |
| A chargeback is recorded **only** by the admin API `POST /api/payu/admin/reconcile` with `{"txnid":"XS…","reason":"chargeback"}` and header `authorization: Bearer <ADMIN_TOKEN>`. Without a configured `ADMIN_TOKEN`, a wrong token or a cross-site `Origin`, it is refused (401/403). | `src/payu-routes.mjs` (`/api/payu/admin/reconcile`) |
| The endpoint **records** a chargeback that PayU has already confirmed. It does not contact PayU, start a refund or move money. | same; comment "records externally VERIFIED refund/chargeback only" |
| Effect: order `captured` → `chargeback`; the SiteCheck entitlement → `revoked` with `revoked_at`; one `payu_events` row `admin_reconciliation / chargeback`. | ledger `revoke` in `src/payu-routes.mjs` |
| Repeating the call is safe: it answers `duplicate:true` and adds no second event. A later `reason:"refunded"` does not overwrite `chargeback`. | ledger `revoke` |
| Only a `captured` order can be charged back (pending → 409, unknown → 404, malformed txnid → 400). | ledger `revoke` |
| After revocation, licence verify returns `pro:false`, a new key cannot be issued (403), and a later re-check or admin verify cannot settle the order again (409). | `src/sitecheck-license.mjs`, ledger `settle` |
| The extension re-verifies its key when the popup opens, so Pro turns off on the customer's next popup open. The free audit keeps working. | `extension/src/popup.js` `refreshLicense()` |
| The automatic 15-minute check queries PayU **refunds** only. It revokes when refunds ≥ the amount paid. Whether PayU reports a chargeback through that refund query is **not verified**, so do not rely on it: use this runbook. | `src/index.js` `/api/sitecheck/license/verify` |
| There is **no reinstate path.** If a dispute is later decided in Xender's favour, restoring Pro needs a new reviewed code change (or a fresh purchase), not a manual database edit. | — |

## Steps

1. **Notice.** PayU tells the merchant about a dispute or chargeback. The exact PayU email/dashboard wording has not
   been observed by Xender yet: record it in the log below the first time it happens.
2. **Confirm in the PayU merchant dashboard**, not from an email link or a customer message:
   - the Xender transaction ID (`XS…`, the PayU `txnid`) and the PayU payment ID;
   - the amount and that it is a SiteCheck Pro ₹499 order;
   - the dispute state. **Decision for Sahil:** revoke when PayU shows the chargeback as final/debited
     (proposed default), or as soon as it is raised. Write down which, so later cases are treated the same.
   - If the dashboard does not show the transaction as charged back, stop. Do nothing in Xender.
3. **Record it in Xender** (only after step 2), from your own terminal, with the token kept in your shell:

   ```bash
   # ADMIN_TOKEN comes from your password manager / Cloudflare secret. Never paste it into chat, GitHub or a doc.
   curl -sS -X POST https://www.xendersecrets.com/api/payu/admin/reconcile \
     -H "authorization: Bearer $XS_ADMIN_TOKEN" -H 'content-type: application/json' \
     -d '{"txnid":"XS…","reason":"chargeback"}'
   ```

   | Response | Meaning | Next |
   | --- | --- | --- |
   | `{"ok":true,"status":"chargeback"}` | recorded, Pro revoked | step 4 |
   | `{"ok":true,"status":"chargeback","duplicate":true}` (or `"refunded"`) | already recorded earlier | nothing more |
   | HTTP 409 | order is not `captured` in Xender (still pending) | check the txnid; if PayU shows it captured, run `/api/payu/admin/verify` first (QA checklist 3.6), then repeat |
   | HTTP 404 / 400 | wrong or malformed txnid | re-copy the txnid from the PayU dashboard |
   | HTTP 401 / 403 | token missing/wrong, or the request carried another site's `Origin` | use the terminal command above, not a browser |
   | HTTP 503 | ledger unavailable | retry later — the call is safe to repeat (a completed revoke answers `duplicate:true`) |

4. **Check the result** (no money involved): the buyer's account at `/api/sitecheck/entitlement` → `pro:false`;
   their extension shows "Free edition" on the next popup open.
5. **Customer and books.** Reply to the customer from the support address if they wrote in, without arguing the
   dispute in public channels. Note the chargeback for GST/accounting with the PayU reference. Respond to PayU's
   dispute request inside PayU if contesting.
6. **Log it** below. Do not record customer names, emails, phone numbers or tokens in this public repository;
   keep those in the private Command Center.

## Log (public, no personal data)

| Date | txnid (last 4 only) | PayU state seen | Revoked (Y/N) | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | no chargeback has occurred yet |

## Not covered (follow-ups, not done)

- A signed PayU chargeback/dispute webhook. It needs PayU's documented payload and signature first, and must never be inferred
  from the existing payment webhook.
- Partial chargebacks: the ledger revokes the whole order. Decide the policy before the first case.
- Reinstatement after a won dispute (see above).
