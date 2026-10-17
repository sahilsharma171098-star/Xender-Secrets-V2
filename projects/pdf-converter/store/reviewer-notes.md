# Xender PDF Converter 1.0.1 - reviewer notes

Single purpose: local PDF conversion and basic page operations selected by the user. Click the toolbar action to open app.html; no automatic pages are opened on install or browser startup.

Permissions: none. No host permissions, content scripts, telemetry, browser storage, external conversion requests or remotely hosted code. The small Firefox event background script only opens the bundled app.html when the user clicks the toolbar icon. Local file access is through a user-initiated input/drop; downloads are Blob links with user clicks.

Data collection: none. The manifest declares browser_specific_settings.gecko.data_collection_permissions.required = ["none"]. Files and filenames stay in memory. Clear files/closing the tab releases them. Fixed external homepage/support/optional service-quote links never include selected filenames, file contents or browsing data. They are not automatically opened. Normal website privacy rules apply after the user chooses a link. The optional quote link carries only fixed utm_source=pdf_extension, utm_medium=extension and utm_campaign=pdf_automation.

Business model: free conversion tools with a clearly labelled optional paid custom-service enquiry link. No mandatory purchase, paid feature, subscriptions, affiliate code or third-party advertising SDK.

Third-party libraries (exact npm distributions, unchanged):
- pdf-lib 1.17.1, MIT: https://www.npmjs.com/package/pdf-lib/v/1.17.1 ; readable release source https://github.com/Hopding/pdf-lib/tree/v1.17.1 ; distribution dist/pdf-lib.js is copied unchanged, not minified.
- pdfjs-dist 6.4.299, Apache-2.0: https://www.npmjs.com/package/pdfjs-dist/v/6.4.299 ; source https://github.com/mozilla/pdf.js/tree/v6.4.299 ; legacy/build/pdf.mjs and pdf.worker.mjs copied unchanged with cmaps, standard_fonts and wasm decoders. The supplied package-lock resolves exact integrity-checked npm tarballs. No source maps or viewer/UI modules are shipped. Third-party licence files are included.

First-party JS is readable and unminified. Source ZIP and README contain deterministic build instructions. On Node 24 LTS: npm ci --ignore-scripts; npm run build. The build performs file copies and creates deterministic ZIPs. It does not bundle, transpile or minify first-party code.

PDF.js imports its bundled worker and reads only packaged CMaps/fonts/decoders. connect-src is self only. wasm-unsafe-eval permits the bundled WebAssembly image decoders; JS evaluation is explicitly disabled in getDocument (isEvalSupported:false).

Known validator warnings are confined to unchanged upstream PDF.js legacy distributions: core-js compatibility fallbacks for old browsers (Function constructor and document.write) and the upstream worker's dynamic import. Firefox 140+ does not use the old IE/ActiveX fallbacks; the CSP excludes JavaScript unsafe-eval, getDocument disables JS evaluation, and worker/library paths are fixed packaged URLs. No first-party source contains eval, Function constructors, document.write or HTML injection. The compatibility build also supplies Math.sumPrecise and other platform APIs for Firefox ESR 140.

Test steps:
1. Click the toolbar icon. Add two ordinary JPG/PNG/WebP images, rearrange them, create and download a two-page PDF.
2. Select Merge PDFs, add two unencrypted PDFs, reorder files, merge and download.
3. Select Extract pages, add a multi-page PDF and enter e.g. 3,1-2; download and verify page order.
4. Select Rotate PDF, choose pages and 90/180/270 degrees; the complete document is saved with only selected pages rotated.
5. Select PDF to images, choose one PDF, pages and PNG/JPG/resolution. One page downloads as an image; multiple selected pages download in a ZIP.
6. Repeat with networking offline. No network access is needed. Corrupt/encrypted files and excessive size/page/pixel requests show errors.
7. The optional paid-service quote link is clearly separated below the free tools, opens Xender's contact form, and does not include document data. Conversion never requires it.

Publisher: Xender Secrets. Support: https://www.xendersecrets.com/contact. Privacy policy is bundled in privacy.html and pasted into the AMO listing.
