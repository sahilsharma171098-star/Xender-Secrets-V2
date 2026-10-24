# One task, one saved workspace

Task: XEND-TASK-WORKSPACE-001. This extends the existing private Command Center, not a second task queue.

## Open one place

Open the existing Command Center linked from `docs/operations/README.md`. `OS Tasks` owns dispatch/status/owner. Its supporting `OS Workspaces` tab points to each task's private Drive folder, latest immutable checkpoint, fixed format and files. `OS Formats` lists versioned profiles; `OS Handoffs` records who stopped, where and the exact next action. Private workspace URLs and content stay in the private Sheet/Drive, never in public Git.

The task folder keeps `brief.md`, `profile.json`, `task.json`, `HANDOFF.md`, `history/` and `artifacts/` together. Research, scripts, storyboards, generated assets, edit previews, rights/review evidence and publishing receipts belong to that same task ID. External files remain accessible only to authorized accounts. The generic interface works for research, code and media; the project's format defines its ordered stages.

## Keep the format identical

At task creation, copy the canonical project's current approved profile. Pin its ID, version and SHA-256. Every checkpoint and resume validates it. New agents preserve language, dimensions, duration, frame rate, voice, caption/CTA rules and any other profile fields. Actual tool/model choice is recorded per checkpoint and cannot justify silently changing the format. A format change needs a separately reviewed profile version and an explicit task decision; never edit an in-flight pinned profile.

Private AutoTube short/long profiles snapshot its existing config; they do not change that config. The public `ops/ai/profiles/example-video-v1.json` is a fictional example, not a replacement production format.

## Commands

Use an authorized local copy of the existing private workspace folder (or a gitignored `.xender-ai/` cache). These commands do not log into Drive or invoke models.

```sh
npm run ai:task -- init --root /private/task-workspaces --task XEND-VIDEO-001 --project AutoTube --owner chatgpt --profile-file /private/autotube-short-hi-v1.json --brief-file /private/brief.md
npm run ai:task -- checkpoint --root /private/task-workspaces --task XEND-VIDEO-001 --owner chatgpt --expected-revision 0 --stage research --artifact-file /private/research.md --complete --next-action "Write script from saved research using the pinned format"
npm run ai:task -- handoff --root /private/task-workspaces --task XEND-VIDEO-001 --owner chatgpt --expected-revision 1 --to claude --reason limit --next-action "Write script from saved research; do not repeat research"
npm run ai:task -- resume --root /private/task-workspaces --task XEND-VIDEO-001 --owner claude --expected-revision 2
npm run ai:task -- show --root /private/task-workspaces --task XEND-VIDEO-001
npm run ai:prepare -- --workspace-root /private/task-workspaces --task XEND-VIDEO-001 --kind code
```

Pass `--workspace-url` during init only with the verified private Drive task-folder URL. Artifact paths are relative to the task folder. Use the current revision from `show`; never guess it. `checkpoint` without `--complete` saves partial-stage progress; repeat partial checkpoints as work grows. A completed stage requires a saved artifact. A stage cannot be skipped/repeated; the final stage yields REVIEW, never publication approval. Original files are not overwritten. A stale revision, foreign owner, changed artifact/profile, symlink task path or competing local writer fails closed.

`ai:prepare --workspace-root` reads the actual checkpoint and includes its format hash, revision, current stage, files and next action. It rejects a replacement brief or another project. Preparation still makes no model call and leaves execution/publishing false.

## Save to the shared center after every meaningful step

1. Check the canonical `OS Tasks` owner and resource before work. Until the existing Apps Script controller is installed, Sahil dispatches; this setup is owner-requested initialization, not activation of an autonomous queue writer.
2. Checkpoint the research/script/file **before** another long/provider call and before ending a session. Saved work survives a model limit; unsaved reasoning cannot be recovered automatically.
3. Through the authorized Drive connector or Drive client, upload the task's profile, brief, immutable `history/rNNNNNN.json` and matching handoff, plus every referenced artifact to the **same private task folder**. Keep the history and artifact subfolders/relative names. Verify metadata/content readback. Never upload credentials, unrelated files or entire laptop backups.
4. Record the verified checkpoint URL/revision/stage/file links in `OS Workspaces` and append the handoff event to `OS Handoffs`. Use the installed queue controller for operational ownership/status mutations; don't bypass its leases with concurrent connector writes. If controller access is unavailable, get Sahil's dispatch and use one serialized writer. Verify the current pointer before advancing it; unresolved conflicting revisions require reconciliation, not last-writer-wins.
5. The next authorized agent opens the latest workspace row, downloads/reads the matching profile, checkpoint and artifacts, validates their hashes, obtains dispatch/ownership and resumes the exact next action. It does not create a new project, restart finished research or assume another agent's account/API access.

Local file locks and revisions are not distributed Drive leases. Different local copies can diverge: immutable revisions, the central pointer and the existing dispatcher/controller are required across machines. A folder upload alone is not proof its latest checkpoint pointer was updated. Cloud sync and automatic failover are not claimed by the local CLI.

## Publishing is part of the record, with the existing gate

Keep title, description, tags, rights, final video/thumbnail hashes, exact owner approval and actual provider receipt in the same task folder. Store the canonical publisher result/receipt URL in `OS Workspaces`; `OS Content` retains the channel content record. For AutoTube, use its existing Episode Studio adapter, signed single-use owner approval, quota, main-only publisher and durable reservation. Do not add another uploader or turn on a disabled queue to make a demo pass.

Workspace commands never call a provider, create paid spend, execute arbitrary shell steps, enable a scheduler or publish. Their `publication.status` remains `not_published`. An external publisher's status/receipt is authoritative only after actual provider readback; a ready script, rendered preview, local receipt file or completed task is not a public post.

## Limit handoff acceptance

The regression suite checks checkpoint → simulated limit → different owner → resume with the same format hash and saved research, stale/foreign writers, skipped stages, evidence-free completion, tampering, competing writers, unsafe paths and unsupported publishing. A demo in the private workspace uses fictional bakery arithmetic; any preview is labelled silent/not publication-ready. This tests persistence and continuation, not a claim that Claude/Gemini was invoked or a real account quota was exhausted.

## Historical content and all-model access

`OS Archive` indexes existing YouTube, Instagram and Facebook material (and other recorded channels). Preserve platform + provider ID as the deduplication key; drafts use their existing content ID. Keep original title, creator/model attribution exactly as recorded, topic, format, language/voice, source/parent excerpt, script/asset references, rights, approval, publishing evidence, metrics observation time and missing files in the private JSON source snapshot. Repository upload history is labelled recorded evidence, not a fresh platform verification. Unknown creators remain unknown. Never republish an archived item to recover its source.

The initial private import contains 16 YouTube upload records, one Facebook post record and eleven existing draft records (eight Instagram, one each LinkedIn/Facebook/Telegram), 28 total. Recovered reel scripts are saved separately. Local-only Instagram media and original YouTube research/scripts/video files were not available on this host; the archive flags those gaps. SocialClaw returned `plan_required`; no subscription was activated. New source imports must reconcile by ID and append provenance without deleting old evidence or overwriting canonical content rows.

Every authorized model reads the same private index and pinned profile, through its own available connector/account or an explicitly attached minimal handoff. Do not make private folders public or assume automatic access from a chat/model name. Old format variations are historical evidence; a new production task uses its explicitly selected versioned profile. Automatic account-wide chat synchronization, background failover and recovery of unsaved work are not supplied by this feature.
