# Xender SiteCheck scoring

**This is a Xender SiteCheck heuristic score, not a Lighthouse score.** It does not measure page speed, Core Web Vitals or search rankings, and it is not a complete WCAG audit. Code: `extension/src/lib/score.js`; check list and weights: `extension/src/lib/checks.js`.

## Check results
Each of the 49 checks returns one of:
- **pass** — the check applied and found nothing wrong;
- **fail** — the check found at least one problem;
- **na** (not applicable) — nothing to check (e.g. form checks on a page with no forms). N/A checks never affect the score.

## Weights and severity
| Weight | Shown as | Meaning |
|---|---|---|
| 3 | Critical | Breaks access, security or basic discoverability (no title, images without alt, password on HTTP…) |
| 2 | Warning | Likely to hurt users or search visibility (no meta description, skipped heading levels, sideways scroll…) |
| 1 | Recommendation | Best practice or heuristic (Open Graph tags, vague link text, competing CTAs…) |

A check counts once whether it found 1 or 20 instances; the count is shown in the report.

## Formula
1. **Category score** = round(100 × sum of weights of passed checks ÷ sum of weights of applicable checks).
2. **Overall Website Health Score** = round(weighted average of category scores) with category weights
   SEO 25 · Accessibility 25 · Usability 15 · Conversion 20 · Technical 15.
   A category with no applicable checks shows "–" and is left out; the other weights are re-normalised.
3. Bands: 90–100 Strong · 75–89 Good — a few fixes · 50–74 Needs work · 0–49 Poor.

### Worked example
Applicable checks: SEO — title ✓ (3), meta description ✗ (2), H1 ✓ (3), og:image ✗ (1); Technical — HTTPS ✓ (3), dead links ✗ (2).
- SEO = round(100 × 6 ÷ 9) = 67 · Technical = round(100 × 3 ÷ 5) = 60
- Overall = round((67 × 25 + 60 × 15) ÷ 40) = round(64.4) = **64 — Needs work**

(This example is a unit test: `extension/tests/unit.test.mjs`.)

## Measurement notes
- Everything is measured on the rendered page in the user's tab at the moment they click, at their current window width.
- **Contrast** is only measured where the background is a solid colour that can be determined (no background images, gradients, transparency, filters or positioned overlays); other text is skipped, never guessed.
- **Broken links**: only same-page `#section` links are verified (the target id must exist). External links are not requested, so SiteCheck never calls an external URL "broken".
- **Conversion** checks are heuristics (keyword and layout based) and are labelled as such.
