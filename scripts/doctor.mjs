#!/usr/bin/env node
// XEND-LOCAL-SETUP-001: read-only workstation check. `npm run doctor`
// Prints PASS / WARN / FAIL per item and exits 1 if anything FAILs. Never prints secret values,
// never contacts Cloudflare and never changes files.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const add = (level, name, detail) => results.push({ level, name, detail });
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", windowsHide: true });
  return { ok: !r.error && r.status === 0, out: `${r.stdout || ""}${r.stderr || ""}`.trim(), missing: r.error?.code === "ENOENT" };
};

// Node version must match CI (.nvmrc).
const want = fs.readFileSync(path.join(ROOT, ".nvmrc"), "utf8").trim();
const have = process.versions.node.split(".")[0];
if (have === want) add("PASS", "Node", `v${process.versions.node} matches .nvmrc (${want})`);
else add("FAIL", "Node", `v${process.versions.node}; CI uses ${want}. Windows: \`fnm use\` (or \`nvm use ${want}\` with nvm-windows)`);

// Line endings: tests and generators compare bytes, so the working tree must be LF.
const sample = ["public/index.html", "src/index.js", "package.json"].map((f) => path.join(ROOT, f));
const crlf = sample.filter((f) => fs.existsSync(f) && fs.readFileSync(f, "utf8").includes("\r\n"));
if (!fs.existsSync(path.join(ROOT, ".gitattributes"))) add("FAIL", "Line endings", ".gitattributes missing (eol=lf rules)");
else if (crlf.length) add("FAIL", "Line endings", `CRLF in ${crlf.map((f) => path.relative(ROOT, f)).join(", ")}. Commit/stash work, then: git rm --cached -r -q . && git reset --hard`);
else add("PASS", "Line endings", "working tree is LF");

// Dependencies.
const pkg = (name) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules", name, "package.json"), "utf8")).version; } catch { return null; } };
const wv = pkg("wrangler");
add(wv ? "PASS" : "FAIL", "wrangler", wv ? `v${wv} (local, via npm scripts)` : "not installed: npm ci");
const pv = pkg("playwright");
const pinned = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).devDependencies?.playwright;
if (!pv) add("FAIL", "Playwright", "not installed: npm ci");
else if (pinned && pv !== pinned) add("FAIL", "Playwright", `v${pv} installed, package.json pins ${pinned}: npm ci`);
else {
  try {
    const { chromium } = await import("playwright");
    const exe = chromium.executablePath();
    if (fs.existsSync(exe)) add("PASS", "Playwright", `v${pv}, Chromium present`);
    else add("FAIL", "Playwright", `v${pv}, Chromium missing: npm run setup:browsers`);
  } catch (e) { add("FAIL", "Playwright", `cannot load: ${e.message.split("\n")[0]}`); }
}

// Tooling (optional but used by the workflow in Issue #43).
const git = run("git", ["--version"]);
add(git.ok ? "PASS" : "FAIL", "git", git.ok ? git.out : "not on PATH");
const gh = run("gh", ["auth", "status"]);
if (gh.missing) add("WARN", "GitHub CLI", "gh not on PATH (winget install GitHub.cli)");
else add(gh.ok ? "PASS" : "WARN", "GitHub CLI", gh.ok ? "authenticated" : "not authenticated: gh auth login (interactive; never paste tokens)");

// Local Worker secrets: optional; names only.
const devVars = path.join(ROOT, ".dev.vars");
if (fs.existsSync(devVars)) {
  const names = fs.readFileSync(devVars, "utf8").split(/\r?\n/).map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=/)?.[1]).filter(Boolean);
  add("PASS", ".dev.vars", `defines ${names.length} name(s): ${names.join(", ") || "none"}`);
} else add("WARN", ".dev.vars", "absent: optional. `npm run dev` works without it; copy .dev.vars.example to test admin routes locally");

const width = Math.max(...results.map((r) => r.name.length));
for (const r of results) console.log(`${r.level.padEnd(4)}  ${r.name.padEnd(width)}  ${r.detail}`);
const fails = results.filter((r) => r.level === "FAIL").length;
console.log(fails ? `\n${fails} problem(s) to fix.` : "\nWorkstation looks ready. Next: npm run verify:local");
process.exitCode = fails ? 1 : 0;
