# Xender SiteCheck — browser extension

**Website QA & Conversion Audit.** Click the toolbar icon on any webpage to get a Website Health Score with plain-English fixes across SEO basics, accessibility, usability, conversion and technical/security basics. Everything runs locally in the browser.

- Single purpose: analyze the current webpage and give the user a fast, actionable website quality and conversion audit.
- Permissions: `activeTab` and `scripting` only. No host permissions, background script, storage, analytics or remote code.
- One shared source for Edge, Firefox and Chrome (Manifest V3).

## Layout

```
extension/
  src/core/audit.js       audit engine (runs in the page; also loaded by tests)
  src/core/restricted.js  detection of browser-protected pages
  src/core/report.js      plain-text report for "Copy report"
  src/popup/              popup UI (HTML/CSS/vanilla JS, no framework)
  manifests/              base.json + per-browser overrides (firefox.json adds gecko settings)
  assets/icons/           icon.svg source + 16/32/48/64/128/300 PNGs
  scripts/                build/zip, manifest validation, icons, store screenshots
  tests/                  node:test suites + HTML fixtures (Playwright Chromium)
  store/                  listings, privacy policy, reviewer notes, screenshots, promo tiles
  docs/                   SCORING.md, CHECKS.md, MARKET-REVIEW.md
```

## Commands

From the repo root (these delegate to `extension/`):

| Command | What it does |
|---|---|
| `npm run extension:install` | Install dev dependencies (ESLint, Playwright, web-ext, all free/OSS) |
| `npm run extension:lint` | ESLint + manifest/source release rules |
| `npm run extension:lint:firefox` | Mozilla `web-ext lint` on the Firefox build |
| `npm run extension:test` | Unit + end-to-end tests (needs Chromium: `npx playwright install chromium` once) |
| `npm run extension:build` | Unpacked builds in `extension/dist/{chrome,edge,firefox}/` |
| `npm run extension:package` | Reproducible zips: `extension/dist/xender-sitecheck-{chrome,edge,firefox}-<version>.zip` |
| `npm run extension:screenshots` | Regenerate store screenshots and promo tiles from real scans |

`dist/` is git-ignored; packages are rebuilt from source.

## Manual smoke test (before every submission)

**Edge / Chrome**
1. `npm run extension:build`
2. Open `edge://extensions` (or `chrome://extensions`), turn on Developer mode, choose **Load unpacked**, and select `extension/dist/edge` (or `dist/chrome`).
3. Pin the SiteCheck icon.
4. Visit https://www.xendersecrets.com/ and click the icon. A score appears within about 1 second; the categories filter the list; issues expand to show Why/Fix; the Passed tab lists passed checks.
5. Click **Check links**. You should see a "N checked" summary; any broken entries must be real 404/410/5xx responses.
6. Click **Copy report** and paste into a text editor. The report starts with "Xender SiteCheck report — https://www.xendersecrets.com/".
7. Visit `edge://settings` and click the icon. You should see "SiteCheck cannot analyze this browser-protected page…".
8. Visit https://microsoftedge.microsoft.com/addons and click the icon. You should see the store message.
9. Open a PDF URL and click the icon. You should see the PDF message.
10. Toggle the OS dark mode. The popup should follow it.
11. Right-click inside the popup and choose **Inspect**: the console must show **no errors**.

**Firefox**
1. `npm run extension:build`
2. Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on…**, and select `extension/dist/firefox/manifest.json`.
3. Repeat steps 3–10 above (use `about:addons` and https://addons.mozilla.org for the protected-page checks).

## How the audit runs

1. The user clicks the toolbar icon, which opens the popup and grants `activeTab` for that tab.
2. The popup checks the URL (`restricted.js`). Protected pages get a friendly message.
3. `scripting.executeScript` injects the packaged `core/audit.js` and calls `XenderSiteCheck.run(document, window)` in the page's isolated world.
4. The result (plain JSON: issues, passed checks, score) is returned to the popup and rendered with DOM APIs; no `innerHTML` is used.
5. Optionally, "Check links" calls `XenderSiteCheck.checkLinks(urls)` in the page. It sends same-origin HEAD/GET requests without cookies.

Scoring is documented in [docs/SCORING.md](docs/SCORING.md), and every check is listed in [docs/CHECKS.md](docs/CHECKS.md).
