# Notes for store reviewers — Xender SiteCheck 1.0.0

**Single purpose:** analyse the web page in the current tab, when the user clicks the toolbar button, and show a website quality and conversion audit (SEO basics, accessibility, usability, conversion heuristics, technical/security basics) with plain-language fixes.

**Permissions**
- `activeTab` — temporary access to the tab the user clicked the button on; nothing else.
- `scripting` — runs the bundled `audit.js` in that tab via `scripting.executeScript({ files: ["audit.js"] })`.
- No host permissions, no background script, no content scripts, no storage, no tabs permission.

**No remote code.** All JavaScript is in the package, unminified and readable: `popup.js` (UI), `audit.js` (page analysis), `lib/*.js` (check copy, scoring, restricted-page handling, report text). No `eval`, no `new Function`, no remote scripts, no `fetch`/XHR.

**No data collection.** The extension makes no network requests. Results live in the popup's memory only. Form field values, cookies and storage are never read. The only outbound actions are ordinary links the user clicks (our website, privacy page, and a "free website audit" page with `utm_source=sitecheck_extension`; the audited URL is not included). Firefox manifest declares `data_collection_permissions: { required: ["none"] }`.

**How to test (2 minutes)**
1. Install the package and pin the SiteCheck icon.
2. Open any public website, for example `https://example.com/` or `https://www.wikipedia.org/`.
3. Click the SiteCheck icon. Within about a second the popup shows a Website Health Score (0–100), five category scores, and issues grouped as Critical / Warnings / Recommendations. Expand any issue to see "Why it matters" and "Recommended fix".
4. Click a category chip (e.g. "SEO") to filter; click "Copy report" to copy a text summary.
5. Open a browser page such as `chrome://extensions`, `edge://settings` or `about:addons` and click the icon: the popup shows "SiteCheck cannot analyze this browser-protected page. Open a normal website and try again." — no error.

**Scoring:** deterministic and documented (https://www.xendersecrets.com/sitecheck#scoring). The popup states "This is a Xender SiteCheck heuristic score, not a Lighthouse score." Conversion checks are labelled as heuristics.

**Publisher:** Xender Secrets (Sahil Kumar Sharma), Gurugram, India · Sahilsharma171098@gmail.com
