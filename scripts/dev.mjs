#!/usr/bin/env node
// XEND-LOCAL-SETUP-001: offline local Worker for development. `npm run dev [-- extra wrangler args]`
//
// Uses tests/worker/wrangler.test.jsonc (production config minus the remote-only AI binding,
// previews and secrets; tests/worker fails if it drifts from wrangler.jsonc), so it needs no
// Cloudflare login, makes no remote calls and cannot touch production data. Durable Objects are
// local SQLite under .wrangler/state. Translation falls back to the non-AI path.
//
// Wrangler resolves .dev.vars relative to the config file, so the repo-root .dev.vars would be
// ignored; pass it explicitly (absolute path) when present.
// `npm run dev:remote-ai` runs the production config instead: it needs `wrangler login` and its
// AI calls use the real account's Workers AI allowance.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = [
  path.join(ROOT, "node_modules", "wrangler", "bin", "wrangler.js"), "dev",
  "-c", path.join(ROOT, "tests", "worker", "wrangler.test.jsonc"),
  "--persist-to", path.join(ROOT, ".wrangler", "state"),
];
const userArgs = process.argv.slice(2);
if (!userArgs.includes("--port")) args.push("--port", "8787");
const devVars = path.join(ROOT, ".dev.vars");
if (fs.existsSync(devVars)) args.push("--env-file", devVars);
else console.log("No .dev.vars: admin routes return 503 locally (copy .dev.vars.example to enable them).");

const child = spawn(process.execPath, [...args, ...userArgs], {
  cwd: ROOT, stdio: "inherit", windowsHide: true,
  env: { ...process.env, WRANGLER_SEND_METRICS: process.env.WRANGLER_SEND_METRICS ?? "false" },
});
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
