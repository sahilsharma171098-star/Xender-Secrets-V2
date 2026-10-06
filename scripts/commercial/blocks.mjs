// Reusable sections for generated commercial pages.
import { esc, wa, offerById } from "./layout.mjs";

export function hero({ eyebrow, h1, lede, primary = "Get a free website check", primaryOffer = "free-website-check", waText, card, ctaPrefix }) {
  return `<section class="hero">
      <div class="wrap hero-grid">
        <div>
          <p class="eyebrow">${eyebrow}</p>
          <h1>${h1}</h1>
          <p class="lede">${lede}</p>
          <div class="actions">
            <a class="btn primary lg" href="#start" data-offer="${primaryOffer}" data-cta="${ctaPrefix}-hero-primary">${primary}</a>
            <a class="btn ghost lg" href="${esc(wa(waText))}" data-cta="${ctaPrefix}-hero-whatsapp" target="_blank" rel="noopener">Chat on WhatsApp</a>
          </div>
          <ul class="trust" aria-label="Why work with Xender">
            <li>GST-registered business</li>
            <li>Price fixed before work starts</li>
            <li>You own the site &amp; content</li>
            <li>No lock-in, no forced retainer</li>
          </ul>
        </div>
        ${card || ""}
      </div>
    </section>`;
}

export function offerCard({ offer, title, bullets, cta, featured = false, ctaPrefix }) {
  const o = offerById(offer);
  return `<aside class="hero-card" aria-labelledby="rec-title">
          <p class="tag">${esc(title)}</p>
          <h2 id="rec-title">${esc(o.name)} — ${o.price}</h2>
          <ul class="checks">${bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
          <a class="btn primary block" href="#start" data-offer="${o.id}" data-cta="${ctaPrefix}-card">${esc(cta || "Choose " + o.price)}</a>
          <p class="fine">Domain and any paid hosting are billed at cost, separately. Scope confirmed in writing first.</p>
        </aside>`;
}

export function pricingBlock({ ctaPrefix, heading = 'Simple packages. <span>Clear prices.</span>', intro = "Start with the smallest thing that gets you enquiries. Upgrade only when your business needs it.", featured = "founding-website-999", id = "services" }) {
  const cards = [
    ["free-website-check", "₹0", "", "Send your current website (or Google Business / Instagram page). We reply with specific fixes for mobile, speed, trust and enquiries.", ["Personal review, not an automated PDF", "Clear list of what to fix first", "No obligation to buy"], "Request free check"],
    ["founding-website-999", "₹999", "one-time", "One-page, mobile-first business site with WhatsApp/contact integration and full handover. Limited to our first 10 businesses.", ["1 page, up to 6 sections", "WhatsApp, call &amp; map", "Basic SEO setup"], "Choose ₹999"],
    ["business-starter-1999", "₹1,999", "one-time", "Up to 3 pages — home, services and contact — with an enquiry form and on-page SEO for your city and services.", ["Up to 3 pages", "Enquiry form to your inbox", "City &amp; service SEO basics"], "Choose ₹1,999"],
    ["business-pro-3499", "₹3,499", "one-time", "Up to 5 pages with stronger trust sections, enquiry forms and analytics, for businesses that sell several services.", ["Up to 5 pages", "Forms &amp; analytics setup", "Service-by-service pages"], "Choose ₹3,499"],
  ];
  return `<section id="${id}" class="section">
      <div class="wrap">
        <div class="section-head">
          <p class="kicker">Pricing</p>
          <h2>${heading}</h2>
          <p>${intro}</p>
          <p class="intl-note" data-intl-note hidden>Outside India? The ₹ packages are for Indian businesses. International landing pages start from <strong>US$299</strong> — <a href="#start" data-offer="custom-build" data-cta="${ctaPrefix}-intl">ask for a quote</a>.</p>
        </div>
        <div class="offers">
          ${cards.map(([id2, price, unit, p, list, label]) => `<article class="card offer${id2 === featured ? " featured" : ""}">
            <p class="offer-name">${esc(offerById(id2).name)}</p>
            <p class="price">${price}${unit ? ` <small>${unit}</small>` : ""}</p>
            <p>${p}</p>
            <ul class="checks small">${list.map((l) => `<li>${l}</li>`).join("")}</ul>
            <a class="btn ${id2 === featured ? "primary" : "ghost"} block" href="#start" data-offer="${id2}" data-cta="${ctaPrefix}-offer-${id2}">${label}</a>
          </article>`).join("\n          ")}
        </div>
        <div class="custom-row card">
          <div>
            <p class="offer-name">Redesign or custom build · from ₹4,999</p>
            <p>Redesign of an existing site, booking or quote flows, dashboards, lead routing and automation. Quoted after a short discovery chat. Outside India, landing pages start from US$299.</p>
          </div>
          <a class="btn ghost" href="#start" data-offer="custom-build" data-cta="${ctaPrefix}-offer-custom">Discuss a project</a>
        </div>
      </div>
    </section>`;
}

export function processBlock() {
  return `<section id="process" class="section">
      <div class="wrap">
        <div class="section-head">
          <p class="kicker">How it works</p>
          <h2>Four steps. <span>No surprises.</span></h2>
        </div>
        <ol class="steps">
          <li><h3>Tell us about your business</h3><p>Fill the short form or WhatsApp us. Share your current site or social page if you have one.</p></li>
          <li><h3>Get a fixed quote in writing</h3><p>Pages, sections, features, price and delivery date are agreed before any work or payment.</p></li>
          <li><h3>Review a live preview</h3><p>You see the site on your own phone through a preview link and ask for the agreed revisions.</p></li>
          <li><h3>Launch &amp; handover</h3><p>We connect your domain, test enquiries end to end and hand over everything. Support after launch is optional.</p></li>
        </ol>
      </div>
    </section>`;
}

export function cardsBlock({ kicker, heading, intro = "", items, alt = false, id = "" }) {
  return `<section class="section${alt ? " alt" : ""}"${id ? ` id="${id}"` : ""}>
      <div class="wrap">
        <div class="section-head">
          <p class="kicker">${kicker}</p>
          <h2>${heading}</h2>
          ${intro ? `<p>${intro}</p>` : ""}
        </div>
        <div class="grid3 grid-auto">
          ${items.map(([h, p]) => `<article class="card"><h3>${h}</h3><p>${p}</p></article>`).join("\n          ")}
        </div>
      </div>
    </section>`;
}

export function buildListBlock({ heading, intro, items, aside }) {
  return `<section class="section alt">
      <div class="wrap split">
        <div>
          <p class="kicker">What we'd build</p>
          <h2>${heading}</h2>
          <p>${intro}</p>
          <ul class="checks">${items.map((i) => `<li>${i}</li>`).join("")}</ul>
        </div>
        ${aside}
      </div>
    </section>`;
}

/** Concept templates for an industry, linked into the existing catalog. Always labelled as demos. */
export function templatesBlock({ business, ids, label, ctaPrefix }) {
  return `<section id="work" class="section">
      <div class="wrap">
        <div class="section-head">
          <p class="kicker">Work you can inspect</p>
          <h2>${esc(label)} templates <span>to start from.</span></h2>
          <p>These are concept demos built by Xender Secrets — not client projects. Open one, pick the style you like, and we customise it with your name, services, photos and contact details.</p>
        </div>
        <div class="grid3">
          ${ids.map(([id, style]) => `<a class="card work" href="/template-preview.html?id=${id}" data-cta="${ctaPrefix}-template-${id}">
            <span class="tag">Concept demo · ${id}</span>
            <h3>${esc(style)} ${esc(label.toLowerCase())} site</h3>
            <p>Open the live preview on your phone.</p>
            <span class="more">Preview ${id} →</span>
          </a>`).join("\n          ")}
        </div>
        <p class="center"><a class="btn ghost" href="/business-templates.html?business=${business}" data-cta="${ctaPrefix}-all-templates">See all ${esc(label.toLowerCase())} templates</a></p>
      </div>
    </section>`;
}

export function includedAside() {
  return `<div class="card included">
          <h3>Always included</h3>
          <ul class="checks"><li>Mobile-first, fast-loading pages</li><li>WhatsApp and call buttons that work</li><li>Enquiries tested end to end before launch</li><li>Your files, logins and content handed over</li></ul>
          <h3>Billed separately, at cost</h3>
          <ul class="dash"><li>Domain name and any paid hosting</li><li>Paid plugins, stock photos or third-party services</li><li>Work beyond the agreed scope (quoted first)</li></ul>
        </div>`;
}

export function relatedBlock(links) {
  return `<section class="section related">
      <div class="wrap">
        <p class="kicker">Related</p>
        <div class="chips left">${links.map(([href, label]) => `<a href="${href}">${label}</a>`).join("")}</div>
      </div>
    </section>`;
}
