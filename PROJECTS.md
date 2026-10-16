# Xender HQ — project registry

This repository is the single home for everything Xender Secrets builds and runs (XEND-HQ-001).
Every project lives in a folder here, every AI agent works from the same files, and every change
goes through a branch + PR. Start with `AGENTS.md`, then the project's own README.

| Project | Department | Folder | Runs on | Status |
| --- | --- | --- | --- | --- |
| xendersecrets.com website + API | Development | `public/`, `src/`, `scripts/commercial/` | Cloudflare Workers (free) | live |
| Admin MIS (leads, prospects, previews, today's plan) | Sales / MIS | `public/admin.html`, `src/growth.mjs`, `src/prospects.mjs`, `src/pipeline.mjs` | same Worker, behind `ADMIN_TOKEN` | live |
| Lead pipeline automation | Sales | `src/pipeline.mjs`, cron in `wrangler.jsonc` | Worker cron 08:45 IST → Telegram | needs Telegram secrets |
| No-website prospect finder | Customer acquisition | `scripts/prospecting/` | Sahil's laptop (Playwright, manual runs) | ready |
| Agent-Reach research setup | Customer acquisition | `scripts/prospecting/agent-reach-research.mjs`, `docs/AGENT_REACH_XENDER.md` | Sahil's laptop | in review |
| Client preview builder (`/p/<id>`) | Sales | `public/preview-builder*`, `src/growth.mjs` | same Worker | live |
| Xender SiteCheck browser extension | Product | `extension/` | Chrome / Edge / Firefox stores | in review |
| Xender Screen Recorder (Firefox add-on) | Product | not in this repo yet — source is on the laptop | addons.mozilla.org (`xender-screen-recorder`) | submitted 2026-10-16, awaiting AMO review |
| SEO tooling (link normaliser, live audit, IndexNow) | Marketing | `scripts/seo/`, `.github/workflows/seo-live-audit.yml`, `indexnow.yml` | GitHub Actions | live |
| Web novel reader + data build | Content | `public/reader*`, `src/reader/`, `scripts/build-novel-data.mjs` | Worker + static JSON | live (subdomain move pending) |
| Facebook novel campaign | Marketing | `scripts/facebook-novel-campaign.mjs`, `marketing/novels/` | GitHub Actions | live |
| Amazon SP-API connector (Xender Seller Manager) | Commerce | `services/amazon-spapi/` | Render free (still deploys from the old repo) | moved here, see its README |
| Claude Code executor (`@claude` on issues/PRs) | Development | `.github/workflows/claude-code.yml` | GitHub Actions | live |
| AI failover handoff | HQ | `ops/`, `scripts/ops/handoff.mjs`, `GEMINI.md` | any laptop with git | ready |
| Laptop projects (`~/Xender`, `~/source`) and n8n workflows | — | `projects/`, `automation/n8n/` (to be added) | — | **waiting for folder access** |

## Rules that apply to every project

- This repository is **public**. Never commit `.env` files, API keys, tokens, cookies, n8n
  credentials, customer or prospect phone numbers, or anyone's personal contact details.
  Secrets live in Cloudflare / Render / GitHub settings; lists of people stay in the admin
  database or in git-ignored local folders (`prospects-out/`).
- No paid tools, APIs, hosting or ads until first revenue unless Sahil approves the spend.
- Live changes outside the repo (sending messages, publishing posts, Amazon listing create/patch,
  payments) need Sahil's explicit yes. Drafting and validating them does not.
- Demos and concepts are labelled as such; never invent clients, results or testimonials.

## Adding a project

1. Put it in its own folder (`projects/<name>/` for standalone apps, `services/<name>/` for
   backend services, `automation/<tool>/` for workflow exports) with a README that says what it
   does, how to run it and where it is deployed.
2. Run a secret scan on it before the first commit (see `ops/FAILOVER.md` → "Before you commit").
3. Add a row to the table above and a task to `docs/TASKS.md`.
