# YouTube to Instagram — XEND-IG-CROSSPOST-001

Sahil authorized cross-posting the channel's already-public videos and Shorts to the connected Xender Instagram account on 2026-10-24, with the YouTube channel link in every caption. Preserve original language, video content, disclosures and credits; do not replace narration, add unsupported claims or publicly expose an unlisted/private upload.

Use `operations/video-crosspost.mjs` to prepare the private batch. It appends the verified canonical channel URL to the complete original description and title; captions over 2200 characters need a reviewed adaptation, never silent truncation. Track each source video ID + destination account once. A pre-existing Instagram caption linking the source requires reconciliation before another post. Keep source observations, caption text, media SHA-256, publisher attempts and actual returned Instagram ID/permalink in the private task workspace/Command Center.

Live owner Studio inspection found 13 public long videos and eight public Shorts, plus one unlisted Short excluded from this batch. This is broader than the repository upload history. Three long videos exceed the observed connector's 15-minute limit and require reviewed parts retaining all source content; do not mark them uploaded after one excerpt. A previously linked Instagram source also needs reconciliation.

The live Windsor Instagram connector exposed `create_video_post` on the connected account, despite the older skill's read-only description. Its schema requires an externally accessible MP4/MOV URL, 3–900 seconds, at most 1 GB. Discovery/readback is required on each execution; stored connector capability is not permanent proof of access. No new paid service is enabled. Two already-published Shorts are served unchanged from the existing site's `public/media/youtube/` path to support native video ingestion; private archives and credentials are not made public.

The helper only prepares records. Use the authorized publisher for actual uploads, then verify its provider result and save the receipt. An ambiguous result must be reconciled before retrying. This does not install a background scheduler, bypass owner/rights review, enable the separate YouTube reviewed queue or merge unrelated PR #72. Future approved YouTube output should be registered with its verified public status and source asset before the same cross-post process runs.

## New videos: AutoTube makes the Reel (2026-10-27, Sahil's request)

Reels posted through the Windsor connector had no cover (Instagram showed a random first frame). For **new** public Shorts the AutoTube repo now builds the Reel itself: the 9:16 cover is the first frame of `instagram.mp4`, the caption keeps the format above (title, complete description, `Original YouTube short: <link>`, `YouTube channel: <link>`), and a ledger (`data/instagram_posts.json` in AutoTube) keeps one post per YouTube video. See AutoTube `docs/INSTAGRAM.md` and its draft PR #14.

- Until Sahil adds the Instagram token to AutoTube's GitHub secrets and sets `instagram.publish: true`, AutoTube only prepares files; it posts nothing. Posting of new videos stays with the existing process until that switch.
- **From the day `publish` is on, do not also post new videos through Windsor.** Check AutoTube's ledger and the Instagram account first; a source already recorded there is reconciled, never reposted.
- When posting through Windsor `create_video_post` for any remaining case (older videos, parts), pass `cover_url` (public JPEG, 9:16) or `thumb_offset`; the connector supports both.
- The old catalog (`data/instagram_retrofit` in AutoTube) is unchanged: its captions are in the new format, the Reel covers are set by hand in the Instagram app.
