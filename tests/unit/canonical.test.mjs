// XEND-GSC-INDEXING-001: canonical URL normalisation (pure functions, no Worker runtime).
import test from "node:test";
import assert from "node:assert/strict";
import { canonicalTarget, normalizePath, canonicalRedirect } from "../../src/canonical.mjs";

const W = "https://www.xendersecrets.com";

test("duplicate variants map to the one https://www extensionless URL", () => {
  const cases = {
    "http://xendersecrets.com/": W + "/",
    "https://xendersecrets.com/": W + "/",
    "http://www.xendersecrets.com/": W + "/",
    "http://xendersecrets.com/index.html": W + "/",
    "https://www.xendersecrets.com/index.html": W + "/",
    "https://www.xendersecrets.com/index": W + "/",
    "https://www.xendersecrets.com/contact.html": W + "/contact",
    "https://www.xendersecrets.com/contact/": W + "/contact",
    "http://xendersecrets.com/about.html": W + "/about",
    "https://xendersecrets.com/services": W + "/services",
    "https://www.xendersecrets.com/article-full-stack-development-guide.html": W + "/article-full-stack-development-guide",
    "https://www.xendersecrets.com/template-preview.html?id=REAL-01": W + "/template-preview?id=REAL-01",
    "https://www.xendersecrets.com/services.html#pricing": W + "/services#pricing",
  };
  for (const [from, to] of Object.entries(cases)) assert.equal(canonicalTarget(from), to, from);
});

test("canonical URLs and non-page paths are left alone", () => {
  for (const u of [W + "/", W + "/contact", W + "/services?utm_source=x", W + "/robots.txt", W + "/sitemap.xml", W + "/home.css", W + "/og-xender.png"]) {
    assert.equal(canonicalTarget(u), null, u);
  }
  // API routes are never redirected (POST bodies, CORS, clients that don't follow redirects).
  assert.equal(canonicalTarget("https://xendersecrets.com/api/lead"), null);
  assert.equal(canonicalTarget(W + "/api/health"), null);
});

test("preview and local hosts keep their origin but still normalise paths", () => {
  assert.equal(canonicalTarget("https://abc-xender-secrets-v2.example.workers.dev/about.html"), "https://abc-xender-secrets-v2.example.workers.dev/about");
  assert.equal(canonicalTarget("http://127.0.0.1:8787/index.html"), "http://127.0.0.1:8787/");
  assert.equal(canonicalTarget("http://127.0.0.1:8787/about"), null);
});

test("normalizePath", () => {
  assert.equal(normalizePath("/"), "/");
  assert.equal(normalizePath("//"), "/");
  assert.equal(normalizePath("/about/"), "/about");
  assert.equal(normalizePath("/about.html"), "/about");
  assert.equal(normalizePath("/index.html"), "/");
  assert.equal(normalizePath("/preview/"), "/preview");
});

const assets = (rules = {}) => ({
  async fetch(req) {
    const p = new URL(req.url).pathname;
    if (rules[p]) return new Response(null, { status: rules[p][0], headers: { location: rules[p][1] } });
    return new Response("ok", { status: 200 });
  },
});

test("redirect is a single permanent hop, following _redirects rules in the same hop", async () => {
  const r1 = await canonicalRedirect(new Request("http://xendersecrets.com/about.html"), assets());
  assert.equal(r1.status, 301);
  assert.equal(r1.headers.get("location"), W + "/about");

  const r2 = await canonicalRedirect(new Request("http://xendersecrets.com/website-development-gurgaon.html"),
    assets({ "/website-development-gurgaon": [301, "/website-development-gurugram"] }));
  assert.equal(r2.status, 301);
  assert.equal(r2.headers.get("location"), W + "/website-development-gurugram");

  // A temporary rule (client preview short links) stays temporary.
  const r3 = await canonicalRedirect(new Request("https://xendersecrets.com/p/abc"), assets({ "/p/abc": [302, "/preview?id=abc"] }));
  assert.equal(r3.status, 302);
  assert.equal(r3.headers.get("location"), W + "/preview?id=abc");

  assert.equal(await canonicalRedirect(new Request(W + "/about"), assets()), null);
  assert.equal(await canonicalRedirect(new Request("https://xendersecrets.com/contact.html", { method: "POST", body: "x" }), assets()), null);
  // Asset layer failure must not break the redirect.
  const r4 = await canonicalRedirect(new Request("https://xendersecrets.com/faq"), { fetch: () => { throw new Error("down"); } });
  assert.equal(r4.headers.get("location"), W + "/faq");
});
