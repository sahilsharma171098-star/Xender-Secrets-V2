# Instagram + Gurugram prospects — handoff (XEND-IG-001)

Source: Issue #19, "INSTAGRAM / METRICOOL EXECUTION HANDOFF" (2026-10-06). Owner: Claude. Zero paid spend.

This repo is public, so prospect names and messages live in a private Google Doc (link in §5), not here.

## 1. Profile audit (2026-10-06, via Windsor's Instagram read connector)

| Item | Found | Problem |
|---|---|---|
| Username | `@xande_r5955` | Not the brand, not searchable, looks like a throwaway account |
| Display name | "Xander Secrets" | Misspelt (brand is **Xender**) |
| Bio | empty | Nothing says what we sell, where, or how to start |
| Website link | none | No path from Instagram to the lead form |
| Followers / following | 4 / 40 | No audience yet, so every post must work for non-followers (hashtags, local terms, shares) |
| Posts | 3 before today | Two Aug 2025 teasers ("The hunt for XaNder has begun…") that are off-brand; one 2026-10-04 post with reach 0 |
| Metricool | brand `7266070` has **no social network linked** | Can't schedule or read analytics there yet |

Connectors that work: **Windsor** can read the profile/media/comments and publish image posts, carousels, stories and comment replies right away. It **cannot schedule**, edit the bio or send DMs. **Metricool** can schedule, but only after Instagram is linked to it.

## 2. Profile fix (Sahil, on phone, about 5 minutes)

No connected tool can edit the profile, so Sahil does this in the Instagram app (Edit profile):

1. **Username:** `xendersecrets`. If it's taken, use `xendersecrets.in`, then `xender.secrets`.
2. **Name** (searchable, 30 chars max): `Xender Secrets | Websites`
3. **Category:** Website designer (or "Web designer"). Turn on "Display category".
4. **Bio** (146 chars, paste as is):
   ```
   Websites for Gurugram & NCR businesses
   Free website check: DM "CHECK"
   ₹999+GST one-page site · redesigns · custom builds
   GST-registered · Gurugram
   ```
5. **Link:** `https://www.xendersecrets.com/?utm_source=instagram&utm_medium=bio&utm_campaign=20261006-bio#start`
6. **Contact options:** WhatsApp business number +91 98219 41814 and email. City: Gurugram.
7. **Archive** (don't delete) the two Aug 2025 teaser posts and the 2026-10-04 post, so the grid starts with the new series.
8. **Pin** the 2026-10-06 founding-offer carousel.
9. Optional: in Metricool, link Instagram at <https://app.metricool.com/brands/connections?blogId=7266070> so analytics and scheduling work there too.

## 3. Content calendar, week 1 (Gurugram / Delhi NCR SMB owners)

Creatives: `marketing/instagram/2026-10-week1/` (`slides.mjs` = copy, `build.mjs` = renderer, `posts.json` = captions + image URLs, `img/` = 1080×1350 JPEGs). Every price and claim matches `public/index.html`. Mockups use the real preview system with fictional "Example …" names and a **CONCEPT DEMO** badge.

| Date (IST) | Post | Format | CTA |
|---|---|---|---|
| Tue 06 Oct · published | Founding Website ₹999 + GST (₹1,178.82) | Carousel ×4 | DM "WEBSITE" |
| Wed 07 Oct · 18:52 | Free website check: 6 things we check | Carousel ×4 | DM "CHECK" |
| Thu 08 Oct · 18:52 | CA & accounting firms + concept demo | Carousel ×3 | DM "CHECK" |
| Fri 09 Oct · 18:52 | Clinics & dentists + concept demo | Carousel ×3 | DM "CHECK" |
| Sat 10 Oct · 18:52 | All prices, out in the open | Single image | DM "PRICE" |
| Sun 11 Oct · 18:52 | Real-estate agents + concept demo | Carousel ×3 | DM "CHECK" |
| Mon 12 Oct · 18:52 | Gyms & cafés: "a listing isn't a website" | Carousel ×4 | DM "CHECK" |

**How it publishes:** a daily routine (18:52 IST, Oct 7–12) publishes that day's row from `posts.json` through Windsor. If Instagram gets linked in Metricool first, the routine checks Metricool's schedule so nothing is posted twice. Captions point to WhatsApp and the site, so they work before the bio link is fixed.

**Why 18:52:** there's no best-time data yet (4 followers, zero reach). Early evening is a reasonable default for SMB owners; revisit after week 1 using reach by post.

**Daily 10-minute routine for Sahil** (DMs aren't exposed by any connector):
- Reply to every "WEBSITE" / "CHECK" / "PRICE" DM the same day, using `docs/sales/SALES_PLAYBOOK.md` §4. Ask for their link and WhatsApp number.
- Log each DM lead in `/admin.html` (source `instagram`) or the Command Center sheet.
- Like or comment on 5 posts from the §5 prospect accounts *before* DMing them, so the DM isn't cold.

## 4. Measurement

- Bio link and captions carry `utm_source=instagram`; `/admin.html` attributes leads by source.
- Per-post reach, saves, shares and profile visits can be read from Windsor (`media_reach`, `media_saved`, `media_shares`, `media_profile_visits`).
- Week-1 targets: 7 posts live, profile fixed, ≥3 DM conversations, ≥1 free check delivered. Optimise for conversations, not reach.

## 5. Gurugram prospect list (private)

25 Gurugram businesses (6 CA, 6 dental, 4 real estate, 3 recruitment, 3 gyms, 3 cafés; 13 have no working website), each with an observed issue, a first-touch angle and an Instagram DM template, are in a private Google Doc in Sahil's Drive: "Xender Instagram Prospects, Gurugram — 2026-10-06 (PRIVATE, XEND-IG-001)" (<https://docs.google.com/document/d/1g_inZfoGPSqW63qhc4RmayPO_n-TVOhO9QZFjIukOxY/edit>, owner-only access). It is deduplicated against the LinkedIn thread's doc (XEND-LI-001) and the 11 businesses already emailed on 2026-10-05/06.

Rules for whoever sends (ChatGPT or Sahil):
- Re-open the site on a phone before sending. Only send if the issue is still there.
- Max 5 first touches a day, highest priority first. One channel per prospect per day.
- Instagram DMs: Sahil sends them by hand from the business account (no connector can). Email: ChatGPT via Gmail, label "Xender Prospects", log in the Command Center sheet, include an opt-out line.
- Stop at the first "no".
- MIS stages: sourced → contacted → replied → qualified → preview → proposal → won/lost → cash collected.

## 6. Limits

- No connector can send Instagram DMs, so outbound DMs are manual (Sahil).
- Windsor publishes immediately, so the daily posts depend on the routine running. If a day is missed, run that row the next morning instead of posting twice in one day.
- Image URLs point at `raw.githubusercontent.com` on this branch (the repo is public). After merge they also resolve on `main`.
