# Xender AI-team operating system — XEND-OS-003

Owner: Sahil. Version: 2026-10-09. Business timezone: Asia/Kolkata; machine timestamps: UTC ISO 8601.

## Open these first

- [Private Command Center](https://docs.google.com/spreadsheets/d/1TVMZP-EHE_1yqXk4H8huIaIKZtxsudgWvSNHf8VV2TY/edit): operational task queue, leads, touch history, approvals, suppression, content and metrics.
- [Private Notion hub](https://app.notion.com/p/3f433cd168c481728d67d794a722fe14): navigation and human instructions; no mirrored live statuses.
- GitHub: versioned SOPs, code, task branches, PR review and release evidence.
- Existing `/admin` growth CRM: inbound website enquiries. Keep its ID as `inbound_id` when creating a private operational lead. There is currently no deployed synchronization bridge.

## Three businesses, six functions

Website development sales/delivery and Instagram content are active lanes. Amazon seller is RESERVED / NOT_DEFINED: no automation, listing edits, inventory changes or spend. Existing development, acquisition, sales, revenue, MIS and admin functions continue inside these lanes.

## One record owns each fact

`OS Tasks` is the cross-business queue. `docs/TASKS.md` is the technical implementation index; old Development sheet rows are historical references. Use the same stable task ID in GitHub, handoff and Sheet. Do not create competing statuses in Notion. Existing Leads stays authoritative for contact identity; the added columns hold outreach controls. Touch history is in `OS Touches`; opt-outs in `OS Suppression` override all channels. No private contacts in commits, issues, CI artifacts or public logs.

## Team protocol

| Role | Work | Handoff |
|---|---|---|
| ChatGPT/Codex | coordination, evidence-based research, CRM drafts, review, implementation where useful | task ID, claim token, artifact, checks, blocker, next owner |
| Claude Pro/Code | multi-file implementation, debugging and tests | task branch + PR; read AGENTS.md and CLAUDE.md |
| Gemini Pro/Antigravity | source-backed research, storyboard variants, independent review | cited artifact + factual uncertainties |
| n8n | authenticated polling, due-work reminders and explicit record transport | request ID, result ID, error/retry evidence |
| Sahil | approvals, pricing, client commitments, account auth and releases | approval tied to exact action/content/account |

Chat subscriptions are interactive sessions, not API credits or continuously running workers. No direct chat synchronization is assumed. An authenticated runner must explicitly claim a task, read linked artifacts and write a handoff. Existing Claude GitHub workflow is owner-triggered and requires its OAuth secret; this setup does not invoke it. Gemini/Antigravity handoffs are manual until a supported authenticated runner is configured. Do not send private contacts to substitute models without permission.

## Queue and approvals

States: READY → IN_PROGRESS → REVIEW → DONE; BLOCKED requires reason, unblock action and owner. Claim holds a 30-minute lease, refreshed before expiry. A fresh token fences out a stale worker; only the owner/token may update. Expired work can be reclaimed, not blindly marked DONE. A resource key prevents simultaneous edits of the same repo branch or artifact. Handoff clears the lease. REVIEW is not production release or send approval.

Scripts use Apps Script ScriptLock to serialize mutations. All automated queue writers must use the installed script. Direct connector/Sheet edits bypass its lock: until installed, Sahil is the sole dispatcher. Configure sheet protections for machine columns. Sheets is not a transactional database: script audit records intent before mutation and commit afterward; an interrupted intent requires human reconciliation before replay. Audit rows must not be deleted or rewritten; owners can still edit Sheets, so this is an operational log, not tamper-proof evidence.

Approvals bind exact recipient/account, channel, content hash, expiry and approver. Changed copy/assets invalidate approval. Sending uses provider receipts and a unique touch ID; uncertain timeout goes to manual reconciliation, never automatic resend. Permanent suppression wins over approval. Task approval cannot authorize outreach. Drafts/research/checks are allowed; sensitive account changes, public posts, outreach, deployments, destructive actions and spending require specific approval. Scripts in this kit do not send or publish.

## Daily / weekly

09:30 IST: check replies, bounces and opt-outs before due follow-ups; review queue and claims. Research up to five well-qualified prospects per market pilot, not a sending quota. Produce one reel draft and one sales artifact. 18:00: record provider receipts, blockers, cash versus booked revenue and content metrics. Friday: review funnel by country/source, opt-outs, delivery capacity, cost and content experiments; choose next week's priorities.

Start with [sales SOP](SALES.md), [content SOP](CONTENT.md), [SEO checklist](SEO.md), [integration setup](INTEGRATIONS.md) and [access evidence](ACCESS.md). Do not treat older state documents as proof of live account configuration.
