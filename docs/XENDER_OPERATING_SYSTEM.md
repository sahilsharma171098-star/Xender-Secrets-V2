# Xender Operating System

## Centralized system update — XEND-OS-003, 2026-10-09

The implementation and activation runbook are now in [operations/README.md](operations/README.md). Website sales and Instagram are active business lanes; Amazon is reserved pending Sahil's SOP. The six functions below remain the functional model. The private Command Center owns cross-business tasks, lead/touch/suppression records and content; GitHub owns code/SOP versions; Notion links to them. No autonomous chat syncing is claimed. Scripts are tested locally but require Apps Script/n8n authentication before automation runs. New outbound cadence and channel permission rules in operations/SALES.md supersede older broad sending targets.

Xender will be run through six execution tracks:

1. Development
2. Customer Acquisition
3. Revenue Generation
4. MIS
5. Admin
6. Sales

## Operating priority
For the current stage, the priority order is:
1. Customer Acquisition
2. Sales
3. Revenue Generation
4. Development
5. MIS
6. Admin

Reason: Xender is pre-scale and needs paying customers before broad expansion.

## Ownership model
- Sahil: final business approvals, pricing exceptions, client commitments, sensitive account actions.
- ChatGPT: operating coordinator, research, planning, lead strategy, sales support, MIS design, code/PR review, execution where connectors/tools allow.
- Claude: primary large repo implementation agent, debugging, multi-file code changes, tests, PR preparation.
- GitHub: source of truth for development tasks and cross-agent handoffs.

## Track 1 — Development
Goal: keep xendersecrets.com stable, credible, conversion-ready and able to support new products.

Immediate outcomes:
- Complete repo audit.
- Fix P0/P1 conversion and reliability issues first.
- Improve lead capture, services/catalog presentation and mobile UX.
- Keep production deploys reviewable and reversible.

Core KPIs:
- P0/P1 bugs open
- conversion-critical pages working
- E2E pass rate
- deployment failures
- lead-form completion rate when tracking is available

## Track 2 — Customer Acquisition
Goal: build a no-paid-media lead pipeline until first revenue.

Initial channels:
- LinkedIn outreach
- Instagram content/outreach
- local business prospecting
- referrals/network
- organic SEO/content
- freelancing marketplaces where no upfront spend is required

Lead qualification:
- identifiable business
- visible website/digital problem
- contact path available
- realistic ability to pay
- service fit

Core KPIs:
- new qualified leads/day
- contacted/day
- replies
- meetings/conversations started
- SQLs created

## Track 3 — Revenue Generation
Goal: convert Xender capabilities into simple offers that can close quickly.

Initial offer ladder:
- Website Audit / Fix Plan
- Small Business Website
- Website Redesign / Conversion Fix
- Automation / Custom Web Work
- recurring maintenance/support after first delivery

Rules:
- Start with clear, easy-to-buy outcomes.
- Avoid custom complexity before discovery.
- Track quote value, won revenue, collected revenue and delivery status separately.

Core KPIs:
- pipeline value
- quotes sent
- won revenue
- cash collected
- average order value
- gross margin estimate

## Track 4 — MIS
Goal: one daily management view of the business.

Daily scorecard:
- leads found
- leads contacted
- replies
- qualified opportunities
- calls/meetings
- proposals sent
- deals won
- revenue booked
- cash collected
- active delivery tasks
- blockers

Weekly review:
- acquisition channel performance
- funnel conversion
- revenue
- delivery capacity
- bugs/incidents
- next-week priorities

## Track 5 — Admin
Goal: keep operations controlled and auditable.

Immediate controls:
- account/access inventory
- domain/deployment ownership
- client records
- proposal/invoice templates
- permission discipline
- credential/secrets hygiene
- documented approvals for risky/irreversible actions

Never store passwords, tokens or secrets in GitHub docs/issues.

## Track 6 — Sales
Goal: move qualified leads from first contact to paid work.

Sales stages:
1. New lead
2. Contacted
3. Replied
4. Qualified
5. Discovery
6. Proposal
7. Negotiation
8. Won
9. Lost
10. Follow-up

Sales principles:
- diagnose before pitching
- sell outcome, not code
- use proof/demos relevant to the prospect
- make the next step explicit
- follow up consistently without spamming

Core KPIs:
- contact-to-reply rate
- reply-to-qualified rate
- qualified-to-proposal rate
- proposal-to-win rate
- sales cycle length

## Daily operating rhythm
1. Acquisition: add qualified leads.
2. Sales: contact/follow up and move opportunities.
3. Revenue: issue proposals/close/collect.
4. Development: fix blockers and build conversion/delivery assets.
5. MIS: update scorecard.
6. Admin: clear approvals, access and records.

## Current commercial focus
Until first consistent revenue, avoid paid tools/ads unless Sahil explicitly approves spend.
