# Xender Secrets — pre-cleanup recovery record (2026-10-22)

## Status and protection
- Owner requested "complete first, then backup and delete unused setups".
- DO NOT delete services, secrets, DNS, databases, workflows or channels based solely on their names.
- Today's safety fix: AutoTube PR #2 merged to main (`1c4075be515bbc406999a858f7a8df6084f195f0`), 27/27 offline checks passed. Queue remains disabled; daily workflow schedule unchanged.
- HQ-01 PR #63 merged to main (`ac0de475136afce6db1351e4387bfe82c7c4a4f4`), Cloudflare Worker build succeeded, Render static site reported LIVE, homepage and /api/health worked. Full E2E was cancelled, not passed.
- Old PRs #46 and #57 were closed as superseded by #63, not deleted; their source branches remain.

## Code snapshots
- Xender-Secrets-V2: `backup/2026-10-22-pre-cleanup`, initial commit `ac0de475136afce6db1351e4387bfe82c7c4a4f4`.
- autotube: `backup/2026-10-22-pre-cleanup`, initial commit `7df0a3ec7eb89122b0b53f0e13a4ee0b89408c24`.
- xender-amazon-spapi: `backup/2026-10-22-pre-cleanup`, initial commit `0b998b2c9d634fda913be340c513b634cc1e9ee5`.
- Google Sheet "Xender Command Center" (17 tabs) copied to "BACKUP 2026-10-22 — Xender Command Center — pre-cleanup" (Drive id `13puO-_aDDTudcr0n5WWaY7qpVHPSy0nO1kK_GUk7LhU`).

## Render service metadata backup
See `ops/backups/render-services-2026-10-22.json` on this backup branch. This is a configuration inventory, NOT a full data/secrets backup.

| Render service | ID | Recommendation |
| --- | --- | --- |
| xender-reader-stable | srv-db1mvi60tbcc73bkch4g | KEEP; documented live reader fallback/rollback |
| xender-reader-api | srv-db111nqd0e5s73djlr70 | CANDIDATE for retirement; verify no dependencies, traffic and secrets, then reversible suspension observation |
| xender-secrets-web | srv-db10u5tg1s2s738229mg | CANDIDATE for retirement; canonical site is Cloudflare Worker, but prove no direct links/referrals/DNS dependencies |
| xender-amazon-spapi | srv-davm9mpsrm7s73ci8u60 | KEEP unless Amazon workflow ownership and dependencies are separately audited |

Render traffic metrics and request logs were empty for this query window, so they do NOT prove lack of usage.

## Other cleanup candidates
- Facebook novel series workflow: disabled; preserve history and production settings, inspect whether any new publisher depends on it.
- AutoTube reviewed Shorts trial workflow: disabled (branch-specific); keep code and published video IDs in records.
- Old LinkedIn trigger: disabled; leave recoverable until owner validates replacement.
- PRs #46/#57: CLOSED as superseded; neither merged nor source branch deleted.

## Blocking integrations
- HQ-02: `EXPORT_TOKEN` must be configured as a Cloudflare Worker Secret (never commit to GitHub). Google Apps Script OAuth is blocked; installer/triggers cannot be completed through current connector. Verify read-only route scope, cursor replay, and no lead loss before activation.
- YT-03: queue `publish_queue.enabled: false`; named `--by` is NOT independently authenticated approval. Need durable, identity-backed approval; Episode Studio laptop manifest audit; final shared host/workflow concurrency. Do not auto-enable uploads.
- Full Xender production E2E was cancelled after the merge; it has not passed as a post-merge check.

## Deletion safety gate
Before deleting any identified item:
1. Record exact resource ID, owner, repo, region, environments, dependencies and current DNS/traffic use.
2. Preserve code, config, required secret names (never values in repo), relevant environment values in a secure owner-controlled vault, databases and persistent assets.
3. Verify recovery from that backup, then disable/suspend only the exact redundant resource, observe health and rollback path, and review with owner.
4. Delete ONLY if no active dependency, rollback is documented, and owner has approved that exact set of IDs.
5. The available Render connector does not expose suspend/delete actions. No Render service was deleted.

## Rollback
- Git: restore a known good commit/branch from the protected backup. A Git branch snapshots code, not databases or encrypted secrets.
- Command Center: work from the preserved original Sheet; the copy is a rollback snapshot, not live CRM.
- AutoTube: keep new queue off until tests, current daily uploader scheduling continues.
- Render: do not tear down the stable reader fallback or Amazon service.

Recorded from connected GitHub, Google Drive and Render metadata on 2026-10-22.
