# Permission justification — SiteCheck 2.0.0 (draft)

## Requested permissions

```json
{"permissions":["activeTab","scripting","storage"],"host_permissions":["https://www.xendersecrets.com/*"]}
```

- `activeTab`: temporary access to the visible page only when clicked; audits remain local.
- `scripting`: injects bundled `audit.js` after user action; from 2.1.0 also bundled `vitals.js` (reads the browser's own page-load timing entries) and the bundled "Show on page" outline functions, only when the user clicks. No remote code.
- `storage`: local only, never sync — an optional Pro license key, Pro baselines the user saves on purpose (origin + path, heuristic score, issue ids/counts, timestamp; max 20 pages) and the time the user clicked "Not now" on the human-review suggestion. No page content, issue samples or reports are stored.
- `host_permissions`: scoped to Xender Secrets HTTPS, only for optional license validation. No all-sites access.

No `tabs`, `cookies`, `history`, `downloads`, `webRequest`, `identity`, `background` or content script permission is requested. CSV export (and, from 2.1.0, the PDF report) uses a local Blob and a user click. The website handles payment. Firefox declares optional `authenticationInfo` because a Pro buyer may voluntarily submit a license key.
