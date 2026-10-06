// Pages browsers don't let extensions script (or that SiteCheck shouldn't touch).
// Returns null when the URL can be analysed, otherwise { reason, message }.
const STORE_HOSTS = [
  /^chromewebstore\.google\.com$/i,
  /^chrome\.google\.com$/i, // /webstore
  /^microsoftedge\.microsoft\.com$/i, // /addons
  /^addons\.mozilla\.org$/i,
  /^addons\.allizom\.org$/i,
  /^accounts-static\.cdn\.mozilla\.net$/i,
  /^(accounts|addons|content|discovery|install|sync|support)\.(cdn\.)?mozilla\.(org|net)$/i,
];

export const PROTECTED_MESSAGE = "SiteCheck cannot analyze this browser-protected page. Open a normal website and try again.";

export function restrictionFor(rawUrl) {
  if (!rawUrl) return { reason: "unknown", message: PROTECTED_MESSAGE };
  let url;
  try { url = new URL(rawUrl); } catch (e) { return { reason: "unknown", message: PROTECTED_MESSAGE }; }
  const p = url.protocol;
  if (p === "http:" || p === "https:") {
    if (STORE_HOSTS.some((re) => re.test(url.hostname))) {
      if (url.hostname === "chrome.google.com" && !url.pathname.startsWith("/webstore")) return null;
      if (url.hostname === "microsoftedge.microsoft.com" && !url.pathname.startsWith("/addons")) return null;
      return { reason: "store", message: "Browsers don't allow extensions to run on add-on store pages. Open a normal website and try again." };
    }
    if (/\.pdf$/i.test(url.pathname)) return { reason: "pdf", message: "SiteCheck analyses web pages, not PDF files. Open a normal web page and try again." };
    return null;
  }
  if (p === "file:") return { reason: "file", message: "Local files can only be checked if you allow it: open the extension's details page and turn on “Allow access to file URLs”, then try again." };
  return { reason: "protected", message: PROTECTED_MESSAGE };
}

/** Maps a scripting.executeScript error to a friendly message. */
export function messageForError(err, rawUrl) {
  const text = String((err && err.message) || err || "");
  if (/file/i.test(text) && /^file:/i.test(rawUrl || "")) return restrictionFor("file:///x").message;
  if (/gallery|webstore|extensions gallery/i.test(text)) return restrictionFor("https://chromewebstore.google.com/").message;
  if (/pdf/i.test(text)) return restrictionFor("https://x/x.pdf").message;
  if (/(Cannot access|cannot be scripted|Missing host permission|permission|restricted|chrome:\/\/|edge:\/\/|about:)/i.test(text)) return PROTECTED_MESSAGE;
  return "SiteCheck couldn't read this page. Reload the page, wait until it has finished loading, and try again.";
}
