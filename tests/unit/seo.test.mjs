// XEND-SEO-TRAFFIC-001: crawl/index invariants for the public site. Pure file checks — no
// browser, no network — so they run in every CI job and fail before a bad sitemap ships.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { allPages, INDUSTRIES, LOCATIONS } from "../../scripts/commercial/pages.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUBLIC = path.join(ROOT, "public");
const SITE = "https://www.xendersecrets.com";
const read = (f) => fs.readFileSync(path.join(PUBLIC, f), "utf8");
const fileForUrl = (u) => { const p = new URL(u).pathname; return p === "/" ? "index.html" : p.slice(1) + ".html"; };
const meta = (html, re) => (html.match(re) || [])[1];
const robotsOf = (html) => meta(html, /<meta name="robots" content="([^"]*)"/);
const canonicalOf = (html) => meta(html, /<link rel="canonical" href="([^"]*)"/);
const titleOf = (html) => meta(html, /<title>([^<]*)<\/title>/);
const sitemapUrls = [...read("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const jsonLd = (html) => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));
const redirects = read("_redirects").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => l.split(/\s+/));

test("sitemap lists only canonical, indexable pages that exist", () => {
  assert.ok(sitemapUrls.length >= 20);
  assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, "no duplicate URLs");
  for (const u of sitemapUrls) {
    assert.ok(u.startsWith(SITE + "/"), u + " uses https://www");
    assert.ok(!u.endsWith(".html"), u + " is the extensionless URL Cloudflare serves with 200");
    const f = fileForUrl(u);
    assert.ok(fs.existsSync(path.join(PUBLIC, f)), u + " has a file");
    const html = read(f);
    assert.ok(robotsOf(html) && !/noindex/.test(robotsOf(html)), u + " is indexable");
    assert.equal(canonicalOf(html), u, u + " canonical matches sitemap");
  }
  for (const priv of ["/admin", "/preview", "/preview-builder", "/reader", "/account", "/catalog"]) assert.ok(!sitemapUrls.includes(SITE + priv), priv + " stays out");
});

test("priority commercial pages are all in the sitemap", () => {
  for (const { file } of allPages()) {
    const html = read(file);
    if (/noindex/.test(robotsOf(html))) continue;
    assert.ok(sitemapUrls.includes(canonicalOf(html)), file + " in sitemap");
  }
  assert.ok(sitemapUrls.includes(SITE + "/website-cost-calculator"), "calculator is indexable");
});

test("robots.txt allows crawling and points at the www sitemap", () => {
  const robots = read("robots.txt");
  assert.match(robots, /^Sitemap: https:\/\/www\.xendersecrets\.com\/sitemap\.xml$/m);
  assert.doesNotMatch(robots, /^Disallow: \/\s*$/m);
});

test("indexable pages have unique titles and descriptions", () => {
  const titles = new Map(); const descs = new Map();
  for (const u of sitemapUrls) {
    const html = read(fileForUrl(u));
    const t = titleOf(html); const d = meta(html, /<meta name="description" content="([^"]*)"/);
    assert.ok(t, u + " has a title"); assert.ok(d, u + " has a description");
    assert.ok(!titles.has(t), `duplicate title: ${u} and ${titles.get(t)}`); titles.set(t, u);
    assert.ok(!descs.has(d), `duplicate description: ${u} and ${descs.get(d)}`); descs.set(d, u);
  }
});

test("generated pages link internally to final URLs, never to redirecting .html URLs", () => {
  for (const { file, html } of allPages()) {
    const hrefs = [...html.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
    for (const h of hrefs) {
      assert.doesNotMatch(h, /^\/[^?#]*\.html/, `${file} links to ${h}`);
      const p = h.split(/[?#]/)[0];
      const f = p === "/" ? "index.html" : p.slice(1);
      assert.ok(fs.existsSync(path.join(PUBLIC, f)) || fs.existsSync(path.join(PUBLIC, f + ".html")), `${file} -> ${h} resolves`);
    }
  }
});

test("homepage and pricing page link every location and industry page", () => {
  const pages = Object.fromEntries(allPages().map((p) => [p.file, p.html]));
  for (const hub of ["index.html", "services.html"]) {
    for (const { file } of [...LOCATIONS, ...INDUSTRIES]) {
      assert.ok(pages[hub].includes(`href="/${file.replace(/\.html$/, "")}"`), `${hub} links /${file}`);
    }
  }
});

test("industry and location pages carry honest Service + Breadcrumb schema", () => {
  for (const { file } of [...LOCATIONS, ...INDUSTRIES]) {
    const lds = jsonLd(read(file));
    const types = lds.map((l) => l["@type"]);
    for (const t of ["ProfessionalService", "Service", "FAQPage", "BreadcrumbList"]) assert.ok(types.includes(t), `${file} has ${t}`);
    const service = lds.find((l) => l["@type"] === "Service");
    assert.equal(service.provider["@id"], SITE + "/#business");
    assert.equal(service.url, canonicalOf(read(file)));
    for (const item of lds.find((l) => l["@type"] === "BreadcrumbList").itemListElement) assert.doesNotMatch(item.item, /\.html$/);
    const raw = JSON.stringify(lds);
    for (const banned of ["aggregateRating", "Review", "ratingValue", "streetAddress"]) assert.ok(!raw.includes(banned), `${file} has no invented ${banned}`);
  }
});

test("Gurgaon searches land on the single Gurugram page", () => {
  const html = read("website-development-gurugram.html");
  assert.match(titleOf(html), /Gurgaon/);
  assert.match(html, /<h1>[^<]*Gurgaon/);
  for (const src of ["/website-development-gurgaon", "/website-development-gurgaon.html"]) {
    const r = redirects.find(([from]) => from === src);
    assert.ok(r, src + " redirect exists");
    assert.deepEqual(r.slice(1), ["/website-development-gurugram", "301"]);
  }
});

test("redirects never shadow a sitemap URL and always land on a real page", () => {
  for (const [from, to, code] of redirects) {
    assert.ok(!sitemapUrls.includes(SITE + from), from + " is in the sitemap but redirects");
    if (code === "301" && !to.includes(":")) {
      const f = to === "/" ? "index.html" : to.slice(1).split("?")[0];
      assert.ok(fs.existsSync(path.join(PUBLIC, f)) || fs.existsSync(path.join(PUBLIC, f + ".html")), `${from} -> ${to} target exists`);
    }
  }
});

test("IndexNow key is served from public/ and the payload only carries our sitemap URLs", async () => {
  const { findKey, sitemapUrls: urls, buildPayload } = await import("../../scripts/seo/indexnow.mjs");
  const key = findKey();
  assert.match(key, /^[a-f0-9]{32}$/);
  assert.ok(!/Disallow: \/[a-f0-9]{32}\.txt/.test(read("robots.txt")));
  const p = buildPayload({ key, urls: [...urls(), "https://evil.example/x"] });
  assert.equal(p.host, "www.xendersecrets.com");
  assert.equal(p.keyLocation, `${SITE}/${key}.txt`);
  assert.deepEqual(p.urlList, sitemapUrls);
});

// ---------------------------------------------------------------- XEND-GSC-INDEXING-001
const { ARTICLES } = await import("../../scripts/commercial/articles.mjs");
const { normalizeHtml, normalizeJs, targets } = await import("../../scripts/seo/normalize-links.mjs");
const { HUBS } = await import("../../scripts/seo/hubs.mjs");
const allHtml = fs.readdirSync(PUBLIC).filter((f) => f.endsWith(".html"));
const bodyWords = (html) => html.replace(/<(script|style|header|footer|nav|form)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " ").split(/\s+/).filter(Boolean).length;

test("every public page declares robots; every indexable page is self-canonical and in the sitemap", () => {
  const exempt = new Set();
  for (const f of allHtml) {
    if (exempt.has(f)) continue;
    const html = read(f);
    const robots = robotsOf(html);
    assert.ok(robots, f + " has meta robots");
    if (/noindex/.test(robots)) { assert.ok(!sitemapUrls.includes(SITE + "/" + f.replace(/\.html$/, "")), f + " noindex but in sitemap"); continue; }
    const expected = SITE + (f === "index.html" ? "/" : "/" + f.replace(/\.html$/, ""));
    assert.equal(canonicalOf(html), expected, f + " self-canonical");
    assert.ok(sitemapUrls.includes(expected), f + " indexable but missing from sitemap");
  }
});

test("no internal .html links anywhere in public HTML or JS (they would 301)", () => {
  for (const file of targets(PUBLIC)) {
    const src = fs.readFileSync(file, "utf8");
    const out = file.endsWith(".html") ? normalizeHtml(src) : normalizeJs(src);
    assert.equal(out, src, path.basename(file) + " has non-canonical internal links");
  }
  assert.equal(normalizeHtml('<a href="index.html">'), '<a href="/">');
  assert.equal(normalizeHtml('<a href="./faq.html#x">'), '<a href="/faq#x">');
  assert.equal(normalizeJs("location.href='account.html?next=ideas.html%23share'"), "location.href='/account?next=/ideas%23share'");
  assert.equal(normalizeHtml('<a href="https://wa.me/1?text=see%20faq.html">'), '<a href="https://wa.me/1?text=see%20faq.html">');
});

test("private, utility, demo and thin pages are intentionally excluded", () => {
  for (const f of ["admin.html", "account.html", "preview.html", "preview-builder.html", "sample-preview.html", "template-preview.html", "catalog.html", "reader.html", "community.html", "ideas.html", "404.html"]) {
    assert.match(robotsOf(read(f)), /noindex/, f);
  }
  for (const f of allHtml.filter((x) => x.startsWith("demo-"))) assert.match(robotsOf(read(f)), /noindex/, f);
  const headers = read("_headers");
  for (const p of ["/admin", "/account", "/reader", "/catalog", "/sample-preview", "/template-preview", "/preview*", "/p/*"]) {
    assert.match(headers, new RegExp("^" + p.replace(/[*]/g, "\\*") + "\\n\\s+X-Robots-Tag: noindex", "m"), "_headers X-Robots-Tag for " + p);
  }
  const robots = read("robots.txt");
  for (const p of ["/admin", "/api/", "/preview"]) assert.match(robots, new RegExp("^Disallow: " + p, "m"));
});

test("indexable articles are complete guides with honest BlogPosting schema", () => {
  const indexable = allHtml.filter((f) => f.startsWith("article-") && !/noindex/.test(robotsOf(read(f))));
  assert.deepEqual(indexable.sort(), ARTICLES.map((a) => a.file).sort(), "only rewritten guides are indexable");
  for (const f of indexable) {
    const html = read(f);
    assert.ok(bodyWords(html) >= 550, `${f} body has ${bodyWords(html)} words`);
    const post = jsonLd(html).find((l) => l["@type"] === "BlogPosting");
    assert.ok(post, f + " has BlogPosting");
    assert.equal(post.mainEntityOfPage["@id"], canonicalOf(html));
    assert.ok(post.datePublished && post.dateModified && post.image && post.author && post.publisher, f + " BlogPosting fields");
    assert.ok(!JSON.stringify(post).includes(".html"), f + " schema uses canonical URLs");
  }
  // Remaining legacy articles still carry valid Article JSON-LD pointing at canonical URLs.
  for (const f of allHtml.filter((x) => x.startsWith("article-") && !indexable.includes(x))) {
    for (const l of jsonLd(read(f))) assert.ok(!JSON.stringify(l).includes(".html"), f + " schema .html URL");
  }
});

test("hub pages ship real content in HTML (not only after JavaScript) and stay in sync", () => {
  for (const [file, transform] of Object.entries(HUBS)) {
    const html = read(file);
    assert.equal(transform(html), html, file + " is stale — run npm run build:pages");
    assert.ok(bodyWords(html) >= 450, `${file} has ${bodyWords(html)} words of server-rendered content`);
    assert.ok(jsonLd(html).some((l) => l["@type"] === "CollectionPage"), file + " CollectionPage");
    assert.ok(jsonLd(html).some((l) => l["@type"] === "BreadcrumbList"), file + " BreadcrumbList");
  }
  const catalog = read("website-catalog.html");
  assert.match(catalog, /concept demo built by Xender Secrets/);
  for (const id of ["FE-01", "BE-01", "FS-01"]) assert.ok(catalog.includes(`id=${id}`), "catalog pre-renders " + id);
});

test("homepage links strongly to the high-value pages", () => {
  const home = read("index.html");
  for (const p of ["/services", "/website-catalog", "/articles", "/about", "/faq", "/contact", "/website-cost-calculator", ...ARTICLES.map((a) => "/" + a.file.replace(/\.html$/, ""))]) {
    assert.ok(new RegExp(`href="${p}["#?]`).test(home), "home links " + p);
  }
  const nav = home.match(/<nav class="nav"[\s\S]*?<\/nav>/)[0];
  for (const p of ["/services", "/website-catalog", "/articles", "/about"]) assert.ok(nav.includes(`href="${p}"`), "home header nav links " + p);
});

test("FAQ page answers match published prices and carry FAQPage schema", () => {
  const faq = read("faq.html");
  const ld = jsonLd(faq).find((l) => l["@type"] === "FAQPage");
  assert.ok(ld && ld.mainEntity.length >= 15);
  assert.match(faq, /₹999 \+ ₹179\.82 GST = ₹1,178\.82/);
  assert.doesNotMatch(faq, /free shipping at ₹499/i, "outdated shop-era copy removed");
});
