# XEND-CHROME-RELEASE-001 — Chrome Web Store preparation

17 October 2026. Branch: `chatgpt/xend-chrome-release-001`, based on recorder source PR #58.

## Actual status

Google sign-in succeeded through the secure browser-auth flow. The account is at the developer registration page: Developer Agreement/Privacy Policies are not accepted and the US$5 registration fee remains unpaid. The fee was approved earlier; accepting this new legal agreement still requires action-time confirmation. No Chrome package has been uploaded or submitted.

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

1. Obtain action-time confirmation before accepting Google's new Developer Agreement. The $5 fee already has approval; do not ask for that same approval again unless the amount/terms materially change. Never accept new subscriptions or unrelated charges.
2. Inspect the registered publisher's items before creating anything, avoiding duplicates.
3. Upload SiteCheck first; fill store/privacy/distribution fields, verify existing images, and submit only when mandatory fields are complete.
4. Obtain genuine Chrome screenshots for PDF/Recorder, test their actual Chrome flows, verify public privacy URLs, then upload their ZIPs and complete each listing. Do not use invented screenshots or claim system audio is universal.
5. Record each item ID, version, submitted/pending/live status and any rejection independently. Publication depends on Google review.
