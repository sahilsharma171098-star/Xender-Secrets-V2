# LinkedIn Execution — XEND-LI-001

Source: Issue #19, "LINKEDIN EXECUTION HANDOFF — 2026-10-06". Owner: Claude (content, prospecting) + ChatGPT/Sahil (anything that needs a logged-in LinkedIn member account).

## 1. Audit (2026-10-06, via the Windsor.ai LinkedIn Organic connector)

| Item | Observed | Verdict |
|---|---|---|
| Company page | `linkedin.com/company/xender-secrets` (org id 145265420), website `www.xendersecrets.com` | OK |
| Followers | 1 | No audience yet |
| Posts | 0 in the last 12 months | Empty feed; every visitor sees an inactive page |
| Page views / impressions (90 days) | 0 page views, 1 impression, 0 clicks | No distribution |
| About text | Generic ("digital solutions company… startups, agencies… white-label") | No offer, no price, no city, no CTA. Mentions white-label agency work, which is not the sprint ICP |
| Featured / custom button | Not readable via API | Sahil to check (see §3) |
| Sahil's personal profile | Not connected to any tool here | Sahil to update (see §3) |
| Metricool | Brand 7266070 has **no social network connected**, so it can't schedule LinkedIn yet | Sahil to connect LinkedIn in Metricool |

The page is clean but has no positioning. Nothing on it tells a Gurugram CA or dentist what they get, what it costs, or what to do next. The connector can publish posts to the page but cannot edit the About text, tagline or button. Those edits are in §3 as copy to paste.

## 2. Positioning (what every LinkedIn surface should say)

- **Who:** owners of small businesses in Gurugram / Delhi NCR (CA firms, clinics, real-estate agents, recruiters, gyms, cafés).
- **Entry point:** free website check, a short written list of what to fix.
- **Paid entry:** ₹999 + GST Founding Website (1 page, first 10 businesses). Then ₹1,999 + GST Business Starter (3 pages) and ₹3,499 + GST Business Pro (5 pages). Custom web and automation are quoted.
- **Proof we can honestly show:** live concept templates (labelled as concepts), fixed written quotes, a live preview before payment, and full handover. **We have no client case studies yet, so we never imply any.**

## 3. Profile and page copy (ready to paste; done by Sahil, see CQ-LI-01)

**Company page tagline (120 chars max):**
> Mobile-first websites for Gurugram small businesses. From ₹999 + GST. Free website check.

**Company page About:**
> Xender Secrets builds fast, mobile-first websites for small businesses in Gurugram and Delhi NCR: CA firms, clinics, real-estate agents, recruiters, gyms and cafés.
>
> How it works: you get a free website check first, a fixed quote in writing, then a live preview before you pay. Every site has WhatsApp and call buttons, an enquiry form, basic local SEO and full handover. There are no compulsory monthly fees.
>
> • Founding Website: ₹999 + GST (1 page, first 10 businesses)
> • Business Starter: ₹1,999 + GST (3 pages)
> • Business Pro: ₹3,499 + GST (5 pages)
> • Redesigns, custom web apps and automation are quoted on request.
>
> Ask for a free website check: https://www.xendersecrets.com/?utm_source=linkedin&utm_medium=company_page&utm_campaign=about

**Custom button:** "Visit website" → `https://www.xendersecrets.com/?utm_source=linkedin&utm_medium=company_page&utm_campaign=button`

**Sahil's personal headline:**
> Founder, Xender Secrets · Websites for Gurugram small businesses from ₹999 + GST · Free website check

**Sahil's Featured section:** (1) homepage with `utm_campaign=featured`; (2) the Day-1 company post below; (3) `/accountant-website-development` or `/clinic-website-development`.

## 4. 7-day content plan (company page; Sahil reshares each one to his profile)

Posting time: 09:52 IST daily. Every link carries `utm_source=linkedin&utm_medium=organic&utm_campaign=<date>-<slug>`. Day 1 was published on 2026-10-06. Days 2–7 are published by a Claude routine through the same connector (routine "XEND-LI-001 daily LinkedIn post", 09:52 IST, 7–12 Oct). The routine marks each day PUBLISHED here. Comments are answered by Sahil within the day.

### Day 1 · Tue 6 Oct · Offer intro (PUBLISHED 2026-10-06, `urn:li:share:7513149415629664256`)
```
Most small-business websites in Gurugram fail the same 5-second test: open it on your phone and try to call, WhatsApp or book. If that takes more than one tap, you are losing enquiries.

Xender Secrets builds mobile-first websites for small businesses in Gurugram and Delhi NCR. That covers CA firms, clinics, real-estate agents, recruiters, gyms and cafés.

What you get:
• A free website check first: a short written list of what to fix, whether or not you hire us
• A fixed quote in writing, then a live preview before you pay
• WhatsApp and call buttons, an enquiry form, basic local SEO and full handover, with no compulsory monthly fees

Founding offer: the first 10 businesses get a one-page website for ₹999 + GST.

Ask for your free website check: https://www.xendersecrets.com/?utm_source=linkedin&utm_medium=organic&utm_campaign=20261006-founding-offer
```

### Day 2 · Wed 7 Oct · Practical checklist (PUBLISHED 2026-10-07, `urn:li:share:7513453769800568832`)
```
A 2-minute website check you can do on your phone today:

1. Does your site load in under 3 seconds on mobile data?
2. Is your phone number a tap-to-call link, not just text?
3. Is there a WhatsApp button, and does it open the right number?
4. Does the footer show this year, or 2019?
5. Does www.yoursite and yoursite (without www) both open without a security warning?
6. Does your contact or booking form actually send? Test it once a month.

We keep seeing points 4–6 fail on otherwise good businesses. Each one quietly tells a visitor "nobody is minding this".

If you want a second pair of eyes, we do a free website check and send you a short written list: https://www.xendersecrets.com/?utm_source=linkedin&utm_medium=organic&utm_campaign=20261007-checklist
```

### Day 3 · Thu 8 Oct · CA firms (PUBLISHED 2026-10-08, `urn:li:share:7513816322716368896`)
```
For CA firms, the website's job is simple: make a business owner comfortable picking up the phone.

What prospective clients look for, in this order:
• Which services you handle (GST, ITR, audit, company incorporation, payroll)
• Who the partners are, with real names and qualifications
• Where you are and how to reach you: tap-to-call, WhatsApp, office map
• Signs of life: an updated compliance calendar or a recent update

What turns them away: a 2019 copyright line, news from five years ago, or a site that throws a security warning.

We build CA firm websites around exactly this, from ₹999 + GST: https://www.xendersecrets.com/accountant-website-development?utm_source=linkedin&utm_medium=organic&utm_campaign=20261008-ca
```

### Day 4 · Fri 9 Oct · Clinics (PUBLISHED 2026-10-09, `urn:li:share:7514178702268772352`)
```
If a patient finds your clinic on Google at 9pm, what happens next?

The best clinic websites make that moment easy:
• Tap-to-call and WhatsApp visible without scrolling
• A booking form that works, or a clear "WhatsApp us to book" if it doesn't
• Doctors' names, qualifications and timings on the first screen
• Your sector and a map link, because patients choose the nearest good option

One thing to avoid: a form that says "under maintenance". Patients won't wait for it to come back.

Clinic websites from ₹999 + GST, with a live preview before you pay: https://www.xendersecrets.com/clinic-website-development?utm_source=linkedin&utm_medium=organic&utm_campaign=20261009-clinic
```

### Day 5 · Sat 10 Oct · Concept demo (gyms) (PUBLISHED 2026-10-10, `urn:li:share:7514541414144315392`)
```
Concept demo: what a gym website needs to turn a visitor into a trial.

This is a concept template we built, not a client project:
• Hero with location, timings and a "Book a free trial" button
• Membership plans with clear prices (the #1 question at the front desk)
• Trainer profiles and a class timetable
• WhatsApp button wired to the front desk

See the gym concept and what's included: https://www.xendersecrets.com/gym-website-development?utm_source=linkedin&utm_medium=organic&utm_campaign=20261010-gym
```

### Day 6 · Sun 11 Oct · What we saw this week
```
This week we reviewed small-business websites across Gurugram. These were the most common problems, and none of them needs a redesign to fix:

• Copyright lines stuck in 2019–2022
• A security warning on the www version of the domain
• Template leftovers, like a footer address in another country
• Online booking forms switched off "for maintenance"
• Phone numbers shown as plain text instead of tap-to-call
• Hosting suspended, so the domain shows a provider's error page

Each one costs enquiries without anyone noticing. Want us to check yours? It's free: https://www.xendersecrets.com/?utm_source=linkedin&utm_medium=organic&utm_campaign=20261011-patterns
```

### Day 7 · Mon 12 Oct · Real estate & recruiters + transparent pricing
```
Real-estate agents and recruiters live or die on enquiries. Yet many sites send leads to a generic contact page.

What works better:
• One clear form per intent: "I want to buy / rent / list" or "I'm hiring / I'm a candidate"
• WhatsApp on every listing or job
• Fresh listings or roles, or no listings section at all

Our prices, in public:
• ₹999 + GST: Founding Website, 1 page (first 10 businesses)
• ₹1,999 + GST: Business Starter, 3 pages
• ₹3,499 + GST: Business Pro, 5 pages
Every quote is fixed and in writing, with a live preview before payment.

Real-estate websites: https://www.xendersecrets.com/real-estate-website-development?utm_source=linkedin&utm_medium=organic&utm_campaign=20261012-realestate
```

Content rules: no client names, no invented results, no "guaranteed leads", and concept work is always labelled as concept. Day 6 lists anonymised patterns we actually observed on 2026-10-06 (§5). It names nobody.

## 5. Prospects (2026-10-06)

The public-repo rule in `docs/ACQUISITION_ENGINE.md` applies: names of people, contact details and messages are **not** committed here. The full table (person, LinkedIn URL, signal, message) is in the private Google Doc linked from CQ-LI-02. Below is the non-sensitive summary.

Method: Apollo free organization lookup (0 credits; people search is not on the free plan), then a manual check of each public website. About 80 organizations came back, 25 public websites were checked, and 10 qualified. Skipped: sites with no specific, observable issue (e.g. White Lily Dental, PKNM, Goyal K, Career Crafterz), sites already contacted by ChatGPT (Deo & Associates, Singh Sethi & Co, Sujeet Choudhary & Associates, Molaris Dental, NKRS & Co.), and sites that only failed because of our fetcher.

No public LinkedIn "need a website" posts in Gurugram were found through web search. LinkedIn post search needs a logged-in member, so that part is CQ-LI-04 for Sahil.

| ID | Vertical | Area | Observed signal (verify before sending) | Landing page | Priority |
|---|---|---|---|---|---|
| LI-01 | CA firm | Gurugram | Domain shows a hosting provider's "not accessible" suspension page | accountant | P0 |
| LI-02 | CA firm | Gurugram | Site returns Cloudflare error 526 (invalid SSL at origin); site is unreachable | accountant | P0 |
| LI-03 | CA firm | Gurugram | © 2019, news section from 2019, header email link malformed | accountant | P0 |
| LI-04 | Dental clinic | Gurugram (2 branches) | Online appointment form "currently under maintenance" | clinic | P0 |
| LI-05 | Café | Gurugram | Footer shows a template address in Victoria, Australia, and the phone is a 1800 number that looks like template text | restaurant | P0 |
| LI-06 | CA firm | Gurugram | © 2020, truncated sentence in intro, no phone number on homepage | accountant | P1 |
| LI-07 | CA firm | Gurugram + Pune | `www.` version throws an SSL hostname mismatch (security warning); bare domain works | accountant | P1 |
| LI-08 | Dental clinic | DLF Phase 1 | © 2020, a "Start 2021 with a Smile" event still live, no WhatsApp | clinic | P1 |
| LI-09 | Real estate | Gurugram / Delhi | © 2022, no listings on a property site, CTA typo | real-estate | P2 |
| LI-10 | Gym | Gurugram (2 clubs) | WhatsApp icon number may differ from the listed phone; repeated sections | gym | P2 |
