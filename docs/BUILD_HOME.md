# Xender HQ — start every build here

Sahil's standing instruction, 22 October 2026: all future builds by ChatGPT/Codex, Claude and Gemini belong in one shared HQ.

## One entry point

Canonical HQ: https://github.com/sahilsharma171098-star/Xender-Secrets-V2

| Record | Canonical location |
| --- | --- |
| All projects and their source/deployment locations | [PROJECTS.md](../PROJECTS.md) |
| Shared agent instructions | [AGENTS.md](../AGENTS.md), [CLAUDE.md](../CLAUDE.md), [GEMINI.md](../GEMINI.md) |
| Technical task IDs and progress | [TASKS.md](TASKS.md) |
| Latest resume notes | [ops/HANDOFF.md](../ops/HANDOFF.md) |
| Architecture and data ownership | [HQ_ARCHITECTURE.md](HQ_ARCHITECTURE.md) |
| Outreach, approvals, suppression and operational queue | Existing private Command Center; access through authorized connectors |

## Gemini and Google AI tools (Sahil approved, 2026-10-22)

Gemini is part of the shared ChatGPT/Codex + Claude + Gemini workflow. Use it when the task benefits from its capabilities or another agent is unavailable; it does not have to wait until both other agents fail. All agents use this HQ, one task owner, the same canonical source, branch/PR review and handoff rules.

When useful, use Google AI tools through an actually available, authorized connector, CLI or signed-in account. Choose the tool for the task (research, coding, document analysis or media generation); verify current availability, access, quota and cost before use. Existing subscription access does not imply API access or included API credits. Prefer existing included access or free allowance; any new paid API usage, credits or subscription requires Sahil's explicit spend approval. Never claim a tool is connected, invoked or successful without observing it.

Pass only the minimum task context. Keep secrets, private customer records and unrelated personal information out of prompts and public handoffs. Record tool/model used where observable, output/source location, checks, quota/access blockers and next action in the task handoff. Review and validate AI outputs before integrating them. This policy authorizes choosing useful tools; it does not install integrations or automatically synchronize accounts/chats.

## Before building

1. Read current main and the linked records. Check actual open PRs and deployment state; historical notes can be stale.
2. Search the registry and source for an existing implementation. Extend it instead of making another copy, service or dashboard.
3. For a new project, add a PROJECTS.md row before implementation: purpose, canonical repository/folder, owner, task ID, deployment target and current status. Use projects/<slug>/ for public standalone apps, services/<slug>/ for services, automation/<slug>/ for workflow exports where appropriate.
4. Private code stays in an appropriate private repository. AutoTube and the Amazon connector retain their canonical repositories; do not copy them into this public HQ. Link safe metadata here.
5. Assign one owner per task/branch and use a branch plus PR. A second agent resumes through a recorded handoff rather than editing the same branch concurrently. Until the Apps Script controller is installed, Sahil remains operational dispatcher; no queue automation is implied.

## Before ending or handing over

Update the task and project record with the branch/PR, commit, actual check results, whether deployed, blockers and next action. Update ops/HANDOFF.md (use npm run ops:handoff -- --agent <name> where available). For separate repositories, preserve implementation details in that repository and add a safe task/PR pointer in HQ. Do not claim completion from a chat message alone.

Use this handoff template:

- Task ID and project:
- Owner and canonical source:
- Branch / PR / commit:
- Changed behavior:
- Checks actually run:
- Deployment status:
- Blockers / next action:

## Boundaries

This public HQ contains code and safe project metadata, never credentials, customer records or private business data. Secrets remain in the provider's secret store; business records remain in the Worker/private Command Center according to HQ_ARCHITECTURE.md. Existing production systems and external repositories are not migrated merely by this policy.

ChatGPT, Claude and Gemini do not automatically read each other's conversations. Start each new agent session with this HQ link and require the startup read. A Claude or Gemini session outside these repositories needs the instruction below supplied once or installed in its own project instructions; this change cannot modify an unrelated Claude or Gemini account/session.

## Bootstrap for a fresh session

> Work from https://github.com/sahilsharma171098-star/Xender-Secrets-V2 as the shared HQ. First read AGENTS.md, docs/BUILD_HOME.md, PROJECTS.md, docs/TASKS.md and ops/HANDOFF.md on current main (for YouTube work also docs/YOUTUBE_FORMAT.md). Find and reuse the canonical existing project. Register new work with a task ID and one owner. Keep private source/data private. Before stopping, update task/project status and handoff with branch/PR, actual checks, deployment status and next action. Do not create a duplicate setup or assume chat synchronization.

## YouTube content format

All YouTube work uses [YOUTUBE_FORMAT.md](YOUTUBE_FORMAT.md): title, cover, story, description and how to fix existing videos. It includes a paste-ready block for ChatGPT Projects and Gemini Gems.

## Tool workspace

See [ops/ai/README.md](../ops/ai/README.md) and its registry for dated observations, evidence scope, activation blockers and shared task preparation commands. Gemini sign-in and Flow project/model options were observed by ChatGPT on 2026-10-22; this is not a current-session, quota, generation or API-access check. Reopen the existing named project after checking access; keep project-specific links in private workspace records. Sahil supplied a 2026-10-24 ThinkPad health check reporting Antigravity running/signed in and a separate current-main workspace; see [the supplied health record](AI_WORKSTATION_REPORTED_HEALTH_2026-10-24.md). This reviewer has not inspected its original local commit or private receipts, and fresh model/API execution remains unverified. Standalone Gemini skill save remains unconfirmed. Task preparation is local and does not execute model calls. A host doctor run does not refresh these observations.

## Shared task and content workspace (2026-10-24)

See `docs/TASK_WORKSPACES.md` for fixed format profiles, private research/script/video storage, revision checkpoints and continuation by another authorized model. The existing private Command Center indexes workspaces, formats, handoffs and historical content. Historical publishing records retain source evidence and missing-file flags; they are not fresh platform readbacks. OS Tasks and the existing publisher approval rules remain canonical.
