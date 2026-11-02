#!/usr/bin/env node
// Static checks for Xender SiteCheck (no dependencies):
// - every shipped JS file parses;
// - policy rules: no eval/new Function/HTML injection or remote code;
//   only popup.js may send the voluntary Pro license key to our own API;
// - manifests: MV3, least-privilege access to the Xender license endpoint;
// - store copy fits each store's length limits;
// - privacy policy and permission docs mention every permission the manifest requests.
// Usage: node scripts/extension/lint.mjs
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { manifestFor, sourceFiles } from "./build.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "extension");
const SRC = path.join(ROOT, "src");
const problems = [];
const fail = (file, msg) => problems.push(`${file}: ${msg}`);

// 1. Syntax
for (const f of sourceFiles().filter((f) => f.endsWith(".js"))) {
  const code = fs.readFileSync(path.join(SRC, f), "utf8");
  if (f === "audit.js") {
    try { new vm.Script(code, { filename: f }); } catch (e) { fail(f, "syntax error: " + e.message); }
  } else {
    const r = spawnSync(process.execPath, ["--check", path.join(SRC, f)], { encoding: "utf8" });
    if (r.error) fail(f, "could not run node --check: " + r.error.message);
    else if (r.status !== 0) fail(f, "syntax error: " + (r.stderr || "").split("\n").slice(0, 4).join(" "));
  }
}

// 2. Policy rules on shipped code
const BANNED = [
  [/\beval\s*\(/, "eval()"],
  [/\bnew\s+Function\s*\(/, "new Function()"],
  [/\bset(?:Timeout|Interval)\s*\(\s*["'`]/, "string timers"],
  [/\.(?:innerHTML|outerHTML)\s*=/, "HTML string injection (innerHTML/outerHTML)"],
  [/insertAdjacentHTML|document\.write/, "HTML string injection"],
  [/XMLHttpRequest|sendBeacon|new\s+WebSocket|EventSource\s*\(/, "unexpected network request API"],
  [/\b(?:localStorage|sessionStorage|indexedDB)\b/, "unexpected storage API"],
  [/document\.cookie|\.cookies\./, "cookie access"],
  [/importScripts|\bimport\s*\(\s*["'`]https?:/, "remote code loading"],

];
for (const f of sourceFiles().filter((f) => /\.(js|html)$/.test(f))) {
  const code = fs.readFileSync(path.join(SRC, f), "utf8").replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
  for (const [re, what] of BANNED) if (re.test(code)) fail(f, "banned: " + what);
  // The only allowed fetch is voluntary license validation, not page auditing.
  if (f !== "popup.js" && /\bfetch\s*\(|\.storage\.(?:local|sync|session)|\.value\b(?!s)/.test(code)) fail(f,"unexpected network/storage/form access");
  if (f === "popup.js") {
    if ((code.match(/\bfetch\s*\(/g)||[]).length!==1 || !code.includes("fetch(LICENSE_API")) fail(f,"only the fixed SiteCheck license API may be fetched");
    if (!code.includes('https://www.xendersecrets.com/api/sitecheck/license/verify')) fail(f,"license API host mismatch");
    if (/\.storage\.(?:sync|session)/.test(code)) fail(f,"license key must remain in local storage only");
  }

  for (const m of code.matchAll(/https?:\/\/[^\s"'`)<>]+/g)) {
    const u = m[0];
    if (/^https:\/\/www\.xendersecrets\.com\//.test(u) || /^http:\/\/www\.w3\.org\//.test(u)) continue;
    if (f === "audit.js" || f === "lib/restricted.js") continue; // URL patterns used for detection, never fetched
    fail(f, "unexpected URL " + u);
  }
  if (f.endsWith(".html") && /<script[^>]+src=["'](?:https?:)?\/\//i.test(code)) fail(f, "remote <script>");
  if (f.endsWith(".html") && /\son[a-z]+\s*=/i.test(code)) fail(f, "inline event handler (blocked by extension CSP)");
  if (f.endsWith(".html") && /<script(?![^>]*\bsrc=)[^>]*>/i.test(code)) fail(f, "inline <script> (blocked by extension CSP)");
}

// 3. Manifests
const ALLOWED = ["activeTab", "scripting", "storage"];
for (const t of ["chrome", "edge", "firefox"]) {
  const m = manifestFor(t);
  if (m.manifest_version !== 3) fail(t, "manifest_version must be 3");
  if (JSON.stringify(m.permissions) !== JSON.stringify(ALLOWED)) fail(t, "permissions must be exactly " + ALLOWED.join(", "));
  if (JSON.stringify(m.host_permissions) !== JSON.stringify(["https://www.xendersecrets.com/*"])) fail(t,"host permission must cover only Xender licensing");
  for (const k of ["optional_permissions", "optional_host_permissions", "content_scripts", "background", "web_accessible_resources", "externally_connectable", "content_security_policy", "update_url", "key"]) {
    if (m[k] !== undefined) fail(t, `"${k}" is not allowed`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(m.version)) fail(t, "version must be MAJOR.MINOR.PATCH");
  if (m.name.length > 45) fail(t, "name over 45 chars");
  if (m.description.length > 132) fail(t, `description is ${m.description.length} chars (Chrome limit 132)`);
  for (const rel of Object.values(m.icons).concat(Object.values(m.action.default_icon))) if (!fs.existsSync(path.join(SRC, rel))) fail(t, "missing icon " + rel);
  if (!fs.existsSync(path.join(SRC, m.action.default_popup))) fail(t, "missing popup");
}
const ff = manifestFor("firefox").browser_specific_settings?.gecko;
if (!ff?.id || JSON.stringify(ff.data_collection_permissions) !== JSON.stringify({ required: ["none"], optional:["authenticationInfo"] })) fail("firefox", "declare optional authenticationInfo for Pro license verification");

// 4. Store copy limits. Each listing marks fields as <!-- field:NAME max:N --> … <!-- /field -->.
const STORE = path.join(ROOT, "store");
for (const f of fs.readdirSync(STORE).filter((f) => f.endsWith("-listing.md"))) {
  const text = fs.readFileSync(path.join(STORE, f), "utf8");
  const fields = [...text.matchAll(/<!-- field:([\w-]+) max:(\d+) -->\n([\s\S]*?)\n<!-- \/field -->/g)];
  if (!fields.length) fail(f, "no length-checked fields found");
  for (const [, name, max, body] of fields) {
    const len = [...body.trim()].length;
    if (len > Number(max)) fail(f, `${name} is ${len} chars (max ${max})`);
  }
  if (/\b(best|#1|number one|guaranteed|100%|certified|official google)\b/i.test(text.replace(/<!--[\s\S]*?-->/g, ""))) fail(f, "superlative or unverifiable claim");
}

// 4b. Every listing's long description matches the single source, and "N checks" claims are true.
const LONG = fs.readFileSync(path.join(STORE, "long-description.txt"), "utf8").trim();
const { CHECKS } = await import("../../extension/src/lib/checks.js");
for (const f of fs.readdirSync(STORE).filter((f) => f.endsWith("-listing.md"))) {
  const m = /<!-- field:description max:\d+ -->\n([\s\S]*?)\n<!-- \/field -->/.exec(fs.readFileSync(path.join(STORE, f), "utf8"));
  if (!m || m[1].trim() !== LONG) fail(f, "description differs from store/long-description.txt — regenerate the listing");
}
for (const f of [path.join(STORE, "long-description.txt"), path.join(ROOT, "store", "changelog.md"), path.join(ROOT, "docs", "SCORING.md"), path.join(ROOT, "..", "scripts", "commercial", "pages.mjs")]) {
  for (const m of fs.readFileSync(f, "utf8").matchAll(/\b(\d+) (?:local )?checks\b/g)) if (Number(m[1]) !== CHECKS.length) fail(path.basename(f), `claims ${m[1]} checks; there are ${CHECKS.length}`);
}

// 5. Docs cover every permission
for (const doc of ["store/privacy-policy.md", "store/permission-justification.md", "store/reviewer-notes.md"]) {
  const text = fs.readFileSync(path.join(ROOT, doc), "utf8");
  for (const p of ALLOWED) if (!text.includes(p)) fail(doc, "does not mention permission " + p);
}

if (problems.length) {
  console.error("Extension lint failed:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`Extension lint passed (${sourceFiles().length} source files, 3 manifests, store copy, permission docs).`);
