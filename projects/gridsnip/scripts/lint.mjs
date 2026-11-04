#!/usr/bin/env node
// GridSnip store-policy lint: exact permissions, no remote code, no HTML injection, no blocking
// dialogs, network only to Google's Gemini API, and store copy that matches what the code does.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, sourceFiles, manifest } from "./build.mjs";

const SRC = path.join(ROOT, "src");
const problems = [];
const fail = (file, msg) => problems.push(`${file}: ${msg}`);

const m = manifest();
const PERMS = ["activeTab", "storage", "clipboardWrite"];
const HOSTS = ["https://generativelanguage.googleapis.com/*"];
if (m.manifest_version !== 3) fail("manifest", "must be MV3");
if (JSON.stringify(m.permissions) !== JSON.stringify(PERMS)) fail("manifest", "permissions must be exactly " + PERMS.join(", "));
if (JSON.stringify(m.host_permissions) !== JSON.stringify(HOSTS)) fail("manifest", "host permission must be only the Gemini API");
for (const k of ["optional_permissions", "optional_host_permissions", "content_scripts", "web_accessible_resources", "externally_connectable", "content_security_policy", "update_url", "key"]) if (m[k] !== undefined) fail("manifest", k + " must not be set");
if ([...m.name].length > 75) fail("manifest", "name over 75 characters");
if ([...m.description].length > 132) fail("manifest", "description over 132 characters");
for (const size of ["16", "32", "48", "128"]) if (!fs.existsSync(path.join(SRC, m.icons[size] || "missing"))) fail("manifest", "icon " + size + " missing");

const BANNED = [
  [/\beval\s*\(/, "eval()"], [/\bnew\s+Function\s*\(/, "new Function()"], [/\bset(?:Timeout|Interval)\s*\(\s*["'`]/, "string timers"],
  [/\.(?:innerHTML|outerHTML)\s*=/, "HTML string injection"], [/insertAdjacentHTML|document\.write\s*\(/, "HTML string injection"],
  [/\b(?:alert|confirm|prompt)\s*\(/, "blocking dialog (alert/confirm/prompt)"],
  [/XMLHttpRequest|sendBeacon|new\s+WebSocket|EventSource\s*\(/, "unexpected network API"],
  [/\b(?:localStorage|sessionStorage|indexedDB)\b/, "web storage (use chrome.storage)"],
  [/\.storage\.sync\b/, "sync storage (keys stay on this device)"],
  [/importScripts|\bimport\s*\(\s*["'`]https?:/, "remote code"],
  [/\bchrome\.scripting\b|\bexecuteScript\b/, "page script injection (not needed)"],
];
const ALLOWED_URL = /^(https:\/\/generativelanguage\.googleapis\.com\b|https:\/\/aistudio\.google\.com\/apikey$|https:\/\/www\.xendersecrets\.com\/gridsnip-privacy$|http:\/\/www\.w3\.org\/)/;
for (const f of sourceFiles().filter((f) => /\.(js|html)$/.test(f))) {
  const raw = fs.readFileSync(path.join(SRC, f), "utf8");
  const code = raw.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
  for (const [re, what] of BANNED) if (re.test(code)) fail(f, "banned: " + what);
  if (f !== "lib/gemini.js" && /\bfetch\s*\(/.test(code.replace(/fetchImpl\s*=\s*fetch/g, ""))) fail(f, "fetch() only allowed in lib/gemini.js");
  for (const u of raw.matchAll(/https?:\/\/[^\s"'`)<>]+/g)) if (!ALLOWED_URL.test(u[0].replace(/[.,;]$/, ""))) fail(f, "unexpected URL " + u[0]);
  if (f.endsWith(".html") && /<script(?![^>]*\bsrc=)[^>]*>/i.test(raw)) fail(f, "inline <script>");
  if (f.endsWith(".html") && /\son[a-z]+\s*=/i.test(raw)) fail(f, "inline event handler");
}
for (const f of sourceFiles().filter((f) => f.endsWith(".js"))) {
  const r = spawnSync(process.execPath, ["--check", path.join(SRC, f)], { encoding: "utf8" });
  if (r.status !== 0) fail(f, "syntax error: " + (r.stderr || "").split("\n").slice(0, 3).join(" "));
}

// Store copy must not promise what the code doesn't do.
const STORE = path.join(ROOT, "store");
const listing = fs.readFileSync(path.join(STORE, "listing.md"), "utf8");
for (const [re, what] of [[/\bpro\b|unlimited|\$\s?\d|₹\s?\d|lifetime|per day|\/day|free snips/i, "paid tier or quota that does not exist"], [/locked|protected pdf|bypass/i, "implies bypassing protection"], [/\b(best|#1|number one|guaranteed|100%|official google)\b/i, "superlative or unverifiable claim"]]) {
  if (re.test(listing.replace(/<!--[\s\S]*?-->/g, ""))) fail("store/listing.md", what);
}
for (const [, name, max, body] of listing.matchAll(/<!-- field:([\w-]+) max:(\d+) -->\n([\s\S]*?)\n<!-- \/field -->/g)) {
  if ([...body.trim()].length > Number(max)) fail("store/listing.md", `${name} is ${[...body.trim()].length} chars (max ${max})`);
}
const policy = fs.readFileSync(path.join(STORE, "privacy-policy.md"), "utf8");
for (const p of [...PERMS, "generativelanguage.googleapis.com"]) if (!policy.includes(p)) fail("store/privacy-policy.md", "does not mention " + p);
const justification = fs.readFileSync(path.join(STORE, "permission-justification.md"), "utf8");
for (const p of [...PERMS, "generativelanguage.googleapis.com"]) if (!justification.includes(p)) fail("store/permission-justification.md", "does not justify " + p);

if (problems.length) { console.error("GridSnip lint failed:\n- " + problems.join("\n- ")); process.exit(1); }
console.log(`GridSnip lint passed (${sourceFiles().length} source files, manifest, store copy).`);
