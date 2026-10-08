// XEND-BUILDER-001 — LIVE end-to-end check of the AI builder against a real deployment
// (a Cloudflare PR preview or production) with the REAL configured AI provider.
//
//   BUILDER_BASE=https://<preview>.workers.dev node tests/builder-live.mjs
//
// It spends real free-tier neurons (one generation + one edit, roughly 600–1,200 neurons of the
// 10,000/day free allowance) and leaves one guest project behind. Run it deliberately, not in loops.
// Writes screenshots, the generated files and summary.json to BUILDER_OUT (default builder-live-out/).
import fs from "node:fs";
import path from "node:path";

const BASE = (process.env.BUILDER_BASE || "https://www.xendersecrets.com").replace(/\/$/, "");
const OUT = process.env.BUILDER_OUT || "builder-live-out";
const WAIT_MS = Number(process.env.BUILDER_WAIT_MS || 0);
fs.mkdirSync(OUT, { recursive: true });
const summary = { base: BASE, startedAt: new Date().toISOString(), checks: [] };
const check = (name, ok, detail = "") => { summary.checks.push({ name, ok: !!ok, detail: String(detail).slice(0, 500) }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); return ok; };
let cookie = "";

async function call(method, p, body) {
  const headers = { origin: BASE };
  if (cookie) headers.cookie = cookie;
  if (body) headers["content-type"] = "application/json";
  const r = await fetch(BASE + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get("set-cookie");
  if (sc && /xs_bguest=/.test(sc)) cookie = sc.split(";")[0];
  return r;
}

async function stream(p, body, timeoutMs = 300000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  const started = Date.now();
  const headers = { origin: BASE, "content-type": "application/json", ...(cookie ? { cookie } : {}) };
  const r = await fetch(BASE + p, { method: "POST", headers, body: JSON.stringify(body), signal: ctl.signal });
  const sc = r.headers.get("set-cookie");
  if (sc && /xs_bguest=/.test(sc)) cookie = sc.split(";")[0];
  if (!(r.headers.get("content-type") || "").includes("ndjson")) { clearTimeout(t); return { status: r.status, error: await r.text() }; }
  const events = [];
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      if (line.trim()) { const ev = JSON.parse(line); events.push(ev); if (ev.type !== "progress" || ev.stage !== "delta") console.log("  ·", JSON.stringify(ev).slice(0, 200)); }
    }
  }
  clearTimeout(t);
  return { status: r.status, events, done: events.find((e) => e.type === "done"), error: events.find((e) => e.type === "error"), ms: Date.now() - started };
}

async function waitForDeployment() {
  const until = Date.now() + WAIT_MS;
  for (;;) {
    try {
      const r = await fetch(BASE + "/api/builder/status");
      if (r.ok && (await r.json()).ok) return true;
    } catch {}
    if (Date.now() > until) return false;
    await new Promise((res) => setTimeout(res, 15000));
  }
}

async function main() {
  check("deployment serves the builder API", await waitForDeployment(), BASE);
  const st = await (await call("GET", "/api/builder/status")).json();
  summary.providers = st.providers;
  check("an AI provider is configured", st.providers?.length > 0 && st.providers[0].id !== "mock", JSON.stringify(st.providers));
  check("free capacity available", st.quota?.capacity?.available, JSON.stringify(st.quota));

  const prompt = "A one-page website for 'Harbourside Physio', a physiotherapy clinic in Brighton, UK: hero with booking button, services with prices in GBP, about the team, opening hours, FAQ and an appointment request form. Calm teal and sand colours.";
  const gen = await stream("/api/builder/generate", { prompt });
  summary.generation = { status: gen.status, ms: gen.ms, provider: gen.done?.provider, model: gen.done?.model, summary: gen.done?.summary, error: gen.error?.error || gen.error };
  if (!check("real AI generated a website", gen.done, gen.done ? `${gen.done.provider} ${gen.done.model} in ${Math.round(gen.ms / 1000)}s` : JSON.stringify(gen.error || gen).slice(0, 300))) return;
  const project = gen.done.project;
  const idx = project.files["index.html"] || "";
  for (const [name, body] of Object.entries(project.files)) fs.writeFileSync(path.join(OUT, "v1-" + name.replace(/\//g, "_")), body);
  check("index.html is substantial HTML", /<body[\s>]/i.test(idx) && idx.length > 1500, `${idx.length} chars, files: ${Object.keys(project.files).join(", ")}`);
  check("content follows the prompt", /harbourside/i.test(idx) && /brighton/i.test(idx));

  // Real rendered output in a real browser, through the production studio + sandbox.
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const [name, value] = cookie.split("=");
    await context.addCookies([{ name, value, url: BASE }]);
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(BASE + "/builder/studio?project=" + project.id, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelector("#verPill")?.textContent === "v1", null, { timeout: 30000 });
    const frame = await (await page.waitForSelector("#frame")).contentFrame();
    await frame.waitForFunction(() => document.body && document.body.innerText.length > 80, null, { timeout: 30000 });
    const text = await frame.evaluate(() => document.body.innerText);
    check("preview renders the generated site", /harbourside/i.test(text), text.slice(0, 160).replace(/\s+/g, " "));
    await page.screenshot({ path: path.join(OUT, "studio-desktop.png") });
    await page.click('[data-device="mobile"]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, "studio-mobile-device.png") });
    check("studio has no console errors", errors.length === 0, errors.join(" | "));

    const edit = await stream(`/api/builder/projects/${project.id}/edit`, { prompt: "Make the primary colour a deep forest green and add a short 'What to expect on your first visit' section before the FAQ." });
    summary.edit = { status: edit.status, ms: edit.ms, changed: edit.done?.changed, summary: edit.done?.summary, error: edit.error?.error || edit.error };
    if (check("follow-up edit applied", edit.done, edit.done ? `changed ${edit.done.changed.join(", ")} in ${Math.round(edit.ms / 1000)}s` : JSON.stringify(edit.error || edit).slice(0, 300))) {
      const files2 = edit.done.project.files;
      for (const [n, b] of Object.entries(files2)) fs.writeFileSync(path.join(OUT, "v2-" + n.replace(/\//g, "_")), b);
      check("edit kept the original content", /harbourside/i.test(files2["index.html"] || ""));
      check("edit added the requested section", /first visit/i.test(Object.values(files2).join("\n")));
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForFunction(() => document.querySelector("#verPill")?.textContent === "v2", null, { timeout: 30000 });
      const f2 = await (await page.waitForSelector("#frame")).contentFrame();
      await f2.waitForFunction(() => /first visit/i.test(document.body?.innerText || ""), null, { timeout: 30000 }).then(() => check("edited preview renders", true), () => check("edited preview renders", false));
      await page.screenshot({ path: path.join(OUT, "studio-after-edit.png") });
    }
    await context.close();
  } finally { await browser.close(); }

  const zip = await call("GET", `/api/builder/projects/${project.id}/export`);
  const buf = Buffer.from(await zip.arrayBuffer());
  fs.writeFileSync(path.join(OUT, "export.zip"), buf);
  check("ZIP export downloads", zip.status === 200 && buf.readUInt32LE(0) === 0x04034b50 && buf.includes("index.html"), `${buf.length} bytes`);
  cookie = "";
  check("project is private to its owner", (await call("GET", "/api/builder/projects/" + project.id)).status === 404);

  for (const p of ["/", "/services", "/portfolio", "/novels", "/builder", "/builder/pricing"]) {
    const r = await fetch(BASE + p, { redirect: "manual" });
    check(`page ${p} responds`, r.status === 200, r.status);
  }
}

main().catch((e) => check("live run crashed", false, e.stack || e)).finally(() => {
  summary.finishedAt = new Date().toISOString();
  summary.ok = summary.checks.length > 0 && summary.checks.every((c) => c.ok);
  fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## AI builder live check — ${summary.ok ? "PASS" : "FAIL"}\n\nBase: ${BASE}\n\nProvider: ${JSON.stringify(summary.generation ? { provider: summary.generation.provider, model: summary.generation.model, seconds: Math.round((summary.generation.ms || 0) / 1000) } : null)}\n\n| Check | Result | Detail |\n|---|---|---|\n${summary.checks.map((c) => `| ${c.name} | ${c.ok ? "✅" : "❌"} | ${c.detail.replace(/\|/g, "\\|").replace(/\n/g, " ")} |`).join("\n")}\n`);
  }
  process.exit(summary.ok ? 0 : 1);
});
