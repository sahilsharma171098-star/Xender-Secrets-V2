// XEND-BUILDER-001 — the AI builder in a real browser (Chromium via Playwright).
// /public is served from disk WITH the production /builder security headers (CSP etc. from
// src/builder/routes.mjs), so any CSP breakage shows up as a console error here.
// /api/builder/* runs the REAL src/builder/{store,routes}.mjs against in-memory SQLite with the
// deterministic mock AI provider; /api/lead runs the real src/growth.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { chromium } from "playwright";
import { ensureBuilderSchema, handleBuilderStore } from "../src/builder/store.mjs";
import { handleBuilderGenerate, withBuilderHeaders } from "../src/builder/routes.mjs";
import { ensureGrowthSchema, handleGrowth } from "../src/growth.mjs";

const PUBLIC = path.resolve("public");
const ORIGIN = "https://xender.test";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".txt": "text/plain" };

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

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

async function setup({ viewport = { width: 1366, height: 860 }, env: extraEnv = {}, country = "GB" } = {}) {
  const sql = doSql();
  ensureBuilderSchema(sql);
  ensureGrowthSchema(sql);
  const env = { BUILDER_AI_MOCK: "1", ...extraEnv };
  const stub = { fetch: (req) => handleBuilderStore(req, { sql, env, user: null }) };
  const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const log = { errors: [], missing: [] };
  const watch = (p) => {
    p.on("pageerror", (e) => log.errors.push(e.message));
    p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) log.errors.push(m.text()); });
  };
  watch(page);
  context.on("page", watch);
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin !== ORIGIN) return route.fulfill({ status: 204, body: "" });
    const headers = await req.allHeaders();
    const send = async (res) => route.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: Buffer.from(await res.arrayBuffer()) });
    if (url.pathname.startsWith("/api/")) {
      const r = new Request(ORIGIN + url.pathname + url.search, { method: req.method(), headers, body: ["GET", "HEAD"].includes(req.method()) ? undefined : req.postDataBuffer() });
      if (url.pathname === "/api/locale") return route.fulfill({ json: { ok: true, country } });
      if (url.pathname === "/api/event") return route.fulfill({ status: 202, json: { ok: true } });
      if (url.pathname.startsWith("/api/builder/")) {
        const gen = await handleBuilderGenerate(r.clone(), env, null, stub, { sleep: async () => {} });
        return send(gen || await handleBuilderStore(r, { sql, env, user: null }));
      }
      const g = await handleGrowth(r, { sql, env: {} });
      return g ? send(g) : route.fulfill({ status: 404, json: { ok: false } });
    }
    let file = path.join(PUBLIC, decodeURIComponent(url.pathname));
    if (!path.extname(file) && fs.existsSync(file + ".html")) file += ".html";
    if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { log.missing.push(url.pathname); return route.fulfill({ status: 404, body: "nf" }); }
    const res = withBuilderHeaders(url.pathname, new Response(fs.readFileSync(file), { headers: { "content-type": TYPES[path.extname(file)] || "application/octet-stream" } }));
    return send(res);
  });
  return { page, context, sql, env, log };
}

const frameOf = async (page) => {
  const handle = await page.waitForSelector("#frame");
  return handle.contentFrame();
};
const waitVersion = (page, v) => page.waitForFunction((v) => document.querySelector("#verPill")?.textContent === "v" + v, v, { timeout: 15000 });

test("landing → prompt → studio generates a site and renders it in the sandboxed preview", async () => {
  const { page, context, log, sql } = await setup();
  await page.goto(ORIGIN + "/builder");
  assert.match(await page.locator("h1").innerText(), /Describe your website/);
  await page.waitForFunction(() => /generations left today/.test(document.querySelector("#capacity").textContent));
  await page.locator("[data-example]").first().click();
  assert.match(await page.locator("#prompt").inputValue(), /physiotherapy clinic/);
  await page.fill("#prompt", "Northern Lights bakery in Glasgow");
  await page.click("#promptForm button[type=submit]");
  await page.waitForURL(/\/builder\/studio\?project=bp_/, { timeout: 15000 });
  await waitVersion(page, 1);
  const frame = await frameOf(page);
  await frame.waitForSelector("h1#title");
  assert.equal(await frame.locator("h1#title").innerText(), "Northern Lights bakery in Glasgow");
  // Generated JavaScript runs inside the preview…
  await frame.click("#cta");
  assert.equal(await frame.locator("#out").innerText(), "Thanks!");
  // …but the preview is an opaque-origin sandbox: no same-origin access, no cookies.
  assert.equal(await page.getAttribute("#frame", "sandbox"), "allow-scripts allow-forms allow-modals");
  assert.equal(await frame.evaluate(() => { try { return document.cookie; } catch (e) { return "blocked:" + e.name; } }), "blocked:SecurityError");
  assert.equal(await frame.evaluate(() => { try { return String(parent.document.title); } catch (e) { return "blocked"; } }), "blocked");
  assert.deepEqual(log.errors.filter((e) => !/preview/.test(e)), [], "no CSP or script errors");
  assert.equal(await frame.evaluate(() => fetch("/api/builder/projects").then(() => "fetched", () => "blocked")), "blocked", "CSP connect-src 'none'");
  assert.match(await page.locator("#log").innerText(), /Northern Lights bakery in Glasgow[\s\S]*v1/);
  assert.equal(Number(sql.exec("SELECT COUNT(*) AS n FROM builder_projects").toArray()[0].n), 1);
  await context.close();
});

test("device previews, follow-up edit, code edit, in-preview navigation, undo and export", async () => {
  const { page, context, log } = await setup();
  await page.goto(ORIGIN + "/builder/studio");
  await page.fill("#composerInput", "Copper Kettle cafe in Auckland");
  await page.click("#sendBtn");
  await waitVersion(page, 1);
  // Device switcher.
  await page.click('[data-device="mobile"]');
  await page.waitForFunction(() => document.querySelector("#device").getBoundingClientRect().width <= 392);
  await page.click('[data-device="tablet"]');
  await page.waitForFunction(() => Math.round(document.querySelector("#device").getBoundingClientRect().width) === 820);
  await page.click('[data-device="desktop"]');
  // Follow-up chat edit only touches styles.css.
  await page.fill("#composerInput", "make the brand colour purple");
  await page.click("#sendBtn");
  await waitVersion(page, 2);
  let frame = await frameOf(page);
  await frame.waitForFunction(() => document.querySelector("header") && getComputedStyle(document.querySelector("header")).backgroundColor === "rgb(124, 58, 237)");
  assert.equal(await frame.locator("h1#title").innerText(), "Copper Kettle cafe in Auckland", "content preserved");
  // Manual code edit.
  await page.click('[data-view="code"]');
  await page.click('#fileList button:has-text("index.html")');
  const code = await page.inputValue("#codeInput");
  assert.match(await page.locator("#hl").innerHTML(), /t-tag/);
  await page.fill("#codeInput", code.replace("Book now", "Reserve a table"));
  assert.equal(await page.isEnabled("#saveBtn"), true);
  await page.click("#saveBtn");
  await waitVersion(page, 3);
  await page.click('[data-view="preview"]');
  frame = await frameOf(page);
  await frame.waitForFunction(() => document.querySelector("#cta")?.textContent === "Reserve a table");
  // Clicking a link to another project page navigates inside the preview.
  await frame.click('a[href="about.html"]');
  await page.waitForFunction(() => document.querySelector("#pageSel").value === "about.html");
  frame = await frameOf(page);
  await frame.waitForFunction(() => document.querySelector("h1")?.textContent === "About us");
  // Undo restores v2 (the purple version without the manual edit) as v4.
  await page.click("#undoBtn");
  await waitVersion(page, 4);
  await page.selectOption("#pageSel", "index.html");
  frame = await frameOf(page);
  await frame.waitForFunction(() => document.querySelector("#cta")?.textContent === "Book now");
  // Export ZIP.
  const href = await page.getAttribute("#exportBtn", "href");
  const sig = await page.evaluate((h) => fetch(h).then((r) => r.arrayBuffer()).then((b) => new DataView(b).getUint32(0, true)), href);
  assert.equal(sig, 0x04034b50);
  // Reload keeps the project (persisted, owned by the guest cookie).
  await page.reload();
  await waitVersion(page, 4);
  assert.equal(await page.locator(".msg-ai").count(), 4);
  assert.deepEqual(log.errors.filter((e) => !/preview/.test(e)), []);
  await context.close();
});

test("projects dashboard: list, duplicate, delete", async () => {
  const { page, context, log } = await setup();
  await page.goto(ORIGIN + "/builder/studio");
  await page.fill("#composerInput", "Riverside dental clinic in Leeds");
  await page.click("#sendBtn");
  await waitVersion(page, 1);
  await page.goto(ORIGIN + "/builder/projects");
  await page.waitForSelector(".proj-card");
  assert.equal(await page.locator(".proj-card").count(), 1);
  assert.match(await page.locator("#who").innerText(), /\(1\/3\)/);
  await page.click('.proj-card button:has-text("Duplicate")');
  await page.waitForFunction(() => document.querySelectorAll(".proj-card").length === 2);
  page.once("dialog", (d) => d.accept());
  await page.locator('.proj-card button:has-text("Delete")').first().click();
  await page.waitForFunction(() => document.querySelectorAll(".proj-card").length === 1);
  assert.deepEqual(log.errors, []);
  await context.close();
});

test("free limit reached: clear message with sign-up and done-for-you options; launch lead is captured", async () => {
  const { page, context, sql } = await setup({ env: { BUILDER_GUEST_DAILY: "1" } });
  await page.goto(ORIGIN + "/builder/studio");
  await page.fill("#composerInput", "Summit yoga studio in Denver");
  await page.click("#sendBtn");
  await waitVersion(page, 1);
  await page.fill("#composerInput", "add a class timetable section");
  await page.click("#sendBtn");
  await page.waitForSelector("text=free guest generations");
  assert.ok(await page.locator('button:has-text("Create a free account")').isVisible());
  await page.click('button:has-text("Get our team to build it")');
  await page.waitForSelector("#launchDialog[open]");
  await page.fill("#ld-name", "Jordan Test");
  await page.fill("#ld-email", "jordan@example.com");
  await page.click('#launchDialog button[type="submit"]');
  await page.waitForSelector(".lead-success");
  const lead = sql.exec("SELECT offer,message,page FROM growth_leads").toArray()[0];
  assert.equal(lead.offer, "ai-builder-launch");
  assert.match(lead.message, /project bp_[a-z2-9]{9} v1/);
  assert.equal(lead.page, "/builder/studio");
  await context.close();
});

test("pricing shows region prices, takes no payment and captures quote requests", async () => {
  const { page, context, sql, log } = await setup({ country: "GB" });
  await page.goto(ORIGIN + "/builder/pricing");
  await page.waitForFunction(() => document.querySelector("#launchPrice").textContent === "£239");
  await page.click('[data-region="IN"]');
  assert.equal(await page.locator("#launchPrice").innerText(), "₹999");
  assert.match(await page.locator("#launchNote").innerText(), /GST/);
  assert.equal(await page.locator("#proPrice").innerText(), "Waitlist");
  assert.equal(await page.locator('input[name*="card"], [data-razorpay], script[src*="razorpay"]').count(), 0);
  await page.click('[data-cta="pricing-pro-waitlist"]');
  assert.equal(await page.inputValue("#q-offer"), "ai-builder-pro-waitlist");
  await page.fill("#q-name", "Alex Test");
  await page.fill("#q-email", "alex@example.com");
  await page.click('form[data-lead-form] button[type="submit"]');
  await page.waitForSelector(".lead-success");
  assert.equal(sql.exec("SELECT offer FROM growth_leads").toArray()[0].offer, "ai-builder-pro-waitlist");
  assert.deepEqual(log.errors, []);
  await context.close();
});

test("mobile: builder pages fit the screen and the studio switches between chat, preview and code", async () => {
  const { page, context, log } = await setup({ viewport: { width: 390, height: 844 } });
  for (const p of ["/builder", "/builder/pricing", "/builder/projects"]) {
    await page.goto(ORIGIN + p);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(overflow <= 0, `${p} overflows by ${overflow}px`);
  }
  await page.goto(ORIGIN + "/builder/studio");
  assert.ok(await page.locator("#chatPanel").isVisible());
  assert.equal(await page.locator("#stagePanel").isVisible(), false);
  await page.fill("#composerInput", "Bondi surf school in Sydney");
  await page.click("#sendBtn");
  await waitVersion(page, 1);
  await page.waitForFunction(() => document.querySelector('[data-mtab="preview"]').getAttribute("aria-selected") === "true");
  assert.ok(await page.locator("#stagePanel").isVisible());
  const frame = await frameOf(page);
  await frame.waitForSelector("h1#title");
  await page.click('[data-mtab="code"]');
  assert.ok(await page.locator("#codeInput").isVisible());
  await page.click('[data-mtab="chat"]');
  assert.ok(await page.locator("#composerInput").isVisible());
  assert.deepEqual(log.errors.filter((e) => !/preview/.test(e)), []);
  await context.close();
});

test("dark mode toggle persists across builder pages", async () => {
  const { page, context } = await setup();
  await page.goto(ORIGIN + "/builder");
  await page.click("[data-theme-toggle]");
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
  await page.goto(ORIGIN + "/builder/pricing");
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
  await context.close();
});
