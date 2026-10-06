# XEND-SEO-TRAFFIC-001 — Organic discovery & index plan

Owner: Claude (repo) · ChatGPT (Search Console / off-site actions) · Sahil (account sign-ins)
Started: 2026-10-06 · Branch: `claude/xend-seo-traffic-001`

Objective: get the priority commercial URLs discovered and indexed, then turn qualified
impressions into clicks and enquiries. Revenue > vanity traffic. No fake traffic, no paid spend,
no doorway pages, no invented reviews/clients/addresses.

## 1. Baseline (Google Search Console, data settled through 2026-10-03, reported by ChatGPT)

| Metric | Value |
|---|---|
| 28-day clicks | 0 |
| 28-day impressions | 0 |
| `/sitemap.xml` | 50 URLs submitted (52 at the time of this audit), 0 errors; aggregate "indexed" shows 0 |
| `https://www.xendersecrets.com/` | URL Inspection: PASS, submitted and indexed, crawled 2026-10-05 |
| `/services.html` | PASS, submitted and indexed, crawled 2026-10-05 |
| `/website-development-gurgaon.html` | URL unknown to Google, no crawl |
| Legacy sitemap entry `https://www.xendersecrets.com/` (the homepage submitted as a sitemap) | 1 error |

Interpretation:
- The sitemap aggregate lags URL Inspection; established pages are indexed. The aggregate is not the KPI — per-URL inspection of the priority list is.
- **`/website-development-gurgaon.html` never existed.** The real page is `/website-development-gurugram`. Google had nothing to crawl, so "unknown" was correct. The spelling gap is a real opportunity though — most people still search "Gurgaon" — so this sprint makes the Gurugram page target both names and 301s every Gurgaon URL variant to it.
- The "1 error" sitemap is a mis-submission (a web page, not XML). Remove it in GSC (CQ-010).

## 2. Audit findings (repo, 2026-10-06) and what changed

| # | Finding | Severity | Fix in this PR |
|---|---|---|---|
| 1 | Every internal link on generated pages pointed at `/page.html`, which Cloudflare answers with **307 → `/page`**. Each crawl of an internal link cost a redirect hop and disagreed with the canonical. | High (crawl efficiency, canonical signals) | `cleanLinks()` in `scripts/commercial/layout.mjs` rewrites root-relative `.html` hrefs to the final URL; breadcrumb JSON-LD uses final URLs too. Test enforces it. |
| 2 | Homepage body had no links to the location pages; Gurugram/Delhi/Noida were reachable only from the footer. Pricing page didn't link them at all. | High (discovery of new commercial pages) | Homepage "Where we work" section + pricing-page related links to all 4 location pages and the cost calculator. Industry pages now link all NCR location pages. |
| 3 | "Gurgaon" appeared nowhere on the site. | High (missed buying-intent query) | Gurugram page title/H1/lede/FAQ use "Gurgaon (Gurugram)" naturally; Service schema `alternateName: Gurgaon`; 301s for `/website-development-gurgaon(.html)` and `-in-gurgaon` / `-in-gurugram`. |
| 4 | Location pages were near-duplicates (same structure, ~3 lines of unique copy each). | Medium (thin/duplicate risk) | Each location page gets distinct, genuinely useful content: a 4-point "how customers in {city} find a local business" guide specific to that city, an "areas we work with" list, a city-specific FAQ. No fake offices or addresses — the copy says we're based in Gurugram. |
| 5 | No `Service` schema; `ProfessionalService` had no `@id`. | Medium | `ProfessionalService` gets `@id`, `image`, `email`; industry + location pages add `Service` (provider → `@id`, `areaServed`, `AggregateOffer` ₹999–₹3,499 excl. GST). No ratings, reviews or street address (test bans them). |
| 6 | `/website-cost-calculator` (high-intent tool, linked from footer) had no robots meta → silently excluded from the sitemap. | Medium | Added `index,follow`; now in the sitemap. |
| 7 | 9 `demo-*` concept pages (fictional brands, thin) were in the sitemap competing for crawl on a brand-new site. | Low–Medium | `noindex,follow` (still linked and usable from the catalog — they are proof, not landing pages). Sitemap 52 → 44 URLs, every one a real page we want found. |
| 8 | `privacy`, `terms`, `refund` had no canonical. | Low | Canonicals added. |
| 9 | Delhi/Noida titles didn't carry "Delhi NCR" / "Greater Noida". | Low | Retitled; titles/descriptions verified unique across all 44 sitemap URLs (test). |
| 10 | No fast discovery path for non-Google engines. | Low (Bing also feeds other assistants/search) | IndexNow: public key file, `scripts/seo/indexnow.mjs`, workflow submits the sitemap after it changes on `main` (verifies the live key first). |
| 11 | Apex `xendersecrets.com` serves pages with 200 instead of redirecting to `www`. HTTP→HTTPS not enforced at the edge either (see QA report). | Medium (duplicate host) | Not a repo fix — every page's canonical already points to `www`. Needs a free Cloudflare Redirect Rule: CQ-015 (Sahil). PR #31 adds a verification workflow. |

Verified unchanged and correct: `robots.txt` allows everything except admin/API/preview paths and points at the `www` sitemap; every sitemap URL is extensionless, exists, is indexable and its canonical equals its `<loc>` (test).

## 3. Priority URLs (request indexing in this order, ≤ 10/day)

1. https://www.xendersecrets.com/website-development-gurugram
2. https://www.xendersecrets.com/website-development-delhi
3. https://www.xendersecrets.com/clinic-website-development
4. https://www.xendersecrets.com/gym-website-development
5. https://www.xendersecrets.com/restaurant-website-development
6. https://www.xendersecrets.com/accountant-website-development
7. https://www.xendersecrets.com/website-development-noida
8. https://www.xendersecrets.com/small-business-website-india
9. https://www.xendersecrets.com/real-estate-website-development
10. https://www.xendersecrets.com/website-cost-calculator
11. https://www.xendersecrets.com/ (re-inspect after deploy — title changed)
12. https://www.xendersecrets.com/services (re-inspect after deploy)

## 4. Measurement checkpoints

Targets are hypotheses for a new domain with zero backlinks, not promises. Record actuals here.

| Checkpoint | Date | Pull | Target (hypothesis) | Actual |
|---|---|---|---|---|
| Day 0 | 2026-10-06 | Baseline above | — | 0 clicks / 0 impressions |
| Day 7 | 2026-10-13 | URL Inspection for the 12 priority URLs; GSC Pages report; Bing WMT indexed count | All 12 discovered; ≥ 6 indexed on Google | |
| Day 14 | 2026-10-20 | GSC Performance by page + query (last 7d); MIS leads by `source`/`landing` | ≥ 1 priority page with impressions; first non-brand queries visible | |
| Day 28 | 2026-11-03 | GSC 28d by page/query; MIS: organic leads, quotes, revenue | First organic clicks; ≥ 1 organic enquiry recorded in `/admin.html` | |

Decision rules at each checkpoint:
- A priority URL still "Discovered – not indexed" at Day 14 → strengthen it (more unique, useful content; more internal links from indexed pages), don't spin up new pages.
- A page with impressions but CTR < 1% at Day 28 → rewrite its title/description for the query it actually shows for.
- Queries with commercial intent we don't have a page for → candidate page only if we can make it genuinely distinct (no city-swap clones).
- Revenue view wins: rank pages by organic leads → quotes → collected revenue in the MIS, not by impressions.

## 5. Off-site acquisition

Executed by ChatGPT/Sahil — see `docs/CHATGPT_ACTION_QUEUE.md` CQ-010 … CQ-017.
