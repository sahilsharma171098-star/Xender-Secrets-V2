# Windows developer setup (XEND-LOCAL-SETUP-001, Issue #43)

Reproducible offline baseline for `C:\Users\T14\Xender\Xender-Secrets-V2`. Nothing in this guide
deploys, logs in to Cloudflare, or touches production data. Use PowerShell (not Git Bash) unless noted;
call `npm.cmd`/`npx.cmd` if PowerShell's execution policy blocks `npm.ps1`. Do not change the
execution policy machine-wide for this.

## 1. Tools (free)

| Tool | Why | Install (user scope where possible) |
|---|---|---|
| Node 22 (CI parity) | `.nvmrc` = 22 | `winget install Schniz.fnm`, then `fnm install 22; fnm use 22` (Node 24 can stay installed) |
| Git | repo | `winget install Git.Git` |
| GitHub CLI | issues/PRs | `winget install GitHub.cli`, then `gh auth login` (browser flow; never paste tokens) |

Python/uv are **not** needed: the repo has no Python code. Install them only if another tool needs them.

For fnm, add to your PowerShell profile so the version follows `.nvmrc` automatically:

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
```

## 2. Line endings (one time per clone)

`.gitattributes` forces LF for text files because tests and generators compare bytes. A clone made
before `.gitattributes` landed still has CRLF files. With no uncommitted work (commit or stash first):

```powershell
git rm --cached -r -q .
git reset --hard
```

`npm run doctor` reports any CRLF files it finds.

## 3. Install and check

```powershell
npm.cmd ci                    # wrangler + the pinned Playwright package
npm.cmd run setup:browsers    # Chromium build matching that Playwright version
npm.cmd run doctor            # PASS/WARN/FAIL per prerequisite, read-only
npm.cmd run verify:local      # every offline suite + one summary table
```

`verify:local` runs `test`, `check:novels`, `check:pages`, `extension:lint`, `extension:test` and
`test:worker`. Run a subset with `npm.cmd run verify:local -- --only=test,check:pages`.

Not part of the offline baseline: `tests/xender-live-e2e.mjs` and `npm run seo:audit` hit the live
site (the E2E submits real leads), so they run in GitHub Actions only.

## 4. Run the site locally

```powershell
npm.cmd run dev               # http://127.0.0.1:8787, offline
```

- No Cloudflare login and no remote calls: it uses `tests/worker/wrangler.test.jsonc` (production
  config minus the remote-only AI binding). Durable Objects are local SQLite in `.wrangler\state`.
- Translation uses the non-AI fallback.
- Admin routes need a local token: `Copy-Item .dev.vars.example .dev.vars` (git-ignored). Use local
  test values only; never copy production secrets into it.
- `npm.cmd run dev:remote-ai` runs the real `wrangler.jsonc`. It needs `npx wrangler login` and
  spends the account's Workers AI allowance, so only use it to debug AI translation.

Stop the server with Ctrl+C. If a `workerd.exe` survives (e.g. the terminal was closed), end it with
`taskkill /IM workerd.exe /F`.

## 5. Known Windows pitfalls already fixed in the repo

- CLI entry-point guards compared `import.meta.url` with `file://` + argv path, which never matches
  `C:\...`, so `check:novels`, `build:novels` and `seo:audit` exited 0 without doing anything.
  They now use `scripts/lib/is-main.mjs` (guarded by `tests/unit/is-main.test.mjs`).
- The worker test uses `taskkill /T /F` on Windows (no POSIX process groups).
- Extension e2e derives the unpacked extension id from the UTF-16 path Chromium uses on Windows.
- `spawn EPERM` seen in an earlier session came from that session's sandbox. Do not weaken Windows
  Defender / Controlled Folder Access to work around it; if it appears in a normal terminal, allow
  `node.exe` for the repo folder in Controlled Folder Access instead.

## 6. Production boundary

Production deploys come from Cloudflare Workers Builds when `main` changes; every pushed branch gets
a non-production preview build. Merging a PR therefore deploys. Never run `npm run deploy` or
`wrangler deploy` from a workstation.
