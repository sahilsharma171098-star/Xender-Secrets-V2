import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import vm from "node:vm";
import { clearHighlights, detectLeadIssues } from "../src/lib/lead-leak.js";

function usePage(markup) {
  const dom = new JSDOM(`<!doctype html><html><body>${markup}</body></html>`);
  global.document = dom.window.document;
  return dom;
}

test("serialized MV3 functions handle reruns, repaired links and original styles", () => {
  const dom = usePage('<a style="outline: 1px dashed blue !important">Get a quote</a>');
  const anchor = document.querySelector("a");
  const previous = anchor.style.getPropertyValue("outline");
  const context = vm.createContext({ document });
  const run = () => vm.runInContext(`(${detectLeadIssues.toString()})()`, context);
  assert.equal(run().length, 1);
  assert.equal(run().length, 1, "reruns do not duplicate findings");
  anchor.setAttribute("href", "/contact");
  assert.equal(run().length, 0);
  assert.equal(anchor.hasAttribute("data-xs-lead-leak-highlight"), false);
  assert.equal(anchor.style.getPropertyValue("outline"), previous);
  assert.equal(anchor.style.getPropertyPriority("outline"), "important");
  anchor.removeAttribute("href");
  run();
  vm.runInContext(`(${clearHighlights.toString()})()`, context);
  assert.equal(anchor.style.getPropertyValue("outline"), previous);
  dom.window.close();
});

test("legacy named anchors and encoded IDs are valid destinations", () => {
  const dom = usePage('<a href="#contact">Contact</a><a name="contact"></a><a href="#hello%20world">Book</a><section id="hello world"></section>');
  assert.deepEqual(detectLeadIssues(), []);
  dom.window.close();
});

test("detects and highlights a missing destination on a named CTA", () => {
  const dom = usePage('<a>Get a quote</a>');
  const issues = detectLeadIssues();
  const anchor = document.querySelector("a");

  assert.equal(issues.length, 1);
  assert.equal(issues[0].type, "broken-cta");
  assert.equal(document.querySelectorAll(issues[0].selector)[0], anchor);
  assert.equal(anchor.style.getPropertyValue("outline"), "2px solid rgb(225, 29, 72)");
  assert.equal(anchor.style.getPropertyPriority("outline"), "important");

  clearHighlights();
  assert.equal(anchor.style.getPropertyValue("outline"), "");
  assert.equal(anchor.hasAttribute("data-xs-lead-leak-highlight"), false);
  dom.window.close();
});

test("does not flag valid actions, disabled controls, or intentional hash/script controls", () => {
  const dom = usePage(`
    <a href="/contact">Contact us</a>
    <a href="#details">Read more</a><section id="details"></section>
    <a href="#">Subscribe</a>
    <a href="#/checkout">Buy now</a>
    <a href="#" onclick="return false">Book a demo</a>
    <a href="#" role="button" aria-controls="menu">Contact</a>
    <a href="javascript:void(0)">Get a quote</a>
    <button disabled>Book now</button>
    <form><input required><button type="submit" disabled>Submit</button></form>
  `);

  assert.deepEqual(detectLeadIssues(), []);
  dom.window.close();
});

test("detects a missing same-page section but ignores empty and router hashes", () => {
  const dom = usePage(`
    <a href="#missing">Read the details</a>
    <a href="#">Home</a>
    <a href="#/route">Client route</a>
  `);
  const issues = detectLeadIssues();

  assert.equal(issues.length, 1);
  assert.equal(issues[0].type, "broken-anchor");
  assert.equal(issues[0].reason, "Link points to a missing section");
  dom.window.close();
});

test("clears highlights without losing pre-existing inline outline styles", () => {
  const dom = usePage('<a style="outline: 1px dashed blue">Get a quote</a>');
  const anchor = document.querySelector("a");
  const previous = anchor.style.getPropertyValue("outline");
  const previousPriority = anchor.style.getPropertyPriority("outline");

  detectLeadIssues();
  clearHighlights();

  assert.equal(anchor.style.getPropertyValue("outline"), previous);
  assert.equal(anchor.style.getPropertyPriority("outline"), previousPriority);
  dom.window.close();
});
