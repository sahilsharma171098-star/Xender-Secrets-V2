# Firefox Add-ons (AMO) listing — Xender SiteCheck

Status: **ready to submit (second store).** AMO is free. Submission needs Sahil's own Firefox account (with two-step authentication) and acceptance of the Firefox Add-on Distribution Agreement.

| Field | Value |
|---|---|
| Package | `extension/dist/xender-sitecheck-firefox.zip` (`npm run extension:package`) |
| Add-on ID | `sitecheck@xendersecrets.com` (in manifest) |
| Minimum Firefox | 140 (required for the built-in data-collection declaration) |
| Data collection | Declared in manifest: `data_collection_permissions: { required: ["none"] }` |
| Source code | Not required: the package contains plain, unminified source; no build step transforms code (the build only merges manifest JSON and copies files) |
| Categories | Web Development (primary), Other |
| Tags | accessibility, seo, web development, website audit, qa |
| Homepage | https://www.xendersecrets.com/sitecheck |
| Support site | https://www.xendersecrets.com/contact |
| Support email | Sahilsharma171098@gmail.com |
| Privacy policy | Paste `privacy-policy.md` into the Privacy Policy field |
| License | All Rights Reserved (Xender Secrets) unless Sahil chooses an open-source licence |
| Icon | `extension/src/icons/icon-128.png` (from package) |
| Screenshots | `extension/store/screenshots/*.png` |

## Name
<!-- field:name max:50 -->
Xender SiteCheck — Website QA & Conversion Audit
<!-- /field -->

## Summary
<!-- field:summary max:250 -->
Check the current webpage for SEO basics, accessibility issues, usability problems and conversion friction — locally in your browser. Clear fixes, a transparent score, no tracking.
<!-- /field -->

## Description
<!-- field:description max:15000 -->
Check the current webpage for SEO basics, accessibility issues, usability problems and conversion friction — directly in your browser.

Xender SiteCheck is a website checker for business owners, marketers and web teams. Open any normal web page, click the SiteCheck button, and in about a second you get a clear list of what to fix, why it matters and how to fix it. No sign-up, no account, no data leaves your browser.

WHAT IT CHECKS (49 checks)

SEO basics
• Missing, generic or overly long page title
• Missing or badly sized meta description
• Missing canonical URL and mobile viewport tag
• Open Graph title, description and image for link previews
• "noindex" left on a public page
• Missing or multiple H1 headings

Accessibility
• Images without alt text, and large images marked as decorative
• Links and buttons with no accessible name, vague link text ("click here")
• Form fields without labels (including placeholder-only fields)
• Skipped heading levels and empty headings
• Invalid ARIA roles and references, focusable elements hidden from screen readers
• Missing page language, zoom disabled on mobile
• Low text contrast — measured only where the background colour can be determined reliably

Usability
• Page wider than the window (sideways scrolling), measured at your current window width
• Forms without a submit button, contact fields without autocomplete, email/phone fields that show the wrong mobile keyboard

Conversion (clearly labelled heuristics)
• No clear call to action, generic "Submit" buttons, too many competing buttons in the first screen
• No visible phone, email or WhatsApp contact method
• No About/Contact/Privacy links, long forms, crowded navigation, visible "lorem ipsum" placeholder text

Technical and security basics
• Page not on HTTPS, password fields on insecure pages, forms that submit over HTTP
• Insecure (http://) images, scripts and styles on secure pages, links to http:// pages
• Links that go nowhere (empty, "#", javascript:), mistyped link addresses
• Broken same-page links — verified on the page, so we only call a link broken when its target really doesn't exist
• Duplicate ids, missing doctype, very large page structure, images far larger than their displayed size

CLEAR SCORE, HONEST LIMITS

You get a Website Health Score from 0 to 100 plus scores for SEO, Accessibility, Usability, Conversion and Technical. The formula is simple, deterministic and published on our website. This is a Xender SiteCheck heuristic score, not a Lighthouse score, and SiteCheck is not a complete WCAG accessibility audit. It doesn't measure page speed or Core Web Vitals, and it doesn't test external links over the network.

PRIVATE BY DESIGN

• Runs only when you click the button, only on the tab you're looking at
• The analysis happens locally in your browser; nothing is sent to us or anyone else
• No browsing history, no form values, no cookies, no passwords, no analytics, no tracking
• Two permissions only: activeTab and scripting
• No remote code; everything the extension runs is inside the package you install

WANT A HUMAN REVIEW?

SiteCheck is made by Xender Secrets, a small website studio in Gurugram, India. If you want a person to look at your site and send specific fixes, the extension links to our free website audit. It's optional, and nothing is shared unless you choose to contact us.
<!-- /field -->

## Notes to reviewer
Paste `reviewer-notes.md`.
