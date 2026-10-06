# Comparable extensions — what we learned (CLAUDE-EXT-001)

Scope: legitimate website-audit, SEO, accessibility, broken-link and web-QA extensions on the Chrome Web Store, Edge Add-ons and AMO. Used only to position Xender SiteCheck and shape its UX — **no code, assets or copy were taken from any of them.**

Method and limits: desk research on 2026-10-06 from store pages and third-party reviews (sources below) plus general familiarity with the category (e.g. Lighthouse in DevTools, WAVE, axe DevTools, "SEO META in 1 CLICK", Detailed SEO Extension, Check My Links, SEOquake). Review counts and ratings were not collected; nothing here should be quoted as a statistic.

## What users value
- **Instant, one-click answer on the current page** — no account, no project setup.
- **Readable layout** over raw data dumps; reviewers repeatedly praise "clean", "no jargon", "good for showing clients".
- **Free and lightweight.**
- **Actionable output** — what's wrong and what to do, not just a metric.

## Common complaints
- **Broad permissions** ("Read and change all your data on all websites") and bundled tracker SDKs in some SEO extensions — a real trust issue for agency and in-house users. [Tooltivity review of Detailed SEO Extension]
- **Stale or wrong data on JavaScript-heavy pages** when the extension reads the HTML source instead of the rendered DOM.
- **Upsells/sign-up walls** inside the popup; feature lists locked behind accounts.
- **Overwhelming dumps** of every tag on the page with no priority.
- **False positives**, especially "broken links" that were actually blocked by bot protection or CORS.
- **Scores that look official** but aren't explained.

## Confusing UX patterns to avoid
- Ten tabs of raw data before any conclusion.
- Unlabelled scores, or scores that imply Google/Lighthouse authority.
- Mixing hard errors with opinion-based suggestions at the same severity.

## Gaps Xender SiteCheck fills (positioning)
| Gap | SiteCheck answer |
|---|---|
| Permission anxiety | Only `activeTab` + `scripting`; no install-time site-access warning; nothing sent anywhere. |
| SEO tools ignore accessibility; a11y tools ignore conversion | One report across SEO, accessibility, usability, conversion and technical basics. |
| Raw data, no priorities | Critical → Warnings → Recommendations, each with "why it matters" and "recommended fix". |
| Mystery scores | Deterministic formula published on our site; disclaimer "not a Lighthouse score". |
| Rendered vs source HTML | Audits the rendered DOM, so client-side-rendered pages are checked as visitors see them. |
| "Broken link" false alarms | Only same-page anchors are verified (locally); we never claim an external URL is broken without testing it. |
| Small-business conversion basics (WhatsApp, phone, CTA clarity) | Explicit conversion heuristics, labelled as heuristics. |
| Next step when the user isn't technical | Optional link to a free human audit from Xender Secrets — no popups, no auto-submission. |

## Sources
- Tooltivity — Detailed SEO Extension review & alternatives: https://tooltivity.com/extensions/detailed-seo-extension
- Chrome Web Store — Detailed SEO Extension: https://chromewebstore.google.com/detail/detailed-seo-extension/pfjdepjjfjjahkjfpkcgfmfhmnakjfba
- Chrome Web Store — Page Auditor for Technical SEO: https://chromewebstore.google.com/detail/page-auditor-for-technica/dogloealpnibhaieipodofhcbamacabh
- Medium — "The Big List: 20 Chrome Extensions to Audit SEO, UX, and Content": https://medium.com/@andrew-chornyy/the-big-list-20-chrome-extensions-to-audit-seo-ux-and-content-b530043685ef
- SiteLint — Auditing website using Chrome extension: https://www.sitelint.com/blog/auditing-website-using-chrome-extension
- Mozilla Add-ons blog — data collection consent changes (Firefox 140+): https://blog.mozilla.org/addons/2025/10/23/data-collection-consent-changes-for-new-firefox-extensions/
- Microsoft Learn — Register as a Microsoft Edge extension developer: https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account
