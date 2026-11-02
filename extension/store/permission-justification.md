# Permission justification — SiteCheck 2.0.0 (draft)

## Requested permissions

```json
{"permissions":["activeTab","scripting","storage"],"host_permissions":["https://www.xendersecrets.com/*"]}
```

- `activeTab`: temporary access to the visible page only when clicked; audits remain local.
- `scripting`: injects bundled `audit.js` after user action; no remote code.
- `storage`: stores only an optional Pro license key locally. No scores, page URLs or reports are stored.
- `host_permissions`: scoped to Xender Secrets HTTPS, only for optional license validation. No all-sites access.

No `tabs`, `cookies`, `history`, `downloads`, `webRequest`, `identity`, `background` or content script permission is requested. CSV export uses a local Blob and user click. The website handles payment. Firefox declares optional `authenticationInfo` because a Pro buyer may voluntarily submit a license key.
