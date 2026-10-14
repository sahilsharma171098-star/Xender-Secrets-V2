# XEND-LOOT-001 — Loot Drop-inspired microproduct opportunity research

**Date:** 2026-10-10  
**Owner:** ChatGPT (research, prioritization); Claude (only after an implementation task is authorized/claimed)  
**Status:** Research complete; **no new product shipped, no paid demand validated**  
**Constraint:** ₹0 incremental spend until first collected revenue. Primary export-market prospects: US and UK, with Canada/Australia as secondary markets.

## Decision

**Pilot Xender FixKit first.** Do not build all five products at once. FixKit is the fastest way to turn existing SiteCheck, reviewer, personalized preview, forms, and Xender's $299+ international services positioning into a narrowly packaged customer outcome: **find 3 real, reproducible website issues → offer a concise action plan → sell scoped repairs**.

No conversion, revenue, traffic, ROI, or SEO improvement is guaranteed. Development estimates below are hypothesis-level and exclude launch compliance/payment-provider integration.

## Sources and reliability

Loot Drop's generated case studies are **idea prompts**, not market or demand validation. Its disclaimer describes AI-assisted interpretations; underlying claims may be inaccurate. These source pages influenced the product wedge, *not* evidence that anyone will purchase Xender products:

- Ve Interactive → focus on specific conversion problems, not broad tracking: https://www.loot-drop.io/startup/2160-ve-interactive
- Big Un → target practical local-service business workflows instead of generic directories: https://www.loot-drop.io/startup/2337-big-un
- Hopin / Pavilion → lightweight branded booking/attendance experiences instead of an expensive virtual-events platform: https://www.loot-drop.io/rebuild/2040-hopin
- Toplyne → make lead/opportunity scoring understandable and actionable instead of a bespoke enterprise prediction stack: https://www.loot-drop.io/startup/2201-toplyne
- Koo → tiny digital-business-presence entry point, not a social network: https://www.loot-drop.io/startup/2199-koo

Competitor check (point-in-time, check again before pricing):
- Jobber advertises quotes, booking, reminders, payments, service workflows: https://www.getjobber.com/pricing/
- Carrd offers Pro Lite at $9/year and Pro Standard at $19/year: https://carrd.com/pro
- NiceJob lists reviews/reputation packages starting around $75/month: https://get.nicejob.com/pricing

**Competitive consequence:** Cannot win with a generic scheduling link, simple business card, or broad CRM. Need a concrete narrow pain, rapid done-for-you setup, proof, and easy cancellation/export.

## Repository fit (verified 2026-10-10 on default branch)

- Existing site/architecture: static HTML/CSS/JS under `public/`; Worker under `src/index.js`; Durable Objects/SQLite.
- Existing `src/growth.mjs` and `/api/lead` + `/api/admin/*` capture and manage leads.
- Existing `extension/` (SiteCheck Manifest V3), `scripts/review-site-html.mjs`, `public/preview/preview-core.mjs`, prospecting scripts.
- Generated commercial pages must be changed through `scripts/commercial/*` and `npm run build:pages`, not directly edited.
- UI/UX test path: `npm test` and relevant `extension:test` where modified.
- Presence in `main` does **not** prove each flow works in production; do not claim live status without deployed URL and smoke check.

## Prioritized five candidates

| Priority | Working product | Buyer / concrete problem | Smallest sellable MVP | Price **test** (not validated) | Est. incremental build | Source / caveat |
|---|---|---|---|---|---|---|
| P1 | **Xender FixKit** | US/UK service business with website issues; agencies managing client sites | Manual/evidence-backed review → shareable 3-fix action pack → repair proposal/CTA → lead capture | $49 standalone action pack OR scoped fixes from $299 | ~1–3 engineer-days | Ve Interactive; on-site review is not a Lighthouse/SEO ranking guarantee |
| P2 | **QuoteChase** | Solo plumbers/HVAC/electricians lose track of quotations | Quote URL, accepted/declined/pending status, manual follow-up reminders, CSV export | $19/mo or $99 assisted setup | ~3–5 engineer-days | Big Un's TradeOS pivot; do not add payments/SMS/phone agents in MVP |
| P3 | **DemoPitch** | Freelance web agencies spend time creating generic prospect demos | Configurable branded demo link + mandatory demo label, expiry and aggregated view count, request-quote CTA | $29/mo or $99 done-for-you demo | ~2–4 engineer-days | Toplyne's targeted sales-signal approach; reuse Xender previews without exposing client information |
| P4 | **BookingLink Mini** | Consultants, independent studios, local service providers need simple booking requests | Branded page, service choice, preferred time request, email/WhatsApp reply; explicitly **request-only** until calendar synchronization exists | $12/mo | ~3–5 engineer-days | Hopin/Pavilion; Calendly is free for many needs; do not claim confirmed availability or booked time |
| P5 | **ReviewNudge** | Local services struggle to systematically request genuine reviews after a job | Review links, customer-consented manual request templates, sent/complete tracking; opt-outs | $19/mo | ~2–4 engineer-days | Big Un's local-business angle; do not fake reviews or review-gate unhappy customers |

Estimates assume code reuse and a restricted MVP. Pricing hypotheses are in USD for testing only; **no paying customers or WTP evidence yet**. App-wide billing, multi-tenancy, compliance and support can extend scope significantly.

## P1 FixKit — execution-ready validation brief

**ICP:** US/UK local service providers with their own published business website and at least one *independently verified* material mobile/CTA/contact/credibility defect; optionally small web agencies who may resell the report.

**Promise:** A specific, truthful diagnosis of actionable issues with a scoped fix proposal. Not promises of better search rankings, traffic, accessibility certification, revenue, or speed metrics.

**Minimum product slice:**
1. Run SiteCheck only against a page an operator is permitted to inspect. Use `npm run review:site -- /path/to/consented-local-copy.html` where applicable; avoid unapproved crawling of third-party websites.
2. Produce a compact mobile-friendly report: title, website URL, captured date, evidence for exactly 3 issues, business consequences as hypotheses, and clearly distinct *recommended* fixes.
3. Add CTA to buy a repair scope or request a no-obligation quote via existing `/api/lead` or the existing contact path. Track source/campaign `fixkit`; no personal data in public GitHub.
4. Provide optional personalized preview for a prospect via the existing preview builder. Keep the **concept demo** notice and expiry.
5. Reports should not expose privileged admin URLs, bearer tokens, unpublished leads, or other clients' data. Do not promise PDF export unless implemented and tested.
6. Verify the entire path manually on mobile and with the relevant test suites before labelling product live.

**Initial service packaging:**
- Free: 3 reproducible findings in a private initial message, no unsupported score.
- $49: clearly scoped diagnostic/action document, if there is demonstrated buyer interest.
- From $299: offer to fix an agreed 1–3 high-value issues; quote the exact scope, limitations, milestones, and support period.
- Never undercut existing approved Xender service pricing or charge without a working approved international payment/invoice path.
- Customer-specific exports/tax treatment: confirm with the accountant before first export invoice.

**Zero-cost validation experiment (before broad build):**
- 10 US/UK prospects from public business sites; qualify on a directly observed defect and contact suitability.
- Up to 5 *individually personalized* permission-respecting first touches; do not bulk-send, automate deceptive messages, scrape personal data, or ignore opt-outs.
- Record `verified_issue`, `prospect_source`, `first_touch_date`, `reply`, `report_sent`, `proposal_sent`, `deposit_collected` in authorized private MIS/CRM; commit only aggregate totals.
- Offer a focused sample report to interested prospects. Charge only after clear scope and invoice/payment readiness.
- **Gate to ship full public self-serve product:** at least 3 qualified conversations and 1 explicit willingness-to-pay/paid pilot. If weak signals, iterate positioning instead of building all five.

## Avoid/reject for now

- Full AI voice receptionist, real-time SMS or payment collection: usage costs, telephony regulation and operational complexity.
- Horizontal social network, large marketplace, automated outbound flood or high-volume crawling: high acquisition cost, spam/legal risk.
- Financial/credit underwriting products: regulated and outside current resources.
- Generic "AI CRM" without a buyer-specific workflow: incumbents already cover basics.

## Engineering handoff

**First ticket:** `XEND-FIXKIT-001`  
**Priority:** P1 after direct customer-problem validation  
**Implementer:** Claude or ChatGPT, single owner per branch  
**DoD:** repo-safe draft branch/PR, demo labelled honestly, quote/form path captures lead, mobile UX verified, `npm test` green, extension tests when touched, launch tracking noted in `docs/CURRENT_STATE.md` and `docs/TASKS.md`. No deployment claims until post-merge live smoke testing.

**Near-term action for ChatGPT acquisition lane:** qualify the first 10 verified sites, create up to 5 personalized compliant messages, track replies, prioritize a scoped repair deposit. **Do not present unsent outreach as sent or uncollected proposals as revenue.**
