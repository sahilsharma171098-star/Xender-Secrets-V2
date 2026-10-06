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
7. **Publish Xender SiteCheck (CLAUDE-EXT-001)** after its PR merges: Edge Add-ons first, then Firefox AMO — both free; shortest steps and every field to paste are in `extension/store/release-checklist.md`. The one-time Chrome US$5 developer registration fee is explicitly approved by Sahil as of 6 October 2026; no other paid extension spend is approved.

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

### CQ-009 — Use Xender SiteCheck in outreach (added 2026-10-06)
- Priority: P1 · Channel: Gmail / LinkedIn
- Action: run SiteCheck on a prospect's homepage before first touch; quote 2–3 specific, verified findings (copy report → pick items) in the personalised message, and link `/sitecheck` for the free extension. Never paste the full report unsolicited, never claim the score is a Google/Lighthouse score.
- Expected: more specific first messages and a reason to reply. MIS: note "SiteCheck used" on the lead.


## Added by Claude — 2026-10-06 (XEND-SEO-TRAFFIC-001, branch `claude/xend-seo-traffic-001`)
Plan, baseline and checkpoints: `docs/SEO_TRAFFIC_PLAN.md`. Rules for every item below: no automated posting, no fake reviews/ratings/engagement, no link schemes, no traffic manipulation. Use the exact business details everywhere (NAP consistency): **Xender Secrets · Gurugram, Haryana, India · +91 98219 41814 · https://www.xendersecrets.com**. Do not publish a street address unless Sahil confirms one he wants public.

### CQ-010 — Search Console clean-up + priority indexing (P0, after this PR deploys)
- Channel: Google Search Console (needs write access — Sahil, or ChatGPT if the connector is upgraded).
- Action: (1) Sitemaps → remove the erroneous sitemap entry `https://www.xendersecrets.com/` (the homepage submitted as a sitemap). (2) Resubmit `https://www.xendersecrets.com/sitemap.xml` (now 44 URLs; demo pages deliberately removed). (3) URL Inspection → "Request indexing" for the priority list in `docs/SEO_TRAFFIC_PLAN.md` §3, in order, ≤ 10/day. Do **not** inspect `/website-development-gurgaon.html` — it now 301s to `/website-development-gurugram`.
- Expected: priority URLs move to "Discovered"/"Crawled" within days. MIS: record per-URL status on the Day-7 row of `docs/SEO_TRAFFIC_PLAN.md` §4.

### CQ-011 — Bing Webmaster Tools + IndexNow (P0, ~10 min, free)
- Channel: Bing Webmaster Tools (Sahil signs in with Google/Microsoft).
- Action: "Import from Google Search Console" (verifies the site and imports the sitemap). Then in GitHub run Actions → **IndexNow submit** → Run workflow (leave "only" empty). Expect HTTP 200/202 in the log.
- Expected: Bing/DuckDuckGo/Yahoo/ChatGPT-search coverage without waiting for a crawl. MIS: note Bing indexed count at each checkpoint.

### CQ-012 — Google Business Profile (P0, highest local-intent lever)
- Channel: Google Business Profile (Sahil is the owner; verification is his).
- Action: create/verify "Xender Secrets" as a **service-area business** (hide address if run from home), primary category **Website designer**, secondary **Internet marketing service** only if accurate. Service areas: Gurugram, Delhi, Noida, Faridabad, Ghaziabad. Services list = the 3 packages + "Free website check" with "from ₹999 + GST". Website button → `https://www.xendersecrets.com/website-development-gurugram`. Add genuine photos only (founder, workspace, screenshots of our own demo builds labelled as demos).
- Reviews: only ask real clients after delivery. Never seed, swap or buy reviews.
- Expected: Maps/local-pack eligibility for "website designer Gurgaon". MIS fields: `source=google_business` on any lead that mentions Maps.

### CQ-013 — Legitimate free profiles/directories (P1, 5 per day max, manual)
- Channel: each site's own free listing flow, signed in by Sahil.
- Targets (free tiers only; skip anything that requires payment to publish): Bing Places (import from GBP), Apple Business Connect, LinkedIn company page (complete "About" + website), Clutch (free profile), GoodFirms (free listing), DesignRush (free listing), Justdial (free listing), IndiaMART (free seller listing for "website development services").
- Content: use the one-line description "Fixed-price, mobile-first business websites for small businesses in Gurugram, Delhi NCR and across India — from ₹999 + GST." Link the homepage (or the industry page if the directory is industry-specific). No UTM on directory links (keeps the link clean); attribution comes from the referrer and landing page that `/api/lead` already stores with every lead (visible in `/admin.html`).
- Expected: brand citations + a few relevant referring domains. MIS: maintain a "Profiles" list (site, URL, status, date) in the issue thread.

### CQ-014 — Industry-page outreach (P0, ties SEO pages to revenue)
- Channel: Gmail / WhatsApp / LinkedIn (existing CQ-002 batches).
- Action: in each first-touch message, link the **matching industry or city page** (e.g. dentists → `/clinic-website-development`, Gurgaon businesses → `/website-development-gurugram`) instead of the homepage, plus 2–3 verified findings from SiteCheck. Personal, one-to-one, ≤ 20/day.
- Expected: real visits to the priority pages from qualified buyers (also a weak discovery signal). MIS: `landing` = page linked; `source` = channel.

### CQ-015 — Apex → www and HTTP → HTTPS redirect (P1, Sahil, free)
- Channel: Cloudflare dashboard → the `xendersecrets.com` zone.
- Action: SSL/TLS → Edge Certificates → **Always Use HTTPS: On**. Rules → Redirect Rules → create "apex to www": when hostname equals `xendersecrets.com`, dynamic redirect to `concat("https://www.xendersecrets.com", http.request.uri.path)`, status **301**, preserve query string.
- Verified 2026-10-06: `https://xendersecrets.com/services` currently serves the page (200) instead of redirecting. Canonicals already point to `www`, so this is consolidation, not an emergency.
- Expected: one host in Google's index. Verify with PR #31's workflow.

### CQ-016 — Useful content distribution (P2, max 3 per week)
- Channel: LinkedIn (Sahil's profile + company page); genuine Q&A threads (Quora / relevant subreddits) only where the question is real and recent.
- Action: turn each location page's "How customers in {city} find a local business" section into one LinkedIn post (4 tips, no hard sell, link at the end). In Q&A, answer the question fully in the reply itself; link the cost calculator or a guide only when it adds something; always disclose "I run Xender Secrets". No copy-paste answers, no multiple accounts.
- Expected: qualified visits and occasional natural links. MIS: `source=linkedin_post` / `source=community`.

### CQ-017 — Backlink opportunities (P2, relationship-based only)
- Channel: email / LinkedIn, one-to-one.
- Targets: Gurugram/NCR business associations or chambers with member directories; Sahil's college alumni / founder directories; complementary local vendors (photographers, printers, CA firms) who maintain a genuine "partners we recommend" page; small-business blogs accepting a genuinely useful guest guide (e.g. "What a ₹1,000 website should and shouldn't include").
- Not allowed: paid links, link exchanges for their own sake, PBNs, comment/forum link drops.
- Expected: 2–5 relevant referring domains over 28 days. MIS: log each in the issue thread (site, contact, status, link URL).

### CQ-018 — Checkpoint readings (P0, scheduled)
- Dates: 2026-10-13 (Day 7), 2026-10-20 (Day 14), 2026-11-03 (Day 28).
- Action: pull the metrics in `docs/SEO_TRAFFIC_PLAN.md` §4 (GSC URL Inspection for the 12 priority URLs, Performance by page + query, Bing indexed count, MIS organic leads/quotes/revenue) and fill the "Actual" column via a PR or an issue comment. Apply the decision rules in §4.
