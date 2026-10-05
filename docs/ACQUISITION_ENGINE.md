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
