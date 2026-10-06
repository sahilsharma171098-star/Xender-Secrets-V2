# Xender Secrets — Canonical Project Context

This file is the shared business/product context for both ChatGPT and Claude.
GitHub is the single source of truth for Xender execution.

## Company / Brand
Brand: Xender Secrets
Production site: https://www.xendersecrets.com/
Repository: sahilsharma171098-star/Xender-Secrets-V2

## Current stage
Xender is in an early revenue stage. The immediate objective is to secure the first real customer revenue without new paid spend.

Primary operating rule:
- Customer Acquisition -> Sales -> Revenue first.
- Development exists to remove conversion/delivery blockers and create sellable assets.
- MIS and Admin keep execution measurable and controlled.

## Six operating departments
1. Development
2. Customer Acquisition
3. Revenue Generation
4. MIS
5. Admin
6. Sales

## Product / website architecture
Current repository uses:
- Static frontend under /public
- Cloudflare Worker backend in /src/index.js
- Wrangler config in /wrangler.jsonc
- Cloudflare Durable Objects with SQLite storage
- Workers AI binding
- Existing auth/account system
- Community / ideas / articles / shop / novels
- Website/frontend/backend/full-stack catalogs and demos
- Country/currency handling
- Translation support
- GitHub Actions live E2E checks

## Commercial direction
The commercial website must become a serious revenue engine, not a feature showcase.

Primary offer ladder to evaluate and improve:
1. Website Audit / Conversion Fix Plan
2. Small Business Website
3. Website Redesign / Conversion Upgrade
4. Custom Web / Automation Work
5. Maintenance / Growth Support

Primary target buyers:
- small/local businesses
- service businesses
- professionals
- SMBs with weak/no website
- businesses with poor lead capture / follow-up

## Website redesign principles
- light theme by default, dark optional
- mobile first
- fast and simple
- outcome-led copy
- clear offer and pricing logic
- strong WhatsApp/contact conversion paths
- short lead form
- demo/proof clarity
- no fake testimonials/case studies
- reduce clutter
- preserve useful backend systems
- revenue-first IA
- accessible
- SEO-ready
- conversion-measured

Homepage must answer quickly:
- What is Xender?
- Who is it for?
- What result can a customer buy?
- Why trust Xender?
- What is the next action?
- What proof/demo exists?

## First-party data direction
Use privacy-conscious first-party measurement.
Track only what is useful to improve business decisions:
- acquisition source
- landing page
- page view
- CTA interactions
- lead start
- lead submit
- service interest
- qualification
- opportunity stage
- proposal
- deal
- booked revenue
- collected cash
- experiment / release
- error/performance events where useful

Never expose raw lead/customer data publicly.

## Zero-spend rule
Until first revenue, do not introduce new paid spend without explicit owner approval.

Prefer:
- existing GitHub
- existing Cloudflare
- current paid ChatGPT/Claude subscriptions
- free/open-source packages
- free platform tiers already available
- organic SEO
- direct personalized outreach
- existing social/account connectors

## AI operating model
### Claude
Primary implementation/cofounder-level executor for:
- repository-wide engineering
- UI/UX design
- architecture
- monetization implementation
- analytics/data implementation
- SEO
- performance
- testing
- debugging
- code/documentation PRs

### ChatGPT
Primary operating/review partner for:
- cross-functional coordination
- architecture/business review
- PR review/merge control
- external research
- customer acquisition
- sales operations
- MIS
- connected external-account actions
- independent verification

### Owner
Final approval remains required for:
- new spending
- legal commitments
- irreversible data destruction
- sensitive account access changes
- major pricing exceptions

## GitHub workflow
- Do not treat ChatGPT and Claude chat sessions as separate sources of truth.
- Read this file plus AGENTS.md and CLAUDE.md.
- Work from GitHub issues.
- Use branches and PRs for material changes.
- Update docs/CURRENT_STATE.md after major merged changes.
- Use docs/CHATGPT_ACTION_QUEUE.md for external actions Claude needs ChatGPT to execute.

## Current war room
Master mission:
- Issue #8 — XEND-WARROOM-001

Execution streams:
- Issue #9 — commercial website / conversion UX rebuild
- Issue #10 — revenue architecture and lead-to-sale funnel
- Issue #11 — first-party analytics/data
- Issue #12 — technical SEO/performance
- Issue #13 — QA/security/deployment readiness

## 7-day target
Target: first real collected customer revenue within 7 days, with zero new paid spend.
This is an operating target, not a guarantee.

Priority sequence:
1. Make site credible and conversion-ready
2. Make offer easy to buy
3. Make lead capture measurable
4. Generate qualified prospects
5. Run personalized outreach
6. Move replies through discovery/proposal
7. Close and collect
8. Learn from data and iterate

## Content / rights rule
Only publish third-party content where authorization/licensing is documented and matches the scope.
Do not bypass access controls or assume permission beyond documented authorization.

## Working principle
Do not overbuild.
For the 7-day sprint, every meaningful task should support at least one:
- qualified traffic
- conversion
- trust
- sales velocity
- revenue
- retention
- lower delivery cost/time
- useful decision data

If it supports none, deprioritize it.
