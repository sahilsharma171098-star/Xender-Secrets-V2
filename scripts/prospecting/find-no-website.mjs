#!/usr/bin/env node
// XEND-ACQ-002 — find local businesses on Google Maps that have no website.
//
// Runs on Sahil's laptop in a visible Chromium window (a Worker or web page cannot read Maps).
// Low volume on purpose: one query at a time, human-paced delays, only listings without a
// "Website" link are opened. It does not log in, solve CAPTCHAs or use proxies — if Google
// shows a check page, the run stops and saves what it has.
//
// Setup (once):   npm install --no-save playwright@1.57.0 && npx playwright install chromium
// Run:            node scripts/prospecting/find-no-website.mjs --q "dentist Sector 56 Gurugram" --max 25
//                 node scripts/prospecting/find-no-website.mjs --file scripts/prospecting/queries.gurugram.txt
// Upload to MIS:  XENDER_ADMIN_TOKEN=... node scripts/prospecting/find-no-website.mjs --file ... --upload
//                 (or upload the JSON later from /admin.html → Prospects → Import file)
//
// Output: prospects-out/prospects-<timestamp>.json and .csv (folder is git-ignored).

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { areaFromAddress, dedupe, parseArgs, parsePhone, parseRating, parseReviews, queriesFromText, toCsv } from "./maps-parse.mjs";

const HELP = `Find businesses with no website on Google Maps.

  --q "<query>"     search, e.g. "gym DLF Phase 3 Gurugram" (repeatable)
  --file <path>     queries, one per line (# comments allowed)
  --max <n>         listings to scan per query (default 25, max 60)
  --delay <ms>      base pause between pages (default 1800, min 800)
  --headless        hide the browser window (visible is safer and easier to watch)
  --upload          send results to the Xender MIS (needs XENDER_ADMIN_TOKEN env var)
  --site <url>      MIS site (default https://www.xendersecrets.com)
  --out <dir>       output folder (default prospects-out)`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms + Math.floor(Math.random() * ms * 0.6)));

async function loadPlaywright() {
  try { return (await import("playwright")).chromium; } catch {
    console.error("Playwright is not installed. Run:\n  npm install --no-save playwright@1.57.0 && npx playwright install chromium");
    process.exit(1);
  }
}

class Blocked extends Error {}
const checkBlocked = (page) => { if (/\/sorry\/|recaptcha/i.test(page.url())) throw new Blocked("Google showed a robot check — stopping. Try again later with fewer queries."); };

async function handleConsent(page) {
  if (!/consent\.google/.test(page.url())) return;
  const btn = page.getByRole("button", { name: /reject all/i }).first();
  if (await btn.count()) { await btn.click(); await page.waitForLoadState("domcontentloaded"); }
}

/** Scroll the results feed; return cards [{ name, href, hasWebsite }]. */
async function collectCards(page, max, delayMs) {
  const feed = page.locator('div[role="feed"]');
  try { await feed.waitFor({ timeout: 12000 }); } catch { return null; } // single-place result or nothing
  let last = -1, still = 0;
  for (let i = 0; i < 40; i++) {
    const n = await page.locator('div[role="feed"] a[href*="/maps/place/"]').count();
    if (n >= max) break;
    if (n === last) { if (++still >= 3) break; } else still = 0;
    last = n;
    if (await page.getByText(/reached the end of the list/i).count()) break;
    await feed.evaluate((el) => el.scrollBy(0, el.clientHeight * 0.9));
    await sleep(Math.round(delayMs * 0.6));
  }
  return page.$$eval('div[role="feed"] a[href*="/maps/place/"]', (links, limit) => links.slice(0, limit).map((a) => {
    const card = a.closest('div[role="article"]') || a.parentElement?.parentElement || a.parentElement;
    const site = card && card.querySelector('a[data-value="Website"], a[aria-label^="Website" i], a[aria-label*="website" i]');
    return { name: a.getAttribute("aria-label") || "", href: a.href, hasWebsite: Boolean(site) };
  }), max);
}

/** Read one place page. Returns null when it turns out to have a website. */
async function readPlace(page, query) {
  await page.locator("h1").first().waitFor({ timeout: 15000 });
  const data = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const website = q('a[data-item-id="authority"], a[aria-label^="Website:" i]');
    const phoneEl = q('button[data-item-id^="phone:tel:"], [data-item-id^="phone:"], button[aria-label^="Phone:" i]');
    const addrEl = q('button[data-item-id="address"], button[aria-label^="Address:" i]');
    const ratingBox = q("div.F7nice");
    const reviewsEl = ratingBox && ratingBox.querySelector('span[aria-label*="review" i]');
    const catEl = q('button[jsaction*="category"]') || q("button.DkEaL");
    return {
      name: (q("h1")?.textContent || "").trim(),
      website: website ? website.getAttribute("href") || "yes" : "",
      phoneItemId: phoneEl?.getAttribute("data-item-id") || "",
      phoneLabel: phoneEl?.getAttribute("aria-label") || "",
      address: (addrEl?.getAttribute("aria-label") || "").replace(/^Address:\s*/i, "").trim(),
      ratingText: ratingBox?.querySelector('span[aria-hidden="true"]')?.textContent || "",
      reviewsText: reviewsEl?.getAttribute("aria-label") || ratingBox?.textContent || "",
      category: (catEl?.textContent || "").trim(),
    };
  });
  if (data.website || !data.name) return null;
  return {
    name: data.name,
    category: data.category,
    area: areaFromAddress(data.address),
    address: data.address,
    phone: parsePhone({ itemId: data.phoneItemId, label: data.phoneLabel }),
    rating: parseRating(data.ratingText),
    reviews: parseReviews(data.reviewsText.replace(/^[\d.,]+\s*(?=\()/, "")),
    maps_url: page.url().split("?")[0],
    query,
  };
}

async function runQuery(page, query, opts) {
  const url = "https://www.google.com/maps/search/" + encodeURIComponent(query) + "?hl=en";
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await handleConsent(page);
  checkBlocked(page);
  await sleep(opts.delayMs);
  const cards = await collectCards(page, opts.max, opts.delayMs);
  if (cards === null) { // Maps jumped straight to one place
    const one = await readPlace(page, query).catch(() => null);
    return { scanned: 1, found: one ? [one] : [] };
  }
  const todo = cards.filter((c) => !c.hasWebsite);
  const found = [];
  for (const c of todo) {
    await page.goto(c.href.includes("hl=") ? c.href : c.href + (c.href.includes("?") ? "&" : "?") + "hl=en", { waitUntil: "domcontentloaded" });
    checkBlocked(page);
    const p = await readPlace(page, query).catch(() => null);
    if (p) { found.push(p); process.stdout.write(`   + ${p.name}${p.phone ? "  " + p.phone : "  (no phone)"}${p.rating ? "  " + p.rating + "★/" + (p.reviews ?? 0) : ""}\n`); }
    await sleep(opts.delayMs);
  }
  return { scanned: cards.length, withWebsite: cards.length - todo.length, found };
}

async function upload(rows, opts) {
  const token = (process.env.XENDER_ADMIN_TOKEN || "").trim();
  if (!token) { console.error("--upload needs XENDER_ADMIN_TOKEN in the environment (same value as the ADMIN_TOKEN secret)."); return; }
  const endpoint = opts.site.replace(/\/$/, "") + "/api/admin/prospects/import";
  for (let i = 0; i < rows.length; i += 200) {
    const res = await fetch(endpoint, { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify({ prospects: rows.slice(i, i + 200) }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.ok) { console.error(`Upload failed (${res.status}): ${body.error || "unknown error"}`); return; }
    console.log(`Uploaded: ${body.added} new, ${body.updated} refreshed${Object.keys(body.skipped || {}).length ? ", skipped " + JSON.stringify(body.skipped) : ""}`);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.file) opts.queries.push(...queriesFromText(await readFile(opts.file, "utf8")));
  if (opts.help || !opts.queries.length) { console.log(HELP); process.exit(opts.help ? 0 : 1); }

  const chromium = await loadPlaywright();
  const browser = await chromium.launch({ headless: opts.headless });
  const page = await (await browser.newContext({ locale: "en-IN", timezoneId: "Asia/Kolkata", viewport: { width: 1280, height: 900 } })).newPage();
  const all = [];
  let stopped = "";
  try {
    for (const q of opts.queries) {
      console.log(`\n▶ ${q}`);
      try {
        const r = await runQuery(page, q, opts);
        all.push(...r.found);
        console.log(`  scanned ${r.scanned}, ${r.withWebsite ?? 0} already have a website, ${r.found.length} without`);
      } catch (e) {
        if (e instanceof Blocked) { stopped = e.message; break; }
        console.error(`  skipped: ${String(e.message || e).split("\n")[0]}`);
      }
      await sleep(opts.delayMs * 2);
    }
  } finally {
    await browser.close();
  }

  const rows = dedupe(all);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  await mkdir(opts.out, { recursive: true });
  const base = join(opts.out, "prospects-" + stamp);
  await writeFile(base + ".json", JSON.stringify(rows, null, 2));
  await writeFile(base + ".csv", toCsv(rows));
  const withPhone = rows.filter((r) => r.phone).length;
  console.log(`\nSaved ${rows.length} businesses without a website (${withPhone} with a phone) → ${base}.json / .csv`);
  if (stopped) console.warn(stopped);
  if (opts.upload && rows.length) await upload(rows, opts);
}

main().catch((e) => { console.error(e); process.exit(1); });
