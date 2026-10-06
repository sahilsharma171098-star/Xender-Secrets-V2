# Changelog — Xender SiteCheck

Versioning: MAJOR.MINOR.PATCH (semver), single source of truth in `extension/manifest/base.json`.
- PATCH: copy fixes, false-positive fixes, no new permissions.
- MINOR: new checks or UI features, no new permissions.
- MAJOR: anything that changes permissions or data handling — requires a privacy-policy update first.
Every store gets the same version number; rebuild all three packages for every release.

## 1.0.0 — 2026-10-06 (initial release, CLAUDE-EXT-001)
- 49 local checks across SEO, Accessibility, Usability, Conversion (heuristics) and Technical/security basics.
- Website Health Score 0–100 with five category scores; deterministic, documented formula.
- Issues grouped as Critical / Warnings / Recommendations with "why it matters" and "recommended fix"; category filters; passed-checks list; copy report as text.
- Friendly handling of browser-protected pages (browser settings, extension stores, PDFs, file URLs).
- Light and dark mode (follows the system).
- Permissions: activeTab, scripting. No network requests, no storage, no analytics.
- Builds for Chrome, Edge (Manifest V3) and Firefox 140+ from one shared source.
