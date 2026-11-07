# Permission justification — SiteCheck 2.0.0 (draft)

## Requested permissions

```json
{"permissions":["activeTab","scripting","storage"],"host_permissions":["https://www.xendersecrets.com/*"]}
```

- `activeTab`: temporary access to the visible page only when clicked; audits remain local.
- `scripting`: injects bundled `audit.js` after user action; no remote code.
- `storage`: stores the optional Pro license key, user-saved comparisons and timestamps, dismissed-suggestion timestamp, and explicitly marked Lead Leak evidence locally; no browser sync or page content.
- `host_permissions`: scoped to Xender Secrets HTTPS, only for optional license validation. No all-sites access.

No `tabs`, `cookies`, `history`, `downloads`, `webRequest`, `identity`, `background` or content script permission is requested. CSV export uses a local Blob and user click. The website handles payment. Firefox declares optional `authenticationInfo` because a Pro buyer may voluntarily submit a license key.
