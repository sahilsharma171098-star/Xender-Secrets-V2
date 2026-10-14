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
export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES);

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

const shotImg = (p, i) => `<img src="/work/${p.slug}-1200.webp" srcset="/work/${p.slug}-640.webp 640w, /work/${p.slug}-1200.webp 1200w" sizes="(max-width: 900px) 100vw, 50vw" width="1200" height="750" alt="Screenshot of ${esc(p.title)}, a ${esc(KINDS[p.kind].label.toLowerCase())} by Xender Secrets"${i < 2 ? "" : ' loading="lazy"'} decoding="async">`;

function card(p, i) {
  const kind = KINDS[p.kind];
  const search = [p.title, p.oneLine, p.problem, ...p.features, ...p.tech, ...p.cats.map((c) => CATEGORY_LABEL[c])].join(" ").toLowerCase();
  return `<article class="pf-card motion-reveal" id="p-${p.slug}" data-cats="${p.cats.join(" ")}" data-search="${esc(search)}" aria-labelledby="p-${p.slug}-t">
            <a class="pf-shot" href="${p.href}" data-cta="portfolio-shot-${p.slug}" tabindex="-1" aria-hidden="true">${shotImg(p, i)}<span class="pf-open">${p.kind === "product" ? "Open the product" : "Open live demo"} ↗</span></a>
            <div class="pf-body">
              <div class="pf-meta"><span class="pf-kind pf-kind-${p.kind}" title="${esc(kind.note)}">${kind.label}</span><span>${p.cats.map((c) => CATEGORY_LABEL[c]).join(" · ")}</span></div>
              <h3 id="p-${p.slug}-t"><span class="pf-num">${String(i + 1).padStart(2, "0")}</span> ${esc(p.title)}</h3>
              <p class="pf-one">${esc(p.oneLine)}.</p>
              <details class="pf-details">
                <summary>Problem, features &amp; stack</summary>
                <p class="pf-problem"><strong>Problem it solves:</strong> ${esc(p.problem)}</p>
                <ul class="pf-features">${p.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
              </details>
              <p class="pf-tech" aria-label="Technology">${p.tech.map((t) => `<span>${esc(t)}</span>`).join("")}</p>
              <div class="pf-actions">
                <a class="btn primary" href="${p.href}" data-cta="portfolio-demo-${p.slug}">${p.kind === "product" ? "Open the product" : "Open live demo"} <span aria-hidden="true">↗</span></a>
                <a class="btn ghost" href="#start" data-offer="custom-build" data-like="${p.slug}" data-like-text="${esc(likeText(p))}" data-cta="portfolio-like-${p.slug}">Get one like this</a>
                <button class="pf-share" type="button" data-share="${p.slug}" data-share-title="${esc(p.title)}" aria-label="Copy link to ${esc(p.title)}">Share</button>
              </div>
            </div>
          </article>`;
}

/** Industries with starting design directions in /business-templates (honestly labelled there as templates). */
const INDUSTRY_DIRECTIONS = [
  ["REAL", "Real estate"], ["REST", "Restaurants"], ["CAFE", "Cafés"], ["HOTL", "Hotels"], ["TRVL", "Travel agencies"], ["CLIN", "Doctors &amp; clinics"],
  ["DENT", "Dentists"], ["GYM", "Gyms &amp; fitness"], ["SALN", "Salons &amp; spas"], ["LAW", "Law firms"], ["CA", "CA firms"], ["RECR", "Recruitment"],
  ["CONS", "Consultants"], ["MKTG", "Marketing agencies"], ["CNST", "Construction"], ["INTR", "Interior designers"], ["ARCH", "Architects"], ["COCH", "Coaching institutes"],
  ["SCHL", "Schools"], ["TUTR", "Tutors"], ["ECOM", "E-commerce brands"], ["RETL", "Local retail"], ["AUTO", "Car dealers"], ["REPR", "Repair services"],
  ["HOME", "Home services"], ["PHOTO", "Photography"], ["EVNT", "Wedding &amp; events"], ["LOGI", "Logistics"], ["SAAS", "SaaS &amp; startups"], ["SMB", "Small businesses"],
  ["PERS", "Freelancers &amp; personal brands"], ["HOSP", "Hospitals"],
];

export function portfolioBody({ leadForm }) {
  const counts = Object.fromEntries(CATEGORIES.map(([c]) => [c, PROJECTS.filter((p) => p.cats.includes(c)).length]));
  return `<section class="pf-hero" aria-labelledby="pf-title">
      <div class="wrap">
        <p class="eyebrow">Catalog · ${PROJECTS.length} live builds</p>
        <h1 id="pf-title">The work, <em>live.</em></h1>
        <div class="pf-hero-foot">
          <p class="lede">Websites, stores, dashboards, booking apps, APIs and a browser extension — all designed and built by Xender Secrets. Open any of them on your phone, then ask for one built around your business.</p>
          <ul class="pf-legend" aria-label="How projects are labelled">
            ${Object.entries(KINDS).map(([k, v]) => `<li><span class="pf-kind pf-kind-${k}">${v.label}</span> ${esc(v.note)}</li>`).join("\n            ")}
          </ul>
        </div>
      </div>
    </section>

    <section class="pf-projects" id="projects" aria-labelledby="pf-projects-title">
      <div class="pf-toolbar">
        <div class="wrap pf-toolbar-inner">
          <h2 id="pf-projects-title" class="pf-sr">Projects</h2>
          <div class="pf-filters" role="group" aria-label="Filter projects by category">
            <button type="button" class="pf-filter" data-filter="all" aria-pressed="true">All <span>${PROJECTS.length}</span></button>
            ${CATEGORIES.map(([c, l]) => `<button type="button" class="pf-filter" data-filter="${c}" aria-pressed="false">${l} <span>${counts[c]}</span></button>`).join("\n            ")}
          </div>
          <label class="pf-search"><span class="pf-sr">Search the catalog</span><input id="pfSearch" type="search" placeholder="Search: booking, API, cart…" autocomplete="off"></label>
        </div>
      </div>
      <div class="wrap">
        <p class="pf-status" id="pfStatus" role="status" aria-live="polite">Showing all ${PROJECTS.length} projects.</p>
        <div class="pf-grid">
          ${PROJECTS.map(card).join("\n          ")}
        </div>
        <p class="pf-note">Screenshots are taken from the live pages. Fictional brand names mark demos; nothing here is presented as a paid client project.</p>
        <p class="pf-empty" id="pfEmpty" hidden>Nothing matches that yet — <a href="#start" data-offer="custom-build" data-cta="portfolio-empty-quote">tell us what you need</a> and we'll quote it.</p>
      </div>
    </section>

    <section class="section pf-directions" id="industries" aria-labelledby="pf-dir-title">
      <div class="wrap">
        <div class="section-head">
          <p class="kicker">Design directions by industry</p>
          <h2 id="pf-dir-title">Starting points for <span>${INDUSTRY_DIRECTIONS.length} industries.</span></h2>
          <p>Layout and style directions we adapt to your brand — starting templates, not finished client websites. Pick an industry to see the directions, then customise one on WhatsApp.</p>
        </div>
        <nav class="sx-industries" aria-label="Design directions by industry">
          ${INDUSTRY_DIRECTIONS.map(([code, label]) => `<a href="/template-preview.html?id=${code}-01" data-cta="portfolio-direction-${code.toLowerCase()}">${label}</a>`).join("\n          ")}
        </nav>
        <p class="center"><a class="btn ghost" href="/business-templates.html" data-cta="portfolio-all-templates">Browse every direction</a> <a class="btn ghost" href="/website-catalog.html" data-cta="portfolio-full-catalog">All live demos</a></p>
      </div>
    </section>

    <section class="section pf-share-section" aria-labelledby="pf-share-title">
      <div class="wrap pf-share-box">
        <div>
          <p class="kicker">Sharing with your team?</p>
          <h2 id="pf-share-title">Send the catalog <span>in one tap.</span></h2>
          <p>No login, no download. Each project also has its own <strong>Share</strong> link that opens straight to it.</p>
        </div>
        <div class="pf-share-ui">
          <label for="pfShareUrl">Catalog link</label>
          <div class="pf-share-row"><input id="pfShareUrl" type="text" readonly value="https://www.xendersecrets.com/portfolio"><button type="button" class="btn primary" id="pfCopy">Copy link</button></div>
          <div class="pf-share-row">
            <a class="btn ghost" href="${esc(wa("Have a look at Xender Secrets' catalog: https://www.xendersecrets.com/portfolio"))}" target="_blank" rel="noopener" data-cta="portfolio-share-whatsapp">WhatsApp</a>
            <a class="btn ghost" href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.xendersecrets.com%2Fportfolio" target="_blank" rel="noopener" data-cta="portfolio-share-linkedin">LinkedIn</a>
            <a class="btn ghost" href="mailto:?subject=Xender%20Secrets%20catalog&amp;body=https%3A%2F%2Fwww.xendersecrets.com%2Fportfolio" data-cta="portfolio-share-email">Email</a>
            <button type="button" class="btn ghost" id="pfNativeShare" hidden>More…</button>
          </div>
          <p id="pfCopyMsg" class="pf-copy-msg" role="status" aria-live="polite"></p>
        </div>
      </div>
    </section>

    ${leadForm}`;
}

export function portfolioJsonLd(SITE, ORG_ID) {
  return {
    "@context": "https://schema.org", "@type": "CollectionPage", name: "Xender Secrets catalog", url: SITE + "/portfolio",
    description: "Xender Secrets' own products and live demos. Fictional brands are demos, not commissioned client projects.",
    isPartOf: { "@id": ORG_ID }, publisher: { "@id": ORG_ID },
    mainEntity: { "@type": "ItemList", numberOfItems: PROJECTS.length, itemListElement: PROJECTS.map((p, i) => ({
      "@type": "ListItem", position: i + 1,
      item: { "@type": p.slug === "sitecheck" ? "SoftwareApplication" : "CreativeWork", name: p.title, description: p.oneLine + ". " + p.problem,
        url: SITE + p.href.replace(/\.html$/, ""), creator: { "@id": ORG_ID }, ...(p.slug === "sitecheck" ? { applicationCategory: "BrowserApplication", operatingSystem: "Chrome" } : {}) },
    })) },
  };
}
