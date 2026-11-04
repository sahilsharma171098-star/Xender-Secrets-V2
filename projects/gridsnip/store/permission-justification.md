# GridSnip 1.1.0 — Chrome Web Store "Privacy practices" answers

## Single purpose
Extracts a table from an area of the screen the user selects and copies it to the clipboard as spreadsheet-ready rows and columns.

## Permission justifications
- `activeTab`: Takes one screenshot of the tab the user is looking at, only when the user presses the GridSnip shortcut or clicks "Snip a table" in the popup.
- `storage`: Saves the user's own Gemini API key and chosen model in local extension storage on this device, and passes the screenshot to GridSnip's snip tab through temporary in-memory session storage (deleted as soon as the tab loads it).
- `clipboardWrite`: Copies the extracted table to the clipboard automatically so the user can paste it straight into Excel or Google Sheets.
- Host permission `https://generativelanguage.googleapis.com/*`: Sends only the user-selected area to Google's Gemini API with the user's own API key to read the table. This is the only network destination; nothing is sent to the developer.

## Remote code
No, I am not using remote code. All JavaScript is in the package; the only network calls are JSON requests to the Gemini API.

## Data usage (tick exactly these)
- **Website content** — the selected screenshot area (text and images on the screen) is sent to Google's Gemini API to read the table.
- **Authentication information** — the user's own Gemini API key, stored locally and sent only to Google as part of the user's request.
Leave every other category unticked (no personally identifiable information, health, financial or payment information, personal communications, location, web history or user activity is collected).

Certify all three statements: data is not sold or transferred to third parties outside the approved use case (sending the selection to the Gemini API is the extension's single purpose, at the user's request); not used for unrelated purposes; not used for credit-worthiness or lending.

## Privacy policy URL
https://www.xendersecrets.com/gridsnip-privacy (must be live before submitting)

## Test instructions for the reviewer
Install, open the welcome page, paste a Gemini API key from https://aistudio.google.com/apikey, press Alt+S (or click the icon → "Snip a table on this page") on the practice table, drag a box around it, and paste into a spreadsheet. A reviewer key can be supplied privately in the dashboard's test-instructions field if needed.
