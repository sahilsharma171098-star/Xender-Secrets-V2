#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { reviewHtml } from "./lib/site-quality.mjs";
import { freeCheckMessage } from "./lib/free-check-message.mjs";

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const files = args.filter((a, i) => !a.startsWith("--") && !["--name", "--site"].includes(args[i - 1]));

if (!args.length || args.includes("--help") || args.includes("-h")) {
  console.log([
    "Xender Site Quality Reviewer",
    "",
    "Usage:",
    "  node scripts/review-site-html.mjs <saved-page.html>",
    "  node scripts/review-site-html.mjs <saved-page.html> --message [--name \"Dr Mehta\"] [--site mehtadental.in] [--no-preview]",
    "",
    "Reviews a locally saved HTML file. Default output is the JSON score + issues.",
    "--message prints a client-ready free-check message instead (review it before sending).",
    "It never sends messages or modifies sites."
  ].join("\n"));
  process.exit(args.length ? 0 : 1);
}

if (files.length !== 1) {
  console.error("Provide exactly one local HTML file.");
  process.exit(1);
}

try {
  const html = await readFile(files[0], "utf8");
  const result = reviewHtml(html);
  if (args.includes("--message")) {
    const out = freeCheckMessage(result, { name: flag("--name") || "", site: flag("--site") || "", preview: !args.includes("--no-preview") });
    console.log(out.message);
    console.error(`\n[internal] score ${result.score}/100 · recommendation: ${out.recommendation}${out.unknownCodes.length ? " · unmapped: " + out.unknownCodes.join(",") : ""}`);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
