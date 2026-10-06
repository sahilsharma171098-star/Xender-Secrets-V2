# Notes for store reviewers — Xender SiteCheck 1.0.0

**Single purpose:** analyze the current webpage and give the user a fast, actionable website quality and conversion audit (SEO basics, accessibility, usability, conversion heuristics and technical/security basics).

## How to test (about 1 minute)
1. Install the package and pin the SiteCheck icon.
2. Open any normal website, e.g. https://example.com/ or https://www.xendersecrets.com/.
3. Click the SiteCheck toolbar icon. The popup scans the page immediately and shows:
   - a 0–100 Website Health Score with five category scores (click a category to filter)
   - issues grouped into Critical, Warnings and Recommendations (expand one to see "Why it matters" and "Recommended fix")
   - a Passed tab
4. Optional: click **Check links**. SiteCheck checks up to 40 links on the same site and reports only links that returned 404, 410 or 5xx.
5. Optional: click **Copy report** to copy a plain-text report.
6. Open a protected page (`about:addons`, `chrome://extensions`, or the add-on store itself) and click the icon. A friendly message appears ("SiteCheck cannot analyze this browser-protected page…") with no errors.

No account, login or configuration is required.

## Why each permission is needed
- **activeTab:** read only the tab the user clicked the button on, with no standing access to websites.
- **scripting:** inject the packaged `core/audit.js` into that tab to run the audit, and the user-initiated same-site link check.
- No host permissions, no storage, no tabs permission, no background script, no content scripts.

## Privacy
- The analysis runs locally in the page. Results are displayed in the popup and not stored.
- Form values, passwords, cookies, storage and history are never read. An automated test (`tests/audit.test.mjs` › "form audit never reads field values") enforces this.
- No analytics, telemetry, ads or third-party scripts. The only network requests are the optional, user-clicked link checks, which go to the same website being audited, without cookies.
- Firefox: `data_collection_permissions.required = ["none"]`.

## Code
- No remote code, no `eval`, no `new Function`, no minification or bundling. Everything in the package is the readable source.
- Files: `popup/popup.html|css|js` (UI), `core/audit.js` (audit engine), `core/restricted.js` (protected-page detection), `core/report.js` (plain-text report).

## The Xender link
The popup contains a small static link, "Get a free website audit", to the publisher's website. It opens only when clicked, sends no data, and there are no popups or prompts.
