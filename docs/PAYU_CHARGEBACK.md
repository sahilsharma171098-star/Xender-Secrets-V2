# SiteCheck Pro — PayU chargeback runbook (MT-010, gate G11)

**Who:** Sahil only. Step 4 is a production write with real customer and money consequences. Agents may read
and prepare this runbook; they never run step 4.
**Policy:** reply in PayU before the `Reply Before` deadline; revoke Pro only on `Closed Customer Favour` (see Policy).
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

## Policy (Sahil's decision, 2026-11-05)

**Revoke Pro only when the PayU dashboard shows the chargeback as `Closed Customer Favour`** (or another
unambiguous final loss for Xender). Do **not** revoke on the first dispute notification, on `Pending Response`,
while the case is being contested, or because of an interim debit. Revocation is permanent today, because there is
no tested restore path. If PayU closes the case in Xender's favour (`Closed in Merchant Favour`), do nothing in Xender.

**Reply first, decide later:** every dispute must be answered in PayU **before its `Reply Before` deadline**
(accept or contest with evidence). Do not wait for the final status before replying: a missed deadline can be lost
by default.

The status names come from PayU's documentation ([chargeback status](https://docs.payu.in/docs/chargeback-status),
[chargeback process](https://docs.payu.in/docs/chargeback-process)). Xender has not yet seen them in its own dashboard,
so check the exact wording in the first real case and record it in the log.

There is no "temporary suspension" mechanism. During an open dispute the buyer keeps Pro. Choosing differently
needs a new policy and reviewed code, not a manual workaround.

## Steps

1. **Notice.** PayU tells the merchant about a dispute or chargeback. Open the case in the PayU merchant dashboard
   (not from an email link or a customer message) and note its **`Reply Before`** date at once.
2. **Respond in PayU before `Reply Before`.** Accept, or contest with evidence: order and txnid, the purchase
   confirmation, the licence-activation record, and the refund terms on `/refund` and `/sitecheck-pro`. Do this even
   though the outcome is unknown. **Nothing changes in Xender at this step.**
3. **Wait for the final status in the PayU dashboard**, then confirm:
   - the Xender transaction ID (`XS…`, the PayU `txnid`) and the PayU payment ID;
   - the amount and that it is a SiteCheck Pro ₹499 order;
   - the status is **`Closed Customer Favour`** (final loss). Anything else, including `Pending Response`, an open
     case, an interim debit or `Closed in Merchant Favour`, means **stop: do nothing in Xender.**
4. **Record it in Xender** (only after step 3 confirms `Closed Customer Favour`), from your own terminal, with the
   token kept in your shell:

   ```bash
   # ADMIN_TOKEN comes from your password manager / Cloudflare secret. Never paste it into chat, GitHub or a doc.
   curl -sS -X POST https://www.xendersecrets.com/api/payu/admin/reconcile \
     -H "authorization: Bearer $XS_ADMIN_TOKEN" -H 'content-type: application/json' \
     -d '{"txnid":"XS…","reason":"chargeback"}'
   ```

   | Response | Meaning | Next |
   | --- | --- | --- |
   | `{"ok":true,"status":"chargeback"}` | recorded, Pro revoked | step 5 |
   | `{"ok":true,"status":"chargeback","duplicate":true}` (or `"refunded"`) | already recorded earlier | nothing more |
   | HTTP 409 | order is not `captured` in Xender (still pending) | check the txnid; if PayU shows it captured, run `/api/payu/admin/verify` first (QA checklist 3.6), then repeat |
   | HTTP 404 / 400 | wrong or malformed txnid | re-copy the txnid from the PayU dashboard |
   | HTTP 401 / 403 | token missing/wrong, or the request carried another site's `Origin` | use the terminal command above, not a browser |
   | HTTP 503 | ledger unavailable | retry later — the call is safe to repeat (a completed revoke answers `duplicate:true`) |

5. **Check the result** (no money involved): the buyer's account at `/api/sitecheck/entitlement` → `pro:false`;
   their extension shows "Free edition" on the next popup open.
6. **Customer and books.** Reply to the customer from the support address if they wrote in, without arguing the
   dispute in public channels. Note the chargeback for GST/accounting with the PayU reference.
7. **Log it** below, including the `Reply Before` date and what was replied. Do not record customer names, emails, phone numbers or tokens in this public repository;
   keep those in the private Command Center.

## Log (public, no personal data)

| Date | txnid (last 4 only) | Reply Before / replied on | Final PayU status seen | Revoked (Y/N) | API response | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — | no chargeback has occurred yet |

## Not covered (follow-ups, not done)

- A signed PayU chargeback/dispute webhook. It needs PayU's documented payload and signature first, and must never be inferred
  from the existing payment webhook.
- Partial chargebacks: the ledger revokes the whole order. Decide the policy before the first case.
- Reinstatement after a won dispute (see above).
