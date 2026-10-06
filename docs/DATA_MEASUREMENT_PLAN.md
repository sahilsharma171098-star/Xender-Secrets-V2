# Data & Measurement Plan — CLAUDE-DATA-001

Implemented 2026-10-06 in `src/growth.mjs` (server), `public/xs-growth.js` (browser), `public/admin.html` (MIS).

## Principles
- First-party only. No third-party analytics, no cookies, no fingerprinting, no visitor/session IDs.
- Events are stored as **daily aggregate counters**, not per-visitor rows.
- Visitors with Global Privacy Control or Do Not Track send no events (lead forms still work).
- Raw leads are readable only with the `ADMIN_TOKEN` Worker secret. Never in the public repo.
- Rate limiting uses a salted SHA-256 of the IP that rotates daily and is deleted after 2 days.

## Storage (additive tables in the existing `AppState` SQLite DO — nothing altered)

| Table | Holds | Retention |
|---|---|---|
| `growth_daily` | `day, event, path, source, label, count` | keep (tiny); prune >400 days if ever needed |
| `growth_leads` | form fields + attribution + pipeline (`stage, quote_value, collected_value, next_action, next_action_at, notes, is_test`) | until the person asks for deletion; review yearly |
| `growth_lead_log` | stage/value change history per lead | with the lead |
| `growth_rate` | hashed rate-limit windows | 2 days |

The legacy `leads` table is untouched; new enquiries go to `growth_leads`.

## Events (`POST /api/event`, whitelisted)

`page_view`, `cta_click` (label = `data-cta`), `whatsapp_click`, `email_click`, `phone_click`, `lead_start` (first focus in a lead form), `lead_error` (label = HTTP status), `js_error` (≤2/page), `demo_view`, `offer_view`.
`lead_submit` is counted **server-side** when a lead is stored (client copies ignored → no double count).

Paths are stored without query strings. Source = `utm_source` → referrer host family (google, linkedin, instagram, …) → `direct`. Attribution is last non-direct touch, 30 days, kept in the visitor's own `localStorage`.

## Lead pipeline
Stages: `new → contacted → qualified → proposal → won | lost`.
`quote_value` = agreed price (counts as **booked** when stage is `won`); `collected_value` = cash actually received. Reported separately.

## Questions the MIS answers (`/admin.html`, `GET /api/admin/report?days=N`)
- Visits, form starts, leads, visit→lead %, WhatsApp clicks
- Leads and WhatsApp clicks by source (which channel works)
- Top pages and CTA clicks (which CTA converts)
- Leads and wins by offer (which offer sells)
- Open pipeline value, booked, collected, deals won
- Follow-ups due today or overdue
- JS/lead errors by page

## Outreach tagging convention (so sources are attributable)
Every link sent in outreach uses:
`https://www.xendersecrets.com/?utm_source=<channel>&utm_campaign=<yyyymmdd-segment>`
Channels: `gmail`, `linkedin`, `instagram`, `whatsapp`, `upwork`, `referral`. Example: `?utm_source=gmail&utm_campaign=20261006-gurugram-ca`.

## Setup (one-time, Sahil)
1. Cloudflare dashboard → Workers → `xender-secrets-v2` → Settings → Variables & Secrets → add **secret** `ADMIN_TOKEN` (random, ≥24 chars; e.g. a password-manager generated 32-char string). Without it, admin routes return 503 by design.
2. Optional free lead alerts: create a Telegram bot with @BotFather, message it once, then add secrets `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. Leads then arrive on your phone instantly. Test leads never notify.
3. Optional: secret `RATE_LIMIT_SALT` (any random string).
Never paste these values into GitHub, issues or chat.

## Not done / next
- Release markers (deploy SHA per day) to correlate releases with conversion.
- Web-vitals (LCP/INP) sampling — add only if performance becomes a question.
