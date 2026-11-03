# Changelog — Xender SiteCheck

Versioning: MAJOR.MINOR.PATCH (semver), single source of truth in `extension/manifest/base.json`.
- PATCH: copy fixes, false-positive fixes, no new permissions.
- MINOR: new checks or UI features, no new permissions.
- MAJOR: anything that changes permissions or data handling — requires a privacy-policy update first.
Every store gets the same version number; rebuild all three packages for every release.

## 2.1.0 — unreleased (ship as an update after 2.0.0 is approved; bump the manifest version then)
- Page load on this device: LCP, INP, CLS, FCP and TTFB read from the browser's own timing entries for the current page load, rated with Google's published good/poor limits. Measured locally; never sent; not part of the Health Score. INP shows "Interact first" until the user clicks or types, and "Under 104 ms" when no slow interaction was recorded. CLS is unavailable in Firefox (no layout-shift API).
- Show on page: outlines the elements an issue refers to (up to 5 per issue), scrolls to the first, clears on Esc / "Clear outlines" / re-check. No page content or style changes.
- No new permissions. Privacy policy updated — publish the matching text on /sitecheck-privacy before releasing.

## 2.0.0 — pending payment verification and Chrome Web Store review
- Free 49-check audit unchanged; optional priority CSV export with a ₹499 one-time Pro license.
- Account-bound SHA-256-hashed license check, manual account-key activation and refund revocation.
- New permissions: local storage plus scoped first-party HTTPS host. Privacy/store disclosures updated.
- Copied reports carry no sales pitch: free copies end with one neutral attribution line; Pro copies and the Pro CSV are white-label (no Xender branding). The "heuristic, not Lighthouse" disclaimer stays.
- The human-review suggestion has a "Not now" button (hidden for 30 days; only that timestamp is kept in local storage) and is never shown to Pro users.
- Do not release until real payment-to-license and refund validation passes.

## 1.0.0 — 2026-10-06 (initial release, CLAUDE-EXT-001)
- 49 local checks across SEO, Accessibility, Usability, Conversion (heuristics) and Technical/security basics.
- Website Health Score 0–100 with five category scores; deterministic, documented formula.
- Issues grouped as Critical / Warnings / Recommendations with "why it matters" and "recommended fix"; category filters; passed-checks list; copy report as text.
- Friendly handling of browser-protected pages (browser settings, extension stores, PDFs, file URLs).
- Light and dark mode (follows the system).
- Permissions: activeTab, scripting. No network requests, no storage, no analytics.
- Builds for Chrome, Edge (Manifest V3) and Firefox 140+ from one shared source.
