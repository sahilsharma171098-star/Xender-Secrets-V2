# Release checklist — Xender SiteCheck

## Before every release
- [ ] Bump `version` in `extension/package.json` **and** `extension/manifests/base.json` (the build fails if they differ)
- [ ] Update `store/changelog.md`
- [ ] `npm run extension:lint`: ESLint plus the manifest and source release rules
- [ ] `npm run extension:lint:firefox`: Mozilla `web-ext lint` with 0 errors and 0 warnings
- [ ] `npm run extension:test`: all unit and end-to-end tests pass
- [ ] `npm run extension:package`: produces three zips in `extension/dist/`
- [ ] Manual smoke test in Edge and Firefox (see `extension/README.md`)
- [ ] If permissions or data handling changed: update `privacy-policy.md`, `public/sitecheck-privacy.html`, `permission-justification.md` and `reviewer-notes.md` **before** submitting
- [ ] If the UI changed: `npm run extension:screenshots`

## Website (must be live before store submission)
- [ ] Deploy the site (`npm run deploy`) so these URLs work:
  - https://www.xendersecrets.com/sitecheck.html (homepage + CTA target, `#free-audit`)
  - https://www.xendersecrets.com/sitecheck-privacy.html (privacy policy URL)
- [ ] After each store approves, replace that store's "Coming soon" label on `public/sitecheck.html` with the real listing link

## Store order
1. [ ] **Microsoft Edge Add-ons** (free): [edge-listing.md](edge-listing.md)
2. [ ] **Firefox AMO** (free): [firefox-listing.md](firefox-listing.md)
3. [ ] **Chrome Web Store**: [chrome-listing.md](chrome-listing.md). **Do not pay the registration fee until Xender Secrets has its first revenue.**

## Steps only the owner can do
- Microsoft Partner Center sign-in, identity/email verification, agreement acceptance
- Firefox account sign-in / 2FA, AMO distribution agreement
- Chrome developer registration (paid; deferred)
