# Xender Secrets — Deep QA Report

**Site:** https://www.xendersecrets.com · **Code checked:** `main` @ `402fa8c` · **Date:** 2026-10-06

## Summary

- **Links:** 429 unique links checked on production, **0 broken**. The only non-200 was LinkedIn (999), which LinkedIn returns to all automated clients. All 50 sitemap URLs return 200.
- **Pages:** 77 page variants crawled on desktop and mobile. There are **no JavaScript crashes** on any page.
- **Tools and features:** 35 flows exercised. **5 high-priority** and **6 medium-priority** problems were found (listed below).
- **Repo test suite:** 51/51 tests pass (31 unit + 20 browser).

**How it was tested.** This sandbox's network can't reach xendersecrets.com directly, so the work ran in two places:

1. **Production, read-only.** A crawl and feature checks ran from GitHub Actions on branch `claude/qa-deep-check`. `main` was not changed. No forms were submitted, no posts were made and no test data was created on production.
2. **Local copy of the same code.** The flows that write data ran against `wrangler dev` with the same code. That covers lead forms, sign-up and login, community posts, ideas, shop checkout, bookings and admin.

---

## P1 — High priority (fix first)

### 1. Community posts and Ideas show an error even though they were published
- **Where:** `/community` (new discussion) and `/ideas` (share an idea)
- **What the user sees:** The server saves the post (`201`), but the form shows the message *"Cannot read properties of null (reading 'reset')"*. The form doesn't clear, the feed doesn't refresh, and the new thread doesn't open. Users will think it failed and post again, which creates duplicate posts.
- **Cause:** `e.currentTarget.reset()` runs *after* an `await`. By then `currentTarget` is `null`. The same line appears in `public/community.js` and `public/ideas.js`.
- **Fix:** Capture the form before the await (`const form = e.currentTarget;`), then call `form.reset()`.
- **Verified:** Locally, on both pages. Production runs the same code, but nothing was posted there.

### 2. Reader "Translate chapter" fails on production
- **Where:** `/reader` → pick a language → Translate (tested on *Journey to the West*, chapter 1)
- **Result:** `POST /api/translate` returns **502** with "Translation is temporarily unavailable". A one-line translation works (`"Hello world"` → Hindi returned fine), so the failure is specific to chapter-sized requests. `translateBatch` throws inside `src/index.js`.
- **Next step:** Check the Worker logs for the thrown error. It is likely an AI model limit or timeout on long blocks. Chunk the text smaller, or fall back per block instead of failing the whole chapter.
- **Tested:** One novel and one language only.

### 3. Admin/MIS is locked on production, so leads can't be read
- `/api/admin/report` → `503 admin_token_too_short`. The `ADMIN_TOKEN` Worker secret is shorter than 24 characters.
- This was already known in `docs/CURRENT_STATE.md` and is **still open**. Leads are being stored safely but can't be viewed.
- **Action (Sahil):** Set `ADMIN_TOKEN` to a random value of 32+ characters in Cloudflare.

### 4. The site is served over plain HTTP, and the apex domain doesn't redirect
- `http://www.xendersecrets.com/` → **200 OK**, with no redirect to HTTPS and no HSTS header. That means lead forms can be submitted unencrypted.
- `https://xendersecrets.com/` → **200** (no redirect to `www`), so the same content exists on two hosts. Canonical tags limit the SEO damage, but this should still be fixed.
- **Action (Sahil, Cloudflare dashboard):** Turn on SSL/TLS → *Always Use HTTPS*, add a redirect rule from apex to `www`, then enable HSTS.

### 5. The 404 page is completely blank
- Any mistyped or outdated URL returns `404` with an **empty body** (a white page, with no navigation and no way back).
- **Cause:** `wrangler.jsonc` sets `not_found_handling: "404-page"`, but there is no `public/404.html`.
- **Fix:** Add a `404.html` with the site header, a short message, and links to Home, Services and WhatsApp.

---

## P2 — Medium priority

### 6. Header overflows on 18 older pages at normal desktop widths, and "Community" appears twice in the menu
- **Pages:** `/articles` and all 13 article pages, `/community`, `/ideas`, `/novels`, `/faq`, `/resources`, `/account`
- At 1280px the page is 1450px wide. It scrolls sideways and the **Contact** button is cut off (see [header-overflow-1280.png](/mnt/project-files/qa/header-overflow-1280.png)). The same happens at 1440px.
- "Community" appears twice in the header on 25 pages. `public/script.js` injects a Community link and only checks for its own `.community-nav-link` class, not for an existing `community.html` link.

### 7. Social login and Email OTP are shown but don't work
- `/api/auth/providers` on production reports `google, github, facebook, x, otp` all **false**. The four "Continue with…" buttons and the Email OTP tab are visible on `/account`, but clicking them only shows "still needs its server credentials".
- **Decision:** Either connect the providers, or hide the buttons until they work (recommended, because dead buttons hurt trust).

### 8. The cost calculator shows foreign-currency prices to non-Indian visitors
- From a US location, `/website-cost-calculator` shows estimates like **"$72.63 – $103.76"**. That conflicts with the decision in `CURRENT_STATE.md` to stop converting ₹ prices and show the US$299 anchor to international visitors instead.

### 9. The commerce demo quote ends with "undefined"
- `/demo-fullstack-commerce` → Get quote shows *"Subtotal ₹278 · Shipping ₹49 · Total ₹327 · **undefined**"*.
- **Cause:** `/api/quote` doesn't return the `note` field that the page prints. This is visible on a portfolio demo shown to prospects.

### 10. The "Back to catalog" link on three demos points to a section that no longer exists
- `/demo-gym`, `/demo-local` and `/demo-pro` link to `/index.html#catalog`. The redesigned homepage has no `#catalog` section, so visitors land at the top of the homepage. It should point to `/website-catalog`.

### 11. The auth demo overflows on mobile
- `/demo-backend-auth` is 455px wide on a 390px phone, so it scrolls sideways.

---

## P3 — Low priority / polish

12. **Console error on every page for logged-out visitors.** `/api/auth/me` returns `401` on about 45 pages, which logs an error in the browser console each time. This noise hides real errors. Returning `200 {user:null}` would fix it.
13. **Novels search looks like it does nothing.** It only filters the A–Z directory below the fold, while "New Novels" and "Popular" stay unchanged.
14. **The wrong-password message on `/account` can disappear.** On production the API returned the error in 306ms, but the message was blank. The startup session check (`showAuth()` → `switchTab()`) clears it if that check finishes later. People typing normally will rarely hit this.
15. **Internal links still use `.html`.** Each one costs a 307 redirect: about 165 template and sample links, plus the navigation on the older pages.
16. **Some pages have no meta description or `<h1>`.** These are `/reader`, `/sample-preview`, `/template-preview`, `/demo-gym`, `/demo-local`, `/demo-pro` and `/preview-builder`.
17. **CTA buttons with no link.** `/template-preview` and `/sample-preview` opened without an `?id=` show "Customize / Get This Website" buttons that go nowhere.

---

## What works

- **Links and routing:** All 50 sitemap URLs return 200. There are 0 broken internal or external links. Mumbai/Bangalore/Hyderabad/Pune redirect (301) to the India page. `.html` URLs redirect (307) to the clean URL.
- **Lead capture (home, contact, services):** Validation blocks empty submits. The package buttons preselect the offer. Submitting shows the reference number and the "Send on WhatsApp" step.
- **Mobile menu and theme toggle:** Both work on all commercial pages, and the dark theme persists after reload.
- **Tools:**
  - The website cost calculator updates the estimate and the WhatsApp link.
  - The preview builder updates its live draft, and saving is correctly blocked without the admin token.
  - The chat assistant replies.
- **Catalogs:** The website catalog grids render and all 60 sample links open. Business templates: search, all 5 filters, "Load more" and template preview work.
- **Shop:** Filters, search, cart and checkout all work (the order saved locally).
- **Novels:** The list loads, the reader opens chapter 1, Next chapter works, and font and theme controls work.
- **Accounts:** Register, dashboard, logout and login all work locally.
- **Demos:** Booking (slots and confirmation), CRM lead, auth demo login, API explorer, SaaS tasks, store cart and filters, and the SaaS pricing toggle all work.
- **Admin (with a valid token, locally):** Leads, report, the "Copy daily scorecard" button and CSV export work.

## Suggested fix order

1. Items 1, 5, 6, 9 and 10 are small code changes that can go in one PR.
2. Items 3 and 4 are Cloudflare settings that only Sahil can change.
3. Item 2 needs the Worker logs.
4. Items 7 and 8 are product decisions: hide or connect the social login, and how the calculator should show currency.

## Re-running these checks

The crawler and feature checks are in `qa/` on branch `claude/qa-deep-check`, and the workflow is `.github/workflows/qa-deep-check.yml`. Pushing to that branch re-runs everything read-only against production and commits the results to `qa/results/`. The branch isn't merged into `main` and can be deleted at any time.

<!-- recheck 2026-10-06T10:42:14Z: admin token reported set by Sahil -->
