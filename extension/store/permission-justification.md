# Permission justification — Xender SiteCheck

The extension requests exactly two permissions in every build (enforced by `npm run extension:lint` and the unit tests):

```json
"permissions": ["activeTab", "scripting"]
```

| Permission | Why it is needed | What it can't do |
|---|---|---|
| `activeTab` | When the user clicks the toolbar button, the browser grants SiteCheck temporary access to that one tab so it can audit the page the user is looking at. | No access to other tabs, no access before the click, no access after the tab navigates away. No "Read and change all your data on all websites" warning at install. |
| `scripting` | Needed to call `scripting.executeScript` and run the extension's own packaged `audit.js` in the active tab. The script returns findings to the popup and exits. | Cannot load code from the internet (MV3 forbids remote code; the lint step also bans eval/new Function/network APIs). |

## Permissions deliberately **not** requested

| Not requested | Consequence / trade-off |
|---|---|
| `host_permissions` / `<all_urls>` | No broad-site access. Trade-off: SiteCheck cannot fetch external links to test their status codes, so it never claims an external link is "broken". Same-page `#section` links are verified locally. |
| `tabs` | Not needed; `activeTab` already exposes the URL of the clicked tab. |
| `storage` | No preferences are stored. Theme follows the system light/dark setting. |
| `background` / service worker | Not needed — all logic runs in the popup while it is open. |
| `content_scripts` | Nothing is injected into pages automatically. |
| `clipboardWrite` | "Copy report" uses `navigator.clipboard.writeText` from a user click in the popup, which browsers allow without the permission. |
| `webRequest`, `cookies`, `history`, `downloads`, `identity` | Not used. |

## File URLs

Chrome and Edge only allow extensions on `file://` pages if the user switches on "Allow access to file URLs" for the extension. SiteCheck explains this in the popup instead of requesting extra permissions.
