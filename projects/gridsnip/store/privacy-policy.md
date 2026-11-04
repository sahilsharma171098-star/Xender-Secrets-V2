# GridSnip OCR — Privacy Policy

Updated 4 November 2026 for GridSnip 1.1.0.
Published at: https://www.xendersecrets.com/gridsnip-privacy

GridSnip OCR ("GridSnip", "the extension") is made by Xender Secrets, a proprietorship of Sahil Kumar Sharma, Gurugram, Haryana, India. This policy explains exactly what the extension handles and where it goes.

## Summary

- GridSnip does something **only when you press its shortcut or click "Snip a table"**, and only on the tab you are looking at.
- **Only the area you select** leaves your browser, and it goes **directly to Google's Gemini API** (`generativelanguage.googleapis.com`) using **your own API key**. Nothing is sent to Xender Secrets — GridSnip has no servers.
- There are **no analytics, no tracking, no advertising and no account**.

## What GridSnip handles, and when

- **Screenshot of the visible tab.** When you press the shortcut or click "Snip a table on this page", the extension takes one screenshot of the tab you are looking at (this uses the `activeTab` permission, which Chrome grants only for that action). The screenshot is kept in temporary session storage in memory for the moment it takes to open GridSnip's own snip tab, which deletes it as soon as it has loaded it. It is never saved to disk by GridSnip and disappears when you close the snip tab.
- **The area you select.** When you drag a box, that cropped part of the screenshot is sent as an image to Google's Gemini API so it can be read as a table. Nothing outside your box is sent. The request carries your API key in a request header.
- **The extracted table.** The text Gemini returns is shown in the snip tab and copied to your clipboard (the `clipboardWrite` permission lets GridSnip do that without an extra click). You can also download it as a CSV file. GridSnip does not keep the table after you close the tab.
- **Your Gemini API key** and the name of the Gemini model chosen for it are saved in the browser's local extension storage (the `storage` permission) on this device only — not synced and never sent anywhere except to Google with your own requests. You can remove the key from the GridSnip popup at any time.

## Google Gemini

GridSnip sends your selection to Google under your own Gemini API account, so Google's terms apply to that request. According to Google's Gemini API terms, when you use Google's **free (unpaid) tier**, Google uses the content you submit and the responses to provide, improve and develop its products, and human reviewers may read it; Google asks that you do not submit sensitive, confidential or personal information to the free tier. On a paid Gemini API plan, Google says it does not use prompts or responses to improve its products. Choose your key accordingly, and don't snip confidential or personal data with a free key.

## What GridSnip never does

- It does not read pages in the background, inject scripts into pages, read form fields, cookies or passwords, or access browsing history.
- It does not send anything to Xender Secrets or any party other than Google's Gemini API.
- It does not sell or transfer data, and it does not use data for advertising, credit-worthiness or any purpose other than reading the table you selected.

## Permissions

| Permission | Why |
| --- | --- |
| `activeTab` | Take one screenshot of the tab you are looking at, only when you press the shortcut or click "Snip a table". |
| `storage` | Keep your Gemini API key and chosen model on this device, and hand the screenshot to the snip tab through temporary session storage. |
| `clipboardWrite` | Copy the extracted table to your clipboard automatically. |
| `https://generativelanguage.googleapis.com/*` | Send the selected area to Google's Gemini API with your key — the only network destination. |

## Changes and contact

Material changes will be published on this page with a new date. Questions: use the contact options at https://www.xendersecrets.com/contact.
