# Revenue Tracker

Only collected money with a verifiable record counts (gateway transaction ID + dashboard status, or bank
credit). Leads, previews, quotes, store installs and CI results are **not** revenue. Never back-fill or
estimate here. Planning target (not a forecast): ₹60,000 net profit per month.

## Can a customer pay today? (2026-11-03)

| Product | Price | Gateway | Accepting public payments? | Evidence |
| --- | --- | --- | --- | --- |
| SiteCheck Pro | ₹499 one-time, GST incl. | PayU India hosted checkout | **No** — checkout OFF by design until gates G9–G13 pass | Live E2E run 41485101193 (`checkoutEnabled=false`) |
| Website packages (Founding ₹999+GST, Starter ₹1,999+GST, Pro ₹3,499+GST) | as listed in `src/payments.mjs` | Razorpay route `/pay` | unverified this session | not probed (egress blocked) |
| GridSnip OCR "$14 Unlimited" | US$14 | Gumroad placeholder | **No** — purchase/licence path not implemented | `popup.js` placeholder `YOUR_PRODUCT` |
| Shopify store | various, USD | Shopify | unverified | not audited |

## Collected transactions

| Date (IST) | Product | Customer type | Gateway txn ID | Amount (₹) | Fees (₹) | Refunded? | Net (₹) | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — | — | — | No captured transaction found in any evidence available to Claude on 2026-11-03 (PayU/Razorpay dashboards not visible to this session) |

The SiteCheck owner canary (MT-005) is a merchant self-purchase for verification. Record it here with
"Customer type = owner test" and exclude it from revenue totals.

## Monthly summary

| Month | Gross collected | Refunds | Gateway fees | Direct costs | Net | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11 | not verified | not verified | not verified | — | not verified | fill from gateway dashboards; do not estimate |
