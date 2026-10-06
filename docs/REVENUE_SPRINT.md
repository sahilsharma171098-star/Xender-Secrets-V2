# Revenue Sprint — Issue #19 (Claude + ChatGPT, 7 days)

Goal: turn a verified prospect into a personalised preview + proposal fast, and optimise for the **first paid deposit**. Zero new spend; no spam; no fabricated claims.

## Status (2026-10-06)
| # | Claude deliverable (Issue #19) | Where | State |
|---|---|---|---|
| 1 | This checklist | `docs/REVENUE_SPRINT.md` | done |
| 2 | Reusable previews by vertical — Dental/Clinic, Real Estate, Professional Services, Fitness, Restaurant | `public/preview/preview-core.mjs`, `public/preview.html`, `public/preview-builder.html`, `/api/admin/previews`, `/p/<id>` | PR (branch `claude/xend-sales-002-preview-system`) |
| 3 | Xender sales-page conversion | homepage/offers/lead form/MIS (PR #18 → **live**, a400b29); all commercial + industry pages (PR #20) | #18 live, #20 open |
| 4 | PR with screenshots + test evidence | PR descriptions | done |
| 5 | What ChatGPT should use in outreach | §3 below + `docs/sales/SALES_PLAYBOOK.md` + `docs/CHATGPT_ACTION_QUEUE.md` | done |

**Merge order:** #20 (→ `main`) then #21 (stacked on #20). #18 is already live. After merging, set the `ADMIN_TOKEN` Worker secret: previews and the MIS both depend on it.

## 1. Preview system — how it works
- **Builder** (`/preview-builder.html`, noindex): choose a vertical, fill in the prospect's **public** details and watch a live phone/desktop preview. "Create share link" (needs `ADMIN_TOKEN`) returns `https://www.xendersecrets.com/p/<id>` plus a ready-to-send message.
- **What the prospect sees:** a one-page site in their name, with their WhatsApp/call buttons wired to *their* number. It has a permanent banner — "Draft website preview prepared by Xender Secrets … not the official website" — and a "Like it? Get this website from ₹999" button that opens WhatsApp to Xender with the preview id prefilled.
- **Honesty built in:**
  - Highlights are never auto-filled, so nothing is claimed about the business that wasn't published by them.
  - Default services appear only as labelled "Sample items".
  - There is no reviews section.
  - Previews are noindex, disallowed in robots.txt, and expire after 30 days by default (90 max).
- **Signal:** every open counts as a view. `/admin.html` → *Client previews* shows views and last view, so follow up when a prospect opens the link. Opening it yourself with `&nocount=1` doesn't count.
- **Safety:** shareable previews exist only when created with the admin token. All input passes `sanitizeConfig` (lengths, http(s)-only URLs, hex colours, phone/email checks) and every value is HTML-escaped on render (unit + browser tests include injection attempts).

## 2. Under-30-minute preview SOP
1. **Verify (5 min)**: open the prospect's Google Maps/Instagram/site; note one concrete problem (no website, broken on mobile, no WhatsApp/call button, no hours…).
2. **Collect public facts (10 min)**: name, area/city, phone/WhatsApp, address, hours, real services (from their own listing), their Google/Instagram URLs, optionally an image *they* published.
3. **Build (5–10 min)**: paste the JSON (template below) via *Import JSON*, or fill the form; check phone + desktop views; pick an accent close to their brand colour.
4. **Share (2 min)**: Create share link → copy the message → send personally. Log it in MIS (lead stage `contacted`, next action "Check preview views", date +2 days).

Config JSON template (ChatGPT can draft this; Sahil pastes it into the builder):
```json
{
  "vertical": "dental | realestate | pro | fitness | restaurant",
  "name": "Business name exactly as listed",
  "tagline": "What they do, for whom (from their own wording)",
  "area": "Sector 56", "city": "Gurugram",
  "phone": "98xxxxxxxx", "whatsapp": "",
  "address": "Public address", "mapsQuery": "Business name Sector 56 Gurugram",
  "services": ["Service | short description | price if publicly listed"],
  "highlights": ["Only facts they publish, e.g. Open on Sundays"],
  "hours": ["Mon–Sat | 10am – 8pm"],
  "about": "One or two sentences from their public description",
  "googleUrl": "", "instagram": "", "heroImage": "", "accent": "#0e7490"
}
```

## 3. What ChatGPT should use in outreach
- **Link the matching industry page** (CQ-007) for cold first touches: `/clinic-website-development`, `/accountant-website-development`, `/real-estate-website-development`, etc., with UTM tags.
- **Offer the preview, not a full free build**: "I can make a quick draft of what your website could look like — free, no obligation."
- On a positive reply: hand Sahil the config JSON. The preview should go out within 12 hours with the builder's message. The proposal goes the same day interest is confirmed (quote template: playbook §6).
- Fitness and restaurant prospects: use `/gym-website-development` and `/restaurant-website-development` (added in PR #21).
- **Free-check message in one command:** save the prospect's homepage HTML, then run `npm run review:site -- page.html --message --name "Dr Asha Mehta" --site mehtadental.in`. It prints a plain-language, prospect-ready message: owner-visible problems first, no scores, and no promises. It recommends a free draft preview only when the site has serious problems. Always read it before sending.

## 4. Daily targets (Issue #19 — targets, not promises)
15 verified prospects · ≤5 personalised first touches (scale only if reply quality holds) · previews within 12 h of a positive reply · proposal same day · track booked vs **collected** in `/admin.html`.

## 5. Remaining checklist
- [x] #18 live on production (a400b29), production E2E green.
- [ ] Sahil: merge #20 then #21; set `ADMIN_TOKEN` if not done; create one test preview from a phone.
- [ ] Sahil: GST inclusive/exclusive + payment terms decision (blocks quotes).
- [ ] ChatGPT: CQ-001…CQ-007 in `docs/CHATGPT_ACTION_QUEUE.md`.
- [x] Claude: gym and restaurant landing pages; `review:site --message` free-check generator; "Copy daily scorecard" in `/admin.html` (MIS-001).
- [ ] Claude (next): ship the release once #20/#21 merge, and verify the production E2E run, `/p/` redirects and `.mjs` content type.
