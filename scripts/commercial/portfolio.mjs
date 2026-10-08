// Portfolio (XEND-PORTFOLIO-002). One data source for /portfolio and the homepage work rail.
// Integrity rules (docs/REVENUE_ARCHITECTURE.md, AGENTS.md): every item is Xender's own product or a
// demo Xender built. Nothing here is a paid client project, and no results or testimonials are claimed.
import { esc, wa } from "./layout.mjs";

/** Honest labels. "Working demo" = fictional business, real backend calls. "Concept demo" = front end only. */
export const KINDS = {
  product: { label: "Xender product", note: "Built and run by Xender Secrets." },
  working: { label: "Working demo", note: "Fictional business, real backend: it reads and writes live data." },
  concept: { label: "Concept demo", note: "Fictional business, fully interactive front end." },
};

export const CATEGORIES = [
  ["business", "Business websites"],
  ["landing", "Landing pages"],
  ["ecommerce", "E-commerce"],
  ["saas", "SaaS dashboards"],
  ["frontend", "Frontend apps"],
  ["backend", "Backend systems"],
  ["fullstack", "Full-stack apps"],
  ["extension", "Browser extensions"],
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES);

export const PROJECTS = [
  {
    slug: "forge-fitness", title: "Forge Fitness", kind: "concept", cats: ["business"], href: "/demo-gym.html", preview: true, accent: "#ff6a2b",
    oneLine: "Membership website for a gym or studio",
    problem: "Gyms lose walk-in leads when timetables, prices and trial booking are buried in Instagram highlights.",
    features: ["Day-by-day class timetable", "Monthly / annual membership toggle", "Free-trial request with validation", "Mobile-first sections and sticky call-to-action"],
    tech: ["HTML", "CSS", "Vanilla JS", "Responsive"],
  },
  {
    slug: "nebula-saas", title: "Nebula SaaS landing page", kind: "concept", cats: ["landing", "frontend"], href: "/demo-frontend-saas.html", preview: true, accent: "#6b6bff",
    oneLine: "Conversion landing page for a software product",
    problem: "A product launch needs one page that explains the value in seconds and pushes visitors to a trial.",
    features: ["Benefit-led hero with live metrics card", "Feature, workflow and pricing sections", "Clear primary and secondary calls to action", "Fast, dependency-free build"],
    tech: ["HTML", "CSS", "JavaScript"],
  },
  {
    slug: "north-store", title: "North Store", kind: "concept", cats: ["ecommerce", "frontend"], href: "/demo-frontend-store.html", preview: true, accent: "#b6895b",
    oneLine: "Storefront with search, filters and a real cart",
    problem: "Small brands need a store that feels premium on a phone without paying for a heavy platform theme.",
    features: ["Category filters, search and sorting", "Cart drawer with quantities and totals", "Free-shipping progress meter", "Cart saved on the device between visits"],
    tech: ["HTML", "CSS", "JavaScript", "localStorage"],
  },
  {
    slug: "market-commerce", title: "Market Commerce", kind: "working", cats: ["ecommerce", "fullstack"], href: "/demo-fullstack-commerce.html", preview: true, accent: "#875bb8",
    oneLine: "Catalog and quotation flow backed by an API",
    problem: "B2B sellers quote by hand from spreadsheets, so prices and shipping rules drift between staff.",
    features: ["Products loaded from a live API", "Server-calculated quote and shipping rule", "Cart state in the browser, prices from the server", "Ready to extend into checkout"],
    tech: ["Cloudflare Workers", "SQLite (Durable Objects)", "REST API", "JavaScript"],
  },
  {
    slug: "pulse-analytics", title: "Pulse Analytics", kind: "concept", cats: ["saas", "frontend"], href: "/demo-frontend-dashboard.html", preview: true, accent: "#2f7cf6",
    oneLine: "Interactive analytics dashboard",
    problem: "Teams make decisions from exported spreadsheets because their numbers aren't in one readable view.",
    features: ["7 / 30 / 90-day range switch", "SVG trend chart with hover read-outs", "Searchable, sortable team table", "One-click CSV export"],
    tech: ["SVG", "JavaScript", "CSS Grid", "Accessible tables"],
  },
  {
    slug: "sprint-workspace", title: "Sprint Workspace", kind: "working", cats: ["saas", "fullstack"], href: "/demo-fullstack-saas.html", preview: true, accent: "#51e3b4",
    oneLine: "Task board that saves to a server",
    problem: "Small teams need a lightweight internal tool, not another per-seat subscription.",
    features: ["Tasks loaded from the server on every visit", "New tasks saved through a POST API", "Input validation on the server", "Board layout that works on phones"],
    tech: ["Cloudflare Workers", "SQLite (Durable Objects)", "REST API"],
  },
  {
    slug: "slotly-booking", title: "Slotly appointment booking", kind: "working", cats: ["fullstack", "business"], href: "/demo-fullstack-booking.html", preview: true, accent: "#0f9d8a",
    oneLine: "Live slot booking for clinics, salons and consultants",
    problem: "Appointment businesses lose bookings to phone tag and double-booked slots.",
    features: ["Two-week date picker", "Free slots fetched from the server", "Booked slots disappear for everyone", "Booking reference returned on confirmation"],
    tech: ["Cloudflare Workers", "SQLite (Durable Objects)", "REST API", "JavaScript"],
  },
  {
    slug: "leadflow-crm", title: "LeadFlow CRM intake", kind: "working", cats: ["backend", "fullstack"], href: "/demo-backend-crm.html", preview: true, accent: "#0f627a",
    oneLine: "Validated enquiry form wired to a backend",
    problem: "Website enquiries arrive as unstructured emails, so follow-up is slow and leads get lost.",
    features: ["JSON form submission to a Worker endpoint", "Server-side validation and clean errors", "Generated lead reference", "Pattern behind Xender's own lead pipeline"],
    tech: ["Cloudflare Workers", "Validation", "REST API"],
  },
  {
    slug: "api-core", title: "API Core console", kind: "working", cats: ["backend"], href: "/demo-backend-api.html", preview: true, accent: "#1f8f6a",
    oneLine: "Live REST endpoints you can call from the page",
    problem: "Buyers want proof a developer can ship real APIs, not just screens.",
    features: ["Health, catalog and product endpoints", "Live JSON responses on the page", "Runs on the same edge Worker as this site", "Persistent SQLite storage"],
    tech: ["Cloudflare Workers", "JSON APIs", "SQLite"],
  },
  {
    slug: "cost-calculator", title: "Website cost calculator", kind: "product", cats: ["frontend"], href: "/website-cost-calculator.html", preview: true, accent: "#1d4ed8",
    oneLine: "Free estimating tool on this website",
    problem: "Business owners can't tell whether a website quote is fair before they talk to anyone.",
    features: ["Instant range from website type, pages and add-ons", "Covers ecommerce, booking, login, CRM and AI add-ons", "No signup required", "Hands off to a real quote on WhatsApp"],
    tech: ["JavaScript", "Accessible forms"],
  },
  {
    slug: "sitecheck", title: "Xender SiteCheck", kind: "product", cats: ["extension"], href: "/sitecheck.html", preview: false, accent: "#236ed6",
    oneLine: "Browser extension that audits any website",
    problem: "Owners can't see why their site doesn't convert: missing titles, broken contact paths, weak mobile layout.",
    features: ["One-click page audit in the browser", "SEO, UX and accessibility checks", "Runs locally, no page data uploaded", "Manifest V3 build with automated tests"],
    tech: ["Chrome extension (MV3)", "JavaScript", "Automated tests"],
  },
];

const likeText = (p) => `Hi Xender Secrets, I saw ${p.title} in your portfolio and want something like it for my business.`;
export const projectUrl = (p) => "https://www.xendersecrets.com/portfolio#p-" + p.slug;

/** Small CSS-only artwork, used where a live preview isn't meaningful (and behind every live preview while it loads). */
function art(p) {
  if (p.slug === "sitecheck") return `<div class="pf-art pf-art-sitecheck"><div class="pf-ext"><span class="pf-ext-head">SiteCheck</span><b class="pf-ext-score">A<small>✓</small></b><i></i><i></i><i></i><span class="pf-ext-chip">SEO · UX · ACCESSIBILITY</span></div></div>`;
  return `<div class="pf-art" style="--a:${p.accent}"><span>${esc(p.title)}</span></div>`;
}

function card(p, i) {
  const kind = KINDS[p.kind];
  const live = p.preview
    ? `<div class="pf-frame" data-live-frame>${art(p)}<iframe src="${p.href.replace(/\.html$/, "")}?embed=1" title="Live preview of ${esc(p.title)}" loading="lazy" tabindex="-1" aria-hidden="true" scrolling="no"></iframe></div>`
    : `<div class="pf-frame">${art(p)}</div>`;
  return `<article class="pf-card motion-reveal" id="p-${p.slug}" data-cats="${p.cats.join(" ")}" style="--a:${p.accent}" aria-labelledby="p-${p.slug}-t">
            <a class="pf-shot" href="${p.href}" data-cta="portfolio-shot-${p.slug}" tabindex="-1" aria-hidden="true">
              <div class="pf-browser"><div class="pf-bar"><i></i><i></i><i></i><span>xendersecrets.com${p.href.replace(/\.html$/, "")}</span>${p.preview ? '<em>LIVE</em>' : ""}</div>${live}</div>
            </a>
            <div class="pf-body">
              <div class="pf-meta"><span class="pf-kind pf-kind-${p.kind}" title="${esc(kind.note)}">${kind.label}</span><span>${p.cats.map((c) => CATEGORY_LABEL[c]).join(" · ")}</span></div>
              <h3 id="p-${p.slug}-t"><span class="pf-num">${String(i + 1).padStart(2, "0")}</span> ${esc(p.title)}</h3>
              <p class="pf-one">${esc(p.oneLine)}</p>
              <p class="pf-problem"><strong>Problem it solves:</strong> ${esc(p.problem)}</p>
              <ul class="pf-features">${p.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
              <p class="pf-tech" aria-label="Technology">${p.tech.map((t) => `<span>${esc(t)}</span>`).join("")}</p>
              <div class="pf-actions">
                <a class="btn primary" href="${p.href}" data-cta="portfolio-demo-${p.slug}">${p.kind === "product" ? "Open the product" : "Open live demo"} <span aria-hidden="true">↗</span></a>
                <a class="btn ghost" href="#start" data-offer="custom-build" data-like="${p.slug}" data-like-text="${esc(likeText(p))}" data-cta="portfolio-like-${p.slug}">Build something like this</a>
                <button class="pf-share" type="button" data-share="${p.slug}" data-share-title="${esc(p.title)}" aria-label="Copy link to ${esc(p.title)}">Share</button>
              </div>
            </div>
          </article>`;
}

/** Brief → launch story. Captions are complete content without JS; JS only pins and scrubs them. */
const STORY = [
  ["01", "Brief", "We start from your customer, not a template.", "One call or message thread: who buys, what they need to see, and the single action the page must drive. You get a written scope and fixed quote before any payment."],
  ["02", "Design", "Structure first, then a distinctive look.", "Layout, typography, colour and motion designed around your offer — previewed on a live link so you review it on your own phone."],
  ["03", "Build", "Real interactions, real data.", "Forms, carts, bookings, dashboards or APIs built to work, not mocked. Every demo on this page is that kind of build."],
  ["04", "Launch", "Tested, handed over, yours.", "Mobile, keyboard and reduced-motion checks before launch. You own the code, content and accounts — no lock-in."],
];

export function portfolioBody({ leadForm }) {
  const counts = Object.fromEntries(CATEGORIES.map(([c]) => [c, PROJECTS.filter((p) => p.cats.includes(c)).length]));
  return `<section class="pf-hero" data-scroll-scene="exit" aria-labelledby="pf-title">
      <div class="wrap pf-hero-grid">
        <div class="pf-hero-copy">
          <p class="eyebrow">Portfolio · Xender Secrets</p>
          <h1 id="pf-title">Work you can open, click and test <em>before you hire us.</em></h1>
          <p class="lede">Business websites, landing pages, e-commerce, dashboards, backends, full-stack apps and a browser extension — all built by Xender Secrets, all live. Open any of them, try it on your phone, then ask for one built around your business.</p>
          <div class="actions">
            <a class="btn primary lg" href="#projects" data-cta="portfolio-hero-explore">Explore the work <span aria-hidden="true">↓</span></a>
            <a class="btn ghost lg" href="#start" data-offer="custom-build" data-cta="portfolio-hero-quote">Request a quote</a>
          </div>
          <ul class="pf-legend" aria-label="How projects are labelled">
            ${Object.entries(KINDS).map(([k, v]) => `<li><span class="pf-kind pf-kind-${k}">${v.label}</span> ${esc(v.note)}</li>`).join("\n            ")}
          </ul>
        </div>
        <div class="pf-hero-stage" aria-hidden="true">
          <div class="pf-fan pf-fan-1"><div class="pf-bar"><i></i><i></i><i></i><span>pulse / dashboard</span></div><div class="pf-mini pf-mini-dash"><b></b><b></b><b></b><svg viewBox="0 0 200 70" preserveAspectRatio="none"><path d="M0 60 C30 50 40 30 70 36 S120 12 150 20 S185 6 200 4"/></svg></div></div>
          <div class="pf-fan pf-fan-2"><div class="pf-bar"><i></i><i></i><i></i><span>north / store</span></div><div class="pf-mini pf-mini-store"><i></i><i></i><i></i><span>Cart · 3</span></div></div>
          <div class="pf-fan pf-fan-3"><div class="pf-bar"><i></i><i></i><i></i><span>forge / fitness</span></div><div class="pf-mini pf-mini-gym"><strong>TRAIN<br>HARDER.</strong><span>Book a free trial</span></div></div>
          <div class="pf-badge pf-badge-1">✓ Booking confirmed · BK-7Q2X</div>
          <div class="pf-badge pf-badge-2">GET /api/health → 200</div>
        </div>
      </div>
    </section>

    <section class="pf-glance" aria-label="At a glance">
      <div class="wrap pf-glance-grid">
        <div><h2>What we build</h2><p>Business websites, landing pages, online stores, dashboards, APIs, full-stack web apps and browser extensions.</p></div>
        <div><h2>How it's built</h2><p>Hand-written HTML, CSS and JavaScript; Cloudflare Workers and SQLite at the edge; no bloated page builders.</p></div>
        <div><h2>Why you can trust it</h2><p>Every item below is live and inspectable. GST-registered, MSME-registered studio; written scope before payment.</p></div>
        <div><h2>How to start</h2><p><a href="#start" data-offer="custom-build" data-cta="portfolio-glance-quote">Send a brief</a> or <a href="${esc(wa("Hi Xender Secrets, I looked at your portfolio and want to discuss a project."))}" target="_blank" rel="noopener" data-cta="portfolio-glance-whatsapp">message us on WhatsApp</a>. We reply personally.</p></div>
      </div>
    </section>

    <section class="pf-story" id="process" data-scroll-scene="pin" data-steps="4" aria-labelledby="pf-story-title">
      <div class="pf-story-sticky">
        <div class="wrap pf-story-grid">
          <div class="pf-story-stage" aria-hidden="true">
            <div class="pf-build">
              <div class="pf-bar"><i></i><i></i><i></i><span>your-business.com</span><em class="pf-build-live">LIVE</em></div>
              <div class="pf-build-body">
                <div class="pf-b-nav"><b></b><span></span><span></span><span></span><i></i></div>
                <div class="pf-b-hero"><div class="pf-b-copy"><small>YOUR BRAND</small><b></b><b></b><p></p><i class="pf-b-cta">Book now</i></div><div class="pf-b-visual"><span></span></div></div>
                <div class="pf-b-cards"><i></i><i></i><i></i></div>
                <div class="pf-b-cursor"></div>
                <div class="pf-b-toast">✓ New enquiry saved</div>
                <div class="pf-b-api"><code>POST /api/lead → 201</code><code>{ "ok": true }</code></div>
              </div>
            </div>
            <div class="pf-story-rail"><span></span></div>
          </div>
          <div class="pf-story-copy">
            <p class="kicker">How a project comes together</p>
            <h2 id="pf-story-title">From brief to launch, <span>in four honest steps.</span></h2>
            <ol class="pf-steps">
              ${STORY.map(([n, t, h, p], i) => `<li class="pf-step" data-i="${i}"><button type="button" data-scene-go="${i}" class="pf-step-n">${n} · ${t}</button><h3>${h}</h3><p>${p}</p></li>`).join("\n              ")}
            </ol>
          </div>
        </div>
      </div>
    </section>

    <section class="section pf-projects" id="projects" aria-labelledby="pf-projects-title">
      <div class="wrap">
        <div class="section-head">
          <p class="kicker">Selected work · ${PROJECTS.length} live builds</p>
          <h2 id="pf-projects-title">Pick a category. <span>Open the real thing.</span></h2>
          <p>Previews below are the live pages, not screenshots. Fictional brand names mark demos; nothing here is presented as a paid client project.</p>
        </div>
        <div class="pf-filters" role="group" aria-label="Filter projects by category">
          <button type="button" class="pf-filter" data-filter="all" aria-pressed="true">All <span>${PROJECTS.length}</span></button>
          ${CATEGORIES.map(([c, l]) => `<button type="button" class="pf-filter" data-filter="${c}" aria-pressed="false">${l} <span>${counts[c]}</span></button>`).join("\n          ")}
        </div>
        <p class="pf-status" id="pfStatus" role="status" aria-live="polite">Showing all ${PROJECTS.length} projects.</p>
        <div class="pf-grid">
          ${PROJECTS.map(card).join("\n          ")}
        </div>
        <div class="pf-more">
          <p><strong>Need a design for your industry?</strong> The full catalog has concept directions for 32 industries.</p>
          <a class="btn ghost" href="/website-catalog.html" data-cta="portfolio-full-catalog">Browse all demos →</a>
        </div>
      </div>
    </section>

    <section class="section pf-share-section" aria-labelledby="pf-share-title">
      <div class="wrap pf-share-box">
        <div>
          <p class="kicker">Sharing with your team?</p>
          <h2 id="pf-share-title">Send this portfolio <span>in one tap.</span></h2>
          <p>No login, no download. Each project also has its own <strong>Share</strong> link that opens straight to it.</p>
        </div>
        <div class="pf-share-ui">
          <label for="pfShareUrl">Portfolio link</label>
          <div class="pf-share-row"><input id="pfShareUrl" type="text" readonly value="https://www.xendersecrets.com/portfolio"><button type="button" class="btn primary" id="pfCopy">Copy link</button></div>
          <div class="pf-share-row">
            <a class="btn ghost" href="${esc(wa("Have a look at Xender Secrets' portfolio: https://www.xendersecrets.com/portfolio"))}" target="_blank" rel="noopener" data-cta="portfolio-share-whatsapp">Share on WhatsApp</a>
            <a class="btn ghost" href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.xendersecrets.com%2Fportfolio" target="_blank" rel="noopener" data-cta="portfolio-share-linkedin">LinkedIn</a>
            <a class="btn ghost" href="mailto:?subject=Xender%20Secrets%20portfolio&amp;body=https%3A%2F%2Fwww.xendersecrets.com%2Fportfolio" data-cta="portfolio-share-email">Email</a>
            <button type="button" class="btn ghost" id="pfNativeShare" hidden>More…</button>
          </div>
          <p id="pfCopyMsg" class="pf-copy-msg" role="status" aria-live="polite"></p>
        </div>
      </div>
    </section>

    ${leadForm}`;
}

/** Homepage rail: the first six projects, scrubbed horizontally by vertical scroll. */
export function workRail() {
  const items = PROJECTS.filter((p) => p.preview).slice(0, 8);
  return `<section class="rail" id="work" data-scroll-scene="pin" aria-labelledby="rail-title">
      <div class="rail-sticky">
        <div class="wrap rail-head">
          <div>
            <p class="kicker">Work you can inspect</p>
            <h2 id="rail-title">See real builds <span>before you pay.</span></h2>
            <p>Every card opens a live concept demo or working build by Xender Secrets — labelled honestly, never passed off as client projects.</p>
          </div>
          <div class="rail-actions"><a class="btn primary" href="/portfolio.html" data-cta="home-portfolio-primary">Open the portfolio ↗</a><a class="btn ghost" href="/website-catalog.html" data-cta="work-full-catalog">All demos</a></div>
        </div>
        <div class="rail-viewport">
          <ol class="rail-track">
            ${items.map((p) => `<li class="rail-card" style="--a:${p.accent}">
              <a href="/portfolio.html#p-${p.slug}" data-cta="home-rail-${p.slug}">
                <span class="rail-art" aria-hidden="true"><span class="rail-bar"><i></i><i></i><i></i></span><b>${esc(p.title)}</b></span>
                <span class="pf-kind pf-kind-${p.kind}">${KINDS[p.kind].label}</span>
                <strong>${esc(p.title)}</strong>
                <span class="rail-one">${esc(p.oneLine)}</span>
              </a>
            </li>`).join("\n            ")}
          </ol>
        </div>
        <div class="wrap"><div class="rail-progress" aria-hidden="true"><span></span></div></div>
      </div>
    </section>`;
}

export function portfolioJsonLd(SITE, ORG_ID) {
  return {
    "@context": "https://schema.org", "@type": "CollectionPage", name: "Xender Secrets portfolio", url: SITE + "/portfolio",
    description: "Xender Secrets' own products and live demos. Fictional brands are demos, not commissioned client projects.",
    isPartOf: { "@id": ORG_ID }, publisher: { "@id": ORG_ID },
    mainEntity: { "@type": "ItemList", numberOfItems: PROJECTS.length, itemListElement: PROJECTS.map((p, i) => ({
      "@type": "ListItem", position: i + 1,
      item: { "@type": p.slug === "sitecheck" ? "SoftwareApplication" : "CreativeWork", name: p.title, description: p.oneLine + ". " + p.problem,
        url: SITE + p.href.replace(/\.html$/, ""), creator: { "@id": ORG_ID }, ...(p.slug === "sitecheck" ? { applicationCategory: "BrowserApplication", operatingSystem: "Chrome" } : {}) },
    })) },
  };
}
