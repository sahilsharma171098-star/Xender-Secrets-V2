# Market review — comparable extensions (October 2026)

The purpose of this review was to position SiteCheck and avoid known UX and trust pitfalls. No code, assets or copy from other extensions were used.

| Extension type | Examples | What users value | Common complaints / gaps |
|---|---|---|---|
| On-page SEO viewers | SEO META in 1 CLICK, Detailed SEO Extension | One click, no account, instant overview. Minimal permissions (activeTab + scripting) are explicitly praised as "the privacy pick" | Outdated designs; title and description length advice that is wrong or outdated; no export or reporting; they show data without saying what to fix |
| Accessibility checkers | axe DevTools, WAVE | Trustworthy results (axe's "no false positives" stance); clear rule references | Noise and false positives (WAVE on complex backgrounds) erode trust; built for developers inside DevTools, so they intimidate business owners |
| Broken-link checkers | Check My Links and similar | Simple green/red results | Often need broad host permissions; can mark links "broken" when a request was merely blocked or timed out |
| Paid SEO suites | Various | Depth | Account walls, upsells and broad "read all sites" permissions |

## What SiteCheck does differently

1. **Business-owner language.** Every issue has *Problem → Why it matters → Recommended fix* in plain English. Raw data dumps are what other tools are criticised for.
2. **Honesty over volume.** Contrast is only measured where it can be measured reliably, and links are only called broken when the server said so. Conversion advice is marked "Heuristic". This answers the false-positive complaints.
3. **Minimum permissions.** Only `activeTab` and `scripting`: no host permissions, no background script, no storage. It runs only when clicked.
4. **One score across five areas.** SEO viewers and a11y tools cover one area each; SiteCheck gives a single, documented, deterministic overview.
5. **Shareable output.** "Copy report" fills the export gap without accounts or servers.
6. **Human help is optional.** A small, non-blocking "Want a human review?" link. There are no popups and no lead capture inside the extension.

## Sources
- https://tooltivity.com/extensions/seo-meta-in-one-click
- https://omr.com/en/reviews/product/seo-meta-in-1-click
- https://web-highlights.com/blog/best-seo-chrome-extensions/
- https://crosscheck.cloud/blogs/axe-vs-wave-vs-pa11y-accessibility-testing/
- https://blog.scottlogic.com/2023/09/27/accessibility-tooling-wave-vs-axe.html
- https://blog.mozilla.org/addons/2025/10/23/data-collection-consent-changes-for-new-firefox-extensions/
