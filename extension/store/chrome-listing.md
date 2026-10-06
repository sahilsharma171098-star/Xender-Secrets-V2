# Chrome Web Store listing — Xender SiteCheck

Status: **package and listing ready; not submitted.** Publishing on the Chrome Web Store requires a one-time US$5 developer registration fee. Under the ₹0-spend rule this is intentionally **not** paid until Xender Secrets has its first revenue. Everything below is ready to paste once Sahil approves the fee.

| Field | Value |
|---|---|
| Package | `extension/dist/xender-sitecheck-chrome.zip` (`npm run extension:package`) |
| Item name | Xender SiteCheck (from manifest) |
| Category | Developer Tools (Productivity → Developer Tools) |
| Language | English |
| Official URL / homepage | https://www.xendersecrets.com/sitecheck |
| Support URL | https://www.xendersecrets.com/contact |
| Privacy policy URL | https://www.xendersecrets.com/sitecheck-privacy |
| Publisher display name | Xender Secrets |
| Mature content | No |
| Icon (128×128) | `extension/src/icons/icon-128.png` |
| Screenshots (1280×800) | `extension/store/screenshots/*.png` — see screenshot-plan.md |
| Small promo tile (440×280) | `extension/store/promo/promo-small-440x280.png` |
| Marquee promo tile (1400×560) | `extension/store/promo/promo-marquee-1400x560.png` |

## Summary (manifest description)
<!-- field:summary max:132 -->
Website QA & conversion audit. Check the current page for SEO basics, accessibility, usability and conversion issues.
<!-- /field -->

## Detailed description
<!-- field:description max:16000 -->
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

## Privacy practices tab

**Single purpose:**
<!-- field:single-purpose max:1000 -->
Xender SiteCheck analyses the web page in the user's current tab, when the user clicks the toolbar button, and shows a website quality and conversion audit (SEO basics, accessibility, usability, conversion and technical checks) with recommended fixes.
<!-- /field -->

**Permission justification — activeTab:**
<!-- field:activeTab max:1000 -->
Grants temporary access to the tab the user is looking at, only after they click the SiteCheck toolbar button, so the extension can read that page's HTML structure to audit it. No access to any other tab or site, and no access in the background.
<!-- /field -->

**Permission justification — scripting:**
<!-- field:scripting max:1000 -->
Used to run the extension's own bundled audit script (audit.js) once in the active tab after the user clicks the button. The script reads the page structure, returns the findings to the popup and leaves nothing behind. No remote code is ever executed.
<!-- /field -->

**Remote code:** No, I am not using remote code.

**Data usage:** Do not tick any data type. The extension does not collect or transmit user data.
Certify: does not sell data to third parties; does not use or transfer data for purposes unrelated to the single purpose; does not use or transfer data to determine creditworthiness or for lending.
