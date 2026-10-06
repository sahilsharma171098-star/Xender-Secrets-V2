# Revenue Architecture — CLAUDE-REV-001

Owner: Claude (design) · Sahil (pricing/payment approval) · Updated 2026-10-06

Goal: first **collected** rupee with ₹0 new spend. Booked ≠ collected; track both.

## 1. Primary ICP (first 7 days)

Indian small service businesses where **one new enquiry is worth more than the website**:
CA/accounting firms, dental & medical clinics, real-estate agents, recruitment agencies, coaches/institutes, gyms, salons, local trades — Delhi NCR/Gurugram first (Sahil can meet or call locally, Hindi/English).

Qualifying signals (any two): no website · website broken on mobile · no WhatsApp/call button · only an Instagram/Google profile · explicit "need a website/developer" post.

Secondary (international): UK/US/CA small firms via email/LinkedIn, landing pages from US$299. Slower to close; keep as a parallel track, not the first-sale bet.

## 2. Offer ladder (live on the homepage)

| Step | Offer | Price | Job |
|---|---|---|---|
| Entry | Free website check | ₹0 | Lead magnet. Personal list of fixes. Converts cold prospects into conversations. |
| Core | Founding Website — 1 page, ≤6 sections | ₹999 (first 10) | Easiest yes. Low risk for buyer, fast for us using templates. |
| Upgrade | Business Starter — ≤3 pages + form + city SEO | ₹1,999 | Default recommendation for professionals. |
| Upgrade | Business Pro — ≤5 pages + forms + analytics | ₹3,499 | Multi-service businesses. |
| Custom | Redesign / booking / CRM / automation | from ₹4,999 | Quoted after discovery. |
| Recurring (optional, after delivery) | Care plan: updates, small edits, uptime check | propose ₹499–999/mo | **Never** a condition of purchase. Sahil to approve price before offering. |

Floor rule: nothing below ₹999 without Sahil's approval. Domain/hosting/paid assets billed at cost.

## 3. Lead → cash flow

1. **Enquiry** — homepage/services/contact form or WhatsApp. Form gives an `XS-YYMMDD-XXXX` reference and a one-tap "send on WhatsApp" so the conversation lands in WhatsApp immediately.
2. **Reply within 2 working hours** (daytime IST). Use the reply scripts in `docs/sales/SALES_PLAYBOOK.md`.
3. **Qualify** (5 questions): business & city · who are your customers · do you have a site/Instagram/Google profile · what should the site make people do (call/WhatsApp/visit/book) · when do you need it & rough budget.
4. **Free check or preview** — run `npm run review:site` on their saved HTML for evidence; for hot leads build a 1-page preview from the matching business template (CATEGORY-NN).
5. **Written quote** — scope, pages, what's included/excluded, delivery date, price, payment terms. Template in the playbook.
6. **Collect** — see §5.
7. **Deliver → handover → ask for permission to show it as real work** (first real portfolio item; only with written consent).
8. Update MIS (`/admin.html`): stage, quote value, collected value, next action + date on **every** open lead.

## 4. Objection handling (also answered in the homepage FAQ)

| Objection | Answer |
|---|---|
| "₹999 is too cheap — what's the catch?" | Founding price for the first 10 businesses; the limit is scope (one page). Upgrade later if needed. |
| "You have no clients / reviews." | True, and we say so: inspect working demos, see a free preview of *your* site before paying, GST invoice. |
| "I already have Instagram." | Instagram doesn't show up when someone Googles "dentist near me"; the site links both. |
| "My nephew can make it." | Fine — take the free check list and give it to him. (Keeps goodwill; often comes back.) |
| "Monthly charges?" | None compulsory. Hosting/domain at cost only if needed. |
| "Send details, I'll think." | Send the specific preview/check, then follow up on day 2 and day 5 (cadence in playbook). |

## 5. Payment collection (Sahil to approve — recommendation)

Zero-spend options, in order:
1. **UPI / bank transfer to the business account** with a GST invoice — ₹0 fees.
2. Razorpay/Cashfree payment links — no upfront cost but a per-transaction fee, and KYC. Use only if a client insists on card/netbanking. *Sahil decision.*

Recommended terms (pending Sahil's approval; the site deliberately says "terms stated on the quote"):
- ₹999: build the preview first, **100% before go-live/handover**. Preview-first removes the trust gap that a no-reviews studio has.
- ₹1,999–3,499: **50% to start, 50% before go-live**.
- Custom: 50/50 or milestone-based.

## 6. Pricing presentation decisions

- Prices are shown in ₹ on the homepage (no currency conversion script there — keeps the page fast and unambiguous for the India-first ICP). `services.html` keeps the existing `data-inr` country conversion.
- International buyers see "landing pages from US$299" in copy.
- Scarcity ("first 10 businesses") is real and must be retired once 10 founding sites are sold — Claude/ChatGPT: check the MIS won count before every outreach batch.
