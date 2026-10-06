#!/usr/bin/env node
// Generates store screenshots (1280×800) and promo tiles from the REAL extension:
// loads extension/dist/chrome in Chromium, opens the real popup against the bundled demo pages
// (extension/store/demo-pages — fictional businesses), and composes the captures into frames.
// Dev-only (needs Playwright). Usage: npm run extension:assets
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { build, manifestFor } from "./build.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "extension");
const STORE = path.join(ROOT, "store");
const DEMOS = { "brightsmile.example": "demo-clinic.html", "urbanthreads.example": "demo-store.html" };
fs.mkdirSync(path.join(STORE, "screenshots"), { recursive: true });
fs.mkdirSync(path.join(STORE, "promo"), { recursive: true });

const { chrome } = build({ targets: ["chrome"], log: () => {} });
const extDir = fs.mkdtempSync(path.join(os.tmpdir(), "sitecheck-assets-"));
fs.cpSync(chrome.dir, extDir, { recursive: true });
const m = JSON.parse(fs.readFileSync(path.join(extDir, "manifest.json"), "utf8"));
m.host_permissions = ["<all_urls>"]; // capture-only stand-in for the toolbar click's activeTab grant
fs.writeFileSync(path.join(extDir, "manifest.json"), JSON.stringify(m));
const hex = crypto.createHash("sha256").update(path.resolve(extDir)).digest("hex").slice(0, 32);
const extId = [...hex].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join("");

const context = await chromium.launchPersistentContext("", {
  channel: "chromium", headless: true, viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1,
  args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`],
});
await context.route("**/*", (route) => {
  const url = new URL(route.request().url());
  if (!/^https?:$/.test(url.protocol)) return route.continue();
  const file = DEMOS[url.hostname];
  if (file && url.pathname === "/") return route.fulfill({ status: 200, contentType: "text/html", body: fs.readFileSync(path.join(STORE, "demo-pages", file)) });
  if (file && url.pathname.startsWith("/images/")) return route.fulfill({ status: 200, contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="220"><rect width="600" height="220" fill="#ccfbf1"/><circle cx="300" cy="110" r="46" fill="#5eead4"/></svg>' });
  return route.fulfill({ status: 204, body: "" });
});

const png = (buf) => "data:image/png;base64," + buf.toString("base64");

async function capture(host, { filter, open, scrollTo } = {}) {
  const site = await context.newPage();
  await site.setViewportSize({ width: 1280, height: 1000 });
  await site.goto(`https://${host}/`);
  const siteShot = await site.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 1000 } });
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 400, height: 600 });
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  const tabId = await popup.evaluate(async (u) => (await chrome.tabs.query({ url: u })).map((t) => t.id)[0], `https://${host}/*`);
  await popup.goto(`chrome-extension://${extId}/popup.html?tab=${tabId}`);
  await popup.waitForSelector("#report:not([hidden])");
  await popup.waitForTimeout(200);
  if (filter) await popup.getByRole("button", { name: new RegExp("^" + filter) }).click();
  if (open) {
    const card = popup.locator(`[data-check="${open}"]`);
    await card.locator("summary").click();
    await popup.waitForTimeout(400); // let the chevron transition finish
  }
  if (scrollTo) await popup.locator(scrollTo).evaluate((el) => el.scrollIntoView({ block: "start" }));
  const score = await popup.textContent("#scoreNum");
  const popupShot = await popup.screenshot();
  await popup.close(); await site.close();
  return { siteShot, popupShot, score };
}

const FRAME_CSS = `*{box-sizing:border-box}body{margin:0;width:1280px;height:800px;overflow:hidden;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;background:linear-gradient(135deg,#eef3ff 0%,#f7f9fc 60%,#e7f7fb 100%);color:#0b1220}
.copy{position:absolute;left:64px;top:72px;width:430px}.brand{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:.02em;color:#1d4ed8;margin-bottom:28px}.brand img{width:36px;height:36px}
h1{font-size:46px;line-height:1.08;letter-spacing:-.02em;margin:0 0 18px}p{font-size:19px;line-height:1.5;color:#334155;margin:0 0 12px}
.browser{position:absolute;right:-90px;top:70px;width:830px;height:690px;border-radius:16px;background:#fff;box-shadow:0 30px 80px rgba(15,23,42,.18);overflow:hidden;border:1px solid #dfe5ee}
.chrome{height:44px;background:#f1f4f9;border-bottom:1px solid #e3e8f0;display:flex;align-items:center;gap:8px;padding:0 14px}.dot{width:11px;height:11px;border-radius:50%;background:#d6dce6}
.url{margin-left:14px;flex:1;max-width:430px;height:26px;border-radius:13px;background:#fff;border:1px solid #e3e8f0;font-size:13px;color:#5b6678;display:flex;align-items:center;padding:0 12px}
.ext{width:24px;height:24px;margin-left:auto;margin-right:90px;border-radius:6px;outline:2px solid #1d4ed8;outline-offset:3px}
.site{width:100%;display:block;opacity:.9}
.popup{position:absolute;right:84px;top:60px;width:400px;border-radius:12px;box-shadow:0 18px 60px rgba(15,23,42,.28);border:1px solid #dfe5ee;background:#fff}
.note{position:absolute;left:64px;bottom:40px;font-size:13px;color:#5b6678}`;

function frame({ title, sub, host, siteShot, popupShot, extra = "" }) {
  const icon = png(fs.readFileSync(path.join(ROOT, "src", "icons", "icon-128.png")));
  const icon32 = png(fs.readFileSync(path.join(ROOT, "src", "icons", "icon-32.png")));
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FRAME_CSS}</style></head><body>
  <div class="copy"><div class="brand"><img src="${icon}" alt="">Xender SiteCheck</div><h1>${title}</h1>${sub.map((s) => `<p>${s}</p>`).join("")}${extra}</div>
  <div class="browser"><div class="chrome"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="url">https://${host}/</span><img class="ext" src="${icon32}" alt=""></div><img class="site" src="${png(siteShot)}" alt=""></div>
  <img class="popup" src="${png(popupShot)}" alt="">
  <div class="note">Real SiteCheck output on a demo page of a fictional business.</div>
  </body></html>`;
}

const out = await context.newPage();
await out.setViewportSize({ width: 1280, height: 800 });
async function render(html, file, size = { width: 1280, height: 800 }) {
  await out.setViewportSize(size);
  await out.setContent(html);
  await out.waitForTimeout(100);
  await out.screenshot({ path: path.join(STORE, file) });
  console.log(file);
}

const perms = manifestFor("chrome").permissions;
const shots = [
  { file: "1-check-in-seconds.png", host: "brightsmile.example", title: "Check your website in seconds", sub: ["One click on any page: a health score, five category scores, and a prioritised list of what to fix."] },
  { file: "2-seo-accessibility.png", host: "brightsmile.example", filter: "Accessibility", open: "a11y-form-labels", scrollTo: "#filters", title: "Find SEO and accessibility issues", sub: ["Missing titles and descriptions, images without alt text, unlabelled form fields, low contrast and more."] },
  { file: "3-clear-fixes.png", host: "brightsmile.example", open: "a11y-img-alt", scrollTo: '[data-check="a11y-img-alt"]', title: "Get clear fixes — not technical jargon", sub: ["Every issue explains why it matters and what to change, with the exact elements found on the page."] },
  { file: "4-conversion-friction.png", host: "urbanthreads.example", filter: "Conversion", open: "cro-cta-competing", scrollTo: "#filters", title: "Spot conversion friction", sub: ["Competing buttons, no visible contact method, crowded menus — clearly labelled as heuristics, not rules."] },
  { file: "5-local-first.png", host: "brightsmile.example", scrollTo: ".tools", title: "Local-first. No browsing-history tracking.", sub: ["SiteCheck runs only when you click it, only on the current tab, and sends nothing anywhere."],
    extra: `<p style="margin-top:22px;font-size:15px;color:#0b1220"><strong>Permissions:</strong> ${perms.map((p) => `<code style="background:#e8efff;color:#1d4ed8;padding:2px 7px;border-radius:6px;margin-right:6px">${p}</code>`).join("")}</p><p style="font-size:15px">No access to all websites · no analytics · no remote code</p>` },
];
const scores = {};
for (const s of shots) {
  const cap = await capture(s.host, s);
  scores[s.host] = cap.score;
  await render(frame({ ...s, ...cap }), path.join("screenshots", s.file));
}

const icon = png(fs.readFileSync(path.join(ROOT, "src", "icons", "icon-128.png")));
const promo = (w, h, big) => `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:${w}px;height:${h}px;overflow:hidden;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;background:linear-gradient(135deg,#1d4ed8 0%,#1e3a8a 100%);color:#fff;display:flex;align-items:center;gap:${big ? 48 : 22}px;padding:0 ${big ? 90 : 30}px}
img{width:${big ? 168 : 84}px;height:${big ? 168 : 84}px;flex:none;filter:drop-shadow(0 10px 24px rgba(0,0,0,.25))}h1{margin:0;font-size:${big ? 64 : 30}px;letter-spacing:-.02em;line-height:1.05}p{margin:${big ? 16 : 8}px 0 0;font-size:${big ? 28 : 15}px;color:#dbe6ff;line-height:1.35}
.tags{margin-top:${big ? 26 : 12}px;display:flex;gap:${big ? 12 : 6}px;flex-wrap:wrap}.tags span{font-size:${big ? 20 : 11}px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);padding:${big ? "6px 14px" : "3px 8px"};border-radius:999px}</style></head>
<body><img src="${icon}" alt=""><div><h1>Xender SiteCheck</h1><p>Website QA &amp; conversion audit${big ? " for the page you're on" : ""}</p><div class="tags"><span>SEO</span><span>Accessibility</span><span>Conversion</span>${big ? "<span>Usability</span><span>Technical</span>" : ""}</div></div></body></html>`;
await render(promo(440, 280, false), path.join("promo", "promo-small-440x280.png"), { width: 440, height: 280 });
await render(promo(1400, 560, true), path.join("promo", "promo-marquee-1400x560.png"), { width: 1400, height: 560 });
await render(`<!doctype html><html><body style="margin:0;width:300px;height:300px;display:grid;place-items:center;background:#fff"><img src="${icon}" style="width:256px;height:256px" alt=""></body></html>`, path.join("promo", "edge-logo-300.png"), { width: 300, height: 300 });

await context.close();
fs.rmSync(extDir, { recursive: true, force: true });
console.log("demo scores:", JSON.stringify(scores));
