#!/usr/bin/env node
// Dev-only: renders 1280×800 Chrome Web Store screenshots of the real build with a mocked Gemini
// answer (no network). Output: projects/gridsnip/store/screenshots/. Needs Playwright.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { build, ROOT } from "./build.mjs";

const OUT = path.join(ROOT, "store", "screenshots");
const DEMO = fs.readFileSync(path.join(ROOT, "store", "demo", "report.html"));
const ANSWER = "Region\tQ2 revenue\tQ3 revenue\tChange\tOrders\tAvg. order (₹)\nNorth\t48.20\t52.75\t+9.4%\t4,812\t1,096\nWest\t61.05\t59.30\t-2.9%\t5,240\t1,132\nSouth\t39.80\t44.10\t+10.8%\t4,015\t1,098\nEast\t22.45\t24.90\t+10.9%\t2,318\t1,074\nOnline\t71.60\t83.25\t+16.3%\t9,904\t841\nTotal\t243.10\t264.30\t+8.7%\t26,289\t1,005";

const { dir } = build({ log: () => {} });
const extDir = fs.mkdtempSync(path.join(os.tmpdir(), "gridsnip-shots-"));
fs.cpSync(dir, extDir, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(extDir, "manifest.json"), "utf8"));
manifest.host_permissions = [...manifest.host_permissions, "<all_urls>"]; // capture without a real shortcut press
fs.writeFileSync(path.join(extDir, "manifest.json"), JSON.stringify(manifest));
const context = await chromium.launchPersistentContext("", { channel: "chromium", headless: true, viewport: { width: 1280, height: 800 }, args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`] });
await context.route("https://demo.example/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: DEMO }));
let delay = 0;
await context.route("https://generativelanguage.googleapis.com/**", async (r) => {
  if (new URL(r.request().url()).pathname === "/v1beta/models") return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ models: [{ name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] }] }) });
  if (delay) await new Promise((res) => setTimeout(res, delay));
  return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ candidates: [{ content: { parts: [{ text: ANSWER }] }, finishReason: "STOP" }] }) });
});
const sw = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker");
const welcome = context.pages().find((p) => p.url().endsWith("/welcome.html")) || await context.waitForEvent("page", (p) => p.url().endsWith("/welcome.html"));
await welcome.waitForSelector("#gsKeyInput");
await welcome.fill("#gsKeyInput", "AIzaSyDEMOKEY0000000000000000");
await welcome.click("text=Save key");
await welcome.waitForSelector("#keyDone:not([hidden])");
await welcome.screenshot({ path: path.join(OUT, "screenshot-3-setup-1280x800.png") });
const page = await context.newPage();
await page.goto("https://demo.example/report.html");
await page.bringToFront();
const opened = context.waitForEvent("page", (p) => p.url().includes("/snip.html"));
await sw.evaluate(async () => { const [t] = await chrome.tabs.query({ url: "https://demo.example/report.html" }); await chrome.tabs.update(t.id, { active: true }); await new Promise((r) => setTimeout(r, 250)); return self.gridsnipStartSnip(t); });
const snip = await opened;
await snip.waitForSelector("#stage:not([hidden]), #message:not([hidden])");
if (await snip.isVisible("#message")) throw new Error("snip tab problem: " + (await snip.textContent("#message")) + " url=" + snip.url());
const table = await page.locator("#results").boundingBox();
const img = await snip.locator("#shot").boundingBox();
const s = img.width / (await snip.locator("#shot").evaluate((i) => i.naturalWidth));
delay = 2500;
await snip.mouse.move(img.x + (table.x - 8) * s, img.y + (table.y - 8) * s);
await snip.mouse.down();
await snip.mouse.move(img.x + (table.x + table.width + 8) * s, img.y + (table.y + table.height + 8) * s, { steps: 8 });
await snip.mouse.up();
await snip.waitForTimeout(300);
await snip.screenshot({ path: path.join(OUT, "screenshot-1-select-1280x800.png") });
await snip.waitForSelector("#result:not([hidden])");
await snip.waitForTimeout(200);
await snip.screenshot({ path: path.join(OUT, "screenshot-2-copied-1280x800.png") });
await context.close();
console.log("wrote", fs.readdirSync(OUT).join(", "));
