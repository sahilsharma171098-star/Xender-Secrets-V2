# SiteCheck Pro ₹499 — end-to-end payment QA checklist

Task: XEND-EXT-PAY-001 · Gates: `docs/RELEASE_GATES.md` G6–G14 · Owner of real-money steps: **Sahil only**.

Run top to bottom on production (`https://www.xendersecrets.com`) with the public checkout flag **off**.
Every row needs evidence (time, txnid, screenshot path or response body). A step without evidence is a fail.
CI results, mocks and the admin MIS are **not** proof of a real payment.

Never paste the admin token, PayU key/salt, OTPs or card/UPI details into a chat, issue or this file.

## 0. Before anyone pays

| # | Check | How | Pass when | Evidence |
| --- | --- | --- | --- | --- |
| 0.1 | Fixes are live | Merge the recovery PR (commits `708e876` admin re-verify, `6fa5fc6` callback pages), wait for Cloudflare | "Xender Live E2E" run on that main SHA is green | run URL |
| 0.2 | Price and gate | Open `https://www.xendersecrets.com/api/payu/config` in a private window | `sitecheck.amountPaise` = `49900`, `currency` = `INR`, `release` = `sitecheck-pro-v2.0.0`, `checkoutEnabled` = `false` | JSON |
| 0.3 | Worker secrets exist (names only) | Cloudflare → Workers → `xender-secrets-v2` → Settings → Variables | `PAYU_KEY`, `PAYU_SALT`, `ADMIN_TOKEN` set; owner gate = **one** of `WORKSPACE_OWNER_EMAIL` (var `SITECHECK_PRO_OWNER_PILOT=true` is already in `wrangler.jsonc`) **or** `SITECHECK_PRO_CANARY_EMAIL` (only after PR #96 is merged); `SITECHECK_PRO_CHECKOUT_ENABLED` **not set** | screenshot (values hidden) |
| 0.4 | PayU is live, not test | PayU dashboard | production merchant key; webhook "Payments → Successful" → `https://www.xendersecrets.com/api/payu/webhook` | screenshot |
| 0.5 | GST paperwork ready | Decide how the tax invoice is issued for this sale | invoice will carry the GSTIN recorded in `docs/REVENUE_ARCHITECTURE.md`, ₹422.88 taxable + ₹76.12 GST, CGST 9% + SGST 9% for a Haryana buyer (IGST 18% otherwise). Confirm treatment with the CA | note |
| 0.6 | A test extension that can activate | The license API only answers the published Chrome ID `egkpcmgkfakclaooopabcmffdmaldkhe` or a Firefox `moz-extension://` origin. Build with `npm run extension:package`, then **either** load `extension/dist/firefox` in Firefox → `about:debugging` → Load Temporary Add-on, **or** load `extension/dist/chrome` unpacked in Chrome after adding the store item's public key (CWS dashboard → Package → Public key) as `"key"` in that local copy's `manifest.json` only. Never commit the key (lint blocks it) | the loaded build shows "Free edition · Pro tools locked" | screenshot |

## 1. Gating — nobody else can buy (no money)

| # | Check | How | Pass when | Evidence |
| --- | --- | --- | --- | --- |
| 1.1 | Anonymous | Private window → `/sitecheck-pro` | button reads "SiteCheck Pro checkout not yet available" and is disabled | screenshot |
| 1.2 | Another account | Sign in with any non-owner account → `/sitecheck-pro` | still disabled; `/api/payu/config` shows `checkoutEnabled: false` | JSON |
| 1.3 | Owner account | Sign in at `/account` with the owner email → `/sitecheck-pro` | button reads "Pay ₹499 securely with PayU"; name/email prefilled | screenshot |
| 1.4 | Email must match account | As owner, change the email field to another address, submit | error "Sign in to your Xender account with the purchase email before paying"; no PayU redirect | screenshot |
| 1.5 | Cross-site initiate blocked | `curl -i -X POST https://www.xendersecrets.com/api/payu/initiate -H 'origin: https://attacker.example' -H 'content-type: application/json' -d '{}'` | `403` | response |

## 2. Cancelled / failed payment (no money)

| # | Check | How | Pass when | Evidence |
| --- | --- | --- | --- | --- |
| 2.1 | Cancel on PayU | As owner, start checkout, then cancel / go back on the PayU page | you land on `/sitecheck-pro?payment=failed` with "The payment was not completed, so no license was issued…"; **never** a 404 or JSON | screenshot + txnid |
| 2.2 | No access | `/sitecheck-pro` → "Generate a license key" | "No active SiteCheck Pro purchase on this account" | screenshot |

## 3. The real ₹499 purchase — Sahil only

| # | Check | How | Pass when | Evidence |
| --- | --- | --- | --- | --- |
| 3.1 | PayU page | Start checkout | amount **₹499.00**, product "SiteCheck Pro — One-time License", owner email | screenshot |
| 3.2 | Pay | Pay with your own UPI/card | PayU shows success | time of payment |
| 3.3 | Landing page | Browser returns to the site | `/sitecheck-pro?payment=verified` with "Payment confirmed for this Xender account…" **or** `?payment=pending` with the "could not confirm yet" text. Never 404 / JSON | screenshot, txnid (`XS…`) |
| 3.4 | PayU record | PayU dashboard → Transactions | status success / captured, ₹499.00, same txnid; note the PayU ID (`mihpayid`) | screenshot |
| 3.5 | Entitlement | Signed in, open `/api/sitecheck/entitlement` | `{"ok":true,"product":"sitecheck","pro":true}` | JSON |
| 3.6 | If still pending after 10 minutes | From your own terminal: `curl -sS -X POST https://www.xendersecrets.com/api/payu/admin/verify -H "authorization: Bearer $XS_ADMIN_TOKEN" -H 'content-type: application/json' -d '{"txnid":"XS…"}'` | `"status":"captured","changed":true`, then 3.5 passes. `"status":"pending"` with PayU `settlement` ≠ `captured` means PayU has not captured — wait, do not retry the payment | response |
| 3.7 | Webhook delivered | PayU dashboard webhook log (if shown) | response `{"ok":true,"captured":true,"fulfilled":true}`. A `400 Order mismatch` means PayU changed an echoed field (watch: the em dash in productinfo) — record it; 3.6 settles the order | screenshot |
| 3.8 | No double licence | Run 3.6 again; resend the webhook from PayU if the dashboard allows | `"changed":false`; entitlement still one purchase | response |

## 4. Licence key and extension

| # | Check | How | Pass when | Evidence |
| --- | --- | --- | --- | --- |
| 4.1 | Generate | `/sitecheck-pro` → "Generate a license key" | key starting `sc1_` shown once with copy button | screenshot (blur the key) |
| 4.2 | Activate | Test extension (0.6) → Pro panel → paste → Activate | "Pro active · …"; CSV (and from 2.1 the PDF) buttons appear | screenshot |
| 4.3 | Only the key is sent | DevTools on the popup → Network during activation | one `POST /api/sitecheck/license/verify` with body `{"licenseKey":"…"}` only; no page URL, score or report | screenshot |
| 4.4 | Restart | Close and reopen the browser, open the popup | still Pro | screenshot |
| 4.5 | Reinstall restore | Remove the extension, install again, sign in on the site, generate a key, activate | Pro again; the previous key no longer activates | screenshot |
| 4.6 | Free still works | Remove saved key in the popup | audit, score, issues, Copy report all work; Pro buttons hidden | screenshot |
| 4.7 | Exports | With Pro, export CSV (and PDF from 2.1) on a real page | files named `website-qa-<host>.csv/.pdf`, open in Excel/Sheets and a PDF viewer, no Xender branding, issue list matches the popup | files |

## 5. Refund — Sahil only (do this last)

| # | Check | How | Pass when | Evidence |
| --- | --- | --- | --- | --- |
| 5.1 | Optional partial | PayU dashboard → refund ₹1.00 | after PayU shows refund **success**, wait 15+ minutes, open the popup: **still Pro** | screenshot |
| 5.2 | Full refund | Refund the remaining amount | PayU refund status success | screenshot |
| 5.3 | Revocation | Wait 15+ minutes (the licence re-checks refunds at most every 15 minutes), open the popup | Pro turns off; `/api/sitecheck/entitlement` → `pro:false`; free audit still works | screenshot + JSON |
| 5.4 | Chargeback path (dry run only) | Read `POST /api/payu/admin/reconcile` with `{"txnid","reason":"chargeback"}` | process documented; no signed chargeback webhook exists yet — manual only, after checking the PayU dashboard | note |

## 6. Close out

| # | Check | Pass when |
| --- | --- | --- |
| 6.1 | Revenue tracker | `docs/REVENUE_TRACKER.md` row: customer type **owner test**, excluded from revenue |
| 6.2 | Gates | G8–G10 and G12 in `docs/RELEASE_GATES.md` updated with this evidence |
| 6.3 | Rollback ready | Removing the owner/canary secret closes checkout again; `SITECHECK_PRO_CHECKOUT_ENABLED` still unset |
| 6.4 | Next decision | Only after every row passes: Chrome Web Store submission of 2.0.0 (G13), then Sahil's explicit go for public checkout (G14) |

## Result log

| Date (IST) | Step | Result | Evidence link | Notes |
| --- | --- | --- | --- | --- |
| | | | | |
