# Xender PDF Converter 1.0.1 (XEND-PDF-EXT-001)

A separate Firefox 140+ Manifest V3 add-on. Open the toolbar action to use JPG/PNG/WebP to PDF, PDF to PNG/JPG, PDF merge, page extraction/reordering and selected-page rotation. All conversion happens in the extension tab; no host, browsing-history, storage, or downloads permissions. There is no content script.

## Reproducible build for Mozilla reviewers

Node.js 24 LTS and npm, on Linux, macOS or Windows:

```sh
cd pdf-extension
npm ci --ignore-scripts
npm run build
npm test
npm run lint:firefox
```

If using the standalone source ZIP, its root is this directory; omit `cd pdf-extension`.

Load `dist/firefox/manifest.json` through Firefox's `about:debugging` temporary add-on loader. Packaged extension: `dist/xender-pdf-converter-firefox-1.0.1.zip`. The source ZIP contains all first-party source, package-lock and these instructions. The build copies source and exact third-party distributions without modifying/minifying their code; the ZIP writer fixes timestamps and ordering for repeatability.

Bundled npm dependencies: `pdf-lib@1.17.1` (MIT; unminified dist/pdf-lib.js) and `pdfjs-dist@6.4.299` (Apache-2.0; legacy build for browser compatibility). Decoders, CMaps and standard fonts are included. The CSP allows WebAssembly for bundled image decoders; PDF.js JavaScript evaluation is disabled via `isEvalSupported:false`. No remote code or external file processing.

## Monetization

The extension is free. A clearly labelled optional paid-service section links to the existing Xender contact form for custom PDF generation, business automation and private tools. No files, filenames or account information are attached. Its fixed UTM campaign identifies only this extension as the source. Clicking the link opens the public website; website privacy terms then apply. There is no paywall, affiliate code, advertising network, automatic website opening, checkout, paid Pro licence or subscription implemented.

## Limits

- 30 files and 80 MB combined input; 5,000 PDF pages; 200 MB output.
- PDF-to-images exports at most 50 selected pages and 16 million pixels per page.
- Input images larger than 16 MP are rejected with a resize message.
- Password-protected/encrypted PDFs are unsupported. No OCR or Word/Excel conversion.
- PDF editing can drop interactive features or invalidate signatures; the UI discloses this. Originals are never overwritten.

See `store/reviewer-notes.md`, `store/firefox-listing.md`, and `src/privacy.html`. Do not describe a prepared ZIP as a published or signed add-on; record AMO's actual resulting status.

## Verification and publishing checkpoint (15 October 2026)

Nine core/privacy tests pass; the exact bundled PDF.js renderer produced the expected pixel and its loading-task cleanup completed. Production dependency audit reported zero known vulnerabilities. Local web-ext validation returned zero errors and eight warnings, all inside unchanged upstream PDF.js compatibility libraries (explained in reviewer notes). Mozilla's upload validation reported the same result for the first uploaded ZIP.

Full Firefox UI/browser tests could not complete because this container denied Firefox content-process user namespaces. Chrome test-browser download was unavailable. No successful browser integration pass or screenshot is claimed. `npm run test:browser` is an optional automated integration test; install Playwright and its Firefox binary in a supported local environment first.

AMO draft exists, but the add-on is **not published or approved**. Automatic approval review blocked entering the public listing and separately blocked a public GitHub source push. No bypass was attempted. The final local package/listing uses website-only support and contains no personal support email. The earlier uploaded AMO draft must be updated/replaced with this final ZIP before completing submission. See `store/SUBMISSION_STATUS.md`.

Publishing update: user approved the exact website-only listing on 15 October 2026. The superseded AMO 1.0.0 draft was cancelled/disabled without deleting the add-on. Version 1.0.1 contains the final website-only support copy; public listing and submission are in progress.


## Chrome release preparation — 17 October 2026

Build now writes `dist/chrome/` and `dist/xender-pdf-converter-chrome-1.0.1.zip` in addition to the original Firefox package. Chrome uses an MV3 service worker, the Chrome API namespace and browser-specific visible copy. No new permissions or remote code. The Firefox package bytes remain identical to the prior 1.0.1 archive.

Run `npm ci`, then `npm test` (includes build) in this folder. Chrome package tests check the worker, bundled decoders, permissions and toolbar behavior. Actual Chrome UI/encoder/device testing is not claimed. Store drafts and privacy are under `store/chrome-*`; actual Chrome screenshot remains pending. No Chrome store upload has occurred.
