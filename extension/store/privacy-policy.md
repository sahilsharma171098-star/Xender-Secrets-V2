# Xender SiteCheck — Privacy Policy

Updated for planned SiteCheck 2.0.0 release, 2 November 2026. SiteCheck 1.0.0 remains free and local-only until the update is published.
Published at: https://www.xendersecrets.com/sitecheck-privacy

Xender SiteCheck ("SiteCheck", "the extension") is made by Xender Secrets, a proprietorship of Sahil Kumar Sharma, Gurugram, Haryana, India. This policy explains exactly what the extension reads, when, and what happens to it.

## Summary

- SiteCheck analyses a web page **only when you click its toolbar button**, and only the tab you are looking at.
- The page analysis runs **locally in your browser**. Optional Pro activation sends only a license key (not page contents, scores or URLs) to Xender Secrets for verification.
- We do **not** collect browsing history, audited page contents, form values, cookies, payment-card details, or messages from the extension. Optional Pro uses an account-bound license key.
- There are **no analytics, no tracking and no advertising** in the extension.

## What the extension reads, and when

When you click the SiteCheck button, the extension runs its bundled audit script once in the current tab. That script reads the page's structure as your browser has rendered it, for example:

- the page title, meta tags (description, viewport, canonical, Open Graph, robots) and the page's language;
- headings, links and their addresses, buttons, images (alt text and sizes) and ARIA attributes;
- form structure — which fields exist, their labels, types and autocomplete settings — **but never what is typed into them** (the script does not read field values);
- computed colours of text (for contrast), element sizes and positions (for sideways-scroll detection), and the number of elements on the page;
- the page address (scheme, host and path) so the report can say which page was checked. The query string and fragment are not included in the result.

The results are shown in the extension popup. They are held only in the popup's memory and disappear when the popup closes. Page audit results are not saved or synced. A Pro user who activates saves a license key in local extension storage (never browser sync).

The extension does not run in the background, does not read other tabs, and cannot see pages you have not clicked it on.

## Optional SiteCheck Pro activation

- Free audits and the free text report require no account or network request.
- Pro purchase/account details are handled separately on the Xender website under its website privacy and refund policies.
- If a user voluntarily activates Pro, the extension sends **only** their entered license key to `https://www.xendersecrets.com/api/sitecheck/license/verify` via HTTPS. The server looks up a SHA-256 hash of the key and returns a boolean status. It receives **no audited URL, page contents, scores, or reports**.
- The key is saved in browser **local** extension storage, not sync. The user can remove it from the popup. Refunded/charged-back purchases lose Pro on successful online revalidation. If validation cannot reach the server, free capabilities remain available.
- The CSV report is generated and downloaded locally; it is not uploaded.

## What leaves your browser

The audited page's data stays local. Optional Pro sends only the license key for verification:

- **"Copy report"** puts a plain-text summary on your clipboard. Where you paste it is up to you.
- **"Get a free website audit"** opens `https://www.xendersecrets.com/sitecheck` in a new tab. The link carries `utm_source=sitecheck_extension`, `utm_medium=extension` and `utm_campaign=human_audit` so we know the visit came from the extension. It does **not** include the address of the page you checked, its score or any audit result. The Xender Secrets website then works under its own [privacy policy](https://www.xendersecrets.com/privacy), and anything you submit there (for example the enquiry form) is sent only when you press its submit button.
- The "Privacy" and "How it's calculated" links simply open pages on www.xendersecrets.com.

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Gives SiteCheck temporary access to the current tab only after you click the toolbar button. |
| `scripting` | Lets SiteCheck run its own bundled audit script in that tab. No remote code is loaded or executed. |

SiteCheck does not request access to all websites, your tabs list, history, cookies, downloads, storage or any other permission.

## Data sharing and sale

We do not sell browsing or audit data. Optional Pro license keys are sent to our first-party license service solely for verifying paid access. Firefox marks authentication information as optional. Firefox users will see this declared in the add-on's data-collection settings ("no data collected").

## Children

The extension is a professional website tool and does not knowingly collect information from anyone, including children.

## Your choices

- Don't click the button on pages you don't want analysed — the extension only runs when you click it.
- You can remove the extension at any time from your browser's extensions page; it removes locally saved license keys with the extension.

## Changes

If a future version ever needs to send data anywhere (for example, an optional feature you switch on), we will update this policy before releasing it, describe the change in the changelog and the store listing, and keep any such feature off by default.

## Contact

Xender Secrets — Sahil Kumar Sharma, Gurugram, Haryana, India · GSTIN 06IQFPS4456B1ZP
Email: Sahilsharma171098@gmail.com · WhatsApp: +91 98219 41814 · https://www.xendersecrets.com/contact
