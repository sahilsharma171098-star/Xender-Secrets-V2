// Portfolio + scroll experience (XEND-PORTFOLIO-002): static guarantees that don't need a browser.
// Browser behaviour (filters, sharing, scroll scrubbing, demos) is covered in tests/commercial-funnel.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROJECTS, CATEGORIES, KINDS } from "../../scripts/commercial/portfolio.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const portfolio = read("public/portfolio.html");
const homepage = read("public/index.html");
const engine = read("public/home.js");

test("portfolio is generated, indexable, canonical and listed in the sitemap", () => {
  assert.match(portfolio, /<link rel="canonical" href="https:\/\/www\.xendersecrets\.com\/portfolio">/);
  assert.match(portfolio, /<meta name="robots" content="index,follow">/);
  assert.match(read("public/sitemap.xml"), /<loc>https:\/\/www\.xendersecrets\.com\/portfolio<\/loc>/);
  const types = [...portfolio.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)].map((m) => JSON.parse(m[1])["@type"]);
  assert.deepEqual(types, ["ProfessionalService", "CollectionPage", "BreadcrumbList"]);
});

test("every one of the eight requested categories has at least one project", () => {
  assert.deepEqual(CATEGORIES.map(([c]) => c), ["business", "landing", "ecommerce", "saas", "frontend", "backend", "fullstack", "extension"]);
  for (const [c, label] of CATEGORIES) {
    assert.ok(PROJECTS.some((p) => p.cats.includes(c)), "no project for " + label);
    assert.match(portfolio, new RegExp(`data-filter="${c}"`));
  }
});

test("every project is real, labelled honestly and complete", () => {
  assert.equal((portfolio.match(/class="pf-card /g) || []).length, PROJECTS.length);
  for (const p of PROJECTS) {
    assert.ok(KINDS[p.kind], p.slug + " has an honest label");
    assert.ok(p.problem && p.oneLine && p.features.length >= 3 && p.tech.length >= 1, p.slug + " is complete");
    assert.ok(fs.existsSync(path.join(ROOT, "public", p.href.slice(1))), "demo file exists: " + p.href);
    const clean = p.href.replace(/\.html$/, "");
    assert.ok(portfolio.includes(`href="${clean}"`), "links to " + clean);
    assert.ok(portfolio.includes(`id="p-${p.slug}"`) && portfolio.includes(`data-like="${p.slug}"`) && portfolio.includes(`data-share="${p.slug}"`), p.slug + " has deep link, quote and share actions");
  }
  // Integrity: no invented clients, results or testimonials anywhere on the page.
  assert.doesNotMatch(portfolio, /testimonial|our clients|trusted by|\d+% (more|increase)|ROI|guaranteed/i);
  assert.match(portfolio, /nothing here is presented as a paid client project/);
});

test("demos carry the honest ribbon and the rebuilt demos are interactive", () => {
  for (const p of PROJECTS.filter((x) => x.href.startsWith("/demo-"))) {
    assert.match(read("public" + p.href), new RegExp(`demo-ribbon\\.js" data-slug="${p.slug}"`), p.href + " ribbon");
  }
  assert.match(read("public/demo-gym.html"), /id="trialForm"/);
  assert.match(read("public/demo-frontend-dashboard.html"), /id="exportCsv"/);
  assert.match(read("public/demo-frontend-store.html"), /id="drawer"/);
  assert.match(read("public/demo-fullstack-booking.html"), /\/api\/bookings/);
  for (const f of ["demo-gym", "demo-local", "demo-pro"]) assert.doesNotMatch(read(`public/${f}.html`), /918368495854|buildnstration/);
  // Previews are iframes; they must not count as page views.
  assert.match(read("public/xs-growth.js"), /window\.self !== window\.top/);
});

test("scroll scenes are scrubbed by scroll position, optional and reduced-motion safe", () => {
  assert.match(homepage, /data-scroll-scene="exit"/);
  assert.match(homepage, /data-scroll-scene="pin" data-steps="4"/);
  assert.match(homepage, /class="rail" id="work" data-scroll-scene="pin"/);
  assert.match(portfolio, /class="pf-story" id="process" data-scroll-scene="pin" data-steps="4"/);
  assert.match(engine, /setProperty\("--p"/);
  assert.match(engine, /prefers-reduced-motion: reduce/);
  assert.match(engine, /saveData/);
  assert.match(engine, /classList\.add\("scroll-fx"\)/);
  // Pinned (tall) layouts only exist when JS opted in.
  assert.match(read("public/home.css"), /html\.scroll-fx \.stack\{height:400vh\}/);
  assert.match(read("public/portfolio.css"), /html\.scroll-fx \.pf-story\{height:380vh\}/);
});

test("navigation leads with Portfolio, Services and Contact / Get a quote", () => {
  const nav = homepage.match(/<nav class="nav"[\s\S]*?<\/nav>/)[0];
  for (const href of ["/portfolio", "/services", "/contact"]) assert.ok(nav.includes(`href="${href}"`), "home nav " + href);
  assert.match(homepage, /data-cta="header-quote">Get a quote</);
  assert.match(read("public/services.html"), /<nav class="nav"[\s\S]*href="\/portfolio"[\s\S]*<\/nav>/);
});
