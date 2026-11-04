# GridSnip OCR — Chrome Web Store listing (1.1.0)

Copy each field into the Chrome Web Store dashboard. Lengths are checked by `npm run gridsnip:lint`.

## Title (from manifest)
Copy Table from Image & Video to Excel - GridSnip OCR

## Summary
<!-- field:summary max:132 -->
Snip any on-screen table - web page, PDF or paused video - and paste it into Excel or Google Sheets. Uses your own Gemini key.
<!-- /field -->

## Description
<!-- field:description max:16000 -->
Stop retyping tables. Press Alt+S, drag a box around any table you can see, and GridSnip copies it as real rows and columns. Paste it into Excel, Google Sheets or Notion with Ctrl+V (⌘V on a Mac).

WORKS ON WHAT YOU SEE
• Web pages, charts with data labels and dashboards
• PDFs open in Chrome, including scanned pages
• Paused videos, slides and screenshots shown in the browser

HOW IT WORKS
1. Add your free Google Gemini API key once (get one in Google AI Studio — no GridSnip account needed).
2. Press Alt+S, or click the GridSnip icon and choose "Snip a table on this page".
3. Drag a box around the table. GridSnip shows a preview and copies it as tab-separated rows, so every value lands in its own cell. You can also download it as CSV.

WHY IT'S DIFFERENT
• Uses your own Gemini key: GridSnip has no servers, no account and no GridSnip fee.
• Rows and columns are kept, numbers stay numbers (minus signs, %, currency and separators are preserved), and cells that would start a spreadsheet formula are made safe.
• Picks a current Gemini model automatically when Google retires an old one.
• No background activity: nothing runs until you press the shortcut or click the icon.

PRIVACY
Only the area you select is sent — straight from your browser to Google's Gemini API with your key. Nothing is sent to Xender Secrets. Your key stays in this browser's local extension storage. On Google's free tier, Google may use what you send to improve its products and people may review it, so don't snip confidential or personal information with a free key.

Always check extracted numbers before you rely on them; AI reading can make mistakes.

Made by Xender Secrets, Gurugram, India. Privacy policy: https://www.xendersecrets.com/gridsnip-privacy
<!-- /field -->

## Category
Productivity → Workflow & Planning

## Language
English

## Assets
- Store icon 128×128: `src/icons/icon-128.png`
- Screenshot 1280×800: take one of the snip tab with a selection and the preview (store/screenshots/, not shipped)
