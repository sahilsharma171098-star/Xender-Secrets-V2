# XEND-CHROME-RELEASE-001 — Chrome Web Store preparation

17 October 2026. Branch: `chatgpt/xend-chrome-release-001`, based on recorder source PR #58.

## Actual status

Sahil reports the registration fee paid and developer account registered. Secure sign-in reached the dashboard, then publishing continued under the **Xender Secrets** publisher (`c49da791-aff5-4849-9b09-47179cef820f`). No additional payment was made by ChatGPT.

| Item | Store ID | Last verified status |
| --- | --- | --- |
| SiteCheck 1.0.0 | `egkpcmgkfakclaooopabcmffdmaldkhe` | **Pending review**; final submission confirmation observed; automatic publication after approval selected |
| PDF Converter 1.0.1 | `cagohinedblhjfafkkomikcnjdpaflfm` | **Draft**; package, description, English/Tools category, icon, promo, support and privacy fields saved; Google reports only missing screenshot/video |
| Screen Recorder 0.1.1 | `mlaokliabcdmlacefdimacekcppoinha` | **Draft**; package, description, English/Tools category, homepage/support, icon, promo and privacy fields saved; Google reports only missing screenshot/video |

No extension is claimed live. Account limit dialog says two published/review-submitted extensions are allowed, and drafts can still be saved. Last observed usage was 1/2 after SiteCheck submission, despite two draft/listed items. Do not infer the quota is exhausted merely from draft count.

PDF/Recorder still need genuine Chrome screenshots and actual device/UI validation. Local file preview was rejected by browser URL security policy; do not work around the block. A legitimate screenshot or video must come from a permitted product test environment. Do not substitute a mockup for an actual product screenshot. On 17 October at approximately 18:23 IST the dashboard redirected to Google sign-in again, so current state after the Recorder timeout remains unknown.

Resume: securely sign in; inspect existing IDs before any writes; finish Recorder fields/assets; obtain genuine screenshots; submit PDF and Recorder individually subject to the two-extension quota. Do not repay registration or create duplicate items.

| Extension | Version | Chrome ZIP | Local validation | Assets |
| --- | --- | --- | --- | --- |
| SiteCheck | 1.0.0 | `extension/dist/xender-sitecheck-chrome.zip` | 10 unit tests, policy/manifest/store-copy lint | Existing 128px icon, 5 actual-product demo screenshots and small promo tile |
| PDF Converter | 1.0.1 | `projects/pdf-converter/dist/xender-pdf-converter-chrome-1.0.1.zip` | 11 tests including Chrome worker/manifest, ZIP integrity and declared icon size | 128px icon and small promo tile; actual Chrome screenshot pending |
| Screen Recorder | 0.1.1 | `projects/screen-recorder/dist/xender-recorder-chrome-0.1.1.zip` | 13 deterministic tests including Chrome audio mixing/cleanup, ZIP/icon checks | 128px icon and small promo tile; actual Chrome screenshot pending |

These are local code/package checks, not store approval or live Chrome device/encoder verification. PDF Firefox 1.0.1 remains byte-identical to the previous archive (`c5f39c5deee195c819104fd0231830fb7a6105fc570a4c3ce83acb777e67be93`); Recorder's original 11 Firefox runtime files still match its recorded release hashes.

## Build

```
npm run extension:package
npm run extension:lint
node --test extension/tests/unit.test.mjs
cd projects/pdf-converter
npm ci
npm test
cd ../screen-recorder
npm test
npm run verify:release
```

PDF libraries are pinned and bundled; there is no runtime CDN. Chrome PDF uses a service worker and `chrome` namespace; Firefox retains its original background script. Recorder's Chrome-only icon/privacy adjustments do not change Firefox runtime files.

## Store fields and privacy

- SiteCheck: `extension/store/chrome-listing.md` plus existing store screenshots/promo.
- PDF Converter: `projects/pdf-converter/store/chrome-listing.md` and `chrome-privacy-policy.md`.
- Recorder: `projects/screen-recorder/store/chrome/listing.md` and `privacy-policy.md`.
- All run locally. Google still requires disclosure of local data handling. Do not leave data usage undeclared only because there is no transmission. Match the current dashboard categories to the actual page/document/media inputs and explain local-only use.
- Privacy policies can use their readable public GitHub Markdown pages on this branch once the link is verified, avoiding a website deployment dependency.
- No personal support email, private customer data or credentials belong in the packages or public source.

## Resume after account registration

1. Registration is complete according to Sahil and the publisher dashboard was reached. Do not pay registration again. Any future new legal agreement still requires action-time confirmation.
2. Inspect the registered publisher's items before creating anything, avoiding duplicates.
3. Upload SiteCheck first; fill store/privacy/distribution fields, verify existing images, and submit only when mandatory fields are complete.
4. Obtain genuine Chrome screenshots for PDF/Recorder, test their actual Chrome flows, verify public privacy URLs, then upload their ZIPs and complete each listing. Do not use invented screenshots or claim system audio is universal.
5. Record each item ID, version, submitted/pending/live status and any rejection independently. Publication depends on Google review.


## Resume update, 17 October 2026 (evening IST)

Sahil explicitly approved cloud-browser continuation after the connected local Chrome browser rejected Web Store scripting. Secure sign-in succeeded again. All three existing items were visible; SiteCheck remained Pending review. Recorder description/category/language, homepage/support, privacy declarations and linked policy were saved, followed by successful icon and small promo uploads. The final Why-can-I-not-submit dialog reports only: "At least one screenshot or video is required." PDF has the same previously verified blocker. Neither draft was submitted. Genuine screenshots/video and actual Chrome UI/device validation remain required. Do not generate a mock screenshot or report successful media tests. The last verification was made while signed in; the prior sign-out observation above is historical. No further fee was charged.
