// Google Analytics 4 tag for www.xendersecrets.com (property stream G-C95XL2M3ZQ).
// One source of truth: the page templates (layout.mjs, hud.mjs) embed gaTag(), and
// scripts/build-commercial-pages.mjs runs withGaTag() over every hand-written public/*.html,
// so `npm run check:pages` fails if any served page is missing the tag.
//
// The snippet is Google's install code unchanged, preceded by Google's documented opt-out flag
// (window["ga-disable-<ID>"]), set when:
// - the host is not the production site (Cloudflare previews on *.workers.dev, localhost, test
//   runners), so test visits never reach the GA property;
// - the visitor sends Global Privacy Control / Do Not Track (mirrors xs-growth.js);
// - the page is framed (e.g. /preview inside /preview-builder), so one visit is not counted twice.
export const GA_ID = "G-C95XL2M3ZQ";
export const GA_MARK = "<!-- Google tag (gtag.js) -->";
// Hostnames that report to GA (apex redirects to www, listed for safety).
export const GA_HOST_RE = "^(www\\.)?xendersecrets\\.com$";
// Private/utility pages that never load the tag.
export const GA_SKIP = new Set(["admin.html"]);

export const gaOptOutJs = () =>
  `try{if(!/${GA_HOST_RE}/.test(location.hostname)||navigator.globalPrivacyControl||navigator.doNotTrack==="1"||window.doNotTrack==="1"||window.self!==window.top)window["ga-disable-${GA_ID}"]=true}catch(e){window["ga-disable-${GA_ID}"]=true}`;

export const gaTag = (indent = "  ") =>
  [
    GA_MARK,
    `<script>${gaOptOutJs()}</script>`,
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>`,
    `<script>`,
    `  window.dataLayer = window.dataLayer || [];`,
    `  function gtag(){dataLayer.push(arguments);}`,
    `  gtag('js', new Date());`,
    ``,
    `  gtag('config', '${GA_ID}');`,
    `</script>`,
  ].map((line, i) => (i && line ? indent + line : line)).join("\n");

// An existing tag block (from GA_MARK through the gtag config </script>), with its indent.
const GA_BLOCK = new RegExp(`([ \\t]*)${GA_MARK.replace(/[()]/g, "\\$&")}[\\s\\S]*?gtag\\('config', '${GA_ID}'\\);\\s*</script>`);

// Insert the tag as high in <head> as possible: after the viewport meta (or charset meta, or the
// <head> tag itself), keeping <meta charset> first. A page that already has the tag gets it
// refreshed in place, so changes to gaTag() reach hand-written pages too. Idempotent.
export function withGaTag(html) {
  const existing = html.match(GA_BLOCK);
  if (existing) {
    const indent = existing[1];
    const lineStart = existing.index === 0 || html[existing.index - 1] === "\n";
    const fresh = (lineStart ? indent : "") + gaTag(lineStart ? indent : "");
    return html.slice(0, existing.index) + (lineStart ? fresh : existing[1] + gaTag("")) + html.slice(existing.index + existing[0].length);
  }
  const head = html.match(/<head[^>]*>/i);
  if (!head) return html;
  const start = head.index + head[0].length;
  const end = html.search(/<\/head>/i);
  const region = html.slice(start, end < 0 ? undefined : end);
  const anchor = region.match(/<meta[^>]+name=["']viewport["'][^>]*>/i) || region.match(/<meta[^>]+charset[^>]*>/i);
  const at = anchor ? start + anchor.index + anchor[0].length : start;
  const multiline = /\n\s*<meta/.test(region.slice(0, 400));
  const indent = multiline ? (region.match(/\n([ \t]*)<meta/) || [, ""])[1] : "";
  return html.slice(0, at) + (multiline ? "\n" + indent : "") + gaTag(multiline ? indent : "") + html.slice(at);
}
