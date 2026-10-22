# Xender HQ — project registry

This file is the map of everything Xender Secrets builds and runs (XEND-HQ-001, updated for XEND-HQ-01 on 2026-10-22).
Most projects live in this repository; a few keep their own repo on purpose (listed below). Every change
goes through a branch + PR. Start with `AGENTS.md`, then the project's own README. Architecture: `docs/HQ_ARCHITECTURE.md`.

| Project | Department | Folder | Runs on | Status |
| --- | --- | --- | --- | --- |
| xendersecrets.com website + API | Development | `public/`, `src/`, `scripts/commercial/` | Cloudflare Workers (free) | live |
| Admin MIS (leads, prospects, previews, today's plan) | Sales / MIS | `public/admin.html`, `src/growth.mjs`, `src/prospects.mjs`, `src/pipeline.mjs` | same Worker, behind `ADMIN_TOKEN` | live |
| Lead pipeline automation | Sales | `src/pipeline.mjs`, `src/outreach-policy.mjs` | same Worker; digest sent from `/admin` | daily cron not enabled (needs approval) |
| Website-lead export to Command Center | Sales / MIS | `src/lead-export.mjs`, `operations/apps-script/LeadImport.gs` | Worker feed + Apps Script trigger | Worker feed deployed via #63/#64; importer inactive (EXPORT_TOKEN + Apps Script OAuth pending) |
| Command Center (outreach, approvals, suppression, task queue) | Sales / Admin | private Google Sheet; `operations/` schema, `Queue.gs`, outreach gate | Google Sheets + Apps Script | Sheet live; Apps Script OAuth blocked |
| Free faceless YouTube course | Customer acquisition | `public/faceless-youtube-course.html`, `src/youtube.mjs` | same Worker | live |
| AutoTube (faceless YouTube channel pipeline) | Content / acquisition | own repo `autotube` | GitHub Actions, 2 runs a day | YT-01 + shared quota merged; owner-signature/reservation guards merged in AutoTube #3; queue disabled |
| No-website prospect finder | Customer acquisition | `scripts/prospecting/` | Sahil's laptop (Playwright, manual runs) | ready |
| Agent-Reach research setup | Customer acquisition | `scripts/prospecting/agent-reach-research.mjs`, `docs/AGENT_REACH_XENDER.md` | Sahil's laptop | in review |
| Client preview builder (`/p/<id>`) | Sales | `public/preview-builder*`, `src/growth.mjs` | same Worker | live |
| Xender SiteCheck browser extension | Product | `extension/` | Chrome / Edge / Firefox stores | in review |
| Xender Screen Recorder (Firefox add-on, built with ChatGPT) | Product | `projects/screen-recorder/` (pending — CQ-021) | addons.mozilla.org (`xender-screen-recorder`) | submitted 2026-10-16, awaiting AMO review |
| SEO tooling (link normaliser, live audit, IndexNow) | Marketing | `scripts/seo/`, `.github/workflows/seo-live-audit.yml`, `indexnow.yml` | GitHub Actions | live |
| Web novel reader + data build | Content | `public/reader*`, `src/reader/`, `scripts/build-novel-data.mjs` | Worker + static JSON | live (subdomain move pending) |
| Facebook novel campaign | Marketing | `scripts/facebook-novel-campaign.mjs`, `marketing/novels/` | GitHub Actions | workflow disabled 2026-10-22 (no Facebook credentials; it never posted) |
| Amazon SP-API connector (Xender Seller Manager) | Commerce | own repo `xender-amazon-spapi` | Render free | live; key check unverified; lane reserved |
| Claude Code executor (`@claude` on issues/PRs) | Development | `.github/workflows/claude-code.yml` | GitHub Actions | live |
| AI failover handoff | HQ | `ops/`, `scripts/ops/handoff.mjs`, `GEMINI.md` | any laptop with git | ready |
| Laptop projects (trading bots, episode studio, website copies) | — | not in any repo yet | Sahil's laptop | **audit pending** (folder access) |

## Rules that apply to every project

- This repository is **public**. Never commit `.env` files, API keys, tokens, cookies, n8n
  credentials, customer or prospect phone numbers, or anyone's personal contact details.
  Secrets live in Cloudflare / Render / GitHub settings; lists of people stay in the admin
  database or in git-ignored local folders (`prospects-out/`).
- No paid tools, APIs, hosting or ads until first revenue unless Sahil approves the spend.
- Live changes outside the repo (sending messages, publishing posts, Amazon listing create/patch,
  payments) need Sahil's explicit yes. Drafting and validating them does not.
- Demos and concepts are labelled as such; never invent clients, results or testimonials.

## Shared entry point

Sahil requires all future ChatGPT/Codex and Claude builds to be registered here. Follow [docs/BUILD_HOME.md](docs/BUILD_HOME.md) before implementation. Reuse canonical sources and deployments; add links for private repositories rather than copying them into this public HQ.

## Adding a project

1. Put it in its own folder (`projects/<name>/` for standalone apps, `services/<name>/` for
   backend services, `automation/<tool>/` for workflow exports) with a README that says what it
   does, how to run it and where it is deployed.
2. Run a secret scan on it before the first commit (see `ops/FAILOVER.md` → "Before you commit").
3. Add a row to the table above and a task to `docs/TASKS.md`.
