# XEND-PAYMENTS-001 — Razorpay payment ledger

Payments now run inside the existing SQLite AppState Durable Object. New tables
`payment_orders`, `payment_attempts`, and `payment_events` do not alter the legacy shop
`orders` table or the lead pipeline. Amounts are integer paise and include the existing 18% GST.

## Lifecycle

- `POST /api/payments/order` saves customer/contact, package, quote reference and the server's
  amount before requesting a Razorpay order. A random receipt and `notes.xs_order_id` correlate
  provider responses and early webhooks. Invalid provider amounts/currencies fail closed.
- Creation failures remain visible as `creation_failed` or `creation_unknown`. A network timeout
  does not prove that Razorpay failed to create the order; reconciliation is required.
- `POST /api/payments/verify` checks the signed checkout response against a saved provider order,
  then records a `verified` attempt. Verification alone does not mark an order paid.
- `POST /api/payments/webhook` verifies HMAC against the raw body using the webhook secret,
  validates the saved amount/currency and processes `payment.authorized`, `payment.captured`,
  `payment.failed`, and `order.paid`. Capture marks the order paid. Late failures, authorization
  events or callbacks cannot downgrade a captured attempt or a paid order.
- Event ID (or SHA-256 payload hash when absent) deduplicates retries. Reusing an event ID with
  a different payload is rejected. Attempt updates and event writes share a synchronous storage
  transaction; storage failures return 503 without acknowledging or partially applying an event.
- Unknown relevant orders return 503 so Razorpay can retry. Unrelated event types are ignored.
- `GET /api/admin/payments?limit=50` uses the existing `ADMIN_TOKEN` authentication, returns
  no-store history (maximum 100 orders), and powers the new Recent online payments MIS section.

## Release and reconciliation

1. Configure Worker secrets `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and
   `RAZORPAY_WEBHOOK_SECRET`; keep `ADMIN_TOKEN` configured. No secret values belong in Git.
2. Subscribe the Razorpay webhook URL `https://www.xendersecrets.com/api/payments/webhook`
   to the four supported events. Confirm capture settings in Razorpay before accepting payments.
3. Verify a test-mode checkout and duplicate webhook delivery against a preview before release.
   Local tests use fake credentials and mocked provider responses, with no real transactions.
4. Check MIS against the Razorpay dashboard. Investigate `verified`, `authorized`,
   `creation_unknown` and repeated webhook delivery failures before treating a project as paid.

Previously created Razorpay orders are not backfilled; historical payments need reconciliation.
There is no automatic fulfillment, invoice creation, refund handling or update of lead revenue.
Use the quote reference to reconcile with a lead and enter collected revenue excluding GST.
The static confirmation page makes no payment claim based on query parameters.

## Validation

Payment unit tests use real SQLite, mocked Razorpay responses and real HMAC signatures.
They cover creation, verification, replay, capture, out-of-order events, retries, amount/currency
checks, early-webhook races, rollback and admin authentication. Worker smoke tests exercise the
AppState route and local-only test secrets without making provider calls.

Provider references: [payment verification](https://github.com/razorpay/razorpay-node/blob/master/documents/paymentVerfication.md),
[payment events](https://github.com/razorpay/markdown-docs/blob/master/webhooks/payments.md).
