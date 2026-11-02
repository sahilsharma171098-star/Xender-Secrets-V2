# Notes for store reviewers — SiteCheck 2.0.0 (pending release)

**Purpose:** user-clicked local website QA audit with optional paid local priority CSV export. All 49 checks and text report copying remain free. No background monitoring, ads or analytics.

**Permissions:** `activeTab` and `scripting` inspect only the clicked active page. `storage` stores the voluntarily supplied Pro license key locally. The only host permission is `https://www.xendersecrets.com/*` for first-party license validation; no broad website access or remote code.

**Optional Pro flow:** The customer buys the ₹499 one-time SiteCheck Pro SKU on Xender Secrets (only after PayU readiness gates), signs in with that purchase email, generates a secret at /sitecheck-pro, and pastes it into the extension. Only the key is POSTed to /api/sitecheck/license/verify; no audited pages, URLs, scores or reports are transmitted. Server stores a key hash and checks captured, non-refunded entitlement status. Free features still work when offline. Refunds revoke paid CSV export at next validation.

**Test:** Install and click SiteCheck on a normal webpage: verify health score, findings and free Copy report. Pro reviewer needs a private, pre-provisioned test key to verify CSV export. Do not charge a real card without authorization.

**Privacy:** https://www.xendersecrets.com/sitecheck-privacy. Firefox declares optional authenticationInfo.
