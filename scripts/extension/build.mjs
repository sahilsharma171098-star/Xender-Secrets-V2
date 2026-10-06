#!/usr/bin/env node
// Builds Xender SiteCheck for each browser from the shared source in extension/src.
//   node scripts/extension/build.mjs            → extension/dist/{chrome,edge,firefox}/
//   node scripts/extension/build.mjs --package  → also extension/dist/xender-sitecheck-{chrome,edge,firefox}.zip
// Chrome and Edge get the same Chromium MV3 manifest; Firefox adds browser_specific_settings.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { zip } from "./zip.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "extension");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");
const TARGETS = { chrome: "chromium", edge: "chromium", firefox: "firefox" };

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
function merge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = isObj(v) && isObj(a[k]) ? merge(a[k], v) : v;
  return out;
}

/** Files shipped in every package (relative to extension/src). Anything else in src is not shipped. */
export function sourceFiles() {
  const files = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(html|css|js|png)$/.test(entry.name)) files.push(path.relative(SRC, full).split(path.sep).join("/"));
    }
  })(SRC);
  return files.sort();
}

export function manifestFor(target) {
  const base = readJson(path.join(ROOT, "manifest", "base.json"));
  return merge(base, readJson(path.join(ROOT, "manifest", TARGETS[target] + ".json")));
}

export function build({ pack = false, targets = Object.keys(TARGETS), log = console.log } = {}) {
  const out = {};
  const files = sourceFiles();
  for (const target of targets) {
    const dir = path.join(DIST, target);
    fs.rmSync(dir, { recursive: true, force: true });
    const manifest = manifestFor(target);
    const entries = [{ name: "manifest.json", data: Buffer.from(JSON.stringify(manifest, null, 2) + "\n") }];
    for (const f of files) entries.push({ name: f, data: fs.readFileSync(path.join(SRC, f)) });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, e.data);
    }
    out[target] = { dir, manifest, files: entries.map((e) => e.name) };
    if (pack) {
      const buf = zip(entries);
      const zipPath = path.join(DIST, `xender-sitecheck-${target}.zip`);
      fs.writeFileSync(zipPath, buf);
      const sha = crypto.createHash("sha256").update(buf).digest("hex");
      out[target].zip = zipPath;
      out[target].sha256 = sha;
      log(`${path.relative(process.cwd(), zipPath)}  v${manifest.version}  ${(buf.length / 1024).toFixed(1)} KB  sha256 ${sha}`);
    } else log(`built ${path.relative(process.cwd(), dir)} (${entries.length} files)`);
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build({ pack: process.argv.includes("--package") });
}
