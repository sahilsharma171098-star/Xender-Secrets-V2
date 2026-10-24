# Gemini — Xender Secrets HQ

You are part of the shared ChatGPT/Codex + Claude + Gemini workflow. Take implementation, research or review tasks when useful, and provide failover when another agent is unavailable.

1. Read AGENTS.md, docs/BUILD_HOME.md, PROJECTS.md, docs/CURRENT_STATE.md, docs/TASKS.md and ops/HANDOFF.md on current main.
2. Find the canonical existing project. Register any new project and task before implementation; do not create duplicate setups.
3. Check the actual branch/PR state before resuming. Continue the existing task branch if still active; after merge, start new work from current main on a new task branch. One owner per task/branch.
4. Follow the shared Google AI tool access, cost, privacy and validation policy below.
5. Before stopping: update task/project status and handoff with branch/PR, actual checks, deployment status, blockers and next action; run `npm run ops:handoff -- --agent gemini` where available and commit.

## Gemini and Google AI tools (Sahil approved, 2026-10-22)

Gemini is part of the shared ChatGPT/Codex + Claude + Gemini workflow. Use it when the task benefits from its capabilities or another agent is unavailable; it does not have to wait until both other agents fail. All agents use this HQ, one task owner, the same canonical source, branch/PR review and handoff rules.

When useful, use Google AI tools through an actually available, authorized connector, CLI or signed-in account. Choose the tool for the task (research, coding, document analysis or media generation); verify current availability, access, quota and cost before use. Existing subscription access does not imply API access or included API credits. Prefer existing included access or free allowance; any new paid API usage, credits or subscription requires Sahil's explicit spend approval. Never claim a tool is connected, invoked or successful without observing it.

Pass only the minimum task context. Keep secrets, private customer records and unrelated personal information out of prompts and public handoffs. Record tool/model used where observable, output/source location, checks, quota/access blockers and next action in the task handoff. Review and validate AI outputs before integrating them. This policy authorizes choosing useful tools; it does not install integrations or automatically synchronize accounts/chats.

The failover process is in ops/FAILOVER.md. Private projects retain their private source repositories; only safe metadata belongs in this public HQ.

## Shared tool execution
Use `ops/ai/README.md` and `ops/ai/tools.json` for the current Gemini, Antigravity, Nano Banana, Veo, NVIDIA and Grok routes, dated observations and activation blockers. `npm run ai:doctor` checks this host only; it does not refresh browser, ThinkPad, provider authentication or quota evidence. `npm run ai:prepare -- --kind <research|code|image|video> --task XEND-... --project <name> --brief-file <path>` creates a local prompt and receipt. Prepared is not executed. Recheck access and quota before using the existing Flow project named **Xender HQ — Images & Video**; keep project-specific workspace links in private records. Record actual outputs in the canonical project and preserve current publishing/owner-approval safeguards. An unavailable route may be handed to another authorized agent, with the real tool recorded. Never mark desktop/API access as connected from a browser observation.

NVIDIA and Grok are optional tools selected with `ai:prepare --tool nvidia|grok` for research or code. They share the same HQ context, output receipts and validation rules. Registry entries do not establish account/API access; honor their pending status and verify model, quota, license and cost before use. Do not replace another agent's authentication/backend with a third-party provider without explicit configuration.

## Saved work across models (2026-10-24)
Follow `docs/TASK_WORKSPACES.md` for every task. Open its private Command Center workspace, latest checkpoint and pinned format; inspect the content archive before creating or repurposing media. Save partial research/scripts/assets before long calls or a limit, upload immutable revisions and hand off the exact next action with verified file links. Preserve format hashes and completed stages across agents. Authorized Drive access or an explicit attached handoff is required; this does not synchronize chats or activate automatic dispatch. OS Tasks retains ownership/status, with Sahil dispatching until the existing controller is installed.
