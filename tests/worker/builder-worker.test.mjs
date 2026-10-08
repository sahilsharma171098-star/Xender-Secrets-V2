// XEND-BUILDER-001: the AI builder through the REAL Worker + AppState Durable Object + asset
// layer (workerd via `wrangler dev`, local only). The AI provider is the deterministic mock
// (BUILDER_AI_MOCK=1 in tests/worker/wrangler.test.jsonc) — live model calls are verified
// separately against the PR preview deployment (tests/builder-live.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 8900 + Math.floor(Math.random() * 90);
const ORIGIN = `http://127.0.0.1:${PORT}`;

let proc;
test.before(async () => {
  proc = spawn(process.execPath, [path.join(ROOT, "node_modules/wrangler/bin/wrangler.js"), "dev", "-c", "tests/worker/wrangler.test.jsonc", "--port", String(PORT), "--ip", "127.0.0.1", "--persist-to", path.join(ROOT, ".wrangler/test-builder-" + PORT)],
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
// wrangler dev spawns workerd: stop the whole process tree (negative pid is POSIX-only).
test.after(() => {
  try {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(-proc.pid, "SIGTERM");
  } catch {}
});

const req = (method, p, { body, headers = {} } = {}) => new Promise((resolve, reject) => {
  const data = body === undefined ? null : Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
  const r = http.request({ host: "127.0.0.1", port: PORT, path: p, method, headers: { ...(data ? { "content-type": "application/json", "content-length": data.length } : {}), ...headers } }, (res) => {
    const chunks = [];
    res.on("data", (c) => chunks.push(c));
    res.on("end", () => {
      const buf = Buffer.concat(chunks);
      resolve({ status: res.statusCode, headers: res.headers, buf, text: buf.toString("utf8"), json: () => JSON.parse(buf.toString("utf8")) });
    });
  });
  r.on("error", reject);
  if (data) r.write(data);
  r.end();
});
const ndjson = (t) => t.trim().split("\n").map((l) => JSON.parse(l));

test("builder pages are served with their security headers; canonical variants 301", async () => {
  const land = await req("GET", "/builder");
  assert.equal(land.status, 200);
  assert.match(land.text, /Describe your website/);
  assert.match(land.headers["content-security-policy"], /script-src 'self'/);
  assert.equal(land.headers["x-robots-tag"], undefined);
  const studio = await req("GET", "/builder/studio");
  assert.equal(studio.status, 200);
  assert.equal(studio.headers["x-frame-options"], "DENY");
  assert.equal(studio.headers["x-robots-tag"], "noindex, nofollow");
  const frame = await req("GET", "/builder/frame");
  assert.equal(frame.status, 200);
  assert.match(frame.headers["content-security-policy"], /connect-src 'none'.*frame-ancestors 'self'/);
  assert.equal(frame.headers["x-frame-options"], undefined);
  const mod = await req("GET", "/builder/studio.mjs");
  assert.match(mod.headers["content-type"], /javascript/);
  for (const [from, to] of [["/builder.html", "/builder"], ["/builder/", "/builder"], ["/builder/pricing.html", "/builder/pricing"]]) {
    const r = await req("GET", from);
    assert.equal(r.status, 301, from);
    assert.equal(r.headers.location, ORIGIN + to, from);
  }
  assert.equal((await req("GET", "/builder/pricing")).status, 200);
  assert.equal((await req("GET", "/builder/projects")).status, 200);
});

test("prompt → streamed generation → saved project → follow-up edit → export, through workerd", async () => {
  const st = await req("GET", "/api/builder/status");
  assert.equal(st.json().providers[0].id, "mock");
  const gen = await req("POST", "/api/builder/generate", { body: { prompt: "Harbour Lights seafood restaurant in Halifax" }, headers: { origin: ORIGIN } });
  assert.equal(gen.status, 200, gen.text);
  assert.match(gen.headers["content-type"], /ndjson/);
  const cookie = String(gen.headers["set-cookie"]).split(";")[0];
  assert.match(cookie, /^xs_bguest=/);
  const done = ndjson(gen.text).find((e) => e.type === "done");
  assert.ok(done, gen.text);
  const id = done.project.id;
  assert.match(done.project.files["index.html"], /Harbour Lights seafood restaurant in Halifax/);

  const got = await req("GET", "/api/builder/projects/" + id, { headers: { cookie } });
  assert.equal(got.json().project.version, 1);
  assert.equal((await req("GET", "/api/builder/projects/" + id)).status, 404, "no cookie, no access");
  assert.equal((await req("GET", "/api/builder/projects/" + id, { headers: { cookie: "xs_bguest=" + "a".repeat(48) } })).status, 404, "other guest, no access");

  const edit = await req("POST", `/api/builder/projects/${id}/edit`, { body: { prompt: "use a purple brand colour" }, headers: { cookie, origin: ORIGIN } });
  const e = ndjson(edit.text).find((x) => x.type === "done");
  assert.deepEqual(e.changed.sort(), ["index.html", "styles.css"]);
  assert.match(e.project.files["index.html"], /<p id="edited">Edited: use a purple brand colour<\/p>/, "SEARCH/REPLACE edit applied");
  assert.equal(e.project.files["index.html"].replace(/<p id="edited">[^<]*<\/p>/, ""), done.project.files["index.html"], "rest of the page preserved");
  assert.equal(e.project.files["about.html"], done.project.files["about.html"]);

  const zip = await req("GET", `/api/builder/projects/${id}/export`, { headers: { cookie } });
  assert.equal(zip.status, 200);
  assert.equal(zip.headers["content-type"], "application/zip");
  assert.equal(zip.buf.readUInt32LE(0), 0x04034b50);
  assert.ok(zip.buf.includes("README.txt"));

  const cross = await req("POST", "/api/builder/generate", { body: { prompt: "A site for a florist" }, headers: { origin: "https://evil.example" } });
  assert.equal(cross.status, 403);
  assert.equal((await req("GET", "/__builder/reserve")).status, 404, "internal DO routes are not reachable from outside");
  assert.equal((await req("GET", "/api/admin/builder")).status, 503, "admin report locked without ADMIN_TOKEN");
});

test("existing site, SEO routes and APIs still work alongside the builder", async () => {
  for (const p of ["/", "/services", "/portfolio", "/novels", "/contact", "/about", "/website-development-gurugram", "/sitemap.xml", "/robots.txt"]) {
    const r = await req("GET", p);
    assert.equal(r.status, 200, p);
    assert.equal(r.headers["content-security-policy"], undefined, p + " keeps its previous headers");
  }
  assert.match((await req("GET", "/")).text, /href="\/builder"/, "homepage links to the builder");
  assert.equal((await req("GET", "/api/health")).json().ok, true);
  assert.equal((await req("GET", "/api/auth/status")).json().ok, true);
  const lead = await req("POST", "/api/lead", { body: { name: "Builder Test", email: "t@example.com", offer: "ai-builder-launch", test: true }, headers: { origin: ORIGIN } });
  assert.equal(lead.status, 201, lead.text);
});
