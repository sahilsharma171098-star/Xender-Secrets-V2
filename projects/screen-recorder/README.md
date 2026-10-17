# Xender Screen Recorder 0.1.1 — Firefox desktop

Record screen/window video with optional microphone audio, a webcam bubble, pause/resume and timestamp notes. Save video and plain-text notes locally. No account, network upload, analytics, advertising, payment integration or external runtime dependencies.


## HQ handoff / CQ-021

AMO listing slug: `xender-screen-recorder`. Version supplied to AMO: **0.1.1**, dated 16 October 2026. Runtime source imported from the original generated source and checked against the 11 files in the uploaded Firefox package. `release/firefox-0.1.1.json` records that package hash and each file's SHA-256; `npm run verify:release` rebuilds and compares every archive entry, including the generated manifest. ZIP timestamps can differ; file contents must match exactly.

The task queue on `claude/xend-hq-001` reports the add-on as awaiting AMO review. This source handoff does not re-submit, publish or independently confirm the current store-review status. No signed XPI, upload archive, credentials, session data or private contacts are committed.

There are **no extension API permissions and no host permissions** in this release. The popup uses runtime.getURL and tabs.create without the sensitive tabs permission. Screen/window selection, microphone and camera use browser-managed consent prompts only after Start. Audio/video and notes stay local. The optional support link opens only when clicked.

From the repository root:

```
cd projects/screen-recorder
npm test
npm run build
npm run verify:release
```

Build output is ignored in this folder's `.gitignore`. It is separate from the website/Cloudflare build. After this source PR and HQ PR #57 merge, remove the pending CQ-021 marker from the Screen Recorder row of `PROJECTS.md` while preserving the independently verified AMO review status.

## Try on Firefox

For development, extract `xender-recorder-firefox-0.1.1.zip`. In Firefox desktop 142 or newer, open `about:debugging#/runtime/this-firefox`, choose Load Temporary Add-on, and select the extracted manifest.json. Temporary installation lasts until Firefox restarts. Normal release Firefox requires Mozilla signing for permanent installation; an unsigned ZIP is not a store-published extension.

Open the extension from Firefox's toolbar, click Open recorder, choose microphone/webcam options and click Start recording. Approve the screen/window selection and device permissions. Keep the recorder tab open; when using webcam, keep it visible, preferably in a separate window. Stop and download video and notes before closing. Pausing stops writing video but keeps device streams active until Stop.

Firefox does not support system/tab audio capture through getDisplayMedia. This Firefox build requests video-only display capture and obtains optional microphone audio separately. Desktop only; do not mark Android compatible in AMO.

## Architecture

A visible recorder tab owns capture, so closing the toolbar popup does not stop it. getDisplayMedia runs directly from Start's user gesture. There is no service worker, offscreen API, content script, broad host permission or privileged extension permission.

The common code has a build-time platform.js switch. Firefox uses direct microphone tracks. The Chrome build can request available screen/tab audio and mix two audio sources with Web Audio without playing the mic through speakers. Codec support is detected; video uses WebM when supported. Webcam output is composited into a circular bubble at up to 1920×1080, requested 30 fps.

## Limits

Video is buffered in memory without crash recovery. Reloading/crashing/closing can lose unsaved recordings. At approximately 250 MiB of accumulated chunks capture stops; a chunk can overshoot, and total memory usage can be higher. Download before starting again. The tab-close prompt is best effort. Webcam rendering can throttle if its tab/window is hidden. Some players may have limited WebM duration/seeking support. No MP4 conversion, trim, markup, cloud links, transcript, watermark or paid entitlement enforcement is included.

## Build and checks

Build environment used: Linux, Python 3.12.14 and Node 24.19.0. Python 3.10+ and Node 20+ are supported. Install Python from https://www.python.org/downloads/ and Node LTS from https://nodejs.org/ if missing. Extract the source ZIP, open a terminal in its root (next to package.json), then run the commands below. No npm install or third-party packages are needed for runtime or packaging.

```
npm test
npm run build
```

Packaging copies src to dist/firefox and dist/chrome, writes browser-specific manifest/platform configuration, and ZIPs the output. Source files are included without transpilation, bundling, minification or remote code. Icons are authored PNG assets included in src/icons.

12 automated tests pass: MIME fallback, timestamp formatting, audio source mixing/disconnect, partial cleanup, real recorder event-handler orchestration using deterministic DOM/media doubles, denied/cancelled capture, native Stop sharing, pause-aware timestamps, webcam startup failure, and screen-only capture. Mozilla web-ext 10.7.0 validation: 0 errors, 0 warnings, 0 notices.

These are not hardware tests. Actual Firefox device permissions, video encoding/playback, webcam timing and microphone capture have not been verified on a desktop OS in this environment. The reviewer should test the flow above. Also check long captures/memory limit, repeated sessions, camera/mic indicators after failure/stop, tab closure, and downloaded playback in target players.

## Privacy and support

See src/privacy.html and store/firefox-listing.md. No user data is transmitted by this extension. User-initiated downloads stay on the user's device. Optional external support website: https://www.xendersecrets.com/contact . No personal support email is included.

## Revenue roadmap (not enabled)

Basic local recording stays free. A future paid offer could add private cloud links with expiry, team workspaces, custom branding and transcripts. Timestamp bug reports are the initial differentiator. Validate willingness to pay with QA/support teams before adding hosting costs. Pricing is not finalized; no unlimited hosting, lifetime cloud-storage promise or revenue guarantee is made.

A paid release needs hosted checkout from an actual merchant account, verified/idempotent server webhooks, account authentication, server-side entitlements, cancellation/refunds and explicit usage quotas. Never put secrets or trusted isPro flags in extension code. Cloud upload needs separate informed consent, authorized short-lived upload URLs, private storage, retention/deletion and access-controlled shares. Update the privacy disclosure before adding any transmission.

## Technical references

- https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
- https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static
- https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/
- https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture
