# Shared AI workspace

Task: XEND-AI-INTEGRATION-001. All agents use the existing HQ and canonical repositories.

## Entry points

| Work | Tool | Dated observation or activation blocker |
| --- | --- | --- |
| Research, planning, review | Gemini | ChatGPT observed a signed-in browser and Pro/Argon options on 2026-10-22. Current session/quota/inference/API access not rechecked. Standalone xender-hq skill save unconfirmed; use repository instructions meanwhile. |
| Coding and development | Antigravity | Sahil supplied a 2026-10-24 check reporting version 2.23.0 running/signed in, Google AI Pro entitlement and a separate workspace on main 9e21348. Original local evidence inspection and fresh model/API execution remain pending. |
| Images and thumbnails | Nano Banana | ChatGPT observed Nano Banana 2.1, Pro and 2 Lite options in Flow on 2026-10-22. No actual generation or remaining-credit check. |
| Optional research/review/coding | NVIDIA API Catalog / NIM | Registry entry added on 2026-10-22; provider account, selected model, quota and API access not verified. |
| Optional research/review/coding | xAI / Grok | Registry entry added on 2026-10-22; provider account, quota, live tools and API access not verified. |
| Video shots | Veo / Flow | ChatGPT observed Veo 3.1 Lite/Fast/Quality options on 2026-10-22. No actual generation or remaining-credit check. |

Shared media entry point: https://flow.google.com/

Open the existing project named **Xender HQ — Images & Video** in the authorized account; do not create a duplicate when access is missing. ChatGPT observed its HQ instruction saved on 2026-10-22, with task IDs, authorized references, cost checks and output records. Keep project-specific URLs in private workspace records; this public registry contains the generic service entry point only. Removing a pointer here does not remove it from earlier public commits. Google model availability can change; read current UI and official docs at use time. Do not hard-code deprecated Veo preview API endpoints.

## Evidence and freshness

Each tool has `checked_at`, `checked_by` and `evidence`. A date is the historical date of the **scope described in the evidence**, not a credential or health guarantee. For NVIDIA/Grok it dates the registry entry only. A null date/reviewer means no tool-access check was recorded. A dated user-supplied report remains attributed to its source; it is not upgraded to an independent check by this reviewer. `evidence.not_verified` lists the limits.

Status values such as `browser_session_observed` and `model_options_observed` describe past observations, never permission to skip preflight. Recheck the actual account, tool/model, live quota/allowance and cost before execution. Update evidence only after observing a result, recording its date, reviewer, scope and safe source. Do not refresh browser/workstation dates from `ai:doctor`: it checks executable presence on the host running it and makes zero provider calls. Detailed review and blockers: [AI_SETUP_REVIEW_2026-10-24.md](../../docs/AI_SETUP_REVIEW_2026-10-24.md).

## Commands

From repository root:

```sh
npm run ai:list
npm run ai:doctor
npm run ai:prepare -- --kind research --tool grok --task XEND-REVIEW-001 --project HQ --brief-file /path/to/brief.md
npm run ai:prepare -- --kind code --tool nvidia --task XEND-CODE-001 --project HQ --brief-file /path/to/brief.md
npm run ai:prepare -- --kind image --task XEND-THUMBNAIL-001 --project AutoTube --brief-file /path/to/brief.md
```

Kinds: research, code, image, video. Optional --tool selects a registered tool that supports the kind; current defaults remain unchanged. NVIDIA/Grok are not automatic fallbacks and preparation makes no provider calls. A prepared job contains prompt.md and job.json under gitignored .xender-ai/. Each job has a unique directory, task/project/tool, preflight checks and a blank result receipt. Preparation does not invoke a provider or spend credits. Briefs stay local; review them before transmission. Store outputs next to their local job, then record safe source/asset pointers and actual checks in the canonical project's task/handoff. This local folder is not the authoritative operational queue and provides no cross-machine lease; existing Command Center ownership rules remain in force.

Use ChatGPT/Codex or Claude for coding while Antigravity is unavailable. Record that actual tool choice in the handoff; never pretend a pending route executed. For private projects, keep job details and generated outputs in the private project/storage; do not publish them to this public repository automatically.

## NVIDIA and Grok activation

- NVIDIA: use the official API Catalog to verify account access and a suitable model. Hosted evaluation does not require a GPU on this laptop; self-hosting has separate hardware requirements. Verify current quota and applicable license before production work. Do not treat free prototyping access as unlimited business hosting.
- Grok: verify the account and model/tools actually available. API usage has its own credit/billing controls; do not assume the consumer subscription covers API calls. No free-credit offer is assumed.
- For either provider, keep API keys in the approved secret store, never in briefs, chat or the public repo. No automatic purchases, top-ups, data-sharing enrollment or production deployment. Record actual model, cost/allowance, output and checks in the task handoff after authorized execution.

## Activation still required

- Review the original sanitized ThinkPad health-check diff when available; the [2026-10-24 supplied report](../../docs/AI_WORKSTATION_REPORTED_HEALTH_2026-10-24.md) reports desktop/login and backup checks passed. Then verify one fresh model result and receipt through the actual workstation, with current account/model/allowance/cost checked. Open the canonical checkout and read AGENTS.md, GEMINI.md, BUILD_HOME.md and current handoff. Preserve dirty worktrees and private backups; do not duplicate repositories or bypass approvals.
- Confirm the standalone Gemini xender-hq skill save before describing it as installed. Repo-based Gemini instructions are already active on main.
- Verify each requested generation's live allowance/cost before execution. Subscription access does not itself configure a backend API.
- The hosted GitHub Claude executor is separate from a local Claude session. Its 2026-10-24 review run failed before invoking Claude because `CLAUDE_CODE_OAUTH_TOKEN` was missing/empty; see XEND-CLAUDE-EXECUTOR-001. A separate Claude review supplied by Sahil does not prove that this executor is active.

No API credentials, automatic top-ups, background agent scheduler or automatic publishing are configured by this change. Current YouTube queue and owner approvals remain intact.

Official references:
- https://ai.google.dev/gemini-api/docs/image-generation
- https://ai.google.dev/gemini-api/docs/video
- https://ai.google.dev/gemini-api/docs/google-ai-plans
- https://www.antigravity.google/docs/plans

- https://docs.api.nvidia.com/nim/docs/api-quickstart
- https://docs.api.nvidia.com/nim/docs/product
- https://docs.x.ai/developers/faq/billing

## Shared task and content workspace (2026-10-24)

See `docs/TASK_WORKSPACES.md` for fixed format profiles, private research/script/video storage, revision checkpoints and continuation by another authorized model. The existing private Command Center indexes workspaces, formats, handoffs and historical content. Historical publishing records retain source evidence and missing-file flags; they are not fresh platform readbacks. OS Tasks and the existing publisher approval rules remain canonical.
