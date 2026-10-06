# Screenshot plan

All screenshots are **real**. `npm run extension:screenshots` loads the actual extension in Chromium, scans local fixture pages from `extension/tests/fixtures/`, and captures the real popup. No score or issue in these images is typed in by hand.

| # | File (1280×800) | Headline | What it shows | Fixture |
|---|---|---|---|---|
| 1 | `screenshots/01-check-in-seconds.png` | Check your website in seconds | Score, grade, category scores, issue list | `demo-store.html` (a fictional saree shop with typical problems) |
| 2 | `screenshots/02-seo-accessibility.png` | Find SEO and accessibility issues | Accessibility filter, expanded "Images without alt text" | `demo-store.html` |
| 3 | `screenshots/03-clear-fixes.png` | Get clear fixes — not technical jargon | Expanded SEO issue with Why/Fix | `demo-store.html` |
| 4 | `screenshots/04-conversion-friction.png` | Spot conversion friction | Conversion filter, "Heuristic" label | `demo-store.html` |
| 5 | `screenshots/05-local-first.png` | Local-first. No browsing-history tracking. | A healthy page scoring 100, link check and copy report tools | `healthy.html` |

The popup in the screenshots shows the host `fixtures.sitecheck.test`, which is the local test origin. That is honest: it is a fixture page, not a real customer site.

Also generated:
- `promo/small-promo-440x280.png`: Chrome small tile and Edge small promotional tile
- `promo/marquee-1400x560.png`: Chrome marquee and Edge large promotional tile
- `screenshots/popup-raw.png`: the raw popup, used on the website product page
- The Edge 300×300 logo is `assets/icons/icon-300.png`

To regenerate after UI changes, run `npm run extension:screenshots`.
