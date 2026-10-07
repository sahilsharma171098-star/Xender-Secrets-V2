# XEND-GSC-INDEXING-001 — Indexing architecture

Owner: Claude · Date: 2026-10-07 · PR: #36 (`claude/xend-gsc-indexing-001`)
Related: `docs/SEO_TRAFFIC_PLAN.md` (baseline, checkpoints), `docs/CHATGPT_ACTION_QUEUE.md` CQ-019.

## 1. Canonical URL standard

**`https://www.xendersecrets.com` + extensionless path.** Home is `/`; every other page is `/name`
(e.g. `/services`, `/article-lead-generation-guide`). No `.html`, no trailing slash, no `/index`.
Query strings are kept as they are.

Why extensionless (verified on production, 2026-10-07):
- Cloudflare static assets (`html_handling: auto-trailing-slash`) already serve `/services` with HTTP 200 and redirect `/services.html` to it.
- The sitemap, every canonical tag and every generated internal link already used the extensionless form, and Google had indexed `/` and `/services` in that form.
- Moving to `.html` instead would contradict all of that and need the asset layer reversed.

## 2. What production did before this PR (live audit, run 37613729633)

| Variant | Before | Problem |
|---|---|---|
| `https://www.xendersecrets.com/contact.html` (every `.html`) | **307** → `/contact` | Temporary redirect: Google may keep the `.html` URL as a separate candidate |
| `https://www.xendersecrets.com/about/` | **307** → `/about` | Same |
| `https://www.xendersecrets.com/index.html` | **307** → `/` | Same |
| `https://xendersecrets.com/*` (apex) | **200** | Full duplicate of every page on a second host |
| `http://xendersecrets.com/` | 301 → `https://xendersecrets.com/` → 200 | Lands on the duplicate host |
| `http://xendersecrets.com/about.html` | 301 → 307 → apex 200 | Chain that ends on the wrong host |
| Internal links on legacy pages (articles, catalog, novels, FAQ…) | `about.html`, `index.html`… | Every link was a 307 hop |
| `/admin`, `/account`, `/reader` | 200, no `X-Robots-Tag` (rules only matched `*.html`) | `/reader` was `index,follow` |

## 3. Redirects now (src/canonical.mjs, run before the asset layer)

`wrangler.jsonc` → `assets.run_worker_first: ["/*", "!/novel-data/*"]`. The Worker issues **one 301**
straight to the final canonical URL. If the cleaned path is itself a `public/_redirects` rule
(for example the Gurgaon alias), that rule is followed inside the same hop.

| Request | Response |
|---|---|
| `https://xendersecrets.com/about` | 301 → `https://www.xendersecrets.com/about` |
| `https://xendersecrets.com/about.html` | 301 → `https://www.xendersecrets.com/about` |
| `https://www.xendersecrets.com/about.html` | 301 → `https://www.xendersecrets.com/about` |
| `https://www.xendersecrets.com/about/` | 301 → `https://www.xendersecrets.com/about` |
| `https://www.xendersecrets.com/index.html`, `/index` | 301 → `https://www.xendersecrets.com/` |
| `https://xendersecrets.com/website-development-gurgaon.html` | 301 → `https://www.xendersecrets.com/website-development-gurugram` (one hop, not two) |
| `/template-preview.html?id=REAL-01` | 301 → `/template-preview?id=REAL-01` |
| `/p/:id` (client preview short link) | stays **302** (temporary by design) |
| `/api/*` | never redirected (POST bodies, API clients) |
| `/novel-data/*` | served directly by the asset layer (no Worker invocation) |
| workers.dev previews / `wrangler dev` | path rules apply, host stays (so they can be tested); `_headers` keeps previews `noindex` |

**`http://` caveat.** Cloudflare's "Always Use HTTPS" upgrades `http://` at the edge *before* any
Redirect Rule or Worker runs. So `http://xendersecrets.com/x` is 2 hops: https upgrade, then the
canonical 301. Google follows this without problems. To make it exactly one hop, turn
**Always Use HTTPS off** — the Worker already upgrades the scheme in the same 301 for every HTML
page. That toggle is Sahil's call (CQ-019 step 0). The live audit reports this as a warning, not a failure.

## 4. Index / noindex decisions

**In the sitemap (32 URLs) — all 200, `index,follow`, self-canonical:**
- Commercial: `/`, `/services`, `/contact`, `/about`, `/faq`; 8 industry pages; 4 location pages; `/website-catalog`, `/business-templates`, `/website-cost-calculator`, `/sitecheck`, `/sitecheck-privacy`.
- Guides: `/articles` + 4 rewritten guides (`/article-small-business-website-features`, `/article-website-project-planning`, `/article-lead-generation-guide`, `/article-full-stack-development-guide`).
- Other: `/novels`, `/resources`, `/privacy`, `/terms`, `/refund`.

**Intentionally excluded (`noindex`, still live and linked, not in the sitemap):**

| Pages | Why |
|---|---|
| `/admin`, `/account`, `/preview`, `/preview-builder`, `/p/*` | Private / per-user; also `X-Robots-Tag` + robots.txt |
| `/catalog` (shop), `/sample-preview`, `/template-preview`, `/reader` | Utility shells driven by query strings; a single URL with many states |
| 12 `/demo-*` concept builds | Fictional brands, thin; proof for buyers, not landing pages |
| `/community`, `/ideas` | Feeds of user posts that are mostly empty today — thin/soft-404 risk |
| 12 legacy articles (see §6) | ~240-word generic notes; indexable again once rewritten |
| `/404` | Error page |

## 5. Why Google said "Crawled – currently not indexed"

| URL in GSC | Cause | Fix |
|---|---|---|
| `http://xendersecrets.com/` | Duplicate host; landed on apex 200 | Single 301 to www (+ edge https upgrade) |
| `/contact.html`, `/services.html`, `/about.html`, `/faq.html`, `/articles.html`, `/website-catalog.html`, `/novels.html`, `/article-*.html` | `.html` duplicates reached by 307 (temporary) from internal links | 301 to the canonical; internal links fixed; these URLs drop out of the report over time — **nothing to index** |
| `/contact` | Indexable and correct, but a new domain with almost no links and a short page; same content also existed on the apex host | Duplicates removed; linked from every page. Mostly a matter of time and authority |
| `/demo-backend-api` | Thin demo page (84 words) | Now `noindex` by design |
| `/article-full-stack-development-guide`, `/article-community-led-growth` | ~240-word generic articles | Full-stack rewritten as a ~620-word practical guide with BlogPosting schema; community-led-growth kept live but `noindex` until rewritten |
| `/website-catalog` | ~130 words of HTML; all cards rendered by JS | 60 sample cards + 8 industry cards pre-rendered in HTML, a "how it works / which kind" guide, 32-industry directory, CollectionPage schema |
| `/articles` | Hub of thin articles, no schema | Featured guides first, CollectionPage + ItemList schema |
| `/faq` | Shop-era FAQ (shipping thresholds, prompt packs) out of step with the business | Rebuilt: 22 current answers (prices + GST, process, ownership, demos), FAQPage schema |
| `/novels` | JS-rendered library with little HTML text | Unchanged for now (lower commercial priority); canonical/links cleaned |
| `/about` | Indexable and correct | Linked from the home header and body; MSME/Udyam credential added site-wide |

Honest expectation: the technical causes above are fixed in this PR. The remaining factor for a
4-week-old domain is authority (links, mentions, Google Business Profile) and time. Requesting
indexing helps discovery, but it doesn't guarantee indexing.

## 6. Article rewrite queue (indexable again when ≥ 550 words of specific, original help)

Done: small-business-website-features, website-project-planning, lead-generation-guide, full-stack-development-guide.
Queue, in commercial order: frontend-development-guide → backend-api-guide → ai-workflows-business →
customer-retention-after-first-sale → sales-customer-experience-guide → ecommerce-store-guide →
ecommerce-trust-checklist → digital-products-guide → ai-content-engine → community-led-growth →
chinese-classic-novels-guide → chinese-web-novels-vs-classics.
To publish one, move it into `scripts/commercial/articles.mjs` (it becomes generated, gets
BlogPosting schema and enters the sitemap automatically). `tests/unit/seo.test.mjs` enforces the bar.

## 7. Guard rails (CI)

- `tests/unit/canonical.test.mjs` — redirect mapping, single hop, `_redirects` passthrough, 302 kept.
- `tests/worker/canonical-worker.test.mjs` — the same rules through the **real** Worker + asset layer (local workerd).
- `tests/unit/seo.test.mjs` — the sitemap holds only 200/indexable/self-canonical URLs; every indexable page is in it; no `.html` internal links anywhere (HTML + JS); private/utility pages are `noindex` with `X-Robots-Tag`; article quality bar + BlogPosting; hub pages server-rendered and in sync; homepage links; FAQ prices.
- `scripts/seo/normalize-links.mjs --check` and `build-commercial-pages.mjs --check` in CI.
- `.github/workflows/seo-live-audit.yml` — on each branch push it audits the Cloudflare preview. After deploy to `main` it audits production in strict mode (status, chain, canonical, robots, X-Robots-Tag, sitemap) and posts a sticky comment on the PR.

## 8. Search Console sequence (do NOT "Validate fix" before step 3)

0. (Optional, Sahil) Decide on Cloudflare "Always Use HTTPS" (§3 caveat).
1. Merge PR #36 → Cloudflare deploys.
2. Check that the **SEO live audit** run on `main` is green (0 problems).
3. Search Console → Sitemaps: resubmit `https://www.xendersecrets.com/sitemap.xml` (32 URLs). Remove the mis-submitted `https://www.xendersecrets.com/` sitemap entry if it's still there.
4. URL Inspection → "Request indexing", ≤ 10/day, **commercial order**:
   `/` · `/services` · `/website-catalog` · `/articles` · `/website-development-gurugram` · `/clinic-website-development` · `/article-small-business-website-features` · `/article-website-project-planning` · `/contact` · `/faq`
   Day 2: `/business-templates` · `/website-development-delhi` · `/gym-website-development` · `/restaurant-website-development` · `/accountant-website-development` · `/article-lead-generation-guide` · `/article-full-stack-development-guide` · `/website-cost-calculator` · `/about` · `/small-business-website-india`
   Later: remaining industry/location pages, then `/novels`, `/resources`.
5. Only then open "Crawled – currently not indexed" and "Validate fix". The `.html` / apex / `http` entries will resolve as "Page with redirect" (correct). `/demo-backend-api` will resolve as "Excluded by noindex" (intended).
