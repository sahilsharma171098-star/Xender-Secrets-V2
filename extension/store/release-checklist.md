# Release checklist — Xender SiteCheck

## Before every release
- [ ] Bump `version` in `extension/manifest/base.json` and add a `changelog.md` entry.
- [ ] `npm run extension:lint` — policy, manifest and store-copy checks pass.
- [ ] `npm run extension:test` — unit, rule and real-extension tests pass (needs `npm install --no-save playwright`).
- [ ] `npm run extension:package` — note the three sha256 hashes in the release notes.
- [ ] Optional: `npx web-ext@10 lint --source-dir extension/dist/firefox` (Mozilla's linter).
- [ ] Manual smoke test (below) in Chrome or Edge **and** Firefox.
- [ ] If permissions or data handling changed: update `privacy-policy.md`, the site page `/sitecheck-privacy` (scripts/commercial/pages.mjs), `permission-justification.md`, every listing's privacy section — **before** submitting.
- [ ] Re-generate screenshots if the UI changed: `npm run extension:assets`.

## Manual smoke test (10 minutes)
1. Chrome/Edge: open `chrome://extensions` (or `edge://extensions`), enable Developer mode, "Load unpacked" → `extension/dist/chrome` (or `edge`). Firefox: `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on…" → `extension/dist/firefox/manifest.json`.
2. Confirm the install prompt/permissions show no "all websites" access.
3. Pin the icon; check it is legible in light and dark toolbars.
4. Open https://www.xendersecrets.com/ → click the icon → a score and categories appear within ~1s; no errors in the popup console (right-click popup → Inspect).
5. Open a page with known issues (e.g. a site without HTTPS, or `extension/tests/fixtures/insecure.html` served locally via `npx http-server extension/tests/fixtures`) → Critical issues appear, expand one → Why/Fix/Examples are shown.
6. Click the "Technical" chip → only technical issues; "All issues" restores the list.
7. Click "Copy report" → paste into a text editor → report contains the URL, score, disclaimer and fixes.
8. Click "Get a free website audit" → opens www.xendersecrets.com/sitecheck with only utm parameters (no audited URL).
9. Click the icon on `chrome://settings` / `edge://settings` / `about:addons` and on the add-on store → friendly "browser-protected page" message.
10. Open a PDF → friendly message. Open a `file://` HTML page → explanation about "Allow access to file URLs".
11. Narrow the window to ~400px on a page and re-run (↻) → sideways-scroll check reflects the new width.
12. Switch the OS to dark mode → popup follows.

## Store submission order (₹0 rule)
1. **Microsoft Edge Add-ons** — free developer registration. See `edge-listing.md`.
2. **Firefox AMO** — free. See `firefox-listing.md`.
3. **Chrome Web Store** — US$5 one-time registration fee. **Do not pay until Sahil approves after first revenue.** See `chrome-listing.md`.

### Edge — shortest path (Sahil)
1. Sign in at https://partner.microsoft.com/dashboard/microsoftedge/overview with your Microsoft account; complete the free developer registration (name, email, country, agreement).
2. "Create new extension" → upload `xender-sitecheck-edge.zip`.
3. Availability: Public, all markets. Properties: category Developer tools, privacy policy URL, website, support contact (from edge-listing.md).
4. Store listing (English): paste short description, description, search terms; upload logo 300×300, tiles, screenshots.
5. Submission options → Notes for certification: paste reviewer-notes.md → Publish. Review typically takes up to several business days.

### Firefox — shortest path (Sahil)
1. Sign in at https://addons.mozilla.org/developers/ with a Firefox account (enable two-step authentication when asked); accept the distribution agreement.
2. "Submit a New Add-on" → "On this site" → upload `xender-sitecheck-firefox.zip` → answer "No" to "Do you need to submit source code?" (code is not minified or generated).
3. Paste name, summary, description, categories, tags, homepage, support email and privacy policy from firefox-listing.md / privacy-policy.md; add screenshots; paste reviewer notes → Submit.

### Chrome — later
1. After first revenue and Sahil's approval: register at https://chrome.google.com/webstore/devconsole (US$5 one-time).
2. Upload `xender-sitecheck-chrome.zip`; paste chrome-listing.md fields, including the Privacy practices tab; upload assets → Submit for review.

## After approval
- [ ] Replace the "Coming soon" text for that store on `/sitecheck` with the real store link (`SITECHECK_STORES` in `scripts/commercial/pages.mjs`), run `npm run build:pages`, open a PR.
- [ ] Record the store URL and listing ID in `docs/CURRENT_STATE.md`.
