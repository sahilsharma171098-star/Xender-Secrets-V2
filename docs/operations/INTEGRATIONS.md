# Activation and integration runbook

## Already connected vs prepared

The private workbook and Notion hub are real. Apps Script and n8n files are prepared, not deployed or running. No automated external sends, posts, lead imports from production or autonomous model dispatch are active. ScriptLock only controls requests to one installed script; Sheet API writes and human cell edits bypass it.

## Install the queue controller (Sahil account auth required)

1. Open Command Center → Extensions → Apps Script. Copy `operations/apps-script/Queue.gs` and the manifest; review scopes. This grants spreadsheet access; authorize in Google's UI, never paste a credential in chat.
2. Set Script Properties `OS_SHEET_ID` to the existing Command Center ID, `OS_APPROVER_EMAIL` to Sahil's actual authenticated approver email, and `OS_ACTOR_TOKENS` to a JSON map of unique random 32+ character tokens per runner (`codex`, `claude`, `gemini`, `n8n`). Store runner tokens in credential vaults, never Sheets/Git. Do not reuse ADMIN_TOKEN.
3. Deploy a web app using the least-public access supported by your runner. If externally accessible as owner, the actor token authenticates every request; no GET endpoint. Use HTTPS; rotate keys and restrict sharing. Apps Script quota/availability is not an SLA. For sensitive multi-user scale, migrate to a transactional private backend.
4. Protect OS Tasks machine columns and OS Audit; only owner/script edits. Integrations must never write task statuses directly through Sheets. Sahil's review menu marks REVIEW → DONE; machine tokens cannot mark DONE. READY/BLOCKED recovery and new task creation are owner-dispatched in this first version.
5. Test on a copy with synthetic tasks: competing claims, same-resource claims, expiry/reclaim, stale token rejection, heartbeat version, handoff, failed audit intent and authorization. No contact records are required. Inspect intent/commit pairs before retries; interrupted writes require reconciliation.

## Runner payload contract

POST JSON: `actor`, secret `token`, `action`, unique `request_id`, `task_id`; updates also carry `lease_token` and current `version`. Claim returns token/version. Heartbeat every 10 minutes during active work. Handoff carries `status` REVIEW/BLOCKED, `artifact_url`, `next_action`, optional `blocker`. Always inspect response `ok`; ContentService returns application errors in an HTTP 200 envelope. Do not log request bodies containing tokens.

Read queue/artifact → claim → do authorized work → heartbeat → attach evidence → handoff. Human interactive ChatGPT/Claude/Gemini sessions receive this packet explicitly. GitHub PR is the code handoff; no subscription UI scraping or invented chat bus. Existing `claude-code.yml` uses an owner trigger and OAuth secret, with usage limits; credential validity/remaining quota needs verification before invoking. No paid API calls are included.

## n8n

Import `operations/n8n/queue-poll.json` into an existing/self-hosted instance. Workflow is inactive and starts with a Manual Trigger. Choose a Generic Auth credential of type Custom Auth with JSON `{"body":{"actor":"n8n","token":"<secret>"}}`; the HTTP node adds only `action:list`. Supply the deployed Apps Script URL in the node. Test manually and inspect `ok` before enabling any schedule. Polling is read-only; it does not dispatch AI sessions or send messages. Add claim/heartbeat/handoff nodes only around an authenticated explicit runner. Never retry an ambiguous mutation without checking the audit. Use n8n's supported credential encryption and disable saving successful executions that carry sensitive payloads.

## Contact and publishing integrations

Gmail historical sent records have been reconciled. No sends authorized by this setup. For any future approved send, check exact target/content hash/expiry against OS Approvals and suppression immediately before provider call; save receipt in OS Touches. Unknown provider result → HOLD/reconcile, never automatic resend. A published business phone number does not opt someone into WhatsApp.

`operations/outreach-gate.mjs` is a tested preflight reference, not a deployed security boundary. A future sender must read the latest private identity, approval and suppression rows from trusted storage, bind `lead.target` to the verified contact and authenticate the human approval. It must not trust agent-supplied approval objects. No sender is included in this change.

Instagram account `xande_r5955` and LinkedIn company `Xender Secrets` were returned by the social connector. Verify these are the intended accounts, inspect supported write actions, obtain exact post approval, then publish via supported API/native scheduling. Facebook has no connected account in that inventory. Do not infer permissions from an installed plugin.

Telegram community requires human Telegram login, approved group name/privacy and optional BotFather setup. The existing website lead-alert code is a separate feature; don't send prospect details to a public group. Notion hub remains private; sharing requires a named destination/approved members.

## Costs and optional tools

Use existing subscriptions interactively, existing Google Sheets, repo scripts and native platform scheduling. No new paid accounts, paid credits, API calls or model routing were used. Self-hosted n8n/local open models may be free software but consume device/storage and still need setup review. OmniRoute, Claude-mem and “Headr” are suggestions only: exact projects and permissions have not been identified; no installation or claims of native synchronization. Never install an ambiguous package by name.

## Handoff packet template

Task ID; scope; resource key; lease token/version (private runner context only); branch/PR; artifact URL; changed behavior; checks and results; permission/source evidence; unresolved risk; blocker; next owner/action. Never include credentials, contact lists or lease tokens in public PR text.

## References

- [Google ScriptLock](https://developers.google.com/apps-script/reference/lock/lock-service)
- [Google Lock and flush](https://developers.google.com/apps-script/reference/lock/lock)
- [n8n HTTP Request](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
