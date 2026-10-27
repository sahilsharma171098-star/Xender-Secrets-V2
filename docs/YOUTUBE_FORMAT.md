# Xender YouTube format — every agent uses this

Owner decision, 27 Oct 2026 (task XEND-YT-FORMAT-001). It applies to Claude, ChatGPT/Codex, Gemini or
a person, whenever they make, rewrite or fix a Hindi video for the Xender Secrets channel. The full
spec, the evidence and the code checks live in the private AutoTube repo:
`docs/CONTENT_FORMAT.md` and `autotube/packaging.py`. This page is the public pointer and the short
version.

## The format

- **Long video title:** `<हिंदी सवाल कमाई के बारे में>? | The Economics of <English business>`.
  Example: `चाय वाला महीने का कितना कमाता है? | The Economics of Tea Stall`. Max 100 characters.
- **Short title:** an earning question with the video's hook number, e.g.
  `चाउमीन ठेले वाला कितना कमाता है? ₹40 की प्लेट का हिसाब`.
- **Cover (long videos):**
  - Light page with a `THE ECONOMICS OF <trade>` header (trade in red Hindi).
  - One big framed picture of the business.
  - Red `मुनाफा?` tag.
  - Green badge with the video's own figure. **Only a figure the video actually says;** otherwise no badge.
- **Story:** one *example* owner, introduced as an example. Scene 1 asks the money question; the
  answer comes at the end. All figures are labelled illustrative.
- **Description:** summary, then 3 romanised Hinglish search lines, then chapters and the footer.
- **Topics:** from the proven list in AutoTube `config.yaml`. Off-niche videos do not go on this channel.
- English US/UK pilot Shorts keep their own pilot rules.

## How to apply it

| Job | Do | Don't |
|---|---|---|
| New videos | The AutoTube pipeline applies the format (`packaging.economics_format: true`) | Upload outside AutoTube |
| Fix videos already on the channel | Edit AutoTube `data/retrofit/plan.json`. The `Retrofit existing videos` workflow backs up first, renders covers for review, and applies only with `apply: true` + approved cover hashes. Rollback: `rollback: true` | Edit titles/thumbnails in YouTube Studio by hand (no backup, no log) |
| Suggest titles/covers in chat | Check each title: `python -m autotube.packaging --format long "<title>"` must print `OK` | Invent figures |
| Saved task workspaces | Pin the AutoTube v2 format profile (see `docs/TASK_WORKSPACES.md`) | Keep using the pre-27-Oct profile for new videos |

Publishing, editing live videos and schedule changes still need Sahil's go.

## Paste into a ChatGPT Project or a Gemini Gem

> For any Xender Secrets YouTube work, follow https://github.com/sahilsharma171098-star/Xender-Secrets-V2/blob/main/docs/YOUTUBE_FORMAT.md
> and, in the private AutoTube repo, `docs/CONTENT_FORMAT.md`. Hindi long-video titles are
> "<हिंदी सवाल कमाई के बारे में>? | The Economics of <English business>"; Shorts ask an earning
> question with the video's own number. Covers: light page, "THE ECONOMICS OF <trade>", one big
> picture, red "मुनाफा?", green badge only with a figure the video actually says. Tell the story through an
> example owner introduced as an example; figures are illustrative. Never change live videos by hand: use
> AutoTube's retrofit plan and workflow (backup first; Sahil approves apply). Check every title with
> `python -m autotube.packaging` before proposing it.
