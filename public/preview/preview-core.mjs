// Xender client-preview system (Issue #19 / XEND-SALES-002).
// Shared by the browser (preview.html, preview-builder.html) and the Worker (src/growth.mjs).
// sanitizeConfig() is the single gate for untrusted input; renderPreview() only ever emits
// escaped text and whitelisted URLs, and always includes the Xender draft banner.

export const VERTICALS = {
  dental: {
    label: "Dental / Clinic", accent: "#0e7490", emoji: "🦷",
    cta: "Book an appointment", ctaMsg: "Hi, I'd like to book an appointment.",
    servicesTitle: "Treatments", aboutTitle: "Meet your doctor",
    defaults: ["Dental check-up & cleaning|Gentle cleaning and a full check-up.", "Root canal treatment|Pain-managed treatment to save the natural tooth.", "Braces & aligners|Straighter teeth for children and adults.", "Implants & crowns|Long-lasting replacements that look natural."],
  },
  realestate: {
    label: "Real Estate", accent: "#b45309", emoji: "🏠",
    cta: "Schedule a site visit", ctaMsg: "Hi, I'm interested in a property. Can we schedule a site visit?",
    servicesTitle: "Properties & services", aboutTitle: "About us",
    defaults: ["Buy a home|Apartments, builder floors and villas matched to your budget.", "Rent|Verified rental options with quick site visits.", "Sell your property|Pricing guidance and qualified buyers.", "Commercial spaces|Offices and retail in prime locations."],
  },
  pro: {
    label: "Professional Services", accent: "#1d4ed8", emoji: "📊",
    cta: "Book a consultation", ctaMsg: "Hi, I'd like to book a consultation.",
    servicesTitle: "Services", aboutTitle: "About the firm",
    defaults: ["GST registration & returns|Timely filing and compliance support.", "Income tax filing|Individual and business returns, done right.", "Audit & assurance|Statutory and internal audits.", "Business registration|Company, LLP and partnership setup."],
  },
  fitness: {
    label: "Fitness / Gym", accent: "#dc2626", emoji: "💪",
    cta: "Book a free trial", ctaMsg: "Hi, I'd like to book a free trial session.",
    servicesTitle: "Programs", aboutTitle: "About the gym",
    defaults: ["Strength training|Coached sessions for every level.", "Weight loss programs|Training plus simple nutrition guidance.", "Personal training|One-to-one sessions with a certified trainer.", "Group classes|HIIT, Zumba and functional training."],
  },
  restaurant: {
    label: "Restaurant / Café", accent: "#9a3412", emoji: "🍽️",
    cta: "Reserve a table", ctaMsg: "Hi, I'd like to reserve a table.",
    servicesTitle: "Menu highlights", aboutTitle: "Our story",
    defaults: ["Chef's specials|Seasonal dishes made fresh every day.", "Starters & small plates|Perfect for sharing.", "Mains|Signature dishes our guests come back for.", "Desserts & drinks|Something sweet to finish."],
  },
};

const LIMITS = { name: 80, tagline: 140, city: 60, area: 80, about: 900, address: 200, service: 70, desc: 200, price: 30, highlight: 60, hoursDay: 40, hoursTime: 40, note: 200 };

const str = (v, n) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const phone = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const plus = s.startsWith("+");
  const d = s.replace(/\D/g, "");
  if (d.length < 7 || d.length > 15) return "";
  if (!plus && d.length === 10 && /^[6-9]/.test(d)) return "+91" + d;
  return (plus ? "+" : "") + d;
};
const httpUrl = (v) => {
  const s = str(v, 400);
  if (!s) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s);
    return /^https?:$/.test(u.protocol) && u.hostname.includes(".") ? u.href : "";
  } catch { return ""; }
};
const email = (v) => { const s = str(v, 254).toLowerCase(); return /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(s) ? s : ""; };
const color = (v, fallback) => (/^#[0-9a-f]{6}$/i.test(String(v || "")) ? String(v).toLowerCase() : fallback);

/** Parse "Name | description | price" lines or objects into service items. */
function services(list) {
  const arr = Array.isArray(list) ? list : String(list ?? "").split("\n");
  return arr.map((x) => {
    if (typeof x === "string") { const [n, d, p] = x.split("|"); return { name: str(n, LIMITS.service), desc: str(d, LIMITS.desc), price: str(p, LIMITS.price) }; }
    return { name: str(x?.name, LIMITS.service), desc: str(x?.desc, LIMITS.desc), price: str(x?.price, LIMITS.price) };
  }).filter((s) => s.name).slice(0, 8);
}

/** The only gate for untrusted preview input. Returns { ok, errors, config }. */
export function sanitizeConfig(input = {}) {
  const v = VERTICALS[input.vertical] ? input.vertical : null;
  const errors = [];
  if (!v) errors.push("Choose a vertical: " + Object.keys(VERTICALS).join(", "));
  const name = str(input.name, LIMITS.name);
  if (!name) errors.push("Business name is required.");
  const meta = VERTICALS[v] || VERTICALS.pro;
  const hours = (Array.isArray(input.hours) ? input.hours : String(input.hours ?? "").split("\n").map((l) => l.split("|")))
    .map((h) => [str(h?.[0], LIMITS.hoursDay), str(h?.[1], LIMITS.hoursTime)]).filter((h) => h[0] && h[1]).slice(0, 7);
  const highlights = (Array.isArray(input.highlights) ? input.highlights : String(input.highlights ?? "").split("\n"))
    .map((h) => str(h, LIMITS.highlight)).filter(Boolean).slice(0, 6);
  const svc = services(input.services);
  const config = {
    vertical: v || "pro",
    name,
    tagline: str(input.tagline, LIMITS.tagline),
    city: str(input.city, LIMITS.city),
    area: str(input.area, LIMITS.area),
    about: str(input.about, LIMITS.about),
    address: str(input.address, LIMITS.address),
    phone: phone(input.phone),
    whatsapp: phone(input.whatsapp) || phone(input.phone),
    email: email(input.email),
    mapsQuery: str(input.mapsQuery, 200),
    googleUrl: httpUrl(input.googleUrl),
    instagram: httpUrl(input.instagram),
    heroImage: httpUrl(input.heroImage),
    accent: color(input.accent, meta.accent),
    services: svc.length ? svc : services(meta.defaults),
    servicesAreSamples: !svc.length,
    // Highlights are claims about the prospect's business, so never defaulted (no fabricated claims).
    highlights,
    hours,
    cta: str(input.cta, 40) || meta.cta,
    note: str(input.note, LIMITS.note),
  };
  return { ok: errors.length === 0, errors, config };
}

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const waLink = (num, text) => `https://wa.me/${String(num).replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
const XENDER_WA = "919821941814";
/** Display format: +91 98219 41814 for Indian mobiles, otherwise the number as stored. */
export const fmtPhone = (p) => (/^\+91[6-9]\d{9}$/.test(p) ? `+91 ${p.slice(3, 8)} ${p.slice(8)}` : p);

/**
 * Render a sanitized config into page HTML (body content + scoped <style>).
 * opts.id: stored preview id (for the Xender CTA message), opts.expiresAt: ISO date.
 */
export function renderPreview(cfg, { id = "", expiresAt = "" } = {}) {
  const meta = VERTICALS[cfg.vertical];
  const place = [cfg.area, cfg.city].filter(Boolean).join(", ");
  const contactWa = cfg.whatsapp ? waLink(cfg.whatsapp, (VERTICALS[cfg.vertical].ctaMsg)) : "";
  const tel = cfg.phone ? "tel:" + cfg.phone : "";
  const xenderMsg = `Hi Xender Secrets, I saw the website preview${id ? " " + id : ""} for ${cfg.name}. I'd like to discuss it.`;
  const map = cfg.mapsQuery ? `https://www.google.com/maps?q=${encodeURIComponent(cfg.mapsQuery)}&output=embed` : "";
  const initials = cfg.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const primaryHref = contactWa || tel || (cfg.email ? "mailto:" + cfg.email : "#contact");
  const css = `
  .xp{--a:${cfg.accent};--ink:#0f172a;--muted:#55606f;--line:#e5e9f0;--bg:#fff;--soft:#f6f8fb;font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg)}
  .xp *{box-sizing:border-box}.xp a{color:var(--a)}.xp h1,.xp h2,.xp h3{line-height:1.15;letter-spacing:-.02em;margin:0 0 .5em}
  .xp-banner{position:sticky;top:0;z-index:50;background:#0b1220;color:#e2e8f0;font-size:13px;padding:8px 14px;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
  .xp-banner strong{color:#fff}.xp-banner a{color:#93c5fd;font-weight:700;text-decoration:none;white-space:nowrap}
  .xp-wrap{width:min(1080px,calc(100% - 32px));margin:auto}
  .xp-nav{display:flex;align-items:center;justify-content:space-between;padding:14px 0;gap:12px}
  .xp-logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:1.05rem}
  .xp-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:var(--a);color:#fff;font-weight:800;font-size:.9rem}
  .xp-btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 18px;border-radius:12px;background:var(--a);color:#fff!important;font-weight:700;text-decoration:none;border:0}
  .xp-btn.ghost{background:transparent;color:var(--ink)!important;border:1px solid var(--line)}
  .xp-hero{padding:48px 0 40px;background:linear-gradient(180deg,color-mix(in srgb,var(--a) 9%,#fff),#fff)}
  .xp-hero-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:36px;align-items:center}
  .xp-hero h1{font-size:clamp(2rem,5vw,3.2rem)}.xp-hero p{color:var(--muted);font-size:1.1rem;max-width:560px}
  .xp-actions{display:flex;flex-wrap:wrap;gap:10px;margin:22px 0}
  .xp-hl{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:8px}
  .xp-hl li{background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:.9rem;font-weight:600}
  .xp-visual{aspect-ratio:4/3;border-radius:20px;background:linear-gradient(135deg,var(--a),color-mix(in srgb,var(--a) 45%,#111));display:grid;place-items:center;font-size:5rem;color:#fff;overflow:hidden}
  .xp-visual img{width:100%;height:100%;object-fit:cover}
  .xp-sec{padding:48px 0}.xp-sec.alt{background:var(--soft)}.xp-kicker{color:var(--a);font-weight:800;font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;margin:0 0 8px}
  .xp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
  .xp-card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px}.xp-card p{margin:0;color:var(--muted)}
  .xp-price{font-weight:800;color:var(--a);margin-top:8px!important}
  .xp-two{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start}
  .xp-hours{width:100%;border-collapse:collapse}.xp-hours td{padding:8px 0;border-bottom:1px solid var(--line)}.xp-hours td:last-child{text-align:right;font-weight:600}
  .xp-map{width:100%;height:280px;border:0;border-radius:16px;background:var(--soft)}
  .xp-foot{padding:28px 0 100px;color:var(--muted);font-size:.9rem;border-top:1px solid var(--line)}
  .xp-float{position:fixed;left:12px;right:12px;bottom:12px;z-index:40;display:flex;gap:10px;justify-content:center}
  .xp-float a{box-shadow:0 8px 24px rgba(0,0,0,.18)}
  .xp-sample{font-size:.8rem;color:var(--muted);font-style:italic}
  @media(max-width:820px){.xp-hero-grid,.xp-two{grid-template-columns:1fr}.xp-visual{aspect-ratio:16/9;font-size:3.5rem}.xp-nav .xp-btn{display:none}}
  `;
  const hours = cfg.hours.length ? `<table class="xp-hours">${cfg.hours.map(([d, t]) => `<tr><td>${esc(d)}</td><td>${esc(t)}</td></tr>`).join("")}</table>` : "";
  return `<style>${css}</style>
<div class="xp">
  <div class="xp-banner" role="note">
    <span><strong>Draft website preview</strong> prepared by Xender Secrets for ${esc(cfg.name)} — not the official website.${expiresAt ? ` Expires ${esc(String(expiresAt).slice(0, 10))}.` : ""}</span>
    <a href="${esc(waLink(XENDER_WA, xenderMsg))}" target="_blank" rel="noopener" data-cta="preview-banner">Get this website →</a>
  </div>
  <header class="xp-wrap xp-nav">
    <div class="xp-logo"><span class="xp-mark">${esc(initials)}</span><span>${esc(cfg.name)}</span></div>
    <a class="xp-btn" href="${esc(primaryHref)}" target="_blank" rel="noopener">${esc(cfg.cta)}</a>
  </header>
  <section class="xp-hero">
    <div class="xp-wrap xp-hero-grid">
      <div>
        ${place ? `<p class="xp-kicker">${esc(meta.label)} · ${esc(place)}</p>` : `<p class="xp-kicker">${esc(meta.label)}</p>`}
        <h1>${esc(cfg.tagline || cfg.name)}</h1>
        <p>${esc(cfg.tagline ? cfg.name + (place ? " in " + place : "") : (place ? "Serving " + place : ""))}</p>
        <div class="xp-actions">
          <a class="xp-btn" href="${esc(primaryHref)}" target="_blank" rel="noopener">${esc(cfg.cta)}</a>
          ${tel ? `<a class="xp-btn ghost" href="${esc(tel)}">Call ${esc(fmtPhone(cfg.phone))}</a>` : ""}
        </div>
        ${cfg.highlights.length ? `<ul class="xp-hl">${cfg.highlights.map((h) => `<li>✓ ${esc(h)}</li>`).join("")}</ul>` : ""}
      </div>
      <div class="xp-visual" aria-hidden="true">${cfg.heroImage ? `<img src="${esc(cfg.heroImage)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : esc(meta.emoji)}</div>
    </div>
  </section>
  <section class="xp-sec">
    <div class="xp-wrap">
      <p class="xp-kicker">${esc(meta.servicesTitle)}</p>
      <h2>What we offer</h2>
      ${cfg.servicesAreSamples ? `<p class="xp-sample">Sample items — replaced with your real ${esc(meta.servicesTitle.toLowerCase())} in the final website.</p>` : ""}
      <div class="xp-grid">${cfg.services.map((s) => `<article class="xp-card"><h3>${esc(s.name)}</h3>${s.desc ? `<p>${esc(s.desc)}</p>` : ""}${s.price ? `<p class="xp-price">${esc(s.price)}</p>` : ""}</article>`).join("")}</div>
    </div>
  </section>
  ${cfg.about ? `<section class="xp-sec alt"><div class="xp-wrap"><p class="xp-kicker">${esc(meta.aboutTitle)}</p><h2>${esc(cfg.name)}</h2><p>${esc(cfg.about)}</p>${cfg.googleUrl ? `<p><a href="${esc(cfg.googleUrl)}" target="_blank" rel="noopener noreferrer">See us on Google →</a></p>` : ""}</div></section>` : ""}
  <section class="xp-sec${cfg.about ? "" : " alt"}" id="contact">
    <div class="xp-wrap xp-two">
      <div>
        <p class="xp-kicker">Visit &amp; contact</p>
        <h2>${esc(cfg.cta)}</h2>
        ${cfg.address ? `<p>${esc(cfg.address)}</p>` : ""}
        ${hours}
        <div class="xp-actions">
          ${contactWa ? `<a class="xp-btn" href="${esc(contactWa)}" target="_blank" rel="noopener">WhatsApp us</a>` : ""}
          ${tel ? `<a class="xp-btn ghost" href="${esc(tel)}">Call</a>` : ""}
          ${cfg.email ? `<a class="xp-btn ghost" href="mailto:${esc(cfg.email)}">Email</a>` : ""}
          ${cfg.instagram ? `<a class="xp-btn ghost" href="${esc(cfg.instagram)}" target="_blank" rel="noopener noreferrer">Instagram</a>` : ""}
        </div>
      </div>
      ${map ? `<iframe class="xp-map" title="Map" src="${esc(map)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>` : ""}
    </div>
  </section>
  <footer class="xp-foot"><div class="xp-wrap">© ${esc(cfg.name)} · Draft preview designed by <a href="https://www.xendersecrets.com/?utm_source=preview&utm_campaign=preview-footer" target="_blank" rel="noopener">Xender Secrets</a>${cfg.note ? ` · ${esc(cfg.note)}` : ""}</div></footer>
  <div class="xp-float"><a class="xp-btn" href="${esc(waLink(XENDER_WA, xenderMsg))}" target="_blank" rel="noopener" data-cta="preview-float">Like it? Get this website from ₹999</a></div>
</div>`;
}
