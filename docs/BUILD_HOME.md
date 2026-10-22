# Xender HQ — start every build here

Sahil's standing instruction, 22 October 2026: all future builds by ChatGPT/Codex and Claude belong in one shared HQ.

## One entry point

Canonical HQ: https://github.com/sahilsharma171098-star/Xender-Secrets-V2

| Record | Canonical location |
| --- | --- |
| All projects and their source/deployment locations | [PROJECTS.md](../PROJECTS.md) |
| Shared agent instructions | [AGENTS.md](../AGENTS.md), [CLAUDE.md](../CLAUDE.md) |
| Technical task IDs and progress | [TASKS.md](TASKS.md) |
| Latest resume notes | [ops/HANDOFF.md](../ops/HANDOFF.md) |
| Architecture and data ownership | [HQ_ARCHITECTURE.md](HQ_ARCHITECTURE.md) |
| Outreach, approvals, suppression and operational queue | Existing private Command Center; access through authorized connectors |

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

ChatGPT and Claude do not automatically read each other's conversations. Start each new agent session with this HQ link and require the startup read. A Claude session outside these repositories needs the instruction below supplied once or installed in its own project instructions; this change cannot modify an unrelated Claude account/session.

## Bootstrap for a fresh session

> Work from https://github.com/sahilsharma171098-star/Xender-Secrets-V2 as the shared HQ. First read AGENTS.md, docs/BUILD_HOME.md, PROJECTS.md, docs/TASKS.md and ops/HANDOFF.md on current main. Find and reuse the canonical existing project. Register new work with a task ID and one owner. Keep private source/data private. Before stopping, update task/project status and handoff with branch/PR, actual checks, deployment status and next action. Do not create a duplicate setup or assume chat synchronization.
