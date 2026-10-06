# Release Checklist — CLAUDE-QA-001

Run before merging any PR that touches `public/`, `src/` or `scripts/commercial/`.

## Automated (CI "Offline checks" job — must be green)
- [ ] `node --test tests/unit/*.test.mjs` — reader data/API + growth (lead/event/admin) on real SQLite
- [ ] `node scripts/build-commercial-pages.mjs --check` — generated pages + sitemap committed and fresh
- [ ] `node scripts/build-novel-data.mjs --check`
- [ ] `tests/reader-sources.test.mjs` — reader in a real browser, network mocked
- [ ] `tests/commercial-funnel.test.mjs` — every generated page: one h1, one lead form, canonical, description length, JSON-LD parses, no broken internal links, no overflow at 375px; lead submit → attribution → WhatsApp ref; server-failure recovery; GPC opt-out; admin auth + pipeline save; international US$299 note

## After merge (automatic "Live E2E" on `main`)
- [ ] `homepage`, `homepage_lead_form`, `lead_api_smoke` (test-flagged lead, hidden, no alert)
- [ ] `commercial_pages` (services/clinic/gurugram/contact/about each have one form; Mumbai → India 301)
- [ ] catalogs, previews, `currency_us` (shop catalog), reader + translation, mobile overflow

## Manual, 5 minutes, on a phone
- [ ] Open https://www.xendersecrets.com/ — prices visible, WhatsApp float works
- [ ] Submit one real enquiry; confirm it appears at `/admin.html` (and Telegram, if configured)
- [ ] Tap "Send on WhatsApp" on the success screen — message contains the XS- reference
- [ ] Toggle dark mode; reload; it persists

## Never
- Weaken a test to make CI green; edit generated `public/*.html` by hand (edit `scripts/commercial/*` and run `npm run build:pages`); commit secrets.

## Rollback
Revert the merge commit on `main`; Cloudflare redeploys the previous version. Growth tables are additive — no data migration to undo.
