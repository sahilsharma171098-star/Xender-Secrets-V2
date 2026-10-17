# Chrome Web Store — Xender Screen Recorder 0.1.1

Status: package prepared; not uploaded or submitted to Chrome Web Store.
Category: Workflow & Planning / Productivity (select the closest current dashboard category).
Language: English. Price: free; no paid tier is enabled.

Summary: Record your screen with optional microphone, webcam and timestamp notes. Save locally.

## Description

Record a bug, explain a workflow or create a short tutorial. Choose a screen, window or Chrome tab, optionally include your microphone and a circular webcam bubble, then save the recording to your device.

- Screen/window/tab video and optional microphone audio.
- Available screen/tab audio, where Chrome and your OS support it and you choose Share audio.
- Optional webcam bubble, pause/resume and timestamp notes.
- Local WebM download and plain-text notes, with no account or cloud upload.

Keep the recorder tab open. Keep it visible when using the webcam bubble; hidden tabs can throttle canvas rendering. Videos are buffered in memory and stop around 250 MiB of video data. Download before closing or starting again. A reload or crash can lose unsaved work. Some players may have limited WebM seeking support.

This version does not include MP4 conversion, editing, cloud links, transcripts or a paid subscription. Screen audio is not available for every sharing source or operating system. Pausing retains active capture devices until Stop.

## Privacy practices draft

Single purpose: Make user-initiated local screen recordings, with optional audio/webcam and timestamp notes, and save them on the user's device.

Extension API permissions: none. Media devices and display selection use Chrome's consent picker. No host permissions, content scripts, background/offscreen worker, remote code or network upload.

Disclose local handling of screen video, shared audio, microphone/camera media and user-entered notes. Do not declare "no data handling" merely because there is no server upload. Select the matching data-type disclosures in the current dashboard and explain their local-only use. No selling, unrelated use/transfer, or creditworthiness/lending use.

Privacy text: privacy-policy.md in this folder. Public policy URL will be the readable GitHub policy page on the release branch; verify its link before submission.

## Assets

128px icon: icon-128.png. Small promo tile: promo-small.png.
Actual Chrome recorder screenshot (1280×800 or640×400): pending; do not substitute an invented screenshot or imply live recording tests passed.
