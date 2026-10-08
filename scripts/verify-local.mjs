#!/usr/bin/env node
// XEND-LOCAL-SETUP-001: run every offline suite in sequence and print one summary table.
// `npm run verify:local`. Nothing here touches production: the Worker test runs a local wrangler
// dev with tests/worker/wrangler.test.jsonc (no AI binding, no secrets, local Durable Objects).
// Pass --only=test,check:pages to run a subset.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ALL = ["test", "check:novels", "check:pages", "extension:lint", "extension:test", "test:worker"];
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",").filter(Boolean);
const suites = only?.length ? ALL.filter((s) => only.includes(s)) : ALL;

// Spawn npm through node + npm-cli.js: works on Windows without shell:true (npm is npm.cmd there).
const npmCli = process.env.npm_execpath;
const npm = (args) => (npmCli && /\.c?js$/.test(npmCli)
  ? spawnSync(process.execPath, [npmCli, ...args], { cwd: ROOT, encoding: "utf8", windowsHide: true, maxBuffer: 64 << 20 })
  : spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", args, { cwd: ROOT, encoding: "utf8", windowsHide: true, shell: process.platform === "win32", maxBuffer: 64 << 20 }));

const rows = [];
for (const s of suites) {
  const t0 = Date.now();
  process.stdout.write(`… ${s}\n`);
  const r = npm(["run", "-s", s]);
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const counts = { tests: 0, pass: 0, fail: 0 };
  for (const m of out.matchAll(/^# (tests|pass|fail) (\d+)/gm)) counts[m[1]] += Number(m[2]);
  const ok = r.status === 0;
  rows.push({ s, ok, secs: ((Date.now() - t0) / 1000).toFixed(1), counts });
  if (!ok) {
    const failed = [...out.matchAll(/^\s*not ok \d+ - (.+)$/gm)].map((m) => m[1]);
    console.log(failed.length ? failed.map((f) => `   ✗ ${f}`).join("\n") : out.split(/\r?\n/).slice(-15).join("\n"));
  }
}

console.log(`\nNode ${process.version} · ${process.platform}/${process.arch}`);
for (const r of rows) {
  const c = r.counts.tests ? `${r.counts.pass}/${r.counts.tests} pass` : "";
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.s.padEnd(15)} ${c.padEnd(14)} ${r.secs}s`);
}
process.exitCode = rows.every((r) => r.ok) ? 0 : 1;
