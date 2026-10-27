# Canva in the existing Xender workflow

Task: XEND-CANVA-001. Owner: ChatGPT/Codex. Canonical source: this HQ's existing AI workspace.
Canva stores editable source designs; exported files and private design pointers belong to the
existing task workspace. AutoTube remains the canonical YouTube pipeline.

## Verified setup — 27 October 2026

Sahil reports an existing Canva Pro subscription. In this ChatGPT session the connected Canva app
successfully listed a brand-kit record, found the existing **Xender Secrets Instagram launch post**,
created the **Xender Secrets** project folder and the four folders below, copied that post into
**Instagram and Reels**, and returned the copied design on readback. The original design remains.
The brand-kit record did not include a name: its identity, colors and logo were not verified.

| Folder inside Xender Secrets | Use |
| --- | --- |
| YouTube Thumbnails | Covers following the current AutoTube format |
| Instagram and Reels | Editable posts, carousel pages and cover layouts |
| Website and Client Work | Website assets and client concept materials |
| Product Creatives | Product assets based on verified product information |

Search folders for **Xender Secrets**, retain the returned folder ID in the private task record,
then list that folder. Inside Instagram and Reels is the copied launch post with its original
title. Copy it before adapting a new asset; it is a working reference, not an approved universal
brand template. The source design's dataset returned an empty object: no bulk-autofill-ready
master or successful autofill was verified. Keep actual folder/design IDs, editor/share URLs and
customer material out of this public repository.

No generated/rendered output, export, branding change or live social post is claimed by this
setup. Remaining credits, subscription billing and Claude/Gemini/laptop authentication have not
been inspected. A connected ChatGPT account does not configure the other assistants.

## Prepare through the existing HQ

Use an authorized existing task workspace and pinned profile (see [TASK_WORKSPACES](../TASK_WORKSPACES.md)).
For a local brief:

```sh
npm run ai:prepare -- --kind image --tool canva --task XEND-DESIGN-001 --project AutoTube --brief-file /private/brief.md
```

For saved task work, preserve its format and completed stages:

```sh
npm run ai:prepare -- --kind image --tool canva --task XEND-DESIGN-001 --workspace-root /private/task-workspaces
```

This is the existing image kind with an explicit Canva provider; defaults and other tools are
unchanged. The command only writes a private prepared job and prompt under gitignored
`.xender-ai/`. It makes zero Canva calls and leaves `executed` and `published` false.
A session with an authorized Canva connection executes the actual design work separately.

The brief must identify the destination, purpose, exact approved copy, language, pixel dimensions,
reference/master, requested file type, rights/source references and allowed usage. Preserve the
pinned project format. YouTube work follows [YOUTUBE_FORMAT](../YOUTUBE_FORMAT.md) and AutoTube's
current content profile: light cover, one business picture, red Hindi trade and profit tag,
green badge only when the figure appears in the actual video. English pilot rules stay separate.
Do not turn this older Instagram reference into the channel's new YouTube cover format.

## Execute and return the usable asset

1. Discover the session's actual Canva tools and verify the intended account and current allowance.
   Search the existing project folder/master before creating another. Check rights and select the
   correct Brand Kit only after identifying it; a successful list response is insufficient.
2. Use a copied source design or a verified brand template for reusable work. Before autofill,
   call get-design-dataset or get-brand-template-dataset. Fill exactly the returned field names/types.
   If the dataset is empty, use the normal copied-design editing workflow or prepare labels for
   review; do not claim autofill ran. Keep update_in_place false unless Sahil requested replacement.
3. Keep changes in an editing transaction, inspect the preview at the destination size, and follow
   the connected tool's explicit approval requirement before committing edits. Check Hindi glyphs,
   contrast, cropping, numbers, spelling, logo and licensing against the brief.
4. Inspect currently exposed export capabilities. This session's discovered tools did not include
   get-export-formats/export-design. Use Canva's native Download for the requested format when no
   authorized export tool is exposed. Never use an expiring thumbnail/preview URL as the final asset.
   Verify actual exported bytes, pixel size, media type, file hash and, for video, duration/audio.
5. Save the actual design ID, source-master ID, editor link, folder, pinned format hash, review and
   rights evidence, export file/SHA-256 and real provider result in the private task checkpoint.
   Prepared, copied, approved, exported and published are distinct evidence states.
6. Hand reviewed files to the existing project. For YouTube use AutoTube's normal pipeline or
   backed-up retrofit flow with its existing content approval. For Instagram use the existing
   approved posting/crosspost workflow. Never enable a second uploader, alter schedules or treat
   a Canva design save as a published post.

## Connection and unattended automation

The existing connected Canva app is usable here now; it is the chosen route for this setup.
Claude/Gemini can follow this runbook with their own authorized available connection or receive
an explicit private handoff. No account-wide chat or credential synchronization is provided.

A custom Xender website/Actions backend needs its own Canva app, OAuth consent, redirect handling,
secure token storage/refresh, least required scopes, current plan/capability checks and an actual
end-to-end export test. Canva Pro alone does not install that backend. No client secret, bearer
token, browser cookie or consumer session should be copied into this public repo, brief or prompt.
This batch does not add an OAuth app, accept developer terms, buy credits or activate an unattended
workflow. The public registry records only observed access and this remaining boundary.

## Validation and rollback

Run `node --test tests/operations/ai-workspace.test.mjs tests/unit/handoff.test.mjs` and the
existing task-workspace regression suite after changing preparation behavior. Confirm a Canva job
retains the chosen provider and YouTube rules while reporting prepared/executed:false/published:false.
Provider calls require separate observed results. Roll back this HQ route by reverting its PR;
Canva folders and the copied design can be retained as normal editable assets.

## Official references

Verified 27 October 2026:

- [Canva MCP capabilities](https://www.canva.dev/docs/apps/mcp/)
- [Account permissions, OAuth and Pro features](https://www.canva.dev/docs/apps/mcp/access/)
- [Autofill fields and replacement behavior](https://www.canva.dev/docs/apps/mcp/tools/autofill-design/)
- [REST API marketing integration and OAuth example](https://www.canva.dev/docs/apps/reference-apps/nourish/)

