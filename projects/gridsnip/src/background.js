// GridSnip service worker: shortcut, popup "Snip a table" and the first-run welcome page.
import { startSnip } from "./lib/capture.js";

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") chrome.tabs.create({ url: "welcome.html" });
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "start-snip") startSnip(tab, chrome);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only the popup (an extension page without a tab) may start a snip by message.
  if (message && message.type === "gridsnip:start" && sender.id === chrome.runtime.id && !sender.tab) {
    startSnip(null, chrome).then(sendResponse, () => sendResponse({ ok: false }));
    return true;
  }
  return false;
});

// Used by the automated extension test only (tests/e2e.test.mjs), which cannot press the shortcut.
self.gridsnipStartSnip = (tab) => startSnip(tab, chrome);
