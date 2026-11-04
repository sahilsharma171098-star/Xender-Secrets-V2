# GridSnip changelog

## 1.1.0 — 2026-11-04 (first submission from the Xender HQ repo)
- Rebuilt: the 1.0.0 draft could not work (the content script never received the screenshot, called APIs content scripts cannot use, sent a message nobody handled, used a placeholder Gemini key and a placeholder Gumroad product, and showed browser alert dialogs).
- New flow: shortcut or popup → screenshot of the visible tab → GridSnip's own snip tab → drag a box → Gemini reads the crop → preview, automatic copy as TSV, CSV download.
- Works on PDFs, videos and any page Chrome lets an extension capture, because nothing is injected into the page. Permission `scripting` removed.
- Uses the user's own Gemini key (sent in a header, never in the URL); validates the key and picks a current Gemini model automatically, re-picking when Google retires one.
- Removed the "5 free snips per day" counter and the "$14 Pro" paywall: neither had a working backend. Paid plans need a real licence system first.
- Clear errors for invalid keys, quota, model retirement, network failures, blocked or empty answers; cancel with Esc.
- Spreadsheet-safe cells: formula-like text is neutralised, real numbers kept.
