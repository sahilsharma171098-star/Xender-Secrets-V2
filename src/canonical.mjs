// XEND-GSC-INDEXING-001 — one canonical URL per page.
//
// Canonical standard: https://www.xendersecrets.com + extensionless path ("/" for home,
// "/services", "/article-…"), no trailing slash, query string preserved.
// Why extensionless: Cloudflare static assets (html_handling: "auto-trailing-slash") already
// serve /page with HTTP 200 and redirect /page.html → /page — but with a *307* (temporary).
// Sitemap, canonicals and internal links already use the extensionless form.
//
// This module runs before the static-asset layer (wrangler.jsonc run_worker_first) and turns
// every duplicate variant into ONE permanent 301 straight to the final URL:
//   http://xendersecrets.com/about.html  → 301 https://www.xendersecrets.com/about
//   https://xendersecrets.com/about      → 301 https://www.xendersecrets.com/about
//   https://www.xendersecrets.com/about/ → 301 https://www.xendersecrets.com/about
//   /index.html, /index                  → 301 /
// If the normalised URL is itself redirected by public/_redirects (e.g. the Gurgaon alias),
// we follow that rule here so the visitor still gets a single hop, not a chain.
export const CANONICAL_ORIGIN = "https://www.xendersecrets.com";
export const PRODUCTION_HOSTS = new Set(["xendersecrets.com", "www.xendersecrets.com"]);

/** Path normalisation shared by every host (production and preview deployments). */
export function normalizePath(pathname) {
  let p = pathname;
  if (p.length > 1) p = p.replace(/\/+$/, "") || "/";
  p = p.replace(/\/index(\.html)?$/, "/");
  if (p.endsWith(".html")) p = p.slice(0, -5) || "/";
  return p || "/";
}

/**
 * The canonical form of a request URL, or null when it is already canonical.
 * Only production hosts are moved to https://www; preview/local hosts keep their origin so the
 * same rules can be tested on workers.dev previews and `wrangler dev`.
 */
export function canonicalTarget(href) {
  const url = new URL(href);
  if (url.pathname.startsWith("/api/")) return null;
  const target = new URL(url.href);
  if (PRODUCTION_HOSTS.has(url.hostname)) {
    target.protocol = "https:";
    target.host = "www.xendersecrets.com";
  }
  target.pathname = normalizePath(url.pathname);
  return target.href === url.href ? null : target.href;
}

const permanent = (location, status = 301) => new Response(null, {
  status,
  headers: { location, "cache-control": "public, max-age=3600", "x-xender-canonical": "1" },
});

/**
 * Returns a redirect Response for non-canonical GET/HEAD requests, else null.
 * `assets` is the ASSETS binding; it is asked (redirect: manual) whether the normalised path is
 * itself a _redirects rule, so the visitor gets the rule's destination in one hop.
 */
export async function canonicalRedirect(request, assets) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const target = canonicalTarget(request.url);
  if (!target) return null;
  if (assets) {
    try {
      const probe = await assets.fetch(new Request(target, { method: "HEAD", redirect: "manual" }));
      const loc = probe.headers.get("location");
      if (probe.status >= 300 && probe.status < 400 && loc) {
        const next = new URL(loc, target);
        const final = canonicalTarget(next.href) || next.href;
        // Keep a temporary rule temporary (e.g. /p/:id 302); everything else is permanent.
        return permanent(final, probe.status === 302 ? 302 : 301);
      }
    } catch { /* asset layer unavailable: fall back to the direct canonical redirect */ }
  }
  return permanent(target);
}
