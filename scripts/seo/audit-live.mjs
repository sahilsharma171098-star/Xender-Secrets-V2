#!/usr/bin/env node
// Baseline run marker: 2026-10-07.
// XEND-GSC-INDEXING-001 — live indexing audit of production (read-only GET/HEAD requests).
//
// For every sitemap URL, every URL Google Search Console flagged, and the common duplicate
// variants of each (http://, apex host, .html, trailing slash) it records the redirect chain,
// final status, canonical, meta robots, X-Robots-Tag and sitemap membership, then checks:
//   - sitemap URLs: 200, indexable, self-canonical, no redirect
//   - every variant: exactly one 301 hop straight to the canonical https://www URL
// Usage:
//   node scripts/seo/audit-live.mjs                 # report (markdown to stdout)
//   node scripts/seo/audit-live.mjs --strict        # also exit 1 on any violation
//   node scripts/seo/audit-live.mjs --json out.json # also write raw results
import fs from "node:fs";
import { isMain } from "../lib/is-main.mjs";

const SITE = "https://www.xendersecrets.com";
const APEX = "xendersecrets.com";
// Reported by Google Search Console as "Crawled – currently not indexed" (2026-10-07).
export const GSC_REPORTED = [
  "http://xendersecrets.com/",
  "https://www.xendersecrets.com/contact",
  "https://www.xendersecrets.com/contact.html",
  "https://www.xendersecrets.com/articles.html",
  "https://www.xendersecrets.com/article-full-stack-development-guide.html",
  "https://www.xendersecrets.com/article-community-led-growth.html",
  "https://www.xendersecrets.com/website-catalog.html",
  "https://www.xendersecrets.com/demo-backend-api",
  "https://www.xendersecrets.com/services.html",
  "https://www.xendersecrets.com/novels.html",
  "https://www.xendersecrets.com/about.html",
  "https://www.xendersecrets.com/faq.html",
];
// Pages that must stay out of the index (checked for noindex or a redirect away).
export const MUST_NOT_INDEX = ["/admin", "/account", "/preview", "/preview-builder", "/sample-preview", "/template-preview", "/catalog", "/reader", "/demo-backend-api"];

/** Canonical form of any URL on our hosts: https, www, no .html, no trailing slash, / for index. */
export function canonicalOf(u) {
  const url = new URL(u);
  let p = url.pathname.replace(/\/index(\.html)?$/, "/").replace(/\.html$/, "");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return SITE + (p || "/") + url.search;
}

export function variantsOf(canonical) {
  const p = new URL(canonical).pathname;
  const out = [`http://${APEX}${p}`, `https://${APEX}${p}`, `http://www.${APEX}${p}`];
  if (p === "/") out.push(`${SITE}/index.html`, `http://${APEX}/index.html`);
  else out.push(`${SITE}${p}.html`, `${SITE}${p}/`, `http://${APEX}${p}.html`);
  return out;
}

const pick = (html, re) => (html.match(re) || [])[1] ?? null;

async function probe(start) {
  const hops = [];
  let url = start;
  for (let i = 0; i < 6; i++) {
    let res;
    try { res = await fetch(url, { redirect: "manual", headers: { "user-agent": "XenderSEOAudit/1.0 (+https://www.xendersecrets.com)" } }); }
    catch (e) { return { start, hops, error: String(e.cause?.code || e.message) }; }
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      const next = new URL(loc, url).href;
      hops.push({ url, status: res.status, location: next });
      url = next; continue;
    }
    const type = res.headers.get("content-type") || "";
    const html = type.includes("html") ? await res.text() : "";
    return {
      start, hops, final: url, status: res.status,
      xRobots: res.headers.get("x-robots-tag"),
      metaRobots: pick(html, /<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/i),
      canonical: pick(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i),
      title: pick(html, /<title>([^<]*)<\/title>/i),
    };
  }
  return { start, hops, error: "too many redirects" };
}

const noindex = (r) => /noindex/i.test(r.metaRobots || "") || /noindex/i.test(r.xRobots || "");

export async function audit({ urls } = {}) {
  const sm = await fetch(SITE + "/sitemap.xml").then((r) => r.text()).catch(() => "");
  const sitemap = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const robotsTxt = await fetch(SITE + "/robots.txt").then((r) => r.text()).catch(() => "");
  const set = new Set(urls || [...sitemap, ...GSC_REPORTED, ...MUST_NOT_INDEX.map((p) => SITE + p)]);
  if (!urls) for (const u of sitemap) for (const v of variantsOf(u)) set.add(v);
  const list = [...set];
  const results = [];
  for (let i = 0; i < list.length; i += 8) results.push(...await Promise.all(list.slice(i, i + 8).map(probe)));

  const problems = [], warnings = [];
  for (const r of results) {
    const inSitemap = sitemap.includes(r.start);
    const expected = canonicalOf(r.start);
    r.inSitemap = inSitemap;
    if (r.error) { problems.push(`${r.start}: ${r.error}`); continue; }
    if (inSitemap) {
      if (r.hops.length) problems.push(`${r.start}: sitemap URL redirects (${r.hops.map((h) => h.status).join("→")})`);
      if (r.status !== 200) problems.push(`${r.start}: sitemap URL status ${r.status}`);
      if (noindex(r)) problems.push(`${r.start}: sitemap URL is noindex`);
      if (r.canonical !== r.start) problems.push(`${r.start}: canonical is ${r.canonical}`);
    } else if (r.start !== expected) {
      // A duplicate variant: one permanent hop straight to the canonical URL.
      if (!r.hops.length) { if (!noindex(r)) problems.push(`${r.start}: duplicate served ${r.status} without redirect`); }
      else {
        // Cloudflare "Always Use HTTPS" upgrades http:// at the edge before any rule or Worker runs,
        // so http://apex/… is necessarily 2 hops while that toggle is on (docs/SEO_INDEXING.md).
        const edgeUpgrade = r.start.startsWith("http://") && r.hops.length === 2 && r.hops[0].location === r.start.replace(/^http:/, "https:");
        if (edgeUpgrade) warnings.push(`${r.start}: 2 hops (edge HTTPS upgrade, then canonical)`);
        else if (r.hops.length > 1) problems.push(`${r.start}: redirect chain ${r.hops.map((h) => h.status).join("→")}`);
        if (r.hops[0].status !== 301) problems.push(`${r.start}: first hop is ${r.hops[0].status}, not 301`);
        if (r.final !== expected && r.status === 200 && !noindex(r)) problems.push(`${r.start}: lands on ${r.final}, expected ${expected}`);
      }
    }
  }
  for (const p of MUST_NOT_INDEX) {
    const r = results.find((x) => x.start === SITE + p);
    if (r && !r.error && r.status === 200 && !noindex(r)) problems.push(`${SITE + p}: private/utility page is indexable`);
  }
  const robotsChecks = {
    sitemapLine: /^Sitemap:\s*https:\/\/www\.xendersecrets\.com\/sitemap\.xml\s*$/m.test(robotsTxt),
    noGlobalDisallow: !/^Disallow:\s*\/\s*$/m.test(robotsTxt),
  };
  if (!robotsChecks.sitemapLine) problems.push("robots.txt does not reference https://www.xendersecrets.com/sitemap.xml");
  if (!robotsChecks.noGlobalDisallow) problems.push("robots.txt disallows the whole site");
  return { when: new Date().toISOString(), sitemapCount: sitemap.length, robotsChecks, results, problems, warnings };
}

/**
 * Preview mode: run the path rules against a non-production deployment (e.g. the workers.dev
 * preview Cloudflare builds for every branch). Host rules can't be tested there, but the real
 * asset layer + Worker can: every sitemap path must be 200 with a production canonical, and
 * .html / trailing-slash / index variants must be ONE 301 to the clean path on the same host.
 */
export async function auditPreview(origin) {
  const paths = [...(await fetch(SITE + "/sitemap.xml").then((r) => r.text()).catch(() => "")).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const local = [...fs.readFileSync(new URL("../../public/sitemap.xml", import.meta.url), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const list = [...new Set([...local, ...paths])];
  const results = [], problems = [];
  const one = async (start, expectPath) => {
    const r = await probe(origin + start);
    r.inSitemap = local.includes(start);
    results.push(r);
    if (r.error) return problems.push(`${start}: ${r.error}`);
    if (expectPath === null) {
      if (r.hops.length) problems.push(`${start}: redirects (${r.hops.map((h) => h.status).join("→")})`);
      if (r.status !== 200) problems.push(`${start}: status ${r.status}`);
      if (r.canonical !== SITE + start) problems.push(`${start}: canonical ${r.canonical}`);
      if (/noindex/i.test(r.metaRobots || "")) problems.push(`${start}: meta noindex`);
    } else {
      if (r.hops.length !== 1) problems.push(`${start}: ${r.hops.length} hops`);
      else if (r.hops[0].status !== 301) problems.push(`${start}: ${r.hops[0].status} not 301`);
      if (r.final !== origin + expectPath) problems.push(`${start}: lands on ${r.final}`);
    }
  };
  for (const p of local) await one(p, null);
  for (const p of list) {
    if (p === "/") { await one("/index.html", "/"); continue; }
    await one(p + ".html", p);
    await one(p + "/", p);
  }
  for (const p of ["/api/health", "/p/abc123"]) {
    const r = await probe(origin + p); results.push(r);
    if (p === "/api/health" && (r.hops.length || r.status !== 200)) problems.push(`${p}: ${r.status}`);
    if (p === "/p/abc123" && r.hops[0]?.status !== 302) problems.push(`${p}: expected 302`);
  }
  return { when: new Date().toISOString(), sitemapCount: local.length, results, problems, warnings: [] };
}

export function toMarkdown({ when, sitemapCount, results, problems, warnings = [] }, { only } = {}) {
  const rows = (only ? results.filter(only) : results).map((r) => {
    const chain = r.hops.map((h) => `${h.status}→${h.location.replace(SITE, "")}`).join(" ");
    const robots = r.error ? "" : [r.metaRobots && "meta " + r.metaRobots, r.xRobots && "X-Robots " + r.xRobots].filter(Boolean).join("; ") || "(none)";
    return `| ${r.start} | ${r.error ? "ERR " + r.error : (chain ? chain + " → " : "") + r.status} | ${r.canonical || "—"} | ${robots} | ${r.inSitemap ? "in sitemap" : "—"} |`;
  });
  return [`Live audit ${when} · sitemap URLs: ${sitemapCount} · problems: ${problems.length}`, "",
    "| URL | HTTP (chain → final) | canonical | robots | sitemap |", "|---|---|---|---|---|", ...rows, "",
    problems.length ? "### Problems\n" + problems.map((p) => "- " + p).join("\n") : "### Problems\nNone.",
    "", warnings.length ? `### Warnings (${warnings.length})\n` + warnings.map((p) => "- " + p).join("\n") : "### Warnings\nNone."].join("\n");
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const pi = args.indexOf("--preview");
  const report = pi >= 0 ? await auditPreview(args[pi + 1].replace(/\/$/, "")) : await audit();
  const md = toMarkdown(report);
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
  const j = args.indexOf("--json");
  if (j >= 0) fs.writeFileSync(args[j + 1], JSON.stringify(report, null, 2));
  if (args.includes("--strict") && report.problems.length) process.exit(1);
}
