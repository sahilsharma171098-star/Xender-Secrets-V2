import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = (name) => readFileSync(new URL("../../public/" + name, import.meta.url), "utf8");
const STORES = {
  sitecheck: "egkpcmgkfakclaooopabcmffdmaldkhe",
  gridsnip: "flejimiajadjeghbjcgkonenbiikaeif",
};

test("two released extensions have accessible, indexable landing pages", () => {
  for (const path of ["extensions.html", "gridsnip.html"]) {
    const html = page(path);
    assert.match(html, /<main>/);
    assert.match(html, /name="robots" content="index,follow"/);
    assert.match(html, /rel="canonical" href="https:\/\/www\.xendersecrets\.com\/(extensions|gridsnip)"/);
    assert.match(html, /<title>.+<\/title>/);
  }
});

test("official Chrome Store IDs and published install actions match", () => {
  const hub = page("extensions.html");
  const gridsnip = page("gridsnip.html");
  const sitecheck = page("sitecheck.html");
  assert.ok(hub.includes(STORES.sitecheck));
  assert.ok(hub.includes(STORES.gridsnip));
  assert.ok(gridsnip.includes(STORES.gridsnip));
  assert.ok(sitecheck.includes(STORES.sitecheck));
  assert.match(sitecheck, /data-cta="sitecheck-install-chrome"/);
  assert.match(sitecheck, /data-cta="sitecheck-install-firefox"/);
  assert.ok(!sitecheck.includes("Chrome Web Store listing not live yet"));
  assert.ok(!sitecheck.includes("Firefox Add-ons listing not live yet"));
});

test("sitemap includes both public extension landing pages", () => {
  const sitemap = page("sitemap.xml");
  for (const slug of ["extensions", "gridsnip", "sitecheck"]) {
    assert.ok(sitemap.includes("<loc>https://www.xendersecrets.com/" + slug + "</loc>"));
  }
});

test("do not take payments or claim live paid feature delivery before verification", () => {
  for (const html of [page("extensions.html"), page("gridsnip.html")]) {
    assert.ok(!/<form[^>]+action=.*payu/i.test(html));
    assert.ok(!/Pay now|Buy Pro|Subscribe now/i.test(html));
  }
});
