#!/usr/bin/env node
// Builds GridSnip for Chrome from projects/gridsnip/{manifest.json,src}.
//   node projects/gridsnip/scripts/build.mjs            → projects/gridsnip/dist/chrome/
//   node projects/gridsnip/scripts/build.mjs --package  → also dist/gridsnip-<version>.zip (byte-identical for same input)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zip } from "../../../scripts/extension/zip.mjs";
import { isMain } from "../../../scripts/lib/is-main.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");

/** Shipped files, relative to src/. Anything else (tests, assets, store copy) is never packaged. */
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

export const manifest = () => JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));

export function build({ pack = false, log = console.log } = {}) {
  const dir = path.join(DIST, "chrome");
  fs.rmSync(dir, { recursive: true, force: true });
  const m = manifest();
  const entries = [{ name: "manifest.json", data: Buffer.from(JSON.stringify(m, null, 2) + "\n") }];
  for (const f of sourceFiles()) entries.push({ name: f, data: fs.readFileSync(path.join(SRC, f)) });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, e.data);
  }
  const out = { dir, manifest: m, files: entries.map((e) => e.name) };
  if (pack) {
    out.zip = path.join(DIST, `gridsnip-${m.version}.zip`);
    fs.writeFileSync(out.zip, zip(entries));
    log(`wrote ${path.relative(process.cwd(), out.zip)} (${entries.length} files)`);
  }
  return out;
}

if (isMain(import.meta.url)) build({ pack: process.argv.includes("--package") });
