#!/usr/bin/env node
// XEND-AGENT-REACH-001: single read-only social search via OpenCLI (Agent-Reach upstream tool).
// No automated sending, following, auth, scraping loops or CRM import.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUTPUT_DIR = join("prospects-out", "agent-reach"); // gitignored
const VALID_PLATFORMS = new Set(["facebook", "instagram"]);

export function parseResearchArgs(args) {
  const opts = { platform: "", query: "", help: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") opts.help = true;
    else if (arg === "--platform" || arg === "--query") {
      if (i + 1 >= args.length) throw new Error("Missing value for " + arg);
      opts[arg.slice(2)] = args[++i];
    } else if (arg.startsWith("--platform=")) opts.platform = arg.slice(11);
    else if (arg.startsWith("--query=")) opts.query = arg.slice(8);
    else throw new Error("Unknown option: " + arg);
  }
  if (!opts.help) {
    if (!VALID_PLATFORMS.has(opts.platform)) throw new Error("Supported platforms: facebook, instagram");
    if (!opts.query.trim() || opts.query.length > 160) throw new Error("Query must contain 1-160 characters");
    if (/[\r\n\0]/.test(opts.query)) throw new Error("Query must be a single line");
  }
  return opts;
}

export function safeSlug(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 44) || "query";
}

export function cliArguments(opts) {
  if (!VALID_PLATFORMS.has(opts.platform)) throw new Error("Invalid platform");
  return [opts.platform, "search", opts.query, "-f", "yaml"];
}

export async function runReadOnlySearch(opts) {
  return new Promise((accept, reject) => {
    const command = "opencli";
    const child = spawn(command, cliArguments(opts), { shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let text = "";
    let err = "";
    let tooLarge = false;
    const timeout = setTimeout(() => { tooLarge = true; child.kill(); }, 45000);
    child.stdout.on("data", (buf) => {
      text += buf.toString("utf8");
      if (Buffer.byteLength(text) > 1024 * 1024) { tooLarge = true; child.kill(); }
    });
    child.stderr.on("data", (buf) => {
      // Do not persist CLI stderr; it may include session/environment diagnostics.
      err = (err + buf.toString("utf8")).slice(-800);
    });
    child.on("error", (e) => { clearTimeout(timeout); reject(new Error(e.code === "ENOENT" ? "OpenCLI missing. Follow docs/AGENT_REACH_XENDER.md to enable the approved desktop channel." : "Unable to launch OpenCLI: " + e.message)); });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (tooLarge) return reject(new Error("Read-only query exceeded 45 seconds or 1MB of output; no file saved."));
      if (code !== 0) return reject(new Error("OpenCLI query failed with code " + code + ". Check Chrome extension/login with opencli doctor; no automatic retries."));
      if (!text.trim()) return reject(new Error("No search output returned; no file saved."));
      accept(text);
    });
  });
}

async function main() {
  const opts = parseResearchArgs(process.argv.slice(2));
  if (opts.help) {
    console.log('Usage: node scripts/prospecting/agent-reach-research.mjs --platform facebook|instagram --query "Toronto dental clinic"');
    console.log("Read-only; saves raw YAML locally (not verified CRM leads).");
    return;
  }
  const output = await runReadOnlySearch(opts);
  await mkdir(OUTPUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = stamp + "-" + opts.platform + "-" + safeSlug(opts.query);
  const rawPath = join(OUTPUT_DIR, base + ".yaml");
  const metaPath = join(OUTPUT_DIR, base + ".json");
  await writeFile(rawPath, output, { encoding: "utf8", flag: "wx" });
  await writeFile(metaPath, JSON.stringify({
    platform: opts.platform,
    query: opts.query,
    source_tool: "opencli",
    retrieved_at: new Date().toISOString(),
    raw_file: rawPath,
    verified: false,
    eligible_for_outreach: false,
    note: "Read-only candidate research. Human-check public business identity, evidence, relevance and consent/opt-out before any outreach."
  }, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
  console.log("Saved unverified read-only results: " + rawPath);
  console.log("Research metadata: " + metaPath);
  console.log("Next: manually verify public business facts before importing into private MIS.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exitCode = 1; });
}
