# Reader architecture — XEND-READER-001

Status: implemented on branch `reader-static-edge` (PR). Render kept as automatic fallback and rollback.

## 1. Diagnosis

What `reader-server.js` (Render) actually does per user request:

| Route | Work per request | Needs a runtime? |
|---|---|---|
| `/gutenberg/catalog`, `/gutenberg/novel` | returns a hard-coded object | **No** — constant data |
| `/gutenberg/chapter` | downloads a 1–3 MB public-domain `.txt` from gutenberg.org (6 h in-memory cache, lost on every Render sleep), regex-splits the **whole book**, returns one chapter | **No** — the source never changes; the result is deterministic |
| `/xh/catalog`, `/xh/novel` | fetches the partner's index page, parses ~600 links into chapter ranges (1 h cache) | Only to refresh metadata; the ranges change rarely |
| `/xh/chapter` | fetches one partner post (WordPress), isolates one chapter | **Yes**, unless prose is stored (see §4) |
| `/xh/catalog-scan`, `/books`, `/book`, `/health` | admin/legacy; not used by the site | No |

So 4 of the 5 user-facing operations do no real dynamic work. The cold-start problem was not
"Render is slow" so much as "a sleeping server is in the path of data that never changes".

Measured CPU of the shared parsers (Node, synthetic pages sized like the real ones —
`node /tmp/bench/bench.mjs`, see PR):

| Operation | CPU |
|---|---|
| Split a ~0.9 MB Chinese Gutenberg book (real books are 1–3 MB) | ~10 ms (→ 20–40 ms real) |
| Parse a partner index page (~230 KB, ~600 links) | ~8 ms |
| Isolate one chapter from a ~120 KB partner post | ~2.5 ms |

Cloudflare Workers Free allows 10 ms CPU per request, so: whole-book Gutenberg parsing must not
run per request (→ pre-generate), index parsing should not run per request (→ prebuilt
metadata + edge cache), single-chapter isolation is fine in a Worker.

Also found:
- `novels.html` fallback list linked to Gutenberg slugs that don't exist (`dream-red-chamber`,
  `romance-three-kingdoms-vol-1`), so while Render was asleep those cards opened "Novel not found".
- Catalog/chapter fetches to Render had no timeout and no user-visible "waking up" state.

Not wrong: the Render workaround (`xender-reader-stable`, auto-deploy off) correctly stopped the
deploy churn. It just can't fix cold starts on the free tier without ping hacks.

## 2. Target architecture

```
Browser
  ├─ /novels.html, /reader.html ─────────► Cloudflare static assets (free, no Worker invocation)
  ├─ /novel-data/catalog.json ───────────► static (generated)
  ├─ /novel-data/gutenberg/<slug>/*.json ► static, 10 chapters per file (public domain)
  ├─ /novel-data/<slug>/* (imported) ────► static (existing authorized-import pipeline)
  ├─ licensed-novels.js ─────────────────► static (lazy-loaded data already in repo)
  ├─ /api/reader/xh/{novel,chapter} ─────► Cloudflare Worker (src/reader/api.mjs)
  │       index: /novel-data/xh/<slug>/index.json (metadata only) → else live-built, edge-cached 6 h
  │       chapter: partner WordPress post → isolate → edge-cached 24 h (Cache API)
  ├─ /api/translate ─────────────────────► Cloudflare Worker (unchanged)
  └─ fallback only on error ─────────────► Render xender-reader-stable (unchanged, rollback)

GitHub Actions (on demand) ─ scripts/build-novel-data.mjs ─► commits public/novel-data
```

## 3. Options evaluated

| Option | Cold start | Limits that matter here | Verdict |
|---|---|---|---|
| Keep Render free, tune config | 30–60 s after ~15 min idle | sleeps by design; only fix is pinging (rejected) or paid plan | Keep only as fallback |
| Whole reader API → Worker, unchanged logic | none | 10 ms CPU: per-request book parsing (20–40 ms) would hit error 1102 | No — wrong place for the CPU |
| **Static pre-generation (Gutenberg + catalog)** | none (CDN) | assets free & not metered as Worker requests; 25 MiB/file, 20k files | **Yes** |
| **Worker for XH only + edge cache** | none | ~2.5 ms CPU/chapter; fetch wait is not CPU; 100k req/day free | **Yes** |
| Cloudflare Pages/Functions | none | same runtime/limits as Workers; would split one deploy into two | No benefit — already on Workers static assets |
| Deno Deploy | low | another account/platform, another deploy path, outbound IP blocking risk same as Render | More moving parts for no gain |
| Store XH prose statically in the repo | none | **repo is public**; permission documented in code is to republish *on Xender* | Not done — needs Sahil's confirmation (see §6) |
| KV / R2 for chapter storage | none | KV free writes 1k/day; R2 needs a payment method on file | Not needed; Cache API is free |

## 4. Why not commit XH chapters too?

It would remove the last runtime dependency, but this repository is public: committing
~6,000 partner chapters makes them downloadable from GitHub, which is broader than "republished on
Xender with permission". The builder therefore stores only the chapter-range index for XH. If the
partner confirms that mirroring the text is fine, add a `--xh-chapters` mode to the builder (same
chunk format as Gutenberg) and XH becomes fully static too.

## 5. Operations

- Rebuild data: Actions → "Build static novel data" → Run workflow (defaults to
  `--all --parity https://xender-reader-stable.onrender.com --samples 3`). It commits
  `public/novel-data/**` and `reports/novel-data-build.json`.
- Offline check (CI): `node scripts/build-novel-data.mjs --check`.
- Tests: `node --test tests/unit/*.test.mjs` and `node --test tests/reader-sources.test.mjs`.
- Source policy: identifying User-Agent, backoff on 429/5xx, stop on 401/403. No proxies,
  header spoofing or CAPTCHA handling. A blocked source is reported, not worked around.

## 6. Open decisions for Sahil

1. Confirm whether XperimentalHamid's permission covers storing the text in a public repo
   (unlocks fully static XH). Until then XH stays Worker + edge cache + Render fallback.
2. After 1–2 weeks with `x-reader-backend`/fallback rate looking healthy, suspend the Render
   service (keep `reader-server.js` in git as the rollback).

## 7. Rollback

- Fastest (one line, frontend only): in `public/reader.html` set `READER_PRIMARY="render"`.
  `novels.html` already falls back to Render automatically if `novel-data/catalog.json` is missing.
- Full: revert the PR merge commit. Render was never changed, so it is immediately the only backend again.
