# Microsoft Edge Add-ons listing — Xender SiteCheck

Status: **ready to submit (first store).** Registering as an Edge extension developer in Microsoft Partner Center is free. Submission needs Sahil's own Microsoft account sign-in, profile/identity details and acceptance of the Microsoft agreement — the external boundary Claude can't cross.

| Field | Value |
|---|---|
| Package | `extension/dist/xender-sitecheck-edge.zip` (`npm run extension:package`) |
| Name | Xender SiteCheck (from manifest) |
| Category | Developer tools |
| Visibility | Public |
| Markets | All markets |
| Website | https://www.xendersecrets.com/sitecheck |
| Support contact | https://www.xendersecrets.com/contact |
| Privacy policy | Required? Yes, because the extension reads page content: https://www.xendersecrets.com/sitecheck-privacy |
| Store logo (300×300) | `extension/store/promo/edge-logo-300.png` |
| Small promotional tile (440×280) | `extension/store/promo/promo-small-440x280.png` |
| Large promotional tile (1400×560) | `extension/store/promo/promo-marquee-1400x560.png` |
| Screenshots (1280×800) | `extension/store/screenshots/*.png` |
| Mature content | No |

## Short description
<!-- field:short-description max:250 -->
Check the current webpage for SEO basics, accessibility issues, usability problems and conversion friction — locally in your browser, with clear fixes.
<!-- /field -->

## Description (250–10,000 characters)
<!-- field:description max:10000 -->
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

## Search terms (max 7 terms, 30 characters each, 21 words total)
<!-- field:search-terms max:200 -->
website audit; website checker; SEO checker; accessibility checker; broken link checker; conversion audit; web QA
<!-- /field -->

## Notes for certification
Paste `reviewer-notes.md` (the "Notes for certification" field accepts free text).
