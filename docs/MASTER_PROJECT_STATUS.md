# Xender Secrets — Master Project Status

Single entry point for the state of every Xender product. Detailed history stays in `docs/TASKS.md`,
`ops/HANDOFF.md` and `docs/CURRENT_STATE.md`; this file only records what was **verified**, with evidence.
Backlog: `docs/MASTER_PENDING_TASKS.md`. Gates: `docs/RELEASE_GATES.md`. Money: `docs/REVENUE_TRACKER.md`.
Session log: `docs/EXECUTION_LOG.md`.

Status words: **VERIFIED COMPLETE** (observed working in production), **CODE COMPLETE** (merged or on a
branch with passing tests, not proven live), **DEPLOYMENT PENDING**, **TESTING PENDING**, **BLOCKED**,
**NOT STARTED**. "Unverified" means nobody in this session could observe it — not that it is broken.

Last updated: 2026-11-03 by Claude (session `session_01FXbkRsKDMFoegtCxmLPPw6`).

## Access this session actually had (2026-11-03)

| System | Access | Consequence |
| --- | --- | --- |
| GitHub `Xender-Secrets-V2` (public) | read (clone, public REST API) — **no write**: session token invalid, repo not attached | could test and commit locally; could not push, comment, merge |
| GitHub `autotube` (private) | none via API (404); local laptop checkout only | AutoTube state not verified |
| Cloudflare | Workers list/metadata only (deprecated bindings MCP) | no deploy, no secrets view, no Durable Object namespace list |
| www.xendersecrets.com | blocked by this session's egress allowlist | production state taken from GitHub Actions live gate, not direct probes |
| Chrome Web Store dashboard | Claude in Chrome failed to connect | store status unverified |
| Laptop (ThinkPad, Windows) | `~/Xender`, `~/source/repos`, `~/.gemini/antigravity/scratch` granted | local repos and GridSnip source inspected |

## Product map

| Product | Canonical source | Runs on | Verified state (evidence) | Status |
| --- | --- | --- | --- | --- |
| Website + API | this repo `public/`, `src/` | Cloudflare Worker `xender-secrets-v2` | main `1faa0a4` served in production: "Xender Live E2E" run 41485101193 — *Wait for Cloudflare to serve this commit* ✓, *Verify SiteCheck Pro route…* ✓, *Run live Xender E2E* ✓. Worker last modified 2026-11-02 16:51 UTC | VERIFIED COMPLETE (for what the E2E covers) |
| SiteCheck Pro backend (₹499 PayU) | `src/payu-*.mjs`, `src/sitecheck-license.mjs` | same Worker | live gate asserts `/api/payu/config` → `release=sitecheck-pro-v2.0.0`, `checkoutEnabled=false` for anonymous; `/sitecheck-pro` serves release meta. **No real payment ever observed.** | TESTING PENDING (real ₹499 canary) |
| SiteCheck PR #96 (canary email gate) | branch `feat/sitecheck-payu-private-canary-20261102` @ `12c2f2c` | — | GitHub: mergeable=clean; *Offline checks* ✓, *sitecheck-rc* ✓; Cloudflare preview build ✗ (Durable Object namespace quota, 99/100). Locally re-run: unit 137/137, browser 26/26, extension 28/28 + lint, worker 4/4, ops 40/40 | CODE COMPLETE, owner decision |
| SiteCheck lost-callback recovery | branch `claude/sitecheck-payu-recovery-20261103` @ `708e876` (local, not pushed) | — | unit 136/136 (+1 new), browser 26/26; merges cleanly with PR #96 (138/138) | CODE COMPLETE, push pending |
| SiteCheck extension | `extension/` | Chrome/Edge/Firefox | manifests at **2.0.0** in `extension/dist/*`; extension tests 28/28, lint ✓. Store listing/approval **unverified** this session | DEPLOYMENT PENDING |
| GridSnip OCR | **not in HQ**: laptop `~/.gemini/antigravity/scratch/gridsnip_extension` (v1.0.0) + `gridsnip-release.zip` | Chrome Web Store draft (item `flejimiajadjeghbjcgkonenbiikaeif`) | Source read: free tier sends placeholder `YOUR_GEMINI_API_KEY` without a user key; "$14 Unlimited" paywall verifies Gumroad with placeholder `YOUR_PRODUCT`; cropped screenshot goes to Google Gemini (must be disclosed) | BLOCKED — do not submit |
| AutoTube | private repo `autotube`; laptop checkout `~/Xender/autotube` | GitHub Actions | laptop checkout is a **detached HEAD at `origin/lab-out/final-biryani`** with untracked `autotube/` and `final_720p.mp4`; remote state not readable here | unverified |
| Lead pipeline / Command Center | `src/pipeline.mjs`, `operations/` | Worker + Google Sheets | per PROJECTS.md: daily cron not enabled; Apps Script importer inactive | BLOCKED (owner OAuth / approval) |
| Instagram cross-post | AutoTube + Windsor | — | TASKS.md XEND-IG-CROSSPOST-001 IN_PROGRESS | unverified |
| Shopify (`xendersecrets.myshopify.com`) | Shopify | Shopify | not audited this session | NOT STARTED (this backlog) |
| International payments (PayU USD/GBP, PayPal, Stripe) | — | — | not audited this session; PayU international approval must not be assumed | NOT STARTED (this backlog) |
| Screen Recorder (Firefox) | `projects/screen-recorder/` (pending) | AMO | submitted 2026-10-16 per PROJECTS.md; review result unverified | unverified |
| Claude Code executor | `.github/workflows/claude-code.yml` | GitHub Actions | recent runs on main: *skipped*; TASKS.md says OAuth secret missing | BLOCKED |

## Open pull requests in this repo (2026-11-03, public API)

20 open. Payment-critical: **#96**. Docs/registry only: #94, #88, #87, #86, #85, #83, #81, #73. Older feature
or WIP branches needing a keep/close decision: #79, #72, #71 (WIP footer), #59, #58, #44 (Razorpay persistence),
#41, #29, #27 (superseded SiteCheck branch?), #24, #23. Disposition is tracked as MT-120 in the backlog; nothing
was merged or closed in this session.

## Infrastructure risks observed

- **Durable Object namespaces 99/100** (reported in PR #96 handoff from build `ab36ba2b…`): every PR preview
  that declares the three DO classes fails. Not re-measured here (no tool access). Cleanup needs owner
  authorization after ownership/data review.
- Local `~/Xender/Xender-Secrets-V2` checkout is on `main` at `ebc6646` (PR #84) — **behind origin**, which
  already has #89, #92 backend and the freshness gate. Fetch before any local work.
