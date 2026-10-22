# Shared AI workspace

Task: XEND-AI-INTEGRATION-001. All agents use the existing HQ and canonical repositories.

## Entry points

| Work | Tool | Verified setup on 22 October 2026 |
| --- | --- | --- |
| Research, planning, review | Gemini | Signed-in browser session; Pro/Argon options observed. Separate xender-hq Gemini skill creation attempted but save unconfirmed; use repository bootstrap instructions meanwhile. |
| Coding and development | Antigravity | Route registered. Desktop/CLI installation and authorization on ThinkPad remain unverified; no CLI present in this Work host. |
| Images and thumbnails | Nano Banana | PRO Flow account offers Nano Banana 2.1, Pro and 2 Lite. No generation test. |
| Video shots | Veo / Flow | PRO account offers Veo 3.1 Lite, Fast and Quality. No generation test. |

Shared media project: https://flow.google.com/project/9a5df5c0-d172-4972-a012-9526d9479743

The project is named **Xender HQ — Images & Video**. Its active agent instruction links HQ and requires task IDs, authorized references, cost checks and output records. Google model availability can change; read current UI and official docs at use time. Do not hard-code deprecated Veo preview API endpoints.

## Commands

From repository root:

```sh
npm run ai:list
npm run ai:doctor
npm run ai:prepare -- --kind image --task XEND-THUMBNAIL-001 --project AutoTube --brief-file /path/to/brief.md
```

Kinds: research, code, image, video. A prepared job contains prompt.md and job.json under gitignored .xender-ai/. Each job has a unique directory, task/project/tool, preflight checks and a blank result receipt. Preparation does not invoke a provider or spend credits. Briefs stay local; review them before transmission. Store outputs next to their local job, then record safe source/asset pointers and actual checks in the canonical project's task/handoff. This local folder is not the authoritative operational queue and provides no cross-machine lease; existing Command Center ownership rules remain in force.

Use ChatGPT/Codex or Claude for coding while Antigravity is unavailable. Record that actual tool choice in the handoff; never pretend a pending route executed. For private projects, keep job details and generated outputs in the private project/storage; do not publish them to this public repository automatically.

## Activation still required

- Confirm Antigravity installation/login on the actual ThinkPad; open the canonical checkout and require AGENTS.md, GEMINI.md, BUILD_HOME.md and current handoff. Do not duplicate repositories or bypass terminal/browser approvals.
- Confirm the standalone Gemini xender-hq skill save before describing it as installed. Repo-based Gemini instructions are already active on main.
- Verify each requested generation's live allowance/cost before execution. Subscription access does not itself configure a backend API.

No API credentials, automatic top-ups, background agent scheduler or automatic publishing are configured by this change. Current YouTube queue and owner approvals remain intact.

Official references:
- https://ai.google.dev/gemini-api/docs/image-generation
- https://ai.google.dev/gemini-api/docs/video
- https://ai.google.dev/gemini-api/docs/google-ai-plans
- https://www.antigravity.google/docs/plans
