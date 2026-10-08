// XEND-BUILDER-001 — turns a project's file map into ONE HTML document for the sandboxed
// preview frame (shared by the browser and the Node tests).
// - Inlines local stylesheets, scripts and SVG images (the frame has no file server).
// - Injects a tiny runtime first in <head> that: re-renders on request from the studio, turns
//   clicks on links to other project pages into in-preview navigation, blocks real form
//   submission and external navigation, and reports runtime errors to the studio.
// The frame itself is an opaque-origin sandbox with a strict CSP (see src/builder/routes.mjs),
// so nothing here is the security boundary.

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const local = (href) => {
  const h = String(href || "").trim();
  if (!h || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(h)) return null;
  return h.replace(/^\.\//, "").replace(/^\//, "").split(/[?#]/)[0].toLowerCase();
};
const b64 = (s) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
};

export const RUNTIME = `(function(){
var P=parent;function post(m){try{P.postMessage(m,"*")}catch(e){}}
addEventListener("message",function(e){if(e.source!==P)return;var d=e.data||{};if(d.type==="xs-render"&&typeof d.html==="string"){document.open();document.write(d.html);document.close();}});
document.addEventListener("click",function(e){var a=e.target&&e.target.closest?e.target.closest("a[href]"):null;if(!a)return;var h=a.getAttribute("href")||"";
if(/^#/.test(h))return;e.preventDefault();
if(/^(mailto:|tel:)/i.test(h)){post({type:"xs-toast",text:"Link: "+h});return}
if(/^(https?:)?\\/\\//i.test(h)){post({type:"xs-toast",text:"External link (opens on your live site): "+h});return}
post({type:"xs-nav",page:h.replace(/^\\.?\\//,"").split(/[?#]/)[0]})},false);
addEventListener("submit",function(e){e.preventDefault()},false);
addEventListener("error",function(e){post({type:"xs-error",text:String(e.message||"Script error").slice(0,200)})});
post({type:"xs-frame-ready"});
})();`;

export function pagesOf(files) {
  return Object.keys(files || {}).filter((f) => f.endsWith(".html")).sort((a, b) => (a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b)));
}

export function composePreview(files, page = "index.html") {
  const f = files || {};
  const name = f[page] !== undefined ? page : "index.html";
  let html = String(f[name] ?? "<!doctype html><title>Empty</title><p>No index.html yet.</p>");

  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) return tag;
    const href = local((tag.match(/href\s*=\s*(["'])(.*?)\1/i) || [])[2]);
    if (href && f[href] !== undefined) return `<style data-file="${esc(href)}">\n${String(f[href]).replace(/<\/style/gi, "<\\/style")}\n</style>`;
    return tag;
  });
  html = html.replace(/<script\b([^>]*)\bsrc\s*=\s*(["'])(.*?)\2([^>]*)>\s*<\/script\s*>/gi, (tag, a, q, src, b) => {
    const s = local(src);
    if (s && f[s] !== undefined) {
      const attrs = (a + " " + b).replace(/\s+/g, " ").trim();
      return `<script${attrs ? " " + attrs : ""} data-file="${esc(s)}">\n${String(f[s]).replace(/<\/script/gi, "<\\/script")}\n</script>`;
    }
    return tag;
  });
  html = html.replace(/(\s(?:src|href)\s*=\s*)(["'])([^"']+\.svg)\2/gi, (all, pre, q, src) => {
    const s = local(src);
    return s && f[s] !== undefined ? `${pre}${q}data:image/svg+xml;base64,${b64(f[s])}${q}` : all;
  });

  const runtime = `<script data-xs-runtime>${RUNTIME}</script>`;
  if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (m) => m + runtime);
  else if (/<html[^>]*>/i.test(html)) html = html.replace(/<html[^>]*>/i, (m) => m + "<head>" + runtime + "</head>");
  else html = runtime + html;
  if (!/^\s*<!doctype/i.test(html)) html = "<!doctype html>\n" + html;
  return html;
}
