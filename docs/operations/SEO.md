# Technical SEO and discovery SOP

## Fresh verification, 2026-10-09

Read-only production crawl: 33 sitemap URLs; zero violations in existing canonical/indexability audit. robots.txt references the canonical sitemap and does not globally disallow. HTTP apex variants have two hops because of edge HTTPS upgrade then canonical redirect; warnings, not crawl failures. Full audit is a local user deliverable, not private account data.

GSC domain property `sc-domain:xendersecrets.com` is active, readable and siteOwner. `/sitemap.xml` is already submitted: zero errors, zero warnings, 33 submitted URLs. Reported indexed count was zero in the sitemap response; that field alone does not establish that the whole site is unindexed. A separate erroneous homepage sitemap entry remains with one error; remove only that entry through GSC after approval. Do not repeatedly submit an already healthy sitemap to imply indexing is guaranteed.

GA4 connector explicitly reports Analytics scope absent. Do not infer that a property/tag does not exist from an unauthenticated connector. Bing API key absent in GSC Wizard. Google Business Profile ownership/eligibility, review listings, social accounts and mobile rendering require separate evidence.

## Checklist and implementation owners

| Check | Existing implementation / action | Owner / gate |
|---|---|---|
| Per-page title/description | commercial generator + static audit; fix generator, regenerate only with parity checks | Claude/Codex PR |
| Canonical/redirects | `src/canonical.mjs`, extensionless https://www; read-only live audit | reviewed Cloudflare config change for extra HTTP hop |
| robots/sitemap | `public/robots.txt`, generated sitemap; exclude admin/previews/utilities | verify on each release |
| Internal links | existing normalize-links and offline SEO checks | PR checks |
| Structured data | generator JSON-LD; truthful services/FAQ/breadcrumb, no fabricated ratings/address | review evidence |
| Search Console | verified domain, healthy sitemap already registered | remove erroneous homepage entry with approval |
| Bing Webmaster | authenticate/import GSC property, submit canonical sitemap | Sahil account auth |
| Analytics | existing aggregate growth events; consent/retention review before adding GA4 | Sahil grants scope and confirms property; never invent measurement ID |
| Mobile | test phone widths 360/390/430, menu, overflow, CTA, contact submit, keyboard and reduced motion | browser/real phone evidence required |
| Google Business Profile | verify real eligible business/service area; no virtual fake addresses | Sahil login, business details and verification |
| Review sites | claim truthful business listings; invite actual clients, no fake reviews | account approval; clients opt in |
| Security/private pages | noindex + auth for admin; no tokens in URLs | regression checks |

Existing `npm run seo:audit`, `check:pages` and `seo:links -- --check` should be checked before release. CLI entry-point detection in the existing audit is unreliable on Windows; import `audit()` explicitly there. New `operations/seo-inventory.mjs` checks every sitemap page for unique titles and descriptions without changing production files. Metadata failures must be fixed at their source, not by manually patching generated HTML.

Weekly: record settled GSC clicks/impressions, indexed-priority URL inspection and source date; review relevant query/page opportunities. Monthly: compare organic enquiries and conversion paths; avoid doorway pages or mass thin city pages. Indexing and reach are outcomes to measure, not promises.
