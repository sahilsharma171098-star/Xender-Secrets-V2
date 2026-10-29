// XEND-HUD-001 — the HUD shell for the core pages (home, studio, catalog, pricing, media, about,
// FAQ, contact). Each page opens as a dark holographic story told in sticky chapters over one 3D
// world (public/xs/world.js), then settles onto white "paper" for the details: the same content
// blocks, lead form, analytics hooks and schema as before (layout.mjs / blocks.mjs), restyled by
// public/xs/xs.css. Everything is self-hosted (fonts, three.js); no third-party requests.
// Without WebGL, with reduced motion, Save-Data or no JS, chapters render as static sections.
import { SITE, EMAIL, esc, wa, canonicalUrl, cleanLinks } from "./layout.mjs";
import { PROJECTS, KINDS } from "./portfolio.mjs";

const YT = "https://www.youtube.com/@Xender-s7y";
const IG = "https://www.instagram.com/xande_r5955/";
export const SOCIAL = { YT, IG };

// ---------------------------------------------------------------- projects → 3D panels
const bySlug = Object.fromEntries(PROJECTS.map((p) => [p.slug, p]));
const shortName = (t) => t.replace(" appointment booking", " booking").replace(" landing page", "").replace(" CRM intake", " CRM").replace(" console", "");
const ctaFor = (p) => (p.kind === "product" ? "Open the product ↗" : "Open live demo ↗");
export function panel(slug) {
  const p = bySlug[slug];
  return { slug, name: shortName(p.title), badge: KINDS[p.kind].label, one: p.oneLine, href: p.href.replace(/\.html$/, ""), cta: ctaFor(p) };
}

// ---------------------------------------------------------------- chapter building blocks
export const spec = (rows) => `<ul class="spec" data-reveal>${rows.map(([k, v]) => `<li>${k} <span>${v}</span></li>`).join("")}</ul>`;
export const chips = (items, cls = "chips") => `<ul class="${cls}" data-reveal>${items.map((c) => `<li>${c}</li>`).join("")}</ul>`;
export const steps = (items) => `<ol class="hsteps" data-reveal>${items.map((it, i) => `<li><span>${String(i + 1).padStart(2, "0")}</span><span>${Array.isArray(it) ? `<b>${it[0]}</b><small>${it[1]}</small>` : it}</span></li>`).join("")}</ol>`;
export function ringList(slugs, ctaPrefix) {
  return `<ol class="proj" data-ring-list data-reveal>${slugs.map((s, i) => {
    const p = panel(s);
    return `<li${i === 0 ? ' class="on"' : ""}><a href="${bySlug[s].href}" data-k="${i}" data-cta="${ctaPrefix}-ring-${s}"><span class="n">${String(i + 1).padStart(2, "0")}</span><span class="nm">${esc(p.name)}</span><span class="meta"><span class="badge${p.badge !== "Concept demo" ? " live" : ""}">${p.badge}</span></span><span class="ds">${esc(bySlug[s].oneLine)}. <span class="go">${p.cta}</span></span></a></li>`;
  }).join("")}</ol>`;
}
export function ringCard(slug, total) {
  const p = panel(slug);
  return `<div class="ringcard" data-ring-card data-reveal><div class="row"><span class="idx" data-f="idx">01 / ${String(total).padStart(2, "0")}</span><span class="badge${p.badge !== "Concept demo" ? " live" : ""}" data-f="badge">${p.badge}</span></div><strong data-f="name">${esc(p.name)}</strong><p data-f="one">${esc(p.one)}</p><a class="go" href="${bySlug[slug].href}" data-f="go">${p.cta}</a></div>`;
}

// ---------------------------------------------------------------- shell
const QUICK = [["/portfolio.html", "Catalog"], ["/studio.html", "Studio"], ["/services.html", "Pricing"], ["/media.html", "Media"], ["/about.html", "About"]];
const MENU = (home) => [
  ["/", "Home", "The story so far"], ["/studio.html", "Studio", "For brands, D2C labels and agencies"], ["/portfolio.html", "Catalog", `${PROJECTS.length} live builds, labelled`],
  ["/services.html", "Pricing", "Local packages from ₹999 + GST"], ["/media.html", "Media", "Videos, Shorts and Reels"], ["/articles.html", "Guides", "Plain-language website guides"],
  ["/about.html", "About", "One person accountable"], [home ? "#faq" : "/faq.html", "FAQ", "Straight answers"], ["/contact.html", "Contact", "WhatsApp, email or the form"],
];
const NEXT = {
  "/": ["/studio.html", "Studio, for brands"], "/studio.html": ["/portfolio.html", "The catalog"], "/portfolio.html": ["/services.html", "Packages and pricing"],
  "/services.html": ["/media.html", "Xender in motion"], "/media.html": ["/about.html", "About the studio"], "/about.html": ["/faq.html", "Questions, answered"],
  "/faq.html": ["/contact.html", "Start a conversation"], "/contact.html": ["/", "Back to the start"],
};

const reticle = `<div class="hud2d boot" id="hud2d" aria-hidden="true">
  <div class="reticle" id="reticle"><svg viewBox="0 0 1000 1000">
    <defs><radialGradient id="sw" cx="500" cy="500" r="400" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5ED8FF" stop-opacity="0"/><stop offset="1" stop-color="#5ED8FF" stop-opacity=".22"/></radialGradient></defs>
    <circle class="draw" cx="500" cy="500" r="400" fill="none" stroke="#5ED8FF" stroke-opacity=".5" stroke-width="1.4"/>
    <g class="spin fadein" id="ticks" stroke="#5ED8FF" stroke-opacity=".55"></g>
    <g class="fadein" id="degs" fill="#5ED8FF" fill-opacity=".55" font-family="Geist Mono, ui-monospace, monospace" font-size="15" text-anchor="middle"></g>
    <g class="a1 fadein"><circle cx="500" cy="500" r="345" fill="none" stroke="#5ED8FF" stroke-width="2.4" stroke-dasharray="190 50 40 60 320 2000" stroke-linecap="round"/></g>
    <g class="a2 fadein"><circle cx="500" cy="500" r="305" fill="none" stroke="#F2B24F" stroke-width="2" stroke-dasharray="70 420 30 1400" stroke-linecap="round"/></g>
    <g class="a3 fadein"><circle cx="500" cy="500" r="268" fill="none" stroke="#5ED8FF" stroke-opacity=".3" stroke-width="12" stroke-dasharray="2 9"/></g>
    <g class="sweep fadein" id="sweep"><path d="M500 500 L500 100 A400 400 0 0 1 757 194 Z" fill="url(#sw)"/></g>
    <g class="draw" stroke="#5ED8FF" stroke-opacity=".6" stroke-width="1.4"><line x1="500" y1="40" x2="500" y2="88"/><line x1="500" y1="912" x2="500" y2="960"/><line x1="40" y1="500" x2="88" y2="500"/><line x1="912" y1="500" x2="960" y2="500"/></g>
  </svg></div>
  <div class="brk" id="brk"><i></i><i></i><i></i><i></i><b id="brkLbl"></b></div>
</div>`;

const ICON_YT = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.7 15.1V8.9L15.5 12z"/></svg>`;
const ICON_IG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7.3A4.7 4.7 0 1 0 16.7 12 4.7 4.7 0 0 0 12 7.3zm0 7.8A3.1 3.1 0 1 1 15.1 12 3.1 3.1 0 0 1 12 15.1zm6-8a1.1 1.1 0 1 1-1.1-1.1A1.1 1.1 0 0 1 18 7.1zM21.9 8a6 6 0 0 0-1.6-4.3A6 6 0 0 0 16 2.1C14.3 2 9.7 2 8 2.1a6 6 0 0 0-4.3 1.6A6 6 0 0 0 2.1 8C2 9.7 2 14.3 2.1 16a6 6 0 0 0 1.6 4.3A6 6 0 0 0 8 21.9c1.7.1 6.3.1 8 0a6 6 0 0 0 4.3-1.6 6 6 0 0 0 1.6-4.3c.1-1.7.1-6.3 0-8zm-2.2 9.9a3.2 3.2 0 0 1-1.8 1.8c-1.3.5-4.3.4-5.9.4s-4.6.1-5.9-.4a3.2 3.2 0 0 1-1.8-1.8C3.8 16.6 3.9 13.6 3.9 12s-.1-4.6.4-5.9a3.2 3.2 0 0 1 1.8-1.8C7.4 3.8 10.4 3.9 12 3.9s4.6-.1 5.9.4a3.2 3.2 0 0 1 1.8 1.8c.5 1.3.4 4.3.4 5.9s.1 4.6-.4 5.9z"/></svg>`;

function header(path, home) {
  return `<header class="top" id="top"><div class="top__in">
  <a class="mark" href="/" aria-label="Xender Secrets home"><b>XENDER SECRETS</b><span>Studio</span></a>
  <nav class="top__links" aria-label="Primary">${QUICK.map(([h, t]) => `<a href="${h}"${h === path ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</nav>
  <div class="top__cta"><a class="btn btn--sm mag top__start" href="#start" data-offer="custom-build" data-cta="header-quote">Start a project</a><button class="menu-btn" id="menu" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav"><i aria-hidden="true"></i>Menu</button></div>
</div></header>
<nav class="nav" id="nav" aria-label="Site menu"><div class="nav__in">
  <div class="nav__bar"><span class="mark"><b>XENDER SECRETS</b><span>Every page, one story</span></span><button class="menu-btn" id="menuClose" type="button">Close</button></div>
  <ol>${MENU(home).map(([h, t, d], i) => `<li><a href="${h}"${h === path ? ' aria-current="page"' : ""}><span class="n">${String(i + 1).padStart(2, "0")}</span><span class="t">${t}</span><span class="d">${d}</span></a></li>`).join("")}</ol>
  <p class="nav__contact"><a href="${esc(wa("Hi Xender Secrets, I want to discuss a website."))}" data-cta="menu-whatsapp" target="_blank" rel="noopener">WhatsApp +91 98219 41814</a><a href="mailto:${EMAIL}" data-cta="menu-email">${EMAIL.toLowerCase()}</a></p>
</div></nav>`;
}

const rail = (chs) => (chs.length < 2 ? "" : `<nav class="rail" id="rail" aria-label="Chapters on this page">${chs.map((c, i) => `<button type="button" data-go="${i}"><span class="lbl">${esc(c.name)}</span>${String(i).padStart(2, "0")}<span class="tick"></span></button>`).join("")}</nav>`);
const hudBar = (chs) => `<div class="hud" id="hud" aria-hidden="true"><span class="l">28.4595° N &nbsp;77.0266° E &nbsp;· Gurugram</span><span class="r">${chs.length > 1 ? `Chapter <b id="hudN">00</b> / ${String(chs.length - 1).padStart(2, "0")} · ` : `<b id="hudN" hidden>00</b>Page · `}<b id="hudT">${esc(chs[0].name)}</b></span></div>`;

function footer(path) {
  const [nr, nt] = NEXT[path] || ["/", "Back to the start"];
  const col = (h, links) => `<div><h2 class="fh">${h}</h2><ul>${links.map(([href, t]) => `<li><a href="${href}">${t}</a></li>`).join("")}</ul></div>`;
  return `<footer id="foot" class="site-foot">
  <a class="next" href="${nr}" data-cta="footer-next"><span><small>Next chapter</small><strong>${nt}</strong></span><span class="arr" aria-hidden="true">→</span></a>
  <div class="fgrid">
    <div class="fabout"><h2 class="fh">Xender Secrets</h2><p>Founded by Sahil Kumar Sharma · Gurugram, Haryana, India. One person accountable for your build, from written scope to handover.</p>
      <div class="social"><a href="${YT}" target="_blank" rel="noopener" aria-label="Xender Secrets on YouTube" data-cta="footer-youtube">${ICON_YT}</a><a href="${IG}" target="_blank" rel="noopener" aria-label="Xender Secrets on Instagram" data-cta="footer-instagram">${ICON_IG}</a></div></div>
    ${col("Work", [["/portfolio.html", "Catalog"], ["/website-catalog.html", "All demos"], ["/business-templates.html", "Templates"], ["/website-cost-calculator.html", "Cost calculator"], ["/sitecheck.html", "SiteCheck extension"], ["/media.html", "Media"]])}
    ${col("Company", [["/studio.html", "Studio"], ["/services.html", "Pricing"], ["/articles.html", "Guides"], ["/novels.html", "Novels"], ["/about.html", "About"], ["/faq.html", "FAQ"], ["/contact.html", "Contact"]])}
    ${col("Websites for", [["/accountant-website-development.html", "CA firms"], ["/clinic-website-development.html", "Clinics &amp; dentists"], ["/real-estate-website-development.html", "Real estate"], ["/recruitment-agency-website-development.html", "Recruitment"], ["/consultant-website-development.html", "Consultants"], ["/coaching-website-development.html", "Coaching"], ["/gym-website-development.html", "Gyms"], ["/restaurant-website-development.html", "Restaurants"]])}
    ${col("Website development in", [["/website-development-gurugram.html", "Gurgaon (Gurugram)"], ["/website-development-delhi.html", "Delhi NCR"], ["/website-development-noida.html", "Noida"], ["/small-business-website-india.html", "All of India"], ["/privacy.html", "Privacy"], ["/terms.html", "Terms"], ["/refund.html", "Refunds"]])}
  </div>
  <div class="legal"><span>GSTIN 06IQFPS4456B1ZP · Udyam (MSME): <a href="https://udyamregistration.gov.in/Udyam_Verify.aspx" target="_blank" rel="noopener">UDYAM-HR-05-0152992</a></span><span>Live demos, labelled · No invented clients</span></div>
  <p class="word" id="word" aria-hidden="true">XENDER <em>secrets</em></p>
</footer>`;
}

/**
 * One chapter of the dark story. `scene` picks what the 3D world shows (core · blueprint · build ·
 * ring · launch · focus · globe); `code` + `lines` feed the typed readout (page facts only).
 */
export function chapter(def) { return def; }

function chapterHtml(chs, fallback) {
  return chs.map((c, i) => `<section class="ch ${c.cls || ""}" id="ch${i}" data-ch="${i}" style="--h:${c.height || "210vh"}" aria-label="${esc(c.name)}"><div class="ch__stick">${i === 0 ? `<div class="hero-fallback" aria-hidden="true">${fallback.map((s) => `<img src="/work/${s}-640.webp" alt="" width="640" height="400" loading="lazy" decoding="async">`).join("")}</div>` : ""}<div class="ch__copy">${c.html}</div>${c.after || ""}</div></section>`).join("\n    ");
}

/** Full HTML document in the HUD shell. `story.chapters` are the dark chapters; `body` is the paper. */
export function hudPage({ path, title, description, ogTitle, story, body, jsonld = [], home = false, robots = "index,follow", scripts = [], waText = "Hi Xender Secrets, I want a website for my business." }) {
  const canonical = canonicalUrl(path);
  const chs = story.chapters;
  const cfg = {
    route: canonical.slice(SITE.length) || "/", three: "/xs/vendor/three.module.min.js", img: "/work/",
    boot: story.boot || null, globe: story.globe || null, panels: (story.panels || []).map(panel),
    chapters: chs.map((c) => ({ name: c.name, scene: c.scene, code: c.code, lines: c.lines, ticks: !!c.ticks, focus: c.focus || null, bracket: c.bracket || null })),
  };
  const ld = jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n  ");
  return cleanLinks(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="${robots}">
  <meta name="theme-color" content="#04070C">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Xender Secrets">
  <meta property="og:title" content="${esc(ogTitle || title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE}/og-xender.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preload" href="/fonts/geist-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/instrument-serif-latin-400-italic.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/xs/xs.css">
  ${ld}
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <canvas id="world" aria-hidden="true"></canvas>
  ${reticle}
  <div class="ro" id="ro" aria-hidden="true"><div class="code" id="roCode"></div><div id="roLines"></div></div>
  ${story.boot ? '<div class="bootlog" id="bootlog" aria-hidden="true"></div>' : ""}
  <div class="cursor" id="cursor" aria-hidden="true"></div>
  <div class="progress" id="progress" aria-hidden="true"></div>
  ${header(path, home)}
  ${rail(chs)}
  ${hudBar(chs)}

  <main id="main">
    ${chapterHtml(chs, story.fallback || ["slotly-booking", "north-store", "forge-fitness"])}
    <div class="paper" id="paper">
    ${body}
    </div>
  </main>

  ${footer(path)}

  <a class="wa-float" href="${esc(wa(waText))}" data-cta="float-whatsapp" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">WhatsApp</a>

  <script type="application/json" id="xs-page">${JSON.stringify(cfg).replace(/</g, "\\u003c")}</script>
  <script src="/xs/shell.js"></script>${scripts.map((j) => `\n  <script src="${j}" defer></script>`).join("")}
  <script src="/xs-growth.js" defer></script>
  <script type="module" src="/xs/world.js"></script>
</body>
</html>
`);
}
