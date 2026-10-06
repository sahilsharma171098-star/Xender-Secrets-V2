#!/usr/bin/env node
// Generates the commercial pages (home, pricing, about, contact, industry and location pages)
// from scripts/commercial/*. Usage:
//   node scripts/build-commercial-pages.mjs          # write public/*.html
//   node scripts/build-commercial-pages.mjs --check  # fail if committed pages are stale
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { allPages, CONTENT_DATE } from "./commercial/pages.mjs";

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const check = process.argv.includes("--check");
const stale = [];
for (const { file, html } of allPages()) {
  const target = path.join(PUBLIC, file);
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
  if (current === html) continue;
  if (check) stale.push(file);
  else { fs.writeFileSync(target, html); console.log("wrote public/" + file); }
}
// Sitemap: every indexable page in public/ (robots meta allows indexing), commercial pages first.
// lastmod is preserved from the existing sitemap; generated pages carry CONTENT_DATE.
const SITE = "https://www.xendersecrets.com";
const EXCLUDE = new Set(["reader.html", "demo-gym.html", "demo-local.html", "demo-pro.html"]);
const sitemapPath = path.join(PUBLIC, "sitemap.xml");
const oldSitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, "utf8") : "";
const oldLastmod = Object.fromEntries([...oldSitemap.matchAll(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)].map((m) => [m[1].replace(/\.html$/, ""), m[2]]));
const generated = new Set(allPages().map((p) => p.file));
const priority = (f) => f === "index.html" ? "1.0" : ["services.html", "contact.html"].includes(f) ? "0.9" : generated.has(f) ? "0.8" : null;
const files = fs.readdirSync(PUBLIC).filter((f) => f.endsWith(".html") && !EXCLUDE.has(f)).filter((f) => {
  const robots = (fs.readFileSync(path.join(PUBLIC, f), "utf8").match(/<meta name="robots" content="([^"]*)"/) || [])[1];
  return robots !== undefined && !/noindex/.test(robots);
}).sort((a, b) => (generated.has(b) - generated.has(a)) || (a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b)));
const urls = files.map((f) => {
  const loc = SITE + (f === "index.html" ? "/" : "/" + f.replace(/\.html$/, ""));
  const lastmod = generated.has(f) ? CONTENT_DATE : (oldLastmod[loc] || CONTENT_DATE);
  const pr = priority(f);
  return `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod>${pr ? `<priority>${pr}</priority>` : ""}</url>`;
});
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
if (sitemap !== oldSitemap) {
  if (check) stale.push("sitemap.xml");
  else { fs.writeFileSync(sitemapPath, sitemap); console.log("wrote public/sitemap.xml (" + urls.length + " urls)"); }
}

if (check) {
  if (stale.length) { console.error("Stale generated pages (run `npm run build:pages`): " + stale.join(", ")); process.exit(1); }
  console.log("Commercial pages are up to date.");
}
