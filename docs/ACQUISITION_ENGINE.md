# Xender Acquisition Engine

Task: XEND-ACQ-001

## Objective

Build a zero-new-spend acquisition loop that focuses Xender on businesses with clear, verifiable website improvement opportunities.

The operating loop is:

Discover -> Review -> Prioritize -> Personalized first touch -> Focused preview -> Proposal -> Close -> Deliver

## Discovery

Use no-cost sources first:
- Apollo free organization lookup for company/domain discovery.
- Public search and local business research.
- Existing Xender inbound leads and referrals.

During the zero-spend sprint, paid Apollo search and enrichment are out of scope unless Sahil explicitly approves the stated credit cost.

## Site review

The repository now includes a deterministic reviewer for locally saved HTML:

    npm run review:site -- /path/to/page.html

It checks visible implementation signals including:
- title and meta description
- mobile viewport
- H1 structure
- structured data
- direct contact channels
- high-intent calls to action
- unfinished placeholder copy
- raw image filenames exposed as headings
- insecure form actions

The score is a triage score. It is not a promise of SEO rankings, traffic, leads, revenue, accessibility compliance or Core Web Vitals performance.

## Qualification rule

Prioritize a company when:
- the issue is visible and reproducible,
- the site has an obvious commercial customer action,
- the problem is material enough to justify a focused preview,
- Xender can plausibly fix it quickly.

Skip strong sites when there is no specific problem. Do not send a generic redesign pitch merely because a company appears in a prospect database.

## Outreach standard

Every first touch must be based on an issue actually observed on the public website.

Do not:
- invent performance results,
- claim guaranteed rankings or revenue,
- fabricate clients or testimonials,
- send large batches of identical messages,
- bypass provider limits or safety controls.

When a prospect is interested, create one focused before/after preview tied to the observed issue before proposing a larger build.

## Public repository data rule

This repository is public. Do not commit active prospect email addresses, exported CRM lists, private notes, credentials, tokens or account data.

Live prospect records belong in the connected CRM/email system. GitHub should contain process, code, aggregate operating status and non-sensitive implementation notes.

## Measurement

Track:
- organizations discovered,
- sites reviewed,
- qualified opportunities,
- first touches sent,
- replies,
- positive replies,
- previews delivered,
- proposals sent,
- wins/losses,
- booked revenue,
- collected revenue,
- source and vertical.

The sprint optimizes for qualified conversations and collected revenue, not raw message volume.

## No-website prospect finder (XEND-ACQ-002)

For local SMBs the visible issue is simpler: they have customers searching for them on Google Maps but no website at all.

1. **Find (laptop):** `npm install --no-save playwright@1.57.0 && npx playwright install chromium` once, then
   `node scripts/prospecting/find-no-website.mjs --file scripts/prospecting/queries.gurugram.txt`
   It opens a visible Chromium window, scans each search, skips every listing that shows a Website link, and saves the rest to `prospects-out/` (JSON + CSV, git-ignored). Add `--upload` with `XENDER_ADMIN_TOKEN` set to push straight to the MIS, or import the JSON from `/admin` later.
2. **Prioritise (`/admin` → Prospects):** de-duplicated by phone; score 0–100 favours many reviews, high rating and a +91 mobile (WhatsApp-able). No phone = score 0.
3. **First touch:** "WhatsApp" opens a prefilled, permission-first message (asks before sending anything, offers an opt-out) and marks the prospect `messaged` with a follow-up in 2 days. Daily cap: 25, with a warning beyond it.
4. **Preview:** "Build preview" opens `/preview-builder` prefilled from the listing (clinic, gym, café/restaurant, CA/consultant, property categories). Saving links the `/p/<id>` back to the prospect and switches the WhatsApp template to the "with preview" version.
5. **Convert:** a `replied`/`interested` prospect becomes a `qualified` lead (source `outbound`, campaign `maps-prospecting`) so it counts in pipeline and revenue. The daily scorecard now fills found/messaged/replies automatically.

Limits: Google's terms do not permit automated collection from Maps, so the finder stays low-volume (human-paced, ~25 listings per query, stops on any robot check, no proxies/CAPTCHA solving). Only public business-listing facts are stored. Never bulk-send identical messages; respect every "No".
