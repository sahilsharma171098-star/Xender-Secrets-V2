// Pages where browsers forbid extensions from running scripts (or where
// running would be pointless). Checked before injecting so the popup can show
// a friendly message instead of an error.

const BLOCKED_SCHEMES = [
  'about:', 'chrome:', 'chrome-extension:', 'chrome-search:', 'chrome-untrusted:', 'devtools:',
  'edge:', 'extension:', 'brave:', 'opera:', 'vivaldi:', 'moz-extension:', 'resource:',
  'view-source:', 'data:', 'blob:', 'javascript:', 'filesystem:', 'ws:', 'wss:', 'ftp:'
];

// Hosts where Chrome, Edge or Firefox block extension scripts by policy.
const BLOCKED_HOSTS = [
  'chromewebstore.google.com',
  'microsoftedge.microsoft.com',
  'addons.mozilla.org',
  'discovery.addons.mozilla.org',
  'accounts.firefox.com',
  'accounts-static.cdn.mozilla.net',
  'api.accounts.firefox.com',
  'oauth.accounts.firefox.com',
  'profile.accounts.firefox.com',
  'addons.cdn.mozilla.net',
  'content.cdn.mozilla.net',
  'install.mozilla.org',
  'support.mozilla.org',
  'sync.services.mozilla.com'
];

/**
 * @param {string|undefined} url
 * @returns {{ ok: true } | { ok: false, reason: 'protected' | 'store' | 'pdf' | 'file' | 'unknown' }}
 */
export function classifyUrl(url) {
  // With activeTab, the browser reveals the URL of any page the extension may
  // run on. No URL therefore means a protected page (chrome://, about:, …).
  if (!url) return { ok: false, reason: 'protected' };
  let u;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, reason: 'unknown' };
  }
  if (BLOCKED_SCHEMES.includes(u.protocol)) return { ok: false, reason: 'protected' };
  if (u.protocol === 'file:') {
    if (/\.pdf$/i.test(u.pathname)) return { ok: false, reason: 'pdf' };
    return { ok: false, reason: 'file' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, reason: 'protected' };
  const host = u.hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(host)) return { ok: false, reason: 'store' };
  if (host === 'chrome.google.com' && u.pathname.startsWith('/webstore')) return { ok: false, reason: 'store' };
  if (/\.pdf$/i.test(u.pathname)) return { ok: false, reason: 'pdf' };
  return { ok: true };
}

export const RESTRICTED_MESSAGES = {
  protected: 'SiteCheck cannot analyze this browser-protected page. Open a normal website and try again.',
  store: 'Browsers do not allow extensions to run on extension stores or account pages. Open a normal website and try again.',
  pdf: 'This looks like a PDF. SiteCheck analyzes web pages, not documents. Open a normal website and try again.',
  file: 'Local files are only supported if you enable “Allow access to file URLs” for SiteCheck in your browser’s extension settings.',
  unknown: 'SiteCheck could not read this tab. Open a normal website and try again.'
};
