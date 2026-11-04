# GridSnip OCR (Chrome extension)

Snip a table from anything on screen and paste it into Excel or Google Sheets. Task: XEND-GRIDSNIP-001.
Canonical source: this folder (moved from Antigravity scratch on 2026-11-04). Store item: `flejimiajadjeghbjcgkonenbiikaeif`.

- `manifest.json`, `src/` — shipped files. `assets/` — icon sources. `store/` — listing, privacy policy, store answers, changelog.
- Build: `npm run gridsnip:build` → `projects/gridsnip/dist/chrome`. Package: `npm run gridsnip:package` → `dist/gridsnip-<version>.zip`.
- Checks: `npm run gridsnip:lint` (permissions, policy, store copy) and `npm run gridsnip:test` (unit + real Chromium extension test with a mocked Gemini API).
- Privacy page on the site: `public/gridsnip-privacy.html` (must match `store/privacy-policy.md`; `npm run gridsnip:lint` checks the policy).

How it works: background.js takes a screenshot of the visible tab (activeTab) and opens snip.html; the snip tab
shows it, the user drags a box, lib/gemini.js sends only that crop to the Gemini API with the user's own key, and
lib/tsv.js turns the answer into spreadsheet-safe rows. No content scripts, no servers, no analytics.

Not built yet (needs Sahil's decision): a paid tier. If one is added, reuse the SiteCheck licence pattern
(`src/sitecheck-license.mjs`) with product id `gridsnip`; the store copy must not mention a paid tier until it works.
