# Claude Repo + Funnel Audit — XEND-AUDIT-001 / XEND-WARROOM-001

Date: 2026-10-06 · Auditor: Claude · Base: `main` @ `e0b2e68`
Scope: the revenue path (homepage → offer → enquiry → follow-up → payment), lead/backend handling, measurement, CI. Reader/novel/translation were **not** re-audited (covered by PR #16).

Only findings actually observed are listed. "Fixed" means fixed on branch `claude/xend-warroom-001-revenue-engine`.

## P0 — directly blocked first revenue

| # | Finding | Evidence | Status |
|---|---|---|---|
| P0-1 | Homepage did not say who it is for, what it costs or what to do next. No prices, no offer, no form — only generic "websites and digital systems" copy and WhatsApp links. | `public/index.html` @ e0b2e68; live page fetched 2026-10-06 matched. | **Fixed** — new homepage with ICP, offer ladder, proof, process, FAQ, lead form. |
| P0-2 | Services enquiry form told successful visitors it **failed**. Handler calls `e.currentTarget.reset()` after `await fetch`; `currentTarget` is `null` by then, the TypeError is caught and its message is shown instead of the success text. The lead *was* saved, but the visitor sees an error. | inline script at end of `public/services.html` @ e0b2e68. | **Fixed** — form moved to shared handler `public/xs-growth.js`. |
| P0-3 | Enquiries went into a black hole: `/api/lead` wrote to the `leads` table but nothing could read it (no admin route, no export, no notification). | `src/index.js` AppState `/api/lead`; no SELECT on `leads` anywhere. | **Fixed** — `/api/admin/*` (ADMIN_TOKEN), `public/admin.html`, CSV export, optional Telegram alert. Requires Sahil to set the secret (see action queue). |
| P0-4 | The public CRM demo (`demo-backend-crm.html`) posted to the **same** real `/api/lead`, mixing demo submissions with real prospects. | `public/demo-backend-crm.html`. | **Fixed** — demo submissions are flagged `test:true`, hidden from MIS by default. |

## P1 — high impact

| # | Finding | Status |
|---|---|---|
| P1-1 | No measurement at all: no page views, no CTA/WhatsApp click counts, no source attribution on leads. Impossible to answer "which channel works". | **Fixed** — `src/growth.mjs` + `xs-growth.js` (aggregate, first-party, GPC/DNT respected). |
| P1-2 | Contact page had only links (WhatsApp/email/LinkedIn), no form — visitors without WhatsApp at hand had no low-friction path. | **Fixed** — form added. |
| P1-3 | Claude Code Executor (`.github/workflows/claude-code.yml`) fails every run: `CLAUDE_CODE_OAUTH_TOKEN` secret is empty (diagnosed in Issue #9 comment 2026-10-05; latest failing run 37408068586 on 2026-10-06). Issues #9–#13/#15 were never executed by it. | **Open — Sahil action** (set the repo secret) or keep using a Claude session like this one. |
| P1-4 | No lead-form backend protection: no rate limit, no honeypot, no input normalisation. | **Fixed** — per-connection rate limit (salted daily IP hash), honeypot, phone/URL normalisation, size limits, CSV formula-injection guard. |
| P1-5 | Business email is a personal Gmail on public pages. Lowers trust for B2B buyers. | **Open** — free fix: Cloudflare Email Routing `hello@xendersecrets.com` → Gmail (Sahil, dashboard). |

## P2 — should fix during the sprint

- Inner pages (`style.css`) still use the older dark-first visual language and a different header/nav from the new homepage. Next DEV pass: shared header/footer partial + light tokens on services, industry and city pages.
- `services.html` mixes the website offer with AI workflows, lead research, CX/knowledge systems — dilutes the hero offer. Recommend moving non-website services below the fold or to a single "Custom work" block.
- Chat widget in `script.js` greets in Hinglish and leads with Shop/Novels; on commercial pages it should lead with "Free website check" and WhatsApp.
- The `AppState` Durable Object is a single global instance holding users, sessions, orders, demo data and now leads. Fine at current traffic; revisit if traffic grows (shard events into their own DO).
- Repo root contains legacy `index.html`, `contact.html`, `demo-*.html` that are **not** served (assets dir is `public/`). Source of confusion for agents; remove after confirming nothing references them.

## P3 — later

- Shop/commerce endpoints (`/api/store/*`, `/api/quote` with shipping) are a dormant track; keep but don't surface on commercial pages.
- No OG image for social shares (LinkedIn/WhatsApp previews show no image). Add one 1200×630 static image.
- SEO-001 (sitemap freshness, internal links, structured data on industry/city pages) not audited in this pass.

## What is healthy

- Production Worker answers `/api/health`; live homepage matched `main`.
- Live E2E (run 37328281004) green after PR #16 fixes; reader data checks pass.
- Auth/session code uses PBKDF2, HttpOnly/Secure cookies and an origin check on non-GET requests — untouched by this work.
