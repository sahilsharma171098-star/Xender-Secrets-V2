# Xender Sales Playbook — SALES-001

For Sahil and ChatGPT. Personal, evidence-based messages only — never bulk. Every link carries UTM tags (see `docs/DATA_MEASUREMENT_PLAN.md`). Log every touch in `/admin.html` (or the private CRM) the same day.

## Daily rhythm (target, not quota)
- 10 qualified prospects found → 10 personalised first touches
- All replies answered within 2 working hours
- All follow-ups due today sent (MIS "Follow-ups due")
- 1 preview or free check delivered to the hottest lead

## Follow-up cadence
Day 0 first touch → Day 2 short bump with one new specific detail → Day 5 value follow-up (send the check/preview) → Day 12 polite close-the-loop. Stop immediately on "not interested" or any opt-out.

## 1. First touch — email (India, local business)
Subject: Quick fix for {Business}'s website on mobile

> Hi {Name},
>
> I was looking at {Business} on Google — {one specific observation, e.g. "the site has no call or WhatsApp button on mobile, so people have to copy your number"}.
>
> I run Xender Secrets, a small Gurugram-based web studio. I can send you a free list of 3–5 fixes for your site, no strings attached — or, if you'd rather start fresh, we build one-page business sites from ₹999 with WhatsApp and call buttons built in.
>
> You can see example builds here: https://www.xendersecrets.com/?utm_source=gmail&utm_campaign={yyyymmdd}-{segment}#work
>
> Want me to send the free check?
>
> Sahil Kumar Sharma
> Xender Secrets · GST-registered · +91 98219 41814

## 2. First touch — LinkedIn DM (after connecting)
> Hi {Name} — noticed {Business} {observation}. I build fast, mobile-first sites for {industry} firms (from ₹999, no lock-in). Happy to send a free 5-point check of your current site — would that help?

## 3. First touch — business WhatsApp (only numbers published as the business's contact)
> Namaste {Name} ji, I'm Sahil from Xender Secrets, Gurugram. I saw {Business} on Google Maps — {observation}. I make simple business websites with WhatsApp/call buttons, starting ₹999. Shall I send a free check of what to improve? If not relevant, no problem at all — I won't message again.

## 4. Reply to an inbound form lead (send within 2 hours)
> Hi {Name}, Sahil from Xender Secrets — thanks for your enquiry ({XS-ref}). Quick questions so I can suggest the right option:
> 1) What should visitors do on your site — call, WhatsApp, visit, or book?
> 2) Do you have a logo and a few photos?
> 3) When would you like it live?
> I'll send {the free check / a preview / a fixed quote} right after.

## 5. Delivering the free website check
Run `npm run review:site -- <saved-page.html>` for evidence, then write by hand:
> Here's your free check for {site}:
> 1. {Most important fix — mobile/CTA/speed/trust}
> 2. …
> 3. …
> The first two you can fix yourself today. If you want us to handle all of it, the {offer} is ₹{price}, delivered by {date agreed}. Want a preview first?

## 6. Written quote (paste into WhatsApp/email or a doc)
```
Xender Secrets — Quote {XS-ref}
Client: {Business}, {City}
Package: {Founding Website ₹999 / Business Starter ₹1,999 / Business Pro ₹3,499 / Custom}
Pages & sections: {list}
Included: mobile-first design, WhatsApp + call buttons, contact/map, basic on-page SEO, {forms}, testing, full handover
Not included: domain & paid hosting (at cost), paid plugins/photos, work beyond this scope (quoted first)
Revisions: {2} rounds on the preview
Delivery: {date}, provided content (logo/photos/text) is received by {date}
Price: ₹{amount} {+ GST if applicable — confirm with your CA}
Payment: {terms approved by Sahil, see REVENUE_ARCHITECTURE §5}
Payment method: UPI / bank transfer to Xender Secrets; GST invoice issued
Valid until: {date + 7 days}
```

## 7. After the sale
- Mark `won`, enter quote and collected amounts in MIS immediately.
- At handover ask: "May we show your site in our portfolio and quote your feedback?" Only publish with written yes. This is the first real proof asset — protect it.
- Offer the optional care plan only after a successful handover.

## Rules
- Never claim results, clients or rankings we don't have.
- Never message the same person on more than one channel the same day.
- Respect opt-outs permanently; record them.
- Don't keep prospect lists or phone numbers in this public repo.
