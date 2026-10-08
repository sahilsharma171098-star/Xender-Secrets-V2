import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const portfolio = read("public/portfolio.html");
const styles = read("public/portfolio.css");
const script = read("public/portfolio.js");
const motion = read("public/home.js");
const homepage = read("public/index.html");

test("portfolio is indexable, canonical and truthful about concept work", () => {
  assert.match(portfolio, /<link rel="canonical" href="https:\/\/www\.xendersecrets\.com\/portfolio">/);
  assert.match(portfolio, /<meta name="robots" content="index,follow">/);
  assert.match(portfolio, /not claimed customer commissions/);
  assert.doesNotMatch(portfolio, /client testimonials|100% ROI|guaranteed results/i);
  assert.match(read("public/sitemap.xml"), /<loc>https:\/\/www\.xendersecrets\.com\/portfolio<\/loc>/);
});

test("six inspectable projects have real local destination files", () => {
  const links = [
    "/sitecheck",
    "/demo-frontend-saas",
    "/demo-fullstack-booking",
    "/demo-frontend-store",
    "/demo-backend-crm",
    "/demo-fullstack-commerce",
  ];
  assert.equal((portfolio.match(/class="project-card motion-reveal"/g) || []).length, 6);
  for (const link of links) {
    assert.ok(portfolio.includes('href="' + link + '"'), "missing demo " + link);
    assert.ok(fs.existsSync(path.join(ROOT, "public", link.slice(1) + ".html")), "missing file " + link);
  }
  assert.match(homepage, /href="\/portfolio"/);
});

test("scroll motion is enhanced, mobile friendly and optional", () => {
  assert.match(homepage, /data-motion-scene/);
  assert.match(portfolio, /data-motion-step="convert"/);
  assert.match(motion, /IntersectionObserver/);
  assert.match(motion, /requestAnimationFrame/);
  assert.match(motion, /prefers-reduced-motion: reduce/);
  assert.match(styles, /@media \(prefers-reduced-motion:reduce\)/);
  assert.match(styles, /@media\(max-width:620px\)/);
});

test("filter, sharing and enquiry actions are wired", () => {
  for (const name of ["all", "web", "app", "product"]) assert.match(portfolio, new RegExp('data-filter="' + name + '"'));
  assert.match(script, /addEventListener\("click", \(\) => setFilter/);
  assert.match(script, /navigator\.clipboard\.writeText/);
  assert.match(script, /navigator\.share/);
  assert.match(portfolio, /data-cta="portfolio-lead-whatsapp"/);
  assert.match(portfolio, /data-cta="portfolio-lead-contact"/);
});
