# Xender SiteCheck checks (v1.0.0)

All checks run locally on the page's current DOM. A check that cannot be measured reliably is skipped rather than guessed.

| ID | Category | Severity | What it detects |
|---|---|---|---|
| seo-title-missing | SEO | critical | No `<title>` |
| seo-title-short | SEO | warning | Title under 15 characters |
| seo-title-long | SEO | notice | Title over 65 characters |
| seo-meta-description-missing | SEO | warning | No meta description |
| seo-meta-description-length | SEO | notice | Description under 50 or over 170 characters |
| seo-noindex | SEO | warning | `robots` meta contains `noindex` |
| seo-canonical-missing | SEO | notice | No `rel=canonical` |
| seo-open-graph-missing | SEO | warning (all missing) / notice | Missing og:title, og:description or og:image |
| struct-h1-missing | SEO | warning | No visible H1 |
| struct-h1-multiple | SEO | notice | More than one visible H1 |
| struct-heading-skip | Accessibility | notice | Heading levels jump (e.g. H2 → H4) |
| struct-heading-empty | Accessibility | warning | Heading with no text or alt |
| a11y-lang-missing | Accessibility | warning | `<html>` has no `lang` |
| img-alt-missing | Accessibility | warning | Visible `<img>` without an `alt` attribute |
| img-alt-empty-large | Accessibility | notice (heuristic) | Images of 300×200 or larger with `alt=""` that are not inside a link or button |
| link-no-name | Accessibility | warning | Link with no accessible name |
| link-vague-text | Accessibility | notice (heuristic) | Link text such as "click here" or "read more" |
| a11y-button-no-name | Accessibility | warning | Button with no accessible name |
| a11y-aria-invalid-role | Accessibility | warning | `role` value that is not a WAI-ARIA role |
| a11y-aria-broken-reference | Accessibility | warning | aria-labelledby, aria-describedby or aria-controls pointing to a missing ID |
| a11y-aria-hidden-focusable | Accessibility | warning | Focusable element inside `aria-hidden="true"` |
| a11y-low-contrast | Accessibility | warning | Measured text contrast below 4.5:1 (3:1 for large text). Only measured on solid backgrounds; text over background images, gradients, transparency, filters or positioned layers is skipped |
| form-missing-label | Accessibility | warning | Field with no label, aria-label, aria-labelledby or title. Placeholder-only fields are called out |
| link-empty-href | Usability | warning | `href=""` or `href="#"` |
| link-javascript | Usability | warning | `href="javascript:…"` |
| link-malformed | Usability | warning | `www.` without a scheme, a mistyped scheme, `mailto:` without an email, `tel:` without a number, or an unparsable URL |
| form-autocomplete-missing | Usability | notice | Email, phone or name fields without `autocomplete` |
| form-no-submit | Usability | warning | Form with fields but no submit button |
| cro-nav-overload | Usability | notice (heuristic) | More than 12 visible links in the main `<nav>` |
| cro-no-cta | Conversion | warning (heuristic) | No action-oriented link or button, and no tel:, mailto: or WhatsApp link |
| cro-vague-cta | Conversion | notice (heuristic) | Buttons labelled "Submit", "Go", "Send", "OK" and similar |
| cro-competing-ctas | Conversion | notice (heuristic) | More than 4 distinct calls to action in the first screen, outside nav and footer |
| cro-no-contact | Conversion | warning (heuristic) | No tel:, mailto:, WhatsApp, Messenger, Telegram or contact link |
| cro-trust-cues | Conversion | notice (heuristic) | No About, Privacy, Terms, Refund or Reviews links |
| cro-long-form | Conversion | notice (heuristic) | Form with more than 7 visible fields (forms with a password field are excluded) |
| tech-viewport-missing | Technical | critical | No viewport meta |
| tech-doctype-missing | Technical | warning | No `<!doctype html>` (quirks mode) |
| tech-duplicate-ids | Technical | notice | The same `id` used twice or more |
| tech-dom-size | Technical | notice (>1,500 elements) / warning (>3,000) | Very large DOM |
| img-oversized | Technical | warning | A loaded image's natural width is over 1,000px and more than 2.5× its displayed width × device pixel ratio |
| sec-not-https | Technical | critical | Page served over HTTP |
| sec-password-on-http | Technical | critical | Password field on an HTTP page |
| sec-mixed-active | Technical | critical | Script, stylesheet, iframe, object or embed loaded over `http://` on an HTTPS page |
| sec-mixed-passive | Technical | warning | Image, video, audio or source loaded over `http://` on an HTTPS page |
| sec-form-action-http | Technical | critical | Form posting to `http://` from an HTTPS page |
| link-insecure-http | Technical | notice | Links to `http://` URLs from an HTTPS page |
| sec-target-blank | Technical | notice | External `target="_blank"` link without `rel="noopener"`/`noreferrer` |

## Broken link check (user-triggered)

The link check is not part of the score. When the user clicks **Check links**, SiteCheck sends `HEAD` requests (falling back to `GET` for servers that reject HEAD) to **up to 40 same-site links**, with at most 4 requests at a time.

- Requests come from the page itself and are sent without cookies (`credentials: 'omit'`).
- A link is reported as **broken only when the server actually answered 404, 410 or 5xx**. Timeouts and blocked requests are reported as "could not be verified", never as broken.
- External links are never requested.
- URLs that look state-changing (`/logout`, `/delete`, `/unsubscribe`, `?action=`) are skipped.
