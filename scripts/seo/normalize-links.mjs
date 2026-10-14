#!/usr/bin/env node
// XEND-GSC-INDEXING-001 — make every internal link point at the canonical extensionless URL.
//
// Hand-written legacy pages (articles, catalog, novels, community…) and their scripts link to
// "about.html", "./faq.html", "/community.html?post=…". Each of those now costs a 301 hop, and
// Google treats a page's internal links as a canonical signal. This rewrites them in place:
//   href="index.html"            → href="/"
//   href="articles.html#x"       → href="/articles#x"
//   'account.html?next=ideas.html' (JS) → '/account?next=/ideas'
// Also fixes structured-data / og:url values that point at .html URLs on our host.
// Idempotent. Usage:
//   node scripts/seo/normalize-links.mjs          # rewrite public/*.html and public/*.js
//   node scripts/seo/normalize-links.mjs --check  # exit 1 if anything would change (CI)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMain } from "../lib/is-main.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUBLIC = path.join(ROOT, "public");
const page = (name) => (name === "index" ? "/" : "/" + name);

export function normalizeHtml(html) {
  return html
    // href/action attributes: optional ./ or / prefix, a root-level page name, .html, then end/?/#
    .replace(/\b(href|action|src)=(["'])(?:\.\/|\/)?([a-z0-9][a-z0-9-]*)\.html(?=[?#"'])/g, (_, attr, q, name) => `${attr}=${q}${page(name)}`)
    // absolute URLs on our host (canonical, og:url, JSON-LD mainEntityOfPage, etc.)
    .replace(/https:\/\/www\.xendersecrets\.com\/([a-z0-9][a-z0-9-]*)\.html\b/g, (_, name) => "https://www.xendersecrets.com" + page(name))
    // inline scripts: same rules as JS files
    .replace(/(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/g, (_, open, body, close) => open + normalizeJs(body) + close);
}

export function normalizeJs(js) {
  return js
    // string literals that start with a page: 'account.html?next=…', "/community.html?post="
    .replace(/(["'`])(?:\.\/|\/)?([a-z0-9][a-z0-9-]*)\.html(?=[?#"'`%])/g, (_, q, name) => q + page(name))
    // page names inside a query value: next=ideas.html%23share → next=/ideas%23share
    .replace(/([?&]next=)([a-z0-9][a-z0-9-]*)\.html(?=[%#&"'`])/g, (_, k, name) => k + page(name))
    .replace(/https:\/\/www\.xendersecrets\.com\/([a-z0-9][a-z0-9-]*)\.html\b/g, (_, name) => "https://www.xendersecrets.com" + page(name));
}

export function targets(dir = PUBLIC) {
  return fs.readdirSync(dir).filter((f) => /\.(html|js)$/.test(f)).map((f) => path.join(dir, f));
}

if (isMain(import.meta.url)) {
  const check = process.argv.includes("--check");
  const changed = [];
  for (const file of targets()) {
    const src = fs.readFileSync(file, "utf8");
    const out = file.endsWith(".html") ? normalizeHtml(src) : normalizeJs(src);
    if (out === src) continue;
    changed.push(path.relative(ROOT, file));
    if (!check) fs.writeFileSync(file, out);
  }
  if (check && changed.length) { console.error("Internal links not canonical (run `node scripts/seo/normalize-links.mjs`): " + changed.join(", ")); process.exit(1); }
  console.log(check ? "Internal links are canonical." : `normalised ${changed.length} files`);
}
