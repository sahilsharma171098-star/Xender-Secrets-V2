// XEND-GSC-INDEXING-001 — server-rendered content for the hand-written hub pages.
//
// /website-catalog and /business-templates used to ship almost empty HTML (≈80–130 words) and
// fill everything in with JavaScript; /articles listed thin and strong articles alike with no
// structured data. Google renders JS, but thin initial HTML + generic cards is a classic
// "Crawled – currently not indexed" pattern. These transforms pre-render the same cards the
// page scripts render (so nothing changes visually; the scripts simply re-render them), add a
// genuinely useful static section and schema, and keep everything in sync with
// public/catalog-data.js and scripts/commercial/articles.mjs.
//
// Every transform is idempotent: content lives between <!-- xs:NAME --> … <!-- /xs:NAME -->
// markers and is regenerated on each build (scripts/build-commercial-pages.mjs).
import fs from "node:fs";
import vm from "node:vm";
import { ARTICLES } from "../commercial/articles.mjs";
import { INDUSTRIES } from "../commercial/pages.mjs";

const SITE = "https://www.xendersecrets.com";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function loadCatalog(file = new URL("../../public/catalog-data.js", import.meta.url)) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, "utf8"), ctx);
  return ctx.window.XENDER_CATALOG;
}

/** Replace the content between markers; if the markers don't exist yet, insert them via `insert`. */
function region(html, name, content, insert) {
  const open = `<!-- xs:${name} -->`, close = `<!-- /xs:${name} -->`;
  const block = open + content + close;
  const i = html.indexOf(open), j = html.indexOf(close);
  if (i >= 0 && j > i) return html.slice(0, i) + block + html.slice(j + close.length);
  const out = insert(html, block);
  if (out === html) throw new Error(`could not place region ${name}`);
  return out;
}
const setTitle = (html, t) => html.replace(/<title>[^<]*<\/title>/, `<title>${esc(t)}</title>`);
const setDesc = (html, d) => html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(d)}">`);
const ldScripts = (items) => items.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("");
const beforeHeadEnd = (html, block) => html.replace("</head>", block + "</head>");
const crumbs = (trail) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: trail.map(([name, p], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + p })) });
const ORG_REF = { "@type": "Organization", "@id": SITE + "/#business", name: "Xender Secrets", url: SITE + "/" };
const fillDiv = (id) => (html, block) => html.replace(new RegExp(`(<div id="${id}"[^>]*>)(</div>)`), `$1${block}$2`);

// Industry landing pages, keyed by the catalog's business-type id.
const LANDING = Object.fromEntries(INDUSTRIES.map((i) => [i.business, "/" + i.file.replace(/\.html$/, "")]));
LANDING.clinics = LANDING.dentists;

// ------------------------------------------------------------------ /website-catalog
const sampleCard = (x, type) => '<article class="market-card"><div class="visual-card"><div class="mini-nav"><i></i><i></i><i></i></div><strong>' + esc(x.id) + '</strong><small>' + esc(type.toUpperCase()) + '</small></div><div class="meta">' + esc(type.toUpperCase()) + '</div><h3>' + esc(x.title || x.name) + '</h3><p>' + esc(x.summary || x.description) + '</p><div class="actions"><a href="/sample-preview?type=' + type + '&id=' + encodeURIComponent(x.id) + '">Open Sample</a><a href="https://wa.me/919821941814?text=' + encodeURIComponent("Hi Xender Secrets, I want a build based on " + x.id + " — " + (x.title || x.name) + ".") + '" target="_blank" rel="noopener">Customize</a></div></article>';

export function transformCatalog(html, C = loadCatalog()) {
  html = setTitle(html, "Website Templates & Live Demos for Small Businesses | Xender Secrets");
  html = setDesc(html, `Browse ${C.templates.length} business website templates across ${C.businessTypes.length} industries plus working frontend, backend and full-stack demos. Concept demos built by Xender Secrets, customised from ₹999 + GST.`);
  html = region(html, "ld", ldScripts([
    { "@context": "https://schema.org", "@type": "CollectionPage", name: "Website templates & live demos", url: SITE + "/website-catalog",
      description: "Concept website templates and working demos built by Xender Secrets, organised by industry and build type.", publisher: ORG_REF,
      hasPart: [{ "@type": "WebPage", name: "Business website templates", url: SITE + "/business-templates" }] },
    crumbs([["Home", "/"], ["Website catalog", "/website-catalog"]]),
  ]), beforeHeadEnd);
  html = region(html, "stats", '<div class="market-stat"><b>' + C.businessTypes.length + '</b><span>business types</span></div><div class="market-stat"><b>' + C.templates.length.toLocaleString("en-US") + '</b><span>business templates</span></div><div class="market-stat"><b>' + C.frontend.length + '</b><span>frontend samples</span></div><div class="market-stat"><b>' + (C.backend.length + C.fullstack.length) + '</b><span>backend + full-stack</span></div>', fillDiv("catalogStats"));
  html = region(html, "business", C.templates.filter((x) => x.variant === 1).slice(0, 8).map((x) => '<article class="market-card"><div class="visual-card"><strong>' + x.emoji + ' ' + esc(x.businessName) + '</strong><small>20 templates</small></div><h3>' + esc(x.businessName) + '</h3><p>' + esc(x.group) + ' · 20 ready-to-customize directions.</p><div class="actions"><a href="/business-templates?business=' + x.businessType + '">View 20 Templates</a></div></article>').join(""), fillDiv("businessPreview"));
  html = region(html, "frontend", C.frontend.map((x) => sampleCard(x, "frontend")).join(""), fillDiv("frontendGrid"));
  html = region(html, "backend", C.backend.map((x) => sampleCard(x, "backend")).join(""), fillDiv("backendGrid"));
  html = region(html, "fullstack", C.fullstack.map((x) => sampleCard(x, "fullstack")).join(""), fillDiv("fullstackGrid"));
  const industries = C.businessTypes.map((b) => LANDING[b.id]
    ? `<a href="${LANDING[b.id]}">${esc(b.name)} websites</a>`
    : `<a href="/business-templates?business=${b.id}">${esc(b.name)}</a>`).join("");
  html = region(html, "guide", `<section class="market-section catalog-guide" id="how-it-works">
<div class="market-head"><div><div class="kicker">HOW THE CATALOG WORKS</div><h2>Pick a direction. We build it with your content.</h2></div></div>
<div class="guide-grid">
<article><h3>1 · Choose a starting point</h3><p>Open any template or demo on your phone. Note what you like — layout, tone, sections, features. You can mix ideas from several.</p></article>
<article><h3>2 · Get a fixed quote</h3><p>Tell us the direction and your business. We reply with a written scope, price and delivery date before any payment — packages start at <a href="/services">₹999 + GST</a>.</p></article>
<article><h3>3 · Review a live preview</h3><p>We rebuild the direction with your name, services, photos, WhatsApp and contact details, and send a preview link to check on your own phone before launch.</p></article>
</div>
<p class="catalog-note"><strong>Honest labelling:</strong> every template and sample here is a concept demo built by Xender Secrets to show what we can deliver — not a client project, and the business names in them are fictional. Frontend samples show interfaces; backend and full-stack samples call real API routes on the same Cloudflare Worker that runs this site.</p>
<div class="market-head"><div><div class="kicker">WHICH KIND DO YOU NEED?</div><h2>Template, frontend, backend or full stack?</h2></div></div>
<div class="guide-grid">
<article><h3>Business template</h3><p>For most local and service businesses: a fast, mobile-first site that explains what you do and turns visitors into WhatsApp messages, calls or form enquiries.</p></article>
<article><h3>Frontend sample</h3><p>For landing pages, dashboards and storefront interfaces where the experience on screen matters most and data comes from an existing tool.</p></article>
<article><h3>Backend / full stack</h3><p>When the site must store and change information — bookings, quotes, orders, logins. Read <a href="/article-full-stack-development-guide">when a small business needs a web app</a> before you commit; often an existing tool is enough.</p></article>
</div>
<div class="market-head"><div><div class="kicker">BROWSE BY INDUSTRY</div><h2>Templates for ${C.businessTypes.length} kinds of business</h2><p>Industries with a dedicated page explain what customers in that field look for before they enquire.</p></div></div>
<div class="industry-links">${industries}</div>
</section>`, (h, block) => h.replace('<section class="cta">', block + '<section class="cta">'));
  return html;
}

// ------------------------------------------------------------------ /business-templates
export function transformTemplates(html, C = loadCatalog()) {
  html = setTitle(html, `Business Website Templates for ${C.businessTypes.length} Industries | Xender Secrets`);
  html = setDesc(html, `${C.templates.length} ready-to-customise website templates — 20 directions for each of ${C.businessTypes.length} business types, from clinics and CA firms to restaurants and gyms. Concept demos, built for you from ₹999 + GST.`);
  html = region(html, "ld", ldScripts([
    { "@context": "https://schema.org", "@type": "CollectionPage", name: "Business website templates", url: SITE + "/business-templates", publisher: ORG_REF,
      description: "Concept website templates by Xender Secrets, 20 directions per business type." },
    crumbs([["Home", "/"], ["Website catalog", "/website-catalog"], ["Business templates", "/business-templates"]]),
  ]), beforeHeadEnd);
  const groups = {};
  for (const b of C.businessTypes) (groups[b.group] ||= []).push(b);
  const dir = Object.entries(groups).map(([g, list]) => `<div class="dir-group"><h3>${esc(g)}</h3><ul>${list.map((b) => `<li><a href="/business-templates?business=${b.id}">${esc(b.name)}</a> <span>${b.focuses.slice(0, 3).map(esc).join(" · ")}</span>${LANDING[b.id] ? ` · <a href="${LANDING[b.id]}">industry guide</a>` : ""}</li>`).join("")}</ul></div>`).join("");
  html = region(html, "directory", `<section class="market-section template-directory" id="directory">
<div class="market-head"><div><div class="kicker">TEMPLATE DIRECTORY</div><h2>All ${C.businessTypes.length} industries at a glance</h2><p>Each industry has 20 directions — Minimal, Premium, Local, Booking-first, WhatsApp-first, Flagship and more. Every template is a concept demo built by Xender Secrets, not a client site. Pick one and we rebuild it with your content; see <a href="/services">packages &amp; prices</a>.</p></div></div>
<div class="dir-grid">${dir}</div>
</section>`, (h, block) => h.replace("</main>", block + "</main>"));
  return html;
}

// ------------------------------------------------------------------ /articles
export function transformArticles(html) {
  html = setTitle(html, "Website & Small Business Guides | Xender Secrets");
  html = setDesc(html, "Practical guides for small-business owners: what a website needs, how to brief a website project, how to turn visits into enquiries, and when you need a full-stack web app.");
  html = region(html, "ld", ldScripts([
    { "@context": "https://schema.org", "@type": "CollectionPage", name: "Guides", url: SITE + "/articles", publisher: ORG_REF,
      mainEntity: { "@type": "ItemList", itemListElement: ARTICLES.map((a, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + "/" + a.file.replace(/\.html$/, ""), name: a.h1 })) } },
    crumbs([["Home", "/"], ["Guides", "/articles"]]),
  ]), beforeHeadEnd);
  const featured = ARTICLES.map((a) => `<article class="article-card featured-guide"><span class="article-category">${esc(a.kicker.toUpperCase())}</span><h3>${esc(a.h1)}</h3><p>${esc(a.deck)}</p><a href="/${a.file.replace(/\.html$/, "")}">Read the guide →</a></article>`).join("");
  html = region(html, "featured", `<section class="catalog-body featured-guides"><div class="kicker">START HERE · GUIDES FOR BUYING A WEBSITE</div><div class="article-grid">${featured}</div><p class="guides-note">More notes and drafts on development, AI, sales and reading are below. We're expanding them into complete guides; until then they're kept out of search results.</p></section>`,
    (h, block) => h.replace('<section class="catalog-body">', block + '<section class="catalog-body">'));
  // The grid below repeats every article; drop the ones now featured so each guide is listed once.
  for (const a of ARTICLES) {
    const href = "/" + a.file.replace(/\.html$/, "");
    html = html.replace(new RegExp(`<article class="article-card"><span class="article-category">[^<]*</span><h3>[^<]*</h3><p>[^<]*</p><a href="${href}">[^<]*</a></article>`), "");
  }
  return html;
}

export const HUBS = { "website-catalog.html": transformCatalog, "business-templates.html": transformTemplates, "articles.html": transformArticles };
