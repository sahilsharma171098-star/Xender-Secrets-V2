// XEND-GSC-INDEXING-001: canonical redirects through the REAL Worker + static-asset layer
// (workerd via `wrangler dev`, local only — no Cloudflare account, no network).
// tests/worker/wrangler.test.jsonc is wrangler.jsonc minus the remote-only AI binding; the
// first test fails if the asset/run_worker_first settings ever drift apart.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import http from "node:http";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 8790 + Math.floor(Math.random() * 100);
const BASE = `http://127.0.0.1:${PORT}`;
const W = "https://www.xendersecrets.com";
const jsonc = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8").replace(/^\s*\/\/.*$/gm, ""));

let proc;
test.before(async () => {
  proc = spawn(process.execPath, [path.join(ROOT, "node_modules/wrangler/bin/wrangler.js"), "dev", "-c", "tests/worker/wrangler.test.jsonc", "--port", String(PORT), "--ip", "127.0.0.1"],
    { cwd: ROOT, env: { ...process.env, NO_PROXY: "*", WRANGLER_SEND_METRICS: "false" }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  let log = "";
  proc.stdout.on("data", (d) => { log += d; });
  proc.stderr.on("data", (d) => { log += d; });
  for (let i = 0; i < 120; i++) {
    if (/Ready on/.test(log)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("wrangler dev did not start:\n" + log.slice(-2000));
});
// Kill the whole process group (wrangler + its workerd children).
test.after(() => { try { process.kill(-proc.pid, "SIGTERM"); } catch {} });

// node:http (not fetch) so the Host header can be set to the apex/www production hostnames.
const get = (p, host) => new Promise((resolve, reject) => {
  const req = http.request({ host: "127.0.0.1", port: PORT, path: p, method: "GET", headers: host ? { host } : {} }, (res) => {
    let body = ""; res.setEncoding("utf8"); res.on("data", (c) => { body += c; });
    res.on("end", () => resolve({ status: res.statusCode, headers: { get: (k) => res.headers[k.toLowerCase()] ?? null }, text: async () => body }));
  });
  req.on("error", reject); req.end();
});

test("test config mirrors production asset routing", () => {
  const prod = jsonc("wrangler.jsonc"), t = jsonc("tests/worker/wrangler.test.jsonc");
  assert.deepEqual(t.assets.run_worker_first, prod.assets.run_worker_first);
  assert.equal(t.assets.html_handling, prod.assets.html_handling);
  assert.equal(t.assets.not_found_handling, prod.assets.not_found_handling);
  assert.equal(t.compatibility_date, prod.compatibility_date);
});

test("apex host: every variant is ONE 301 to https://www + extensionless path", async () => {
  const cases = { "/": "/", "/index.html": "/", "/about.html": "/about", "/contact/": "/contact", "/services": "/services",
    "/website-development-gurgaon.html": "/website-development-gurugram", "/article-community-led-growth.html": "/article-community-led-growth" };
  for (const [from, to] of Object.entries(cases)) {
    const r = await get(from, "xendersecrets.com");
    assert.equal(r.status, 301, from);
    assert.equal(r.headers.get("location"), W + to, from);
  }
});

test("www host: .html, /index and trailing slash are 301 (not 307) to the final URL", async () => {
  for (const [from, to] of Object.entries({ "/contact.html": "/contact", "/index.html": "/", "/about/": "/about", "/faq.html": "/faq", "/template-preview.html?id=REAL-01": "/template-preview?id=REAL-01" })) {
    const r = await get(from);
    assert.equal(r.status, 301, from);
    assert.equal(new URL(r.headers.get("location")).pathname + new URL(r.headers.get("location")).search, to, from);
  }
});

test("canonical pages, assets and APIs are served directly", async () => {
  for (const p of ["/", "/services", "/website-catalog", "/articles", "/about", "/robots.txt", "/sitemap.xml", "/home.css", "/api/health"]) {
    const r = await get(p);
    assert.equal(r.status, 200, p);
  }
  const home = await (await get("/")).text();
  assert.match(home, /<link rel="canonical" href="https:\/\/www\.xendersecrets\.com\/">/);
  assert.equal((await get("/definitely-missing-page")).status, 404);
  // Temporary preview short links stay 302; private pages carry X-Robots-Tag.
  assert.equal((await get("/p/abc123")).status, 302);
  assert.match((await get("/admin")).headers.get("x-robots-tag") || "", /noindex/);
});
