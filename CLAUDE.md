# Claude Instructions — Xender Secrets V2

Before coding, read:
1. `AGENTS.md`
2. `docs/XENDER_ARCHITECTURE.md`
3. `docs/CURRENT_STATE.md`
4. `docs/TASKS.md`

## Working style
- Inspect the repository and relevant files before making changes.
- Follow the existing architecture unless the task explicitly calls for an architectural change.
- Use a dedicated branch and prepare a PR for review.
- Do not modify `main` directly.
- Keep changes production-ready and backwards-compatible.
- Run applicable tests. If a test cannot be run, state exactly why.
- Never invent that a test, deployment, or browser check passed.
- Do not commit secrets or local credentials.
- Keep `public/` static pages compatible with the Cloudflare Worker asset setup.
- Treat `src/index.js` as production backend code; make security-sensitive changes conservatively.
- Respect the content-authorization rule in `AGENTS.md`.

## Current architecture cues
- Static frontend/assets: `public/`
- Cloudflare Worker backend: `src/index.js`
- Deployment config: `wrangler.jsonc`
- Durable Objects use SQLite storage
- Worker AI binding: `AI`
- Production live E2E workflow: `.github/workflows/xender-live-e2e.yml`
- Production URL used by E2E: `https://www.xendersecrets.com`

## Completion format
At the end of each task, provide:
- Task ID
- Branch and PR
- Files changed
- Implementation summary
- Tests/checks
- Risks/limitations
- Anything ChatGPT should specifically review
