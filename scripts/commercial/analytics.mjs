// Google Analytics 4 tag for www.xendersecrets.com (property stream G-C95XL2M3ZQ).
// One source of truth: the page templates (layout.mjs, hud.mjs) embed gaTag(), and
// scripts/build-commercial-pages.mjs runs withGaTag() over every hand-written public/*.html,
// so `npm run check:pages` fails if any served page is missing the tag.
//
// The snippet is Google's install code unchanged, preceded by Google's documented opt-out flag
// (window["ga-disable-<ID>"]) for visitors sending Global Privacy Control / Do Not Track, and for
// framed loads (e.g. /preview inside /preview-builder) so one visit is not counted twice.
// This mirrors the opt-outs xs-growth.js already honours for first-party events.
export const GA_ID = "G-C95XL2M3ZQ";
export const GA_MARK = "<!-- Google tag (gtag.js) -->";
// Private/utility pages that never load the tag.
export const GA_SKIP = new Set(["admin.html"]);

export const gaTag = (indent = "  ") =>
  [
    GA_MARK,
    `<script>try{if(navigator.globalPrivacyControl||navigator.doNotTrack==="1"||window.doNotTrack==="1"||window.self!==window.top)window["ga-disable-${GA_ID}"]=true}catch(e){window["ga-disable-${GA_ID}"]=true}</script>`,
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>`,
    `<script>`,
    `  window.dataLayer = window.dataLayer || [];`,
    `  function gtag(){dataLayer.push(arguments);}`,
    `  gtag('js', new Date());`,
    ``,
    `  gtag('config', '${GA_ID}');`,
    `</script>`,
  ].map((line, i) => (i && line ? indent + line : line)).join("\n");

// Insert the tag as high in <head> as possible: after the viewport meta (or charset meta, or the
// <head> tag itself), keeping <meta charset> first. Idempotent.
export function withGaTag(html) {
  if (html.includes(GA_MARK)) return html;
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
