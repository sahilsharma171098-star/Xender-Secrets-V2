#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { reviewHtml } from "./lib/site-quality.mjs";

const args = process.argv.slice(2);

if (!args.length || args.includes("--help") || args.includes("-h")) {
  console.log([
    "Xender Site Quality Reviewer",
    "",
    "Usage:",
    "  node scripts/review-site-html.mjs <saved-page.html>",
    "",
    "The command reviews a locally saved HTML file and prints a deterministic",
    "quality score plus concrete issues. It does not send messages or modify sites."
  ].join("\n"));
  process.exit(args.length ? 0 : 1);
}

if (args.length !== 1 || args[0].startsWith("--")) {
  console.error("Provide exactly one local HTML file.");
  process.exit(1);
}

try {
  const html = await readFile(args[0], "utf8");
  const result = reviewHtml(html);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
