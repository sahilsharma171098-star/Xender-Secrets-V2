# Chrome Web Store listing — Xender SiteCheck

**Status:** the package and listing are ready. The Chrome Web Store developer registration fee has **intentionally not been paid** (the business rule is ₹0 spend until first revenue). Submit after registration.

| Field | Value |
|---|---|
| Package | `extension/dist/xender-sitecheck-chrome-1.0.0.zip` (`npm run extension:package`) |
| Name | Xender SiteCheck (from manifest) |
| Summary (≤132) | From manifest: "Check the current page for SEO basics, accessibility issues, usability problems and conversion friction. Runs locally." |
| Description | The long description in [listing-copy.md](listing-copy.md) |
| Category | Developer Tools |
| Language | English |
| Icon (128×128) | `extension/assets/icons/icon-128.png` |
| Screenshots (1280×800) | `store/screenshots/01–05*.png` (see [screenshot-plan.md](screenshot-plan.md)) |
| Small promo tile (440×280) | `store/promo/small-promo-440x280.png` |
| Marquee (1400×560, optional) | `store/promo/marquee-1400x560.png` |
| Homepage URL | https://www.xendersecrets.com/sitecheck.html |
| Support URL | https://www.xendersecrets.com/contact.html |
| Privacy policy URL | https://www.xendersecrets.com/sitecheck-privacy.html |
| Visibility | Public |
| Pricing | Free |

## Privacy practices tab

**Single purpose:** Analyze the current webpage and give the user a fast, actionable website quality and conversion audit.

**Permission justifications:**
- `activeTab`: Grants temporary access to the tab the user is viewing, and only after the user clicks the SiteCheck toolbar button, so the extension can read that one page for the audit. No standing access to any website.
- `scripting`: Injects the bundled, local audit script (`core/audit.js`) into the active tab when the user opens the popup, and runs the user-requested same-site link check. No remote code is injected.

**Host permissions:** none.

**Remote code:** No. All JavaScript is included in the package. There is no eval, no remote scripts and no remote config.

**Data usage:** tick **no** data categories. The extension reads the page structure (HTML elements, attributes and computed styles) of the active tab only to compute the audit, inside the browser. Nothing is transmitted to the developer or third parties, so no user data is "collected" as Chrome defines it.

Certify:
- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes
