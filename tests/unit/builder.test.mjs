// XEND-BUILDER-001 — unit tests for the AI website builder: adapter, output protocol,
// sanitiser, ZIP writer, storage/quotas/spend guard, ownership isolation and the Worker route.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { runWithFallback, workersAiProvider, mockProvider, configuredProviders, chunkParts, neuronsFor, ProviderError, zaiProvider } from "../../src/builder/ai.mjs";
import { parseFiles, validateGenerated, sanitizeHtml, cleanFileMap, checkPrompt, editMessages, projectNameFrom } from "../../src/builder/output.mjs";
import { zipFiles, crc32 } from "../../src/builder/zip.mjs";
import { ensureBuilderSchema, handleBuilderStore, GUEST_COOKIE } from "../../src/builder/store.mjs";
import { handleBuilderGenerate, withBuilderHeaders } from "../../src/builder/routes.mjs";
import { composePreview, pagesOf } from "../../public/builder/compose.mjs";
import { highlight } from "../../public/builder/highlight.mjs";

function doSql() {
  const db = new DatabaseSync(":memory:");
  return {
    exec(query, ...args) {
      let rows = [];
      if (!args.length && query.trim().replace(/;\s*$/, "").includes(";")) db.exec(query);
      else { const st = db.prepare(query); rows = st.columns().length ? st.all(...args) : (st.run(...args), []); }
      return { toArray: () => rows.map((r) => ({ ...r })), one: () => ({ ...rows[0] }) };
    },
  };
}

const SITE = (title = "Bakery") => `=== FILE: index.html ===
<!doctype html><html><head><title>${title}</title><link rel="stylesheet" href="styles.css"></head>
<body><header><h1>${title}</h1></header><main><p>Fresh bread every morning in our neighbourhood bakery.</p><a href="about.html">About</a></main><script src="script.js"></script></body></html>
=== END FILE ===
=== FILE: styles.css ===
body{color:#222}
=== END FILE ===
=== FILE: script.js ===
console.log("hi")
=== END FILE ===
=== SUMMARY ===
Built a bakery site.
=== END SUMMARY ===`;

// ---------- output protocol ----------
test("parseFiles reads the file protocol, tolerating fences and a missing END FILE", () => {
  const { files, summary } = parseFiles(SITE());
  assert.deepEqual(Object.keys(files), ["index.html", "styles.css", "script.js"]);
  assert.equal(files["styles.css"], "body{color:#222}");
  assert.equal(summary, "Built a bakery site.");
  const fenced = parseFiles("=== FILE: a.css ===\n```css\nb{c:d}\n```\n=== END FILE ===\n=== FILE: index.html ===\n<body>x</body>");
  assert.equal(fenced.files["a.css"], "b{c:d}");
  assert.equal(fenced.files["index.html"], "<body>x</body>");
});

test("validateGenerated: new sites need index.html; edits merge and keep untouched files", () => {
  assert.equal(validateGenerated("sorry I can't").ok, false);
  const v = validateGenerated(SITE());
  assert.ok(v.ok);
  const current = { ...v.value.files, "about.html": "<body>manual edit kept</body>" };
  const e = validateGenerated("=== FILE: styles.css ===\nbody{color:red}\n=== END FILE ===\n=== FILE: about.html ===\nDELETE\n=== END FILE ===", { mode: "edit", current });
  assert.ok(e.ok);
  assert.equal(e.value.files["styles.css"], "body{color:red}");
  assert.equal(e.value.files["index.html"], current["index.html"], "index.html untouched");
  assert.equal(e.value.files["about.html"], undefined, "DELETE removes a file");
  assert.deepEqual(e.value.changed, ["styles.css"]);
  assert.equal(validateGenerated("nothing", { mode: "edit", current }).ok, false);
  assert.equal(validateGenerated("=== FILE: index.html ===\nDELETE\n=== END FILE ===", { mode: "edit", current }).value.files["index.html"], current["index.html"], "index.html can't be deleted");
});

test("sanitizeHtml strips dangerous constructs but keeps allow-listed CDNs and normal markup", () => {
  const dirty = `<base href="https://evil.test/"><meta http-equiv="refresh" content="0;url=https://evil.test">
<script src="https://evil.test/x.js"></script><script src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.1/dist/cdn.min.js"></script>
<a href="javascript:alert(1)">x</a><a href="https://ok.test">ok</a><iframe src="https://evil.test"></iframe>
<iframe src="https://www.google.com/maps/embed?pb=1"></iframe><object data="x.swf"></object><button onclick="go()">go</button>`;
  const h = sanitizeHtml(dirty);
  assert.doesNotMatch(h, /<base|http-equiv|evil\.test\/x\.js|javascript:|<object|src="https:\/\/evil\.test"/i);
  assert.match(h, /cdn\.jsdelivr\.net/);
  assert.match(h, /google\.com\/maps/);
  assert.match(h, /onclick="go\(\)"/, "inline handlers are kept (sandbox + CSP contain them)");
  assert.match(h, /href="https:\/\/ok\.test"/);
});

test("cleanFileMap enforces file names and size limits", () => {
  const { files, errors } = cleanFileMap({ "index.html": "<body></body>", "../etc/passwd": "x", "evil.php": "x", "Big.CSS": "a".repeat(10) });
  assert.deepEqual(Object.keys(files).sort(), ["big.css", "index.html"]);
  assert.equal(errors.length, 2);
  assert.ok(cleanFileMap({ "index.html": "a".repeat(160_000) }).errors[0].includes("too large"));
});

test("checkPrompt rejects phishing/malware asks and bounds length", () => {
  assert.equal(checkPrompt("A website for my bakery in Leeds").ok, true);
  assert.equal(checkPrompt("Make a PayPal login page that asks for the password").ok, false);
  assert.equal(checkPrompt("phishing page for a bank").ok, false);
  assert.equal(checkPrompt("hi").ok, false);
  assert.equal(checkPrompt("x".repeat(2001)).ok, false);
  assert.equal(projectNameFrom("a modern website for a dental clinic in Leeds with booking"), "A modern website for a dental");
});

test("editMessages sends current files and asks for changed files only", () => {
  const m = editMessages("make it blue", { "index.html": "<body></body>" });
  assert.equal(m[0].role, "system");
  assert.match(m[0].content, /Return ONLY the files you change/);
  assert.match(m[1].content, /CURRENT FILES:[\s\S]*index\.html[\s\S]*REQUEST: make it blue/);
});

// ---------- ZIP ----------
test("zipFiles writes a valid archive (checked with Python's zipfile)", (t) => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  const zip = zipFiles([{ name: "index.html", data: "<h1>Hi ✓</h1>" }, { name: "css/styles.css", data: "body{}" }]);
  const file = path.join(os.tmpdir(), "xb-test-" + process.pid + ".zip");
  fs.writeFileSync(file, zip);
  try {
    const out = execFileSync("python3", ["-I", "-c", "import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print('|'.join(n+'='+z.read(n).decode() for n in z.namelist()))", file], { encoding: "utf8" });
    assert.equal(out.trim(), "index.html=<h1>Hi ✓</h1>|css/styles.css=body{}");
  } catch (e) {
    if (e.code === "ENOENT") t.skip("python3 not available"); else throw e;
  } finally { fs.rmSync(file, { force: true }); }
});

// ---------- AI adapter ----------
const sse = (chunks) => new ReadableStream({ start(c) { for (const ch of chunks) c.enqueue(new TextEncoder().encode("data: " + JSON.stringify(ch) + "\n\n")); c.enqueue(new TextEncoder().encode("data: [DONE]\n\n")); c.close(); } });

test("chunkParts understands Workers AI and OpenAI-style chunks", () => {
  assert.equal(chunkParts({ response: "hi" }).content, "hi");
  assert.equal(chunkParts({ choices: [{ delta: { content: "a" } }] }).content, "a");
  assert.equal(chunkParts({ choices: [{ delta: { reasoning_content: "r" } }] }).reasoning, "r");
  assert.deepEqual(chunkParts({ choices: [], usage: { prompt_tokens: 10, completion_tokens: 20 } }).usage, { input: 10, output: 20 });
  assert.equal(Math.round(neuronsFor("@cf/zai-org/glm-4.7-flash", { input: 1e6, output: 1e6 })), 41900);
});

test("workersAiProvider streams content, reports usage and retries without chat_template_kwargs", async () => {
  const calls = [];
  const ai = { run: async (model, input) => {
    calls.push(input);
    if (input.chat_template_kwargs) throw new Error("AiError: Invalid input: additional properties not allowed: chat_template_kwargs");
    return sse([{ choices: [{ delta: { content: "=== FILE: " } }] }, { choices: [{ delta: { content: "index.html ===" } }] }, { choices: [], usage: { prompt_tokens: 100, completion_tokens: 900 } }]);
  } };
  const deltas = [];
  const r = await workersAiProvider(ai, "@cf/zai-org/glm-4.7-flash").generate({ messages: [{ role: "user", content: "x" }], onDelta: (n) => deltas.push(n) });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].chat_template_kwargs.enable_thinking, false);
  assert.equal(calls[1].stream, true);
  assert.equal(r.text, "=== FILE: index.html ===");
  assert.deepEqual(r.usage, { input: 100, output: 900 });
  assert.equal(r.measured, true);
  assert.ok(deltas.length >= 2);
});

test("runWithFallback: retries with backoff, validates, falls back and accounts every attempt", async () => {
  const sleeps = [];
  let n = 0;
  const flaky = { id: "a", model: "@cf/zai-org/glm-4.7-flash", generate: async () => { n++; throw new Error("upstream 500"); } };
  const quota = { id: "b", model: "@cf/zai-org/glm-4.7-flash", generate: async () => { throw new Error("3036: daily free allocation exceeded"); } };
  const bad = { id: "c", model: "@cf/qwen/qwen3-30b-a3b-fp8", generate: async () => ({ text: "nope", usage: { input: 10, output: 10 }, provider: "c", model: "@cf/qwen/qwen3-30b-a3b-fp8" }) };
  const good = { id: "d", model: "@cf/qwen/qwen3-30b-a3b-fp8", generate: async () => ({ text: SITE(), usage: { input: 1000, output: 3000 }, provider: "d", model: "@cf/qwen/qwen3-30b-a3b-fp8" }) };
  const r = await runWithFallback([flaky, quota, bad, good], { messages: [], validate: (t) => validateGenerated(t), sleepImpl: async (ms) => sleeps.push(ms), retries: 1, backoffMs: 100 });
  assert.equal(n, 2, "retryable error retried once");
  assert.deepEqual(sleeps, [100], "backoff before retrying a provider error; invalid answers retry at once");
  assert.equal(r.provider, "d");
  assert.ok(r.value.files["index.html"]);
  assert.equal(r.spent.length, 3, "two invalid answers from c + the good one are all charged");
  assert.deepEqual(r.errors.map((e) => e.code), ["upstream", "upstream", "quota", "invalid_output", "invalid_output"]);
});

test("runWithFallback stops before exceeding the per-request allowance and times out slow providers", async () => {
  const pricey = { id: "p", model: "@cf/zai-org/glm-4.7-flash", generate: async () => ({ text: "bad", usage: { input: 0, output: 30000 }, provider: "p", model: "@cf/zai-org/glm-4.7-flash" }) };
  await assert.rejects(runWithFallback([pricey], { messages: [], validate: () => ({ ok: false, error: "x" }), budgetLeft: (spent) => (spent.length ? 1200 - spent.reduce((a, s) => a + s.neurons, 0) - 500 : 1), sleepImpl: async () => {} }), (e) => e.code === "budget" && e.spent.length === 1);
  const slow = { id: "s", model: "m", generate: ({ signal }) => new Promise((_, rej) => signal.addEventListener("abort", () => rej(new Error("The operation was aborted")))) };
  await assert.rejects(runWithFallback([slow], { messages: [], validate: () => ({ ok: true }), timeoutMs: 20, retries: 0 }), (e) => e.errors[0].code === "timeout");
});

test("provider selection: Workers AI first, Z.ai only with a key, mock never on production hosts", () => {
  assert.deepEqual(configuredProviders({ AI: {} }).map((p) => p.model), ["@cf/zai-org/glm-4.7-flash", "@cf/qwen/qwen3-30b-a3b-fp8"]);
  assert.deepEqual(configuredProviders({ AI: {}, ZAI_API_KEY: "k" }).map((p) => p.id), ["workers-ai", "zai", "workers-ai"]);
  assert.deepEqual(configuredProviders({}), []);
  assert.equal(configuredProviders({ BUILDER_AI_MOCK: "1" }, { host: "localhost" })[0].id, "mock");
  assert.deepEqual(configuredProviders({ BUILDER_AI_MOCK: "1" }, { host: "www.xendersecrets.com" }), []);
});

test("zaiProvider sends thinking disabled and never leaks the key in errors", async () => {
  let sent;
  const p = zaiProvider("secret-key-123", "glm-4.7-flash", async (url, init) => { sent = { url, init }; return new Response("rate limited", { status: 429 }); });
  await assert.rejects(p.generate({ messages: [] }), (e) => e instanceof ProviderError && e.code === "quota" && !e.message.includes("secret-key-123"));
  assert.equal(sent.url, "https://api.z.ai/api/paas/v4/chat/completions");
  assert.equal(JSON.parse(sent.init.body).thinking.type, "disabled");
});

// ---------- storage, quotas, ownership ----------
const BASE = "https://www.xendersecrets.com";
function mkStore(env = {}) {
  const sql = doSql();
  ensureBuilderSchema(sql);
  let now = Date.parse("2026-10-08T10:00:00Z");
  const users = {};
  const call = async (method, p, { body, cookie = "", user = null, ip = "1.1.1.1" } = {}) => {
    const req = new Request(BASE + p, { method, headers: { "content-type": "application/json", cookie, "x-xs-ip": ip }, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleBuilderStore(req, { sql, env, user: user && users[user], nowMs: now });
    const ct = res.headers.get("content-type") || "";
    return { status: res.status, headers: res.headers, body: ct.includes("json") ? await res.json() : new Uint8Array(await res.arrayBuffer()) };
  };
  return { sql, call, users, tick: (ms) => { now += ms; }, setNow: (iso) => { now = Date.parse(iso); } };
}
const guest = (tok) => `${GUEST_COOKIE}=${Buffer.from(tok).toString("hex").padEnd(48, "0")}`;

async function generateVia(s, { cookie, user, prompt = "A website for a bakery in Leeds", ip } = {}) {
  const r = await s.call("POST", "/__builder/reserve", { body: { prompt, mode: "new" }, cookie, user, ip });
  if (r.status !== 200) return r;
  const v = validateGenerated(SITE("Leeds Bakery"));
  return s.call("POST", "/__builder/commit", { body: { reservation: r.body.reservation, files: v.value.files, summary: "ok", provider: "workers-ai", model: "@cf/zai-org/glm-4.7-flash", spent: [{ neurons: 300, usage: { input: 1000, output: 8000 } }] } });
}

test("guest flow: reserve mints a guest cookie, commit stores project + version, quota is enforced", async () => {
  const s = mkStore();
  const first = await s.call("POST", "/__builder/reserve", { body: { prompt: "A website for a bakery", mode: "new" } });
  assert.equal(first.status, 200);
  const minted = first.headers.get("x-xs-set-cookie");
  assert.match(minted, /^xs_bguest=[a-f0-9]{48}; Path=\/; HttpOnly; Secure; SameSite=Lax/);
  await s.call("POST", "/__builder/release", { body: { reservation: first.body.reservation, spent: [] } });
  const cookie = minted.split(";")[0];
  for (let i = 0; i < 3; i++) assert.equal((await generateVia(s, { cookie })).status, 200);
  const over = await generateVia(s, { cookie });
  assert.equal(over.status, 429);
  assert.equal(over.body.code, "quota");
  assert.equal(over.body.signInForMore, true);
  const list = await s.call("GET", "/api/builder/projects", { cookie });
  assert.equal(list.body.projects.length, 3);
  const st = await s.call("GET", "/api/builder/status", { cookie });
  assert.equal(st.body.quota.remaining, 0);
  assert.equal(st.body.signedIn, false);
});

test("one generation at a time per visitor; failures refund the visitor but charge the budget", async () => {
  const s = mkStore();
  const cookie = guest("a1");
  const r1 = await s.call("POST", "/__builder/reserve", { body: { prompt: "A site for a florist", mode: "new" }, cookie });
  assert.equal((await s.call("POST", "/__builder/reserve", { body: { prompt: "Another site please", mode: "new" }, cookie })).body.code, "busy");
  await s.call("POST", "/__builder/release", { body: { reservation: r1.body.reservation, spent: [{ neurons: 250, usage: { input: 1, output: 1 } }], error: "workers-ai:upstream" } });
  const st = await s.call("GET", "/api/builder/status", { cookie });
  assert.equal(st.body.quota.used, 0, "failed generation not counted against the visitor");
  const b = s.sql.exec("SELECT used,reserved,failed FROM builder_budget").toArray()[0];
  assert.deepEqual([b.used, b.reserved, b.failed], [250, 0, 1]);
});

test("budget arithmetic: reserve holds the cap, settle replaces it with real usage", async () => {
  const s = mkStore({ BUILDER_DAILY_NEURON_BUDGET: "1500", BUILDER_REQUEST_NEURON_CAP: "1000", BUILDER_GUEST_DAILY: "50", BUILDER_IP_DAILY: "50", BUILDER_GUEST_PROJECTS: "50" });
  const a = await s.call("POST", "/__builder/reserve", { body: { prompt: "A site for a florist", mode: "new" }, cookie: guest("c1") });
  assert.equal(a.status, 200);
  const b = await s.call("POST", "/__builder/reserve", { body: { prompt: "A site for a bakery", mode: "new" }, cookie: guest("c2") });
  assert.equal(b.status, 503, "1000 reserved leaves 500 < 1000");
  assert.equal(b.body.code, "capacity");
  await s.call("POST", "/__builder/release", { body: { reservation: a.body.reservation, spent: [{ neurons: 400 }] } });
  assert.equal((await s.call("POST", "/__builder/reserve", { body: { prompt: "A site for a bakery", mode: "new" }, cookie: guest("c2") })).status, 200, "1100 left ≥ 1000");
  const c = await s.call("POST", "/__builder/reserve", { body: { prompt: "A site for a cafe", mode: "new" }, cookie: guest("c3") });
  assert.equal(c.status, 503);
  s.setNow("2026-10-09T00:00:01Z");
  assert.equal((await s.call("POST", "/__builder/reserve", { body: { prompt: "A site for a cafe", mode: "new" }, cookie: guest("c3") })).status, 200, "new UTC day, fresh budget");
});

test("abandoned reservations expire after 5 minutes and are charged at the cap (conservative)", async () => {
  const s = mkStore({ BUILDER_REQUEST_NEURON_CAP: "1000" });
  const cookie = guest("d1");
  await s.call("POST", "/__builder/reserve", { body: { prompt: "A site for a florist", mode: "new" }, cookie });
  s.tick(301_000);
  assert.equal((await s.call("POST", "/__builder/reserve", { body: { prompt: "A site for a florist", mode: "new" }, cookie })).status, 200, "no longer busy");
  const b = s.sql.exec("SELECT used,reserved FROM builder_budget").toArray()[0];
  assert.deepEqual([b.used, b.reserved], [1000, 1000]);
});

test("ownership isolation: other guests and users can't read, edit, export or delete a project", async () => {
  const s = mkStore();
  const mine = guest("e1"), theirs = guest("e2");
  const made = await generateVia(s, { cookie: mine });
  const id = made.body.project.id;
  assert.match(id, /^bp_[a-z2-9]{9}$/);
  s.users.u1 = { id: "user-1", name: "U" };
  for (const [method, p] of [["GET", ""], ["PATCH", ""], ["DELETE", ""], ["GET", "/export"], ["POST", "/duplicate"], ["POST", "/restore"], ["GET", "/versions/1"]]) {
    for (const who of [{ cookie: theirs }, { user: "u1" }, {}]) {
      const r = await s.call(method, `/api/builder/projects/${id}${p}`, { ...who, body: method === "GET" || method === "DELETE" ? undefined : { name: "hack", version: 1 } });
      assert.equal(r.status, 404, `${method} ${p} as ${JSON.stringify(who)}`);
    }
  }
  const edit = await s.call("POST", "/__builder/reserve", { body: { prompt: "make it red please", mode: "edit", projectId: id }, cookie: theirs });
  assert.equal(edit.status, 404);
  assert.equal((await s.call("GET", `/api/builder/projects/${id}`, { cookie: mine })).status, 200);
});

test("project lifecycle: manual edit, restore, duplicate, rename, export ZIP, delete; claim into an account", async () => {
  const s = mkStore();
  const cookie = guest("f1");
  const id = (await generateVia(s, { cookie })).body.project.id;
  let p = (await s.call("GET", `/api/builder/projects/${id}`, { cookie })).body.project;
  assert.equal(p.version, 1);
  assert.equal(p.versions[0].kind, "generate");
  const patched = await s.call("PATCH", `/api/builder/projects/${id}`, { cookie, body: { files: { ...p.files, "styles.css": "body{color:blue}" } } });
  assert.equal(patched.body.project.version, 2);
  assert.equal(patched.body.project.versions[1].kind, "manual");
  assert.equal((await s.call("PATCH", `/api/builder/projects/${id}`, { cookie, body: { files: { "a.css": "x" } } })).status, 400, "index.html required");
  const v1 = await s.call("GET", `/api/builder/projects/${id}/versions/1`, { cookie });
  assert.equal(v1.body.version.files["styles.css"], "body{color:#222}");
  const restored = await s.call("POST", `/api/builder/projects/${id}/restore`, { cookie, body: { version: 1 } });
  assert.equal(restored.body.project.files["styles.css"], "body{color:#222}");
  assert.equal(restored.body.project.version, 3);
  const dup = await s.call("POST", `/api/builder/projects/${id}/duplicate`, { cookie, body: {} });
  assert.equal(dup.status, 201);
  assert.match(dup.body.project.name, /\(copy\)$/);
  await s.call("PATCH", `/api/builder/projects/${id}`, { cookie, body: { name: "Leeds Bakery Site" } });
  const zip = await s.call("GET", `/api/builder/projects/${id}/export`, { cookie });
  assert.equal(zip.headers.get("content-type"), "application/zip");
  assert.match(zip.headers.get("content-disposition"), /leeds-bakery-site\.zip/);
  assert.equal(new DataView(zip.body.buffer).getUint32(0, true), 0x04034b50);
  const text = new TextDecoder().decode(zip.body);
  assert.ok(text.includes("index.html") && text.includes("README.txt") && text.includes("Fresh bread"));
  // Sign in and claim the guest projects.
  s.users.u2 = { id: "user-2", name: "Sam" };
  const claim = await s.call("POST", "/api/builder/claim", { cookie, user: "u2", body: {} });
  assert.equal(claim.body.claimed, 2);
  assert.equal((await s.call("GET", "/api/builder/projects", { user: "u2" })).body.projects.length, 2);
  assert.equal((await s.call("GET", `/api/builder/projects/${id}`, { cookie })).status, 404, "no longer a guest project");
  assert.equal((await s.call("DELETE", `/api/builder/projects/${id}`, { user: "u2" })).status, 200);
  assert.equal(s.sql.exec("SELECT COUNT(*) AS n FROM builder_versions WHERE project_id=?", id).toArray()[0].n, 0);
});

test("edits: reservation carries current files; too-large projects are refused for AI edits", async () => {
  const s = mkStore();
  const cookie = guest("g1");
  const id = (await generateVia(s, { cookie })).body.project.id;
  const r = await s.call("POST", "/__builder/reserve", { body: { prompt: "make the header sticky", mode: "edit", projectId: id }, cookie });
  assert.equal(r.status, 200);
  assert.ok(r.body.files["index.html"].includes("Leeds Bakery"));
  await s.call("POST", "/__builder/release", { body: { reservation: r.body.reservation } });
  await s.call("PATCH", `/api/builder/projects/${id}`, { cookie, body: { files: { "index.html": "<body>" + "x".repeat(100_000) + "</body>", "big.css": "y".repeat(60_000) } } });
  assert.equal((await s.call("POST", "/__builder/reserve", { body: { prompt: "make the header sticky", mode: "edit", projectId: id }, cookie })).status, 413);
});

test("admin builder report requires ADMIN_TOKEN", async () => {
  const s = mkStore({ ADMIN_TOKEN: "x".repeat(32) });
  await generateVia(s, { cookie: guest("h1") });
  const sql = s.sql;
  const no = await handleBuilderStore(new Request(BASE + "/api/admin/builder"), { sql, env: { ADMIN_TOKEN: "x".repeat(32) } });
  assert.equal(no.status, 401);
  const yes = await handleBuilderStore(new Request(BASE + "/api/admin/builder", { headers: { authorization: "Bearer " + "x".repeat(32) } }), { sql, env: { ADMIN_TOKEN: "x".repeat(32) } });
  const j = await yes.json();
  assert.equal(j.totals.projects, 1);
  assert.equal(j.byModel[0].model, "@cf/zai-org/glm-4.7-flash");
  assert.equal(j.config.dailyNeuronBudget, 8000);
});

// ---------- Worker route (stream) ----------
function stubFor(s) {
  return { fetch: async (req) => {
    const user = null;
    const res = await handleBuilderStore(req, { sql: s.sql, env: {}, user });
    return res;
  } };
}
async function readNdjson(res) { return (await res.text()).trim().split("\n").map((l) => JSON.parse(l)); }

test("handleBuilderGenerate streams progress then the saved project (mock provider), and edits keep files", async () => {
  const s = mkStore();
  const stub = stubFor(s);
  const env = { BUILDER_AI_MOCK: "1" };
  const res = await handleBuilderGenerate(new Request("http://localhost/api/builder/generate", { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify({ prompt: "Sunrise Yoga studio in Bristol" }) }), env, null, stub);
  assert.equal(res.headers.get("content-type"), "application/x-ndjson; charset=utf-8");
  const cookie = res.headers.get("set-cookie").split(";")[0];
  const events = await readNdjson(res);
  assert.equal(events[0].type, "start");
  const done = events.find((e) => e.type === "done");
  assert.ok(done, JSON.stringify(events));
  assert.deepEqual(Object.keys(done.project.files).sort(), ["about.html", "index.html", "script.js", "styles.css"]);
  assert.match(done.project.files["index.html"], /Sunrise Yoga studio in Bristol/);
  const id = done.project.id;
  const res2 = await handleBuilderGenerate(new Request(`http://localhost/api/builder/projects/${id}/edit`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ prompt: "make the brand colour purple" }) }), env, null, stub);
  const done2 = (await readNdjson(res2)).find((e) => e.type === "done");
  assert.deepEqual(done2.changed, ["styles.css"]);
  assert.match(done2.project.files["styles.css"], /#7c3aed/);
  assert.equal(done2.project.files["index.html"], done.project.files["index.html"], "unchanged file preserved");
  assert.equal(done2.project.version, 2);
});

test("handleBuilderGenerate: cross-origin 403, quota errors as JSON, provider failure releases the reservation", async () => {
  const s = mkStore();
  const stub = stubFor(s);
  const cross = await handleBuilderGenerate(new Request("http://localhost/api/builder/generate", { method: "POST", headers: { origin: "https://evil.test" }, body: "{}" }), { BUILDER_AI_MOCK: "1" }, null, stub);
  assert.equal(cross.status, 403);
  const none = await handleBuilderGenerate(new Request("http://localhost/api/builder/generate", { method: "POST", body: JSON.stringify({ prompt: "A site for a bakery" }) }), {}, null, stub);
  assert.equal(none.status, 503);
  const bad = await handleBuilderGenerate(new Request("http://localhost/api/builder/generate", { method: "POST", body: JSON.stringify({ prompt: "x" }) }), { BUILDER_AI_MOCK: "1" }, null, stub);
  assert.equal(bad.status, 400);
  const fail = await handleBuilderGenerate(new Request("http://localhost/api/builder/generate", { method: "POST", headers: { cookie: guest("z1") }, body: JSON.stringify({ prompt: "A site for a bakery" }) }), { BUILDER_AI_MOCK: "1", BUILDER_AI_MOCK_FAIL: "1" }, null, stub, { sleep: async () => {} });
  const ev = await readNdjson(fail);
  assert.equal(ev.at(-1).type, "error");
  assert.equal(s.sql.exec("SELECT COUNT(*) AS n FROM builder_reservations").toArray()[0].n, 0);
  assert.equal(s.sql.exec("SELECT failed FROM builder_budget").toArray()[0].failed, 1);
  const st = await s.call("GET", "/api/builder/status", { cookie: guest("z1") });
  assert.equal(st.body.quota.used, 0);
  assert.equal(await handleBuilderGenerate(new Request("http://localhost/api/builder/projects"), {}, null, stub), null, "non-generation routes fall through");
});

test("withBuilderHeaders: strict app CSP, sandbox CSP for the preview frame, untouched elsewhere", async () => {
  const html = () => new Response("<p>x</p>", { headers: { "content-type": "text/html" } });
  const app = withBuilderHeaders("/builder/studio", html());
  assert.match(app.headers.get("content-security-policy"), /script-src 'self'(;|$)/);
  assert.match(app.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(app.headers.get("x-frame-options"), "DENY");
  assert.equal(app.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal(withBuilderHeaders("/builder", html()).headers.get("x-robots-tag"), null, "landing stays indexable");
  const frame = withBuilderHeaders("/builder/frame", html());
  const csp = frame.headers.get("content-security-policy");
  assert.match(csp, /connect-src 'none'/);
  assert.match(csp, /form-action 'none'/);
  assert.match(csp, /frame-ancestors 'self'/);
  assert.equal(frame.headers.get("x-frame-options"), null);
  assert.equal(withBuilderHeaders("/services", html()).headers.get("content-security-policy"), null);
});

// ---------- preview composer + highlighter ----------
test("composePreview inlines local CSS/JS/SVG and injects the runtime first", () => {
  const files = { "index.html": '<!doctype html><html><head><link rel="stylesheet" href="./styles.css"><link rel="icon" href="x.ico"></head><body><img src="logo.svg"><script src="script.js"></script><script src="https://cdn.jsdelivr.net/x.js"></script></body></html>', "styles.css": "body{color:red}</style>", "script.js": "console.log('</script>')", "logo.svg": "<svg/>", "about.html": "<p>about</p>" };
  const out = composePreview(files);
  assert.match(out, /<head><script data-xs-runtime>/);
  assert.match(out, /<style data-file="styles.css">\nbody\{color:red\}<\\\/style>/);
  assert.match(out, /<script data-file="script.js">\nconsole\.log\('<\\\/script>'\)/);
  assert.match(out, /src="data:image\/svg\+xml;base64,/);
  assert.match(out, /cdn\.jsdelivr\.net\/x\.js/);
  assert.deepEqual(pagesOf(files), ["index.html", "about.html"]);
  assert.match(composePreview(files, "about.html"), /<p>about<\/p>/);
  assert.match(composePreview(files, "missing.html"), /data:image\/svg/, "unknown page falls back to index.html");
});

test("highlight escapes everything and round-trips the source text", () => {
  const unhl = (h) => h.replace(/<span class="t-[a-z]+">|<\/span>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const samples = {
    html: '<!-- c --><div class="a" data-x=\'y\' hidden>Tom & "Jerry" <b>x</b></div><style>a{color:#fff}</style><script>if(a<b){alert("<x>")}</script>',
    css: "/* c */ .a > b{color:#fff;margin:0 auto !important}@media (max-width:600px){a{x:1px}}",
    js: "const a = `x${1}` // c\nlet b='<script>'; /* d */ function f(){return 2.5}",
  };
  for (const [lang, src] of Object.entries(samples)) {
    const h = highlight(src, lang);
    assert.doesNotMatch(h.replace(/<\/?span[^>]*>/g, ""), /[<>]/, lang + " output is escaped");
    assert.equal(unhl(h), src, lang + " round trip");
  }
});
