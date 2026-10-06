#!/usr/bin/env node
// Renders extension/assets/icon*.svg to the PNG icon set in extension/src/icons (committed).
// Dev-only: needs Playwright (npm install --no-save playwright). 16/32px use the simplified mark.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "extension");
const svg = (f) => fs.readFileSync(path.join(ROOT, "assets", f), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
for (const size of [16, 32, 48, 64, 128]) {
  const mark = size <= 32 ? svg("icon-small.svg") : svg("icon.svg");
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${mark}`);
  await page.screenshot({ path: path.join(ROOT, "src", "icons", `icon-${size}.png`), omitBackground: true });
  console.log(`icon-${size}.png`);
}
await browser.close();
