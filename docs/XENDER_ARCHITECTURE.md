# Xender Secrets V2 — Architecture

## Repository
`sahilsharma171098-star/Xender-Secrets-V2`

Default branch: `main`

## Frontend
The production frontend is primarily static HTML/CSS/JavaScript under `public/`.

Observed areas include:
- home and services
- website/business template catalogs
- frontend/backend/full-stack sample demos
- account/auth UI
- community and ideas
- articles/resources
- shop/catalog
- novels and reader
- localized website-development landing pages

## Backend
Primary backend entry point: `src/index.js`

It runs as a Cloudflare Worker and contains API/business logic for the application.

Observed backend capabilities include:
- account/session/authentication logic
- catalog/demo data
- country/currency handling
- translation utilities
- application/community/content state

## Cloudflare configuration
`wrangler.jsonc`:
- Worker name: `xender-secrets-v2`
- Main module: `./src/index.js`
- Static asset directory: `./public`
- Worker runs first for `/api/*`
- Workers AI binding: `AI`

Durable Objects:
- `APP_STATE` -> `AppState`
- `COMMUNITY_INDEX` -> `CommunityIndex`
- `CONTENT_THREAD` -> `ContentThread`

These Durable Objects use SQLite storage.

## Translation
The Worker currently contains translation logic using a Google Translate endpoint first, with a Workers AI model fallback where applicable. Any changes should preserve graceful fallback behavior and avoid silently returning incorrect translations.

## Deployment
`package.json` exposes:
- `npm run deploy` -> `wrangler deploy`
- `npm run import:novels` -> authorized novel import script

Production URL referenced by the repository E2E workflow:
`https://www.xendersecrets.com`

## Testing
GitHub Actions workflow:
`.github/workflows/xender-live-e2e.yml`

It runs Playwright-based live E2E checks against production for selected frontend/backend changes.

## Architecture principles
- Keep static presentation in `public/` where practical.
- Keep API/server-side logic in the Worker.
- Avoid duplicating business logic across many HTML pages.
- Preserve mobile responsiveness.
- Treat authentication/session and Durable Object changes as high-risk.
- Prefer incremental, reviewable migrations rather than large rewrites.

## Novel reader (see `docs/READER_ARCHITECTURE.md`)
- Catalog and Project Gutenberg chapters: pre-generated static JSON in `public/novel-data/`
  (built by `scripts/build-novel-data.mjs` via the "Build static novel data" workflow).
- XperimentalHamid partner chapters: Worker route `/api/reader/xh/*` (`src/reader/`), edge-cached.
- Render `xender-reader-stable` (`reader-server.js`): automatic fallback and rollback only.

## Growth / lead / MIS layer (XEND-WARROOM-001) — see `docs/DATA_MEASUREMENT_PLAN.md`
- `src/growth.mjs`, called first inside `AppState.fetch`; tables `growth_leads`, `growth_daily`, `growth_lead_log`, `growth_rate`.
- Routes: `POST /api/lead`, `POST /api/event`, `/api/admin/*` (Bearer `ADMIN_TOKEN` secret).
- Main fetch intercepts `/api/lead` to send the optional Telegram alert via `ctx.waitUntil`.
- Browser: `public/xs-growth.js` (all pages), `public/admin.html` (private MIS).
- Local dev: `wrangler.local.jsonc` (gitignored, AI binding removed) + `.dev.vars` with a local ADMIN_TOKEN.
