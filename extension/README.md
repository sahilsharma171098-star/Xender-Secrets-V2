# Xender SiteCheck — browser extension (CLAUDE-EXT-001)

**Single purpose:** analyse the current webpage and give the user a fast, actionable website quality and conversion audit.
Chrome + Edge (Manifest V3) and Firefox 140+ from one shared source. Vanilla JS/HTML/CSS, no runtime dependencies.

## Layout
```
extension/
  src/                  shipped code (everything here goes into the packages)
    popup.html/.css/.js   UI; runs audit.js in the active tab, scores and renders locally
    audit.js              page analysis, injected only on toolbar click (activeTab + scripting)
    lib/checks.js         check catalog: titles, why/fix copy, category, weight
    lib/score.js          deterministic scoring (docs/SCORING.md)
    lib/restricted.js     browser-protected page handling
    lib/report.js         "Copy report" text
    icons/                16/32/48/64/128 PNG (generated from assets/*.svg)
  manifest/             base.json + chromium.json / firefox.json overrides (version lives in base.json)
  tests/                unit, audit-rule (fixtures/) and real-extension E2E tests
  store/                listings, privacy policy, permission justification, reviewer notes,
                        release checklist, changelog, screenshot plan, market research,
                        screenshots/ and promo/ (generated), demo-pages/ (fictional businesses)
  docs/SCORING.md       score formula
  dist/                 build output (git-ignored)
```

## Commands (from the repo root)
| Command | What it does |
|---|---|
| `npm run extension:build` | Writes `extension/dist/{chrome,edge,firefox}/` |
| `npm run extension:package` | Also writes reproducible zips `extension/dist/xender-sitecheck-{chrome,edge,firefox}.zip` and prints sha256 |
| `npm run extension:lint` | Syntax, policy (no eval/network/storage/remote code/HTML injection), manifest, store-copy and permission-doc checks |
| `npm run extension:test` | Unit + audit-rule + real-extension tests (needs `npm install --no-save playwright`) |
| `npm run extension:assets` | Regenerates store screenshots, promo tiles and icons from the real extension |

Optional Firefox validation: `npx web-ext@10 lint --source-dir extension/dist/firefox` (0 errors, 0 warnings on 1.0.0).

## Try it locally
- Chrome/Edge: `chrome://extensions` → Developer mode → Load unpacked → `extension/dist/chrome`.
- Firefox: `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → `extension/dist/firefox/manifest.json`.
Then open any website and click the SiteCheck icon. Full manual smoke test: `store/release-checklist.md`.

## Privacy model
Permissions: `activeTab`, `scripting` only. No host permissions, background, content scripts or storage. The extension makes no network requests; results live in popup memory. See `store/privacy-policy.md` (also published at `/sitecheck-privacy`) and `store/permission-justification.md`.

## Adding a check
1. Add the logic in `src/audit.js` (`record(...)` / `fromList(...)`, never read field values).
2. Add the catalog entry in `src/lib/checks.js` (category, weight, copy).
3. Add/extend a fixture and assertion in `tests/audit.test.mjs`.
4. Update the check count in the store copy if it changed (lint enforces it), bump the version, add a changelog entry.
