# Permission justification — Xender SiteCheck 1.0.0

| Permission | Requested? | Why |
|---|---|---|
| `activeTab` | **Yes** | Gives temporary access to the current tab, only after the user clicks the toolbar button. This lets SiteCheck read the page the user explicitly asked to audit, and nothing else. It replaces any need for host permissions. |
| `scripting` | **Yes** | `chrome.scripting.executeScript` injects the packaged `core/audit.js` into that tab, runs the audit, and (only when the user clicks "Check links") runs the same-site link check. Required by Manifest V3 to run code in a page. |
| Host permissions (`<all_urls>`, `*://*/*`, …) | **No** | Not needed: activeTab covers the user-initiated case. |
| `tabs` | No | activeTab already exposes the clicked tab's URL. |
| `storage` | No | Nothing is persisted. |
| `clipboardWrite` | No | "Copy report" uses the standard async clipboard API during a user click, which needs no permission. |
| Background service worker | None | All logic runs in the popup when it is open. |
| Content scripts in the manifest | None | Nothing runs on pages automatically. |

`scripts/validate-manifests.mjs` (part of `npm run extension:lint`) fails the build if any other permission, host permission, background script, content script, custom CSP, `eval`/`new Function`, remote script, or unexpected network call is introduced.

The automated test build (`dist/test-chromium`) adds `<all_urls>` **only** so Playwright can drive the popup without a physical toolbar click. It is never packaged.
