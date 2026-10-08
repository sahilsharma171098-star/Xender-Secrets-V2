# Xender Builder — AI website builder (XEND-BUILDER-001)

Public URL: `https://www.xendersecrets.com/builder` (landing) · `/builder/studio` · `/builder/projects` · `/builder/pricing`

## What it is
Prompt → AI writes a static HTML/CSS/JS site → sandboxed live preview (desktop / tablet / mobile) →
chat edits that only touch the files they need → code editor → version history → ZIP export →
"launch it for me" lead funnel. It does **not** generate or run backends, databases, logins or payments.

## Architecture
| Piece | File | Notes |
|---|---|---|
| AI adapter | `src/builder/ai.mjs` | Provider list + fallback, retry with backoff, per-attempt timeout, response validation, token/neuron accounting. Mock provider for tests only (refuses production hosts). |
| Prompts / output protocol / sanitiser | `src/builder/output.mjs` | `=== FILE: name ===` protocol. Edits return `=== EDIT: name ===` SEARCH/REPLACE blocks (or a full FILE for new/rewritten files), applied exactly or indentation-insensitively; an edit that doesn't match counts as invalid output and is retried. The first live check showed full-file edits of a 16 KB page took over 150 s on GLM-4.7-Flash, so patches are the default. Prompt policy blocks phishing/malware/brand-login asks. |
| Generation route (Worker) | `src/builder/routes.mjs` | `POST /api/builder/generate`, `POST /api/builder/projects/:id/edit`. Streams NDJSON progress. AI runs in the stateless Worker, never in the DO. Also sets CSP/isolation headers for `/builder*` pages. |
| Storage, ownership, quotas, spend guard | `src/builder/store.mjs` | Runs in the existing `AppState` Durable Object (SQLite). Additive `builder_*` tables only. |
| ZIP | `src/builder/zip.mjs` | Dependency-free STORE zip. |
| Frontend | `public/builder.html`, `public/builder/*` | No framework, no CDN. `compose.mjs` builds the preview document; `highlight.mjs` is the editor highlighter. Prices in `pricing-config.js`. |
| Admin | `public/admin.html` → `GET /api/admin/builder` | Usage, neurons, failures, recent generations (needs `ADMIN_TOKEN`). |

### API
`GET /api/builder/status` · `GET /api/builder/projects` · `GET|PATCH|DELETE /api/builder/projects/:id` ·
`POST …/:id/duplicate` · `POST …/:id/restore {version}` · `GET …/:id/versions/:n` · `GET …/:id/export` (zip) ·
`POST /api/builder/claim` (move guest projects into the signed-in account) · `POST /api/builder/generate` · `POST …/:id/edit`.

### Ownership
Signed-in: owner `u:<user id>` from the existing `xs_session` cookie (same accounts as `/account`).
Guests: owner `g:<sha256 of an HttpOnly xs_bguest cookie>`. Every query filters by owner. Signing in from
the builder dialog claims that browser's guest projects.

## Free-first AI and cost protection
Provider order (`configuredProviders`):
1. Workers AI `@cf/zai-org/glm-4.7-flash` (primary) — 5,500 input / 36,400 output neurons per M tokens.
2. Z.ai `glm-4.7-flash` — **only if** a `ZAI_API_KEY` Worker secret exists (Z.ai lists it as free; not enabled today, terms/quotas to be verified by Sahil before adding a key).
3. Workers AI `@cf/qwen/qwen3-30b-a3b-fp8` (fallback) — 4,625 / 30,475 neurons per M tokens.
Rates verified against Cloudflare's pricing page on 2026-10-08. Workers AI includes **10,000 free neurons/day** (reset 00:00 UTC). On the Workers Free plan usage beyond that simply fails; on Workers Paid it would bill $0.011 / 1,000 neurons — the guard below keeps the builder under the free allocation either way.

Spend guard (`store.mjs`):
- Each AI request first **reserves** its worst case (`BUILDER_REQUEST_NEURON_CAP`, default 1,200) against today's builder budget (`BUILDER_DAILY_NEURON_BUDGET`, default 8,000 = 80% of the free 10,000, leaving room for the reader's translation fallback). If the budget can't cover another worst-case request, generation pauses until 00:00 UTC and the UI offers the done-for-you service instead.
- The Worker stops retrying/falling back before an attempt could exceed the reservation; a model that times out (150 s) is not retried but falls through to the next one, a request has a 270 s overall deadline, and a timed-out stream is charged an estimate for what it produced; output is capped at 12,000 tokens; AI edits are refused for projects > 140 KB (bounds the input).
- After the call the reservation is settled with the real token usage (or a conservative estimate if the provider reports none). Abandoned reservations expire after 5 minutes and are charged at the cap.
- Per-visitor limits: guests 3/day, accounts 12/day, 15/day per IP, 1 concurrent generation, 3 guest / 25 account projects. Failed generations are refunded to the visitor (the budget still pays).
- Kill switch: Worker variable `BUILDER_ENABLED=false`.
All limits are Worker variables (`BUILDER_*`), no code change needed.

## Preview security
- Preview = `<iframe sandbox="allow-scripts allow-forms allow-modals">` **without** `allow-same-origin` → opaque origin: no Xender cookies, storage, or same-origin API access; `parent.document` is blocked.
- The frame document (`/builder/frame`) has its own CSP: `connect-src 'none'`, `form-action 'none'`, `base-uri 'none'`, scripts only inline or from jsDelivr/unpkg/cdnjs/Tailwind CDN, frames only Google Maps/YouTube/Vimeo. The generated site is written into that document, so the CSP applies to it.
- Builder app pages: `script-src 'self'`, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `noindex` (except `/builder` and `/builder/pricing`).
- Generated code is never executed server-side; it is parsed as text, sanitised (no `<base>`, meta refresh, `javascript:` URLs, `<object>/<embed>`, non-allow-listed external scripts/iframes) and size/name-validated before storage.
- Provider keys never reach the browser (`/api/builder/status` only lists provider ids/models).
- Same-origin check on generation POSTs; internal reservation routes (`/__builder/*`) are reachable only from the Worker.

## Migrating to `builder.xendersecrets.com`
All builder pages use absolute `/builder/...` and `/api/builder/...` paths, and the API is cookie-scoped. To move:
add a Worker route for `builder.xendersecrets.com/*`, map `/` → `/builder` there, and keep `/api/*` on the same
Worker. For a stronger preview boundary, serve `/builder/frame` from a separate host (e.g. `preview.xendersecrets.com`)
and change the iframe `src` — no other code change is needed because the frame already talks only via `postMessage`.

## Tests
- `tests/unit/builder.test.mjs` — adapter (fallback/retry/timeout/budget/usage), protocol, sanitiser, prompt policy, ZIP (checked by Python's `zipfile`), quotas, spend guard, ownership isolation, lifecycle, admin, streaming route, headers, composer, highlighter.
- `tests/worker/builder-worker.test.mjs` — the same flows through real workerd + Durable Object (mock AI) and regression checks for existing pages/APIs.
- `tests/builder-studio.test.mjs` — Chromium with production CSP: landing → studio → preview, sandbox isolation, device switcher, chat edit, code edit, in-preview navigation, undo, export, dashboard, quota UX, lead capture, pricing regions, mobile layout, dark mode.
- `tests/builder-live.mjs` + `.github/workflows/builder-live.yml` — **real** generation with the configured provider against the PR preview (automatic on PRs touching the builder) or any URL (manual), with screenshots and generated files as artifacts.
