// XEND-IG-001: renders the week-1 Instagram creatives (1080x1350, 4:5) from slides.mjs.
// Run from the repo root: node marketing/instagram/2026-10-week1/build.mjs
// Concept mockups use the real preview system (public/preview/preview-core.mjs) with
// fictional "Example …" businesses and a visible CONCEPT DEMO badge.
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeConfig, renderPreview } from "../../../public/preview/preview-core.mjs";
import { POSTS } from "./slides.mjs";

// CommonJS resolution so a global/NODE_PATH Playwright works (same as the repo's browser tests).
const { chromium } = createRequire(import.meta.url)("playwright");
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "img");
await mkdir(out, { recursive: true });

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// **text** → accent highlight
const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<em>$1</em>").replace(/\n/g, "<br>");

const CSS = `
*{box-sizing:border-box;margin:0}
html,body{width:1080px;height:1350px}
body{font-family:Inter,sans-serif;background:#0b1220;color:#fff;overflow:hidden}
.s{position:relative;width:1080px;height:1350px;padding:96px 88px;display:flex;flex-direction:column}
.body{flex:1;display:flex;flex-direction:column;justify-content:center;padding-bottom:40px}.b-prices,.b-mock{justify-content:flex-start;padding-bottom:0}
.s.light{background:#f5f7fb;color:#0b1220}
.s.blue{background:#1d4ed8}
.glow{position:absolute;inset:0;background:radial-gradient(900px 520px at 85% -5%,rgba(110,168,255,.35),transparent 70%);pointer-events:none}
.kicker{font-weight:800;font-size:30px;letter-spacing:.14em;text-transform:uppercase;color:#4dd4f0;margin-bottom:36px}
.light .kicker{color:#0891b2}.blue .kicker{color:#bfdbfe}
h1{font-family:"Inter Display",Inter,sans-serif;font-weight:850;font-size:112px;line-height:1.02;letter-spacing:-.035em}
h2{font-family:"Inter Display",Inter,sans-serif;font-weight:800;font-size:76px;line-height:1.06;letter-spacing:-.03em;margin-bottom:44px}
em{font-style:normal;color:#6ea8ff}.light em{color:#1d4ed8}.blue em{color:#fde68a}
.sub{font-size:40px;line-height:1.4;color:#c8d1df;margin-top:40px;max-width:880px}
.light .sub{color:#334155}.blue .sub{color:#dbeafe}
ul{list-style:none;padding:0;display:flex;flex-direction:column;gap:26px}
li{display:flex;gap:26px;align-items:flex-start;font-size:40px;line-height:1.3;font-weight:600}
li b{flex:none;display:grid;place-items:center;width:60px;height:60px;border-radius:16px;background:#1d4ed8;color:#fff;font-size:30px;font-weight:800}
.light li b{background:#e8efff;color:#1d4ed8}
li small{display:block;font-size:30px;font-weight:500;color:#97a3b6;margin-top:6px}
.light li small{color:#5b6678}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;font-size:28px;font-weight:700;color:#97a3b6}
.light .foot{color:#5b6678}.blue .foot{color:#dbeafe}
.brand{letter-spacing:.16em;font-weight:850;color:#fff}.brand span{color:#6ea8ff}
.light .brand{color:#0b1220}.light .brand span{color:#1d4ed8}.blue .brand span{color:#fde68a}
.note{font-size:26px;color:#97a3b6;margin-top:30px;line-height:1.4}.light .note{color:#5b6678}
.cards{display:grid;gap:18px}.prices h2{margin-bottom:34px}
.card{background:#121a2a;border:2px solid #223049;border-radius:28px;padding:24px 34px;display:flex;justify-content:space-between;align-items:center;gap:20px}
.card.hi{border-color:#6ea8ff;background:#16264a}
.card h3{font-size:40px;font-weight:800;margin-bottom:6px}
.card p{font-size:27px;color:#c8d1df;line-height:1.35}
.card .p{text-align:right;flex:none}
.card .p b{display:block;font-size:52px;font-weight:850;font-family:"Inter Display",Inter,sans-serif}
.card .p small{font-size:24px;color:#97a3b6}
.cta{display:inline-flex;align-self:flex-start;margin-top:56px;background:#fff;color:#1d4ed8;font-weight:850;font-size:42px;padding:28px 44px;border-radius:24px}
.mockwrap{display:flex;gap:56px;align-items:center;flex:1}
.phone{flex:none;width:432px;height:902px;border-radius:64px;background:#0b1220;padding:18px;box-shadow:0 40px 90px rgba(2,6,23,.45);border:3px solid #334155;position:relative}
.phone iframe{width:390px;height:860px;border:0;border-radius:48px;background:#fff;display:block;transform-origin:0 0}
.badge{position:absolute;top:-22px;left:50%;transform:translateX(-50%);background:#f59e0b;color:#111827;font-weight:850;font-size:24px;letter-spacing:.1em;padding:10px 22px;border-radius:999px;white-space:nowrap;z-index:2}
.side h2{font-size:64px}
.side ul{gap:20px}.side li{font-size:34px}.side li b{width:50px;height:50px;font-size:26px}
`;

function slideHtml(sl, n, total) {
  const theme = sl.theme || "dark";
  const foot = `<div class="foot"><div class="brand">XENDER<span>·</span>SECRETS</div><div>${total > 1 ? n + "/" + total : "xendersecrets.com"}</div></div>`;
  const list = (items) => `<ul>${items.map((it, i) => { const [t, sm] = it.split("||"); return `<li><b>${sl.icons ? esc(sl.icons[i]) : i + 1}</b><div>${rich(t)}${sm ? `<small>${esc(sm)}</small>` : ""}</div></li>`; }).join("")}</ul>`;
  let body = "";
  if (sl.type === "cover") body = `<div class="kicker">${esc(sl.kicker)}</div><h1>${rich(sl.title)}</h1>${sl.sub ? `<p class="sub">${rich(sl.sub)}</p>` : ""}`;
  if (sl.type === "list") body = `${sl.kicker ? `<div class="kicker">${esc(sl.kicker)}</div>` : ""}<h2>${rich(sl.title)}</h2>${list(sl.items)}${sl.note ? `<p class="note">${esc(sl.note)}</p>` : ""}`;
  if (sl.type === "prices") body = `<div class="kicker">${esc(sl.kicker)}</div><h2>${rich(sl.title)}</h2><div class="cards">${sl.cards.map((c) => `<div class="card${c.hi ? " hi" : ""}"><div><h3>${esc(c.name)}</h3><p>${esc(c.desc)}</p></div><div class="p"><b>${esc(c.price)}</b><small>${esc(c.small)}</small></div></div>`).join("")}</div><p class="note">${esc(sl.note)}</p>`;
  if (sl.type === "cta") body = `<div class="kicker">${esc(sl.kicker)}</div><h2>${rich(sl.title)}</h2><p class="sub">${rich(sl.sub)}</p><div class="cta">${esc(sl.button)}</div>`;
  if (sl.type === "mock") {
    const { config } = sanitizeConfig(sl.config);
    const doc = `<!doctype html><meta charset="utf-8"><style>body{margin:0}</style>${renderPreview(config)}`;
    body = `<div class="kicker">${esc(sl.kicker)}</div><div class="mockwrap"><div class="phone"><div class="badge">CONCEPT DEMO</div><iframe srcdoc="${esc(doc)}"></iframe></div><div class="side"><h2>${rich(sl.title)}</h2>${list(sl.items)}</div></div>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><section class="s ${theme}">${theme === "dark" ? '<div class="glow"></div>' : ""}<div class="body b-${sl.type}">${body}</div>${foot}</section></body></html>`;
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
for (const post of POSTS) {
  for (const [i, sl] of post.slides.entries()) {
    await page.setContent(slideHtml(sl, i + 1, post.slides.length), { waitUntil: "load" });
    await page.waitForTimeout(sl.type === "mock" ? 600 : 100);
    const file = join(out, `${post.id}-${i + 1}.jpg`);
    // Instagram publishing APIs require JPEG.
    await page.screenshot({ path: file, type: "jpeg", quality: 90 });
    console.log(file);
  }
}
await browser.close();
