# ChatGPT Action Queue

This file is the handoff surface for authenticated external actions that should not run from repository code.

Do not store passwords, tokens, session cookies, private prospect lists or active prospect email addresses here.

## XEND-ACQ-001 — Zero-spend acquisition launch

Status: IN_PROGRESS
Owner: ChatGPT
Priority: P0

### Completed 2026-10-05

- Used Apollo's free organization lookup to discover small-business candidates in Gurugram/Gurgaon across several local-business verticals.
- Used no Apollo paid search or enrichment credits.
- Reviewed a small set of public websites and skipped stronger sites where a generic redesign pitch was not justified.
- Sent 3 evidence-based personalized first-touch emails through the connected Gmail account.
- Applied the Gmail label "Xender Prospects" to those sent threads for follow-up tracking.
- Additional sends that were not accepted by platform safety controls were not retried or bypassed.

### Next actions

1. Monitor the labeled outreach threads for replies.
2. For positive replies, verify the original website issue is still present.
3. Build one focused free preview relevant to that prospect.
4. Send the preview with a concrete scope, delivery time and pricing path.
5. Record reply, preview, proposal, win/loss and collected-revenue status in the operating MIS.

### Operating rules

- Zero new paid spend.
- Personalized, evidence-based communication only.
- No bulk spam.
- Respect provider limits, safety controls and opt-out requests.
- Do not claim an issue that was not observed.
- Do not promise guaranteed rankings, traffic, leads or revenue.

---

## Added by Claude — 2026-10-06 (XEND-WARROOM-001, branch `claude/xend-warroom-001-revenue-engine`)

The site now has a real offer ladder, a lead form with `XS-YYMMDD-XXXX` references, first-party source attribution and a private MIS at `/admin.html`. These actions turn that into conversations. Scripts: `docs/sales/SALES_PLAYBOOK.md`. Offer logic: `docs/REVENUE_ARCHITECTURE.md`.

### CQ-001 — Follow up the 3 Gmail prospects from 2026-10-05
- Priority: P0 · Channel: Gmail (label "Xender Prospects")
- Action: on 2026-10-07 (day 2) send the short bump from the playbook to each thread with no reply; add one new specific observation about their site; link `https://www.xendersecrets.com/?utm_source=gmail&utm_campaign=20261005-gurugram#work`.
- Criteria: only threads with no reply and no bounce; skip any opt-out.
- Expected: ≥1 reply. MIS: stage `contacted`, next_action "Day-5 value follow-up", next_action_at +3 days.

### CQ-002 — Daily first-touch batch: Gurugram professional services (free website check)
- Priority: P0 · Channel: Gmail (+ LinkedIn where a decision-maker profile exists)
- Action: 10/day personalised first touches using playbook §1/§2. Segments in order: CA/accounting firms, dental clinics, real-estate agents, recruitment agencies.
- Criteria: identifiable business in Gurugram/Delhi NCR; visible website problem (no mobile CTA, broken layout, no HTTPS, no site at all) observed by you, stated in the message; public business email.
- UTM: `?utm_source=gmail&utm_campaign=<yyyymmdd>-gurugram-<segment>`
- Expected: 1–2 replies/day. MIS: one row per prospect in the private CRM (not in GitHub).

### CQ-003 — LinkedIn "need a website" signal search
- Priority: P1 · Channel: LinkedIn
- Action: daily search posts/jobs for "need a website", "website developer", "looking for web designer" (India first, then UK/US/CA). Respond within hours of posting with playbook §2 adapted, linking the most relevant concept template.
- UTM: `?utm_source=linkedin&utm_campaign=<yyyymmdd>-signal`
- Expected: highest-intent leads. MIS: as above.

### CQ-004 — Post the offer on LinkedIn (company page + Sahil's profile)
- Priority: P1 · Channel: LinkedIn
- Content: "Founding offer: 10 small businesses get a one-page, mobile-first website for ₹999 — WhatsApp + call buttons, full handover, no monthly fees. Not sure you need one? Ask for a free website check. https://www.xendersecrets.com/?utm_source=linkedin&utm_campaign=20261006-founding-post" + a screenshot of a business template (labelled concept demo).
- Expected: inbound DMs/referrals. MIS: source `linkedin`.

### CQ-005 — Reply SLA on inbound leads
- Priority: P0 · Channel: whatever the lead chose
- Action: when Sahil forwards a new `XS-…` lead (Telegram alert or `/admin.html`), draft the playbook §4 reply for Sahil to send within 2 working hours.

## Needed from Sahil (cannot be done by Claude or ChatGPT)

1. **Set Worker secret `ADMIN_TOKEN`** (Cloudflare → Workers → xender-secrets-v2 → Settings → Variables & Secrets, type *Secret*, ≥24 random chars). Without it `/admin.html` stays locked and new leads can't be read. Optional: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` for instant free lead alerts (steps in `docs/DATA_MEASUREMENT_PLAN.md`).
2. **Merge the PR** for branch `claude/xend-warroom-001-revenue-engine` (Cloudflare deploys `main`), then submit one real test enquiry from your phone and confirm it shows in `/admin.html`.
3. **Decide GST presentation**: Xender is GST-registered, so is ₹999 inclusive or exclusive of GST? The site currently shows ₹999 / ₹1,999 / ₹3,499 with no GST note. Confirm with your CA; Claude will update copy either way.
4. **Approve payment terms** (recommendation in `docs/REVENUE_ARCHITECTURE.md` §5: ₹999 preview-first, 100% before go-live; larger packages 50/50).
5. Optional free trust fix: Cloudflare Email Routing `hello@xendersecrets.com` → your Gmail, then Claude swaps the public email.
6. Optional: set `CLAUDE_CODE_OAUTH_TOKEN` repo secret if you want `@claude` issue comments to work (Executor fails without it).

### CQ-006 — Re-submit sitemap after XEND-DEV-002 deploys (added 2026-10-06)
- Priority: P2 · Channel: Google Search Console / Bing Webmaster (if connected)
- Action: after PR for `claude/xend-dev-002-commercial-pages` is live, resubmit `https://www.xendersecrets.com/sitemap.xml`. The old sitemap contained a literal "\n" text node (invalid XML) and pointed at `.html` URLs that 307-redirect; canonicals/sitemap now use the final extensionless URLs. Four thin city pages (Mumbai/Bangalore/Hyderabad/Pune) now 301 to `/small-business-website-india`.
- Expected: cleaner indexing of commercial pages. MIS: none.

### CQ-007 — Use industry landing pages in outreach (added 2026-10-06)
- Priority: P0 · Channel: Gmail / LinkedIn
- Action: link the matching page instead of the homepage: CA → `/accountant-website-development`, clinics/dentists → `/clinic-website-development`, agents → `/real-estate-website-development`, recruiters → `/recruitment-agency-website-development`, coaching → `/coaching-website-development`, consultants → `/consultant-website-development`, gyms → `/gym-website-development`, restaurants/cafés → `/restaurant-website-development` (gym/restaurant live after PR #21). Always add `?utm_source=<channel>&utm_campaign=<yyyymmdd>-<segment>`.
- Expected: higher click→enquiry rate (each page has industry FAQs, matching concept templates and the lead form).

### CQ-008 — Post the daily scorecard (added 2026-10-06)
- Priority: P1 · Channel: GitHub Issue #5 (MIS-001)
- Action: each evening Sahil clicks **Copy daily scorecard** in `/admin.html` (after #21 is live). ChatGPT fills in the outreach numbers from the private CRM (found / contacted / replies, plus delivery and blockers) and posts it as a comment on Issue #5.
- Expected: one comparable daily record of funnel, pipeline, booked and collected revenue.

### CQ-009 — Quote with GST (added 2026-10-06, P0 for every proposal)
- All ₹ prices are **+ 18% GST** (approved). Quote as "₹999 + ₹179.82 GST = ₹1,178.82". Haryana clients: CGST 9% + SGST 9%; other states: IGST 18%. For US$ (international) quotes, don't add GST until the CA confirms LUT/export treatment.
- Selling point for GST-registered clients: they can usually claim the GST as input tax credit (their CA confirms) — never promise it.
- Record `quote_value` / `collected_value` in `/admin.html` **excluding GST**.

---

## XEND-LI-001 — LinkedIn channel (added by Claude 2026-10-06, Issue #19 LinkedIn handoff)

Plan, audit and public prospect summary: `docs/LINKEDIN_EXECUTION.md`. **Prospect names, LinkedIn URLs and ready-to-send messages are in the private Google Doc "Xender LinkedIn Prospects — 2026-10-06 (PRIVATE, XEND-LI-001)"** in Sahil's Drive (https://docs.google.com/document/d/12VM3yauiSekdMXFbPFhtwIKoWs6KeV8JMW7HhcKXlJY/edit). Per `docs/ACQUISITION_ENGINE.md`, they are not in this public repo.

Already done by Claude: audited the company page (1 follower, 0 posts, generic About), published Day 1 to the company page, and scheduled Days 2–7 via a daily routine (09:52 IST, 7–12 Oct). Also sourced 10 verified Gurugram prospects (LI-01…LI-10).

### CQ-LI-01 — Update LinkedIn positioning
- Priority: P0 · Owner: Sahil (needs a logged-in admin; the connector can't edit page details)
- Action: paste the tagline, About text and button URL from `docs/LINKEDIN_EXECUTION.md` §3 into the company page. Update Sahil's headline and Featured section the same way.
- Expected: profile visitors see the offer, price and CTA. MIS: none.

### CQ-LI-02 — First touches to the P0 prospects (LI-01…LI-05)
- Priority: P0 · Owner: Sahil (LinkedIn connection notes and DMs) / ChatGPT (email variant, LI-05 via Instagram/Facebook)
- Action: re-check each site on a phone, then send that prospect's message from the private doc. One channel per prospect. Max 5 first touches/day; the P1s (LI-06…08) go on 2026-10-07. No InMail, Premium or automation.
- UTM: already in each message (`utm_source=linkedin&utm_medium=dm&utm_campaign=20261006-<segment>-<id>`).
- Expected: 1–2 replies from 5. MIS: a row per prospect in the Command Center Leads sheet, stage `contacted`, next action "accept → DM" or "day-3 follow-up".

### CQ-LI-03 — Reshare and engage daily
- Priority: P1 · Owner: Sahil
- Action: reshare each day's company post to his profile with one personal line. Reply to every comment the same day. Comment thoughtfully on 3 posts a day from Gurugram CA, clinic or real-estate owners (no pitch in comments).
- Expected: page followers > 25 by 2026-10-12.

### CQ-LI-04 — Live intent search (needs a member login)
- Priority: P1 · Owner: Sahil / ChatGPT if a LinkedIn connector becomes available
- Action: LinkedIn post search, sorted by Latest and filtered to the past 24h: "need a website", "looking for web developer", "website redesign", "recommend website developer", "new clinic" + Gurugram/Delhi/NCR. Reply in the comments or DM within hours. Log each signal in the private doc as LI-11+.
- Why: public web search doesn't index these posts, so this can't be done from Claude's side.

### CQ-LI-05 — Connect LinkedIn to Metricool (optional)
- Priority: P2 · Owner: Sahil
- Action: connect the LinkedIn page at https://app.metricool.com/brands/connections?blogId=7266070. Then Claude can schedule posts there with best-time data, and Metricool analytics will cover LinkedIn. Not required for this week's plan.

### CQ-IG — Instagram channel handoff (link, owned by the Instagram thread)
- Handoff: `docs/handoffs/instagram-gurugram.md` in PR #24 (branch `claude/instagram-execution-bqkq8g`).
- Private prospect doc (25 Gurugram businesses, already deduped against the LinkedIn doc and the Oct 5–6 emails): https://docs.google.com/document/d/1g_inZfoGPSqW63qhc4RmayPO_n-TVOhO9QZFjIukOxY/edit
- Instagram posts publish via Windsor (@xande_r5955) daily Oct 7–12 at 18:52 IST. LinkedIn publishes at 09:52 IST.
- Recommendation (Claude): treat the 5/day first-touch cap as shared across LinkedIn, Instagram and email until reply rates justify more. Sahil can override.
