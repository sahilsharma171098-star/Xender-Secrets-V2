import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const html = read("../../public/immersive-lab.html");
const js = read("../../public/immersive-lab.js");
const css = read("../../public/immersive-lab.css");

test("new lab is explicitly a noindex concept demo with a single real WebGL canvas", () => {
  assert.match(html, /name="robots" content="noindex,follow"/);
  assert.match(html, /<canvas id="showroom"/);
  assert.match(html, /Simulation only/);
  assert.match(html, /No pre-rendered videos/);
  assert.match(html, /immersive-lab\.js/);
  assert.match(html, /immersive-lab\.css/);
  assert.doesNotMatch(html, /<script[^>]+src="https?:\/\//);
});

test("procedural renderer parses and exposes all five distinct verticals", () => {
  assert.doesNotThrow(() => new vm.Script(js));
  for (const key of ["gym", "fashion", "cinema", "property", "bistro"]) {
    assert.match(js, new RegExp("\\b"+key+":\\s*\\{"));
    assert.match(js, new RegExp('key==="'+key+'"'));
  }
  assert.match(js, /gl\.drawArrays/);
  assert.match(js, /setPointerCapture/);
  assert.match(js, /canvas\.addEventListener\("keydown"/);
  assert.match(js, /picker\.addEventListener\("change"/);
});

test("demo interactions never send purchases, bookings or new customer records", () => {
  assert.doesNotMatch(js, /\bfetch\s*\(|\bXMLHttpRequest\b|sendBeacon|localStorage|sessionStorage/);
  assert.match(js, /new Set\(\)/);
  assert.match(js, /Nothing was submitted or purchased/);
  assert.match(html, /Nothing here books, purchases or submits personal data/);
});

test("responsive WebGL stage and reduced motion fallback exist", () => {
  assert.match(css, /\.stage #showroom\{position:absolute;inset:0/);
  assert.match(css, /@media\(max-width:780px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(js, /getContext\("webgl"/);
  assert.match(js, /if\(!gl\)\{fallback\.hidden=false/);
});

test("existing 640 business entries remain generated from 32 industries x 20 variants", () => {
  const context={window:{}};
  new vm.Script(read("../../public/catalog-data.js")).runInNewContext(context);
  const catalog=context.window.XENDER_CATALOG;
  assert.equal(catalog.businessTypes.length,32);
  assert.equal(catalog.variants.length,20);
  assert.equal(catalog.templates.length,640);
  assert.equal(catalog.frontend.length,20);
  assert.equal(catalog.backend.length,20);
  assert.equal(catalog.fullstack.length,20);
  const IDs=catalog.templates.map(t=>t.id);
  assert.equal(new Set(IDs).size,640);
});
