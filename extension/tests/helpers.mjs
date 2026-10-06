// Shared helpers for SiteCheck browser tests. Fixtures are served from disk through Playwright
// routing, so tests run offline and can pretend to be on https:// or http:// origins.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const EXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const FIXTURES = path.join(EXT, "tests", "fixtures");
export const SRC = path.join(EXT, "src");
export const AUDIT_JS = fs.readFileSync(path.join(SRC, "audit.js"), "utf8");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };

/** Route every request in `context`: fixture origins serve extension/tests/fixtures, /ext/ serves extension/src. */
export async function serveFixtures(context) {
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (!/^https?:$/.test(url.protocol)) return route.continue(); // chrome-extension://, data:
    if (!/^(fixtures\.test|shop\.example|sitecheck\.test)$/.test(url.hostname)) return route.fulfill({ status: 204, body: "" });
    const base = url.pathname.startsWith("/ext/") ? SRC : FIXTURES;
    const rel = url.pathname.startsWith("/ext/") ? url.pathname.slice(5) : url.pathname.slice(1);
    const file = path.join(base, decodeURIComponent(rel));
    if (!file.startsWith(base) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: "not found" });
    return route.fulfill({ status: 200, headers: { "content-type": TYPES[path.extname(file)] || "application/octet-stream" }, body: fs.readFileSync(file) });
  });
}

export const originFor = (fixture) => (fixture === "http-login.html" ? "http://shop.example" : "https://fixtures.test");

/** Runs the real audit.js in a fixture page and returns the raw result. */
export async function auditFixture(context, fixture, { viewport } = {}) {
  const page = await context.newPage();
  if (viewport) await page.setViewportSize(viewport);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(originFor(fixture) + "/" + fixture, { waitUntil: "load" });
  const result = await page.evaluate(AUDIT_JS);
  await page.close();
  return { result, errors, byId: Object.fromEntries(result.checks.map((c) => [c.id, c])) };
}
