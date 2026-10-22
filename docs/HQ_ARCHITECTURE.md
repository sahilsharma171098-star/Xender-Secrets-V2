# Xender HQ architecture: Worker-first (XEND-HQ-01)

Decided by Sahil on 2026-10-22. Branch `claude/xend-hq-01-integration`. This replaces the
competing designs in PR #46 (XEND-OS-003, Command Center as CRM) and PR #57 (XEND-HQ-001,
Worker `/admin` as CRM). Neither PR is merged as-is; this branch carries the parts of each that fit.

## Who owns which fact

| Fact | Owner (source of truth) | Others |
|---|---|---|
| Inbound website enquiries (`/api/lead`) | **Cloudflare Worker** → `growth_leads` in the AppState SQLite Durable Object | Command Center gets a read-only copy |
| Lead stage, quote, collected revenue for website leads | Worker `/admin` | copied to the Command Center on the next import |
| Outbound prospects found by the laptop finder | Worker `/admin` (prospects list) | — |
| Cold-email outreach (Lead Hunt), approvals, suppression, touch history | **Command Center** (private Google Sheet: `OS Approvals`, `OS Suppression`, `OS Touches`, `OS Audit`) | — |
| Cross-business task queue | Command Center `OS Tasks` (Apps Script lease controller) | `docs/TASKS.md` indexes technical work |
| Code, SOPs, decisions | GitHub | — |

Reason: Apps Script OAuth for the Command Center is blocked today. If the website depended on the
Sheet, a blocked or broken script would lose leads. The Worker already stores every lead
without any Google dependency.

## Data flow

```
Website form ──POST /api/lead──▶ Worker (growth_leads)  ◀── /admin (Sahil)
                                      │
                         GET /api/admin/export/leads?after=<cursor>   (EXPORT_TOKEN, read-only)
                                      ▼
              Apps Script LeadImport.gs (every 15 min) ──▶ Command Center "Website Leads" tab
                                      │                                + OS Audit row per page
                         POST /api/admin/export/ack  (audit only: export lag)
```

One way only. Nothing in the Sheet writes back into the Worker. If a website lead turns into
outreach work, the Command Center creates its own outreach record and keeps the Worker lead ID
(`inbound_id`) as the link.

## Export contract (src/lead-export.mjs)

- **Feed:** `GET /api/admin/export/leads?after=<seq>&limit=<1-200>&consumer=command-center`
  returns `{ok, after, next_after, has_more, head_seq, items:[{seq, lead_id, version, lead}]}`.
  `lead` has the columns in `EXPORT_COLUMNS` (no internal notes). Test leads are never exported.
- **Queue:** on every read, each `(lead_id, updated_at)` pair not yet queued gets a new, strictly
  increasing `seq` (`UNIQUE(lead_id, version)`). No write path has to remember to enqueue.
- **Deduplication:** the importer upserts by `lead_id` and skips an entry when the stored
  `export_seq` is the same or newer.
- **Retry:** the importer moves its cursor only after the rows are written. Network errors, 429 and
  5xx are retried 3 times with backoff; a rejected token stops at once. A crash replays the same
  page and the rows are skipped, not duplicated. A cursor ahead of the feed (for example after a
  Durable Object reset) gets HTTP 409 `cursor_ahead`, so the run fails visibly instead of stalling.
  Added after the 2026-10-22 audit.
- **Audit:** the Worker logs every read and ack (`growth_export_log`). The importer writes one
  `OS Audit` row per page. `GET /api/admin/export/status` shows the lag per consumer.
- **Auth:** `EXPORT_TOKEN` (new, optional Worker secret, 24+ chars) can read the three export routes and
  nothing else. `ADMIN_TOKEN` also works. Never store `ADMIN_TOKEN` in Apps Script.

## Outreach policy (src/outreach-policy.mjs)

One file holds the limits for both systems:

- **Email:** 5 a day, 15 minutes apart (LEAD-02, approved 2026-10-22). `operations/outreach-gate.mjs` now
  rejects any email when the sender's history is missing or unreadable. That includes sends already made
  today with no `last_sent_at`.
- **One approval = one message** (audit 2026-10-22): the caller passes `pacing.used_approval_ids` (from
  `OS Touches.approval_id`). An approval that is already used, or marked `used_at`, is rejected, even after
  the 24h per-lead cooldown.
- **WhatsApp:** manual from `/admin`, existing cap of 25 first messages a day. The gate allows
  *automated* WhatsApp only with recorded opt-in.
- **All channels:** two unanswered follow-ups maximum, and one contact per lead per 24 hours.

Open decision for Sahil: cold WhatsApp to publicly listed business numbers is still allowed by hand
at 25 a day. The #46 SOP says a public business number is not WhatsApp opt-in. Lower the cap or keep
it; it is one number in `src/outreach-policy.mjs`.

## What came from each PR

| Kept | From | Notes |
|---|---|---|
| Command Center schema, Apps Script lease controller `Queue.gs`, outreach preflight gate + tests, SOPs in `docs/operations/`, SEO inventory check, operations CI | #46 | gate now uses the shared policy and pacing |
| Daily lead queue `src/pipeline.mjs`, auto follow-up dates, `followed_up` touches, "Aaj ka plan" card in `/admin`, digest preview/send buttons, AI-failover handoff (`ops/`, `GEMINI.md`, `npm run ops:handoff`), `PROJECTS.md` | #57 | |
| **Not carried** | | |
| n8n polling workflow | #46 | n8n is being retired; Apps Script triggers do the polling |
| Dated reels note `REELS-2026-10-10.md` | #46 | stale content plan |
| `services/amazon-spapi/` copy | #57 | the connector lives in its own repo (`xender-amazon-spapi`) and Render deploys from there; a second copy would drift |
| Worker cron `triggers` in `wrangler.jsonc` + `scheduled()` | #57 | production change; needs Sahil's separate approval. The digest can still be sent from `/admin` |

## Rollout (each step needs Sahil's approval; nothing here is live yet)

1. Review and merge this PR. The merge deploys the Worker. Changes are additive: two new
   SQLite tables and new admin-only routes; no existing route changes behaviour.
2. Cloudflare: add Worker secret `EXPORT_TOKEN` (32+ random chars). Sahil does this in the
   dashboard; nobody pastes it into chat or the repo.
3. Command Center → Extensions → Apps Script: add `LeadImport.gs` and the updated
   `appsscript.json` (two new scopes: external requests and triggers). Set Script Properties
   `OS_SHEET_ID` and `XENDER_EXPORT_TOKEN`. Authorize. This is the step that is blocked today.
4. Run `importWebsiteLeads` once by hand, then compare the "Website Leads" tab with `/admin`.
   Then run `installLeadImportTrigger`.
5. Optional, separate approval: Worker cron for the morning Telegram digest.

## Rollback

- Before merge: close the PR and delete the branch. `main`, PR #46 and PR #57 are untouched.
- After merge: revert the merge commit. The two new tables are inert if unused; there is no destructive migration.
- Importer: delete the Apps Script trigger. Rows already copied stay in the Sheet. Delete the
  `LEAD_EXPORT_CURSOR` property to re-import from the start.
- Remove `EXPORT_TOKEN` to close the feed to the importer immediately.
