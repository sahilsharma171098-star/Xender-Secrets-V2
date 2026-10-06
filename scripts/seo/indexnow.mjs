#!/usr/bin/env node
// XEND-SEO-TRAFFIC-001 — tell IndexNow search engines (Bing, Yandex, Seznam, Naver…) which
// sitemap URLs exist, so new commercial pages are discovered without waiting for a crawl.
// Free, no account, no secret: the key is public by design and proven by public/<key>.txt.
// Google does not use IndexNow; Google discovery = sitemap in Search Console + internal links.
//
// Usage:
//   node scripts/seo/indexnow.mjs --dry-run            # print what would be sent
//   node scripts/seo/indexnow.mjs                      # verify live key file, then submit all sitemap URLs
//   node scripts/seo/indexnow.mjs --only /website-development-gurugram,/services
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUBLIC = path.join(ROOT, "public");
const HOST = "www.xendersecrets.com";
const SITE = "https://" + HOST;
const ENDPOINT = "https://api.indexnow.org/indexnow";

export function findKey(dir = PUBLIC) {
  const files = fs.readdirSync(dir).filter((f) => /^[a-f0-9]{32}\.txt$/.test(f));
  if (files.length !== 1) throw new Error(`expected exactly one IndexNow key file in public/, found ${files.length}`);
  const key = files[0].slice(0, -4);
  if (fs.readFileSync(path.join(dir, files[0]), "utf8").trim() !== key) throw new Error("key file content must equal its name");
  return key;
}

export function sitemapUrls(dir = PUBLIC) {
  return [...fs.readFileSync(path.join(dir, "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

export function buildPayload({ key, urls }) {
  const urlList = urls.filter((u) => u.startsWith(SITE + "/"));
  if (!urlList.length) throw new Error("no URLs to submit");
  return { host: HOST, key, keyLocation: `${SITE}/${key}.txt`, urlList: urlList.slice(0, 10000) };
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry-run");
  const onlyIdx = args.indexOf("--only");
  const key = findKey();
  let urls = sitemapUrls();
  if (onlyIdx >= 0) {
    const only = new Set(args[onlyIdx + 1].split(",").map((p) => SITE + (p === "/" ? "/" : p.replace(/\/$/, ""))));
    urls = urls.filter((u) => only.has(u));
  }
  const payload = buildPayload({ key, urls });
  if (dry) { console.log(JSON.stringify(payload, null, 2)); return; }

  // Never submit until production serves the key — otherwise engines reject (403) and may
  // treat the host as unverified. Retries cover the Cloudflare deploy that follows a merge.
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(payload.keyLocation, { cache: "no-store" }).catch((e) => ({ ok: false, status: e.message }));
    const body = r.ok ? (await r.text()).trim() : "";
    if (body === key) break;
    if (attempt >= 10) throw new Error(`live key file not served yet (${r.status}); aborting without submitting`);
    console.log(`key file not live yet (${r.status}); retry ${attempt}/10 in 30s`);
    await new Promise((res) => setTimeout(res, 30000));
  }
  const res = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify(payload) });
  const text = await res.text().catch(() => "");
  console.log(`IndexNow: HTTP ${res.status} for ${payload.urlList.length} URLs ${text ? "— " + text.slice(0, 200) : ""}`);
  // 200 = accepted, 202 = accepted / key validation pending. Anything else is a real failure.
  if (![200, 202].includes(res.status)) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
