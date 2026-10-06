// Node-only tests: catalog consistency, deterministic scoring, restricted pages, report text,
// manifests and reproducible packaging. Run: npm run extension:test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CHECKS, CHECK_BY_ID, CATEGORIES } from "../src/lib/checks.js";
import { scoreReport, band } from "../src/lib/score.js";
import { restrictionFor, messageForError, PROTECTED_MESSAGE } from "../src/lib/restricted.js";
import { reportText } from "../src/lib/report.js";
import { build, manifestFor } from "../../scripts/extension/build.mjs";
import { zip } from "../../scripts/extension/zip.mjs";
import { AUDIT_JS, EXT } from "./helpers.mjs";

const auditIds = [...new Set([...AUDIT_JS.matchAll(/(?:record|fromList)\("([a-z0-9-]+)"/g)].map((m) => m[1]))];

test("every check the audit can return has catalog copy, and vice versa", () => {
  assert.deepEqual([...auditIds].sort(), CHECKS.map((c) => c.id).sort());
  for (const c of CHECKS) {
    assert.ok(CATEGORIES.some((cat) => cat.id === c.category), c.id + " category");
    assert.ok([1, 2, 3].includes(c.weight), c.id + " weight");
    for (const k of ["title", "passTitle", "why", "fix"]) assert.ok(c[k] && c[k].length > 5, `${c.id}.${k}`);
    assert.doesNotMatch(c.why + c.fix + c.title, /lighthouse|core web vitals|google score/i, c.id + " must not claim Lighthouse/CWV");
  }
  assert.equal(CATEGORIES.reduce((s, c) => s + c.weight, 0), 100);
});

const r = (id, status) => ({ id, status, count: 0, detail: "", samples: [] });

test("scoring is deterministic and matches the documented formula", () => {
  const all = CHECKS.map((c) => r(c.id, "pass"));
  assert.equal(scoreReport(all).overall, 100);
  assert.equal(scoreReport(CHECKS.map((c) => r(c.id, "fail"))).overall, 0);
  // Documented example (extension/docs/SCORING.md): only SEO and Technical applicable.
  const ex = [r("seo-title-missing", "pass"), r("seo-description-missing", "fail"), r("seo-h1-missing", "pass"), r("seo-og-image", "fail"),
    r("tech-https", "pass"), r("tech-dead-links", "fail")];
  const s = scoreReport(ex);
  const seo = s.categories.find((c) => c.id === "seo");
  const tech = s.categories.find((c) => c.id === "technical");
  assert.equal(seo.score, 67);  // earned 3+3=6 of 3+2+3+1=9 → 66.7 → 67
  assert.equal(tech.score, 60); // earned 3 of 3+2=5
  assert.equal(s.overall, 64);  // (67×25 + 60×15) ÷ 40 = 64.4 → 64
  assert.equal(scoreReport(ex).overall, s.overall, "same input, same score");
});

test("not-applicable checks never change the score; empty categories are left out", () => {
  const base = [r("seo-title-missing", "pass"), r("tech-https", "fail")];
  const withNa = [...base, r("a11y-form-labels", "na"), r("cro-form-length", "na")];
  assert.equal(scoreReport(base).overall, scoreReport(withNa).overall);
  assert.equal(scoreReport(withNa).categories.find((c) => c.id === "accessibility").score, null);
  assert.equal(scoreReport([]).overall, null);
  assert.equal(scoreReport([r("unknown-check", "fail")]).overall, null, "unknown ids are ignored");
});

test("issues are ordered critical → warning → recommendation, with counts", () => {
  const s = scoreReport([r("cro-trust", "fail"), r("seo-canonical", "fail"), r("tech-https", "fail"), r("seo-title-missing", "pass")]);
  assert.deepEqual(s.issues.map((i) => i.severity), ["critical", "warning", "recommendation"]);
  assert.deepEqual(s.counts, { critical: 1, warning: 1, recommendation: 1, passed: 1 });
});

test("score bands", () => {
  assert.equal(band(95).id, "strong");
  assert.equal(band(90).id, "strong");
  assert.equal(band(89).id, "good");
  assert.equal(band(74).id, "work");
  assert.equal(band(49).id, "poor");
  assert.equal(band(null).id, "none");
});

test("restricted pages get a friendly message instead of an attempt", () => {
  for (const u of ["chrome://extensions", "edge://settings", "about:blank", "about:addons", "chrome-extension://abc/popup.html", "moz-extension://x/y", "view-source:https://a.com", "devtools://x", "", undefined, "not a url"]) {
    assert.ok(restrictionFor(u), u + " should be restricted");
  }
  assert.equal(restrictionFor("chrome://newtab").message, PROTECTED_MESSAGE);
  for (const u of ["https://chromewebstore.google.com/detail/x", "https://chrome.google.com/webstore/detail/x", "https://microsoftedge.microsoft.com/addons/detail/x", "https://addons.mozilla.org/en-US/firefox/"]) {
    assert.equal(restrictionFor(u).reason, "store", u);
  }
  assert.equal(restrictionFor("https://example.com/files/menu.pdf").reason, "pdf");
  assert.equal(restrictionFor("file:///home/me/site/index.html").reason, "file");
  for (const u of ["https://www.xendersecrets.com/", "http://localhost:8080/", "https://chrome.google.com/other", "https://example.com/a?b=1#c"]) assert.equal(restrictionFor(u), null, u);
  assert.equal(messageForError(new Error("Cannot access a chrome:// URL")), PROTECTED_MESSAGE);
  assert.match(messageForError(new Error("The extensions gallery cannot be scripted.")), /store/);
  assert.match(messageForError(new Error("boom")), /Reload the page/);
});

test("copy-report text carries the disclaimer, issues and fixes", () => {
  const checks = [r("seo-title-missing", "pass"), { ...r("tech-dead-links", "fail"), count: 3, detail: "3 links have an empty address." }];
  const scored = scoreReport(checks);
  const text = reportText({ url: "https://example.com/", viewport: { width: 1280 } }, scored, new Date("2026-10-06T10:00:00Z"));
  assert.match(text, /^Xender SiteCheck report — https:\/\/example\.com\//);
  assert.match(text, /not a Lighthouse score/);
  assert.match(text, /Links that don't go anywhere \(3\)/);
  assert.match(text, /Fix: Give each link a real destination/);
  assert.match(text, /2026-10-06/);
});

test("manifests: MV3, minimum permissions, no remote code surface", () => {
  for (const t of ["chrome", "edge", "firefox"]) {
    const m = manifestFor(t);
    assert.equal(m.manifest_version, 3);
    assert.deepEqual(m.permissions, ["activeTab", "scripting"]);
    for (const k of ["host_permissions", "optional_permissions", "optional_host_permissions", "content_scripts", "background", "web_accessible_resources", "externally_connectable", "content_security_policy", "update_url"]) {
      assert.equal(m[k], undefined, `${t}: ${k} must not be set`);
    }
    assert.ok(m.description.length <= 132, "Chrome description limit");
    assert.match(m.version, /^\d+\.\d+\.\d+$/);
  }
  const ff = manifestFor("firefox").browser_specific_settings.gecko;
  assert.equal(ff.id, "sitecheck@xendersecrets.com");
  assert.deepEqual(ff.data_collection_permissions, { required: ["none"] });
  assert.equal(manifestFor("chrome").browser_specific_settings, undefined);
});

test("packages are reproducible and contain only shipped files", () => {
  const a = build({ pack: true, log: () => {} });
  const b = build({ pack: true, log: () => {} });
  for (const t of ["chrome", "edge", "firefox"]) {
    assert.equal(a[t].sha256, b[t].sha256, t + " zip must be byte-identical across builds");
    assert.ok(a[t].files.includes("manifest.json") && a[t].files.includes("audit.js") && a[t].files.includes("icons/icon-128.png"));
    assert.ok(a[t].files.every((f) => !/tests?\/|fixtures|\.md$|\.map$/.test(f)), t + " ships no tests/docs");
  }
  const z = zip([{ name: "b.txt", data: "b" }, { name: "a.txt", data: "a" }]);
  assert.equal(z.readUInt32LE(0), 0x04034b50);
  assert.ok(z.includes(Buffer.from("a.txt")) && z.indexOf("a.txt") < z.indexOf("b.txt"), "entries sorted");
});

test("icons exist at every declared size", () => {
  const m = manifestFor("chrome");
  for (const [size, rel] of Object.entries(m.icons)) {
    const buf = fs.readFileSync(path.join(EXT, "src", rel));
    assert.equal(buf.readUInt32BE(16), Number(size), rel + " width");
    assert.equal(buf.readUInt32BE(20), Number(size), rel + " height");
  }
});
