# Firefox Add-ons (AMO) listing — Xender SiteCheck (submit SECOND)

AMO publishing is **free**.

| AMO field | Value |
|---|---|
| Package | `extension/dist/xender-sitecheck-firefox-1.0.0.zip` |
| Add-on ID | `sitecheck@xendersecrets.com` (in the manifest) |
| Minimum Firefox | 140 (desktop) / 142 (Android) |
| Data collection | Declared in the manifest: `data_collection_permissions.required = ["none"]` |
| Distribution | On this site (listed) |
| Name | Xender SiteCheck |
| Summary (≤250) | Check the current page for SEO basics, accessibility issues, usability problems and conversion friction. Runs locally in your browser — no tracking. |
| Description | The long description in [listing-copy.md](listing-copy.md) |
| Categories | Web Development; Privacy & Security is **not** used (it's not a privacy tool) |
| Tags | seo, accessibility, website audit, web development, links |
| Homepage | https://www.xendersecrets.com/sitecheck.html |
| Support site | https://www.xendersecrets.com/contact.html |
| Support email | sahilsharma171098@gmail.com |
| Privacy policy | Paste the contents of [privacy-policy.md](privacy-policy.md) |
| License | All Rights Reserved (or choose an open-source licence if the owner prefers) |
| Icon | Taken from the manifest (`icons/icon-128.png`) |
| Screenshots | `store/screenshots/01–05*.png` |
| Notes to reviewer | Paste [reviewer-notes.md](reviewer-notes.md) |

## Source code
The package contains only unminified, hand-written JavaScript, HTML and CSS. No bundler, transpiler or minifier is used, so AMO's source-code upload is **not required**.

## Validation
`npm run extension:lint:firefox` runs Mozilla's `web-ext lint`. Current result: 0 errors, 0 warnings, 0 notices.

## Owner-only steps
1. Sign in at https://addons.mozilla.org/developers/ with the owner's Firefox account (email verification / 2FA).
2. Accept the Firefox Add-on Distribution Agreement.
3. Submit a new add-on → "On this site" → upload the zip → fill in the fields above.
