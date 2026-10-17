import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { zip } from "./archive.mjs";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const version = JSON.parse(await fs.readFile(path.join(root, "src/manifest.json"), "utf8")).version;
const dist = path.join(root, "dist");
const dest = path.join(dist, "firefox");
await fs.mkdir(dist, { recursive: true });
await fs.rm(dest, { recursive: true, force: true });
await fs.cp(path.join(root, "src"), dest, { recursive: true });
const vendor = path.join(dest, "vendor");
await fs.mkdir(path.join(vendor, "pdfjs"), { recursive: true });
const pdfLib = path.dirname(require.resolve("pdf-lib/package.json"));
const pdfjs = path.dirname(require.resolve("pdfjs-dist/package.json"));
await fs.copyFile(path.join(pdfLib, "dist/pdf-lib.js"), path.join(vendor, "pdf-lib.js"));
await fs.copyFile(path.join(pdfLib, "LICENSE.md"), path.join(vendor, "PDF-LIB-LICENSE.md"));
for (const file of ["pdf.mjs", "pdf.worker.mjs"]) await fs.copyFile(path.join(pdfjs, "legacy/build", file), path.join(vendor, "pdfjs", file));
for (const dir of ["cmaps", "standard_fonts", "wasm"]) await fs.cp(path.join(pdfjs, dir), path.join(vendor, "pdfjs", dir), { recursive: true });
// PDF JavaScript scripting is not a feature of this add-on. Do not ship its VM.
for (const file of ["quickjs-eval.js", "quickjs-eval.wasm"]) await fs.rm(path.join(vendor, "pdfjs", "wasm", file));
await fs.copyFile(path.join(pdfjs, "LICENSE"), path.join(vendor, "pdfjs", "LICENSE"));
await fs.copyFile(path.join(root, "LICENSE.txt"), path.join(dest, "LICENSE.txt"));
await fs.copyFile(path.join(root, "store/reviewer-notes.md"), path.join(dest, "THIRD-PARTY-NOTICES.md"));

async function entries(directory, prefix = "") {
  const result = [];
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    if (["node_modules", "dist", "test-output", ".git"].includes(item.name)) continue;
    const name = prefix + item.name, file = path.join(directory, item.name);
    if (item.isDirectory()) result.push(...await entries(file, name + "/"));
    else result.push({ name, data: await fs.readFile(file) });
  }
  return result;
}
// Chrome MV3 requires a service worker rather than Firefox background scripts.
const chromeDest = path.join(dist, "chrome");
await fs.rm(chromeDest, { recursive: true, force: true });
await fs.cp(dest, chromeDest, { recursive: true });
const chromeManifest = JSON.parse(await fs.readFile(path.join(chromeDest, "manifest.json"), "utf8"));
delete chromeManifest.browser_specific_settings;
chromeManifest.background = { service_worker: "background.js" };
chromeManifest.minimum_chrome_version = "140";
await fs.writeFile(path.join(chromeDest, "manifest.json"), JSON.stringify(chromeManifest, null, 2) + "\n");
const background = await fs.readFile(path.join(chromeDest, "background.js"), "utf8");
await fs.writeFile(path.join(chromeDest, "background.js"), background.replaceAll("browser.", "chrome."));
const html = await fs.readFile(path.join(chromeDest, "app.html"), "utf8");
await fs.writeFile(path.join(chromeDest, "app.html"), html.replace("right in Firefox", "right in Chrome"));

for (const [name, directory] of [[`xender-pdf-converter-firefox-${version}.zip`, dest], [`xender-pdf-converter-chrome-${version}.zip`, chromeDest], [`xender-pdf-converter-source-${version}.zip`, root]]) {
  const bytes = zip(await entries(directory));
  const file = path.join(dist, name); await fs.writeFile(file, bytes);
  console.log(`${name}  ${bytes.length} bytes  sha256:${createHash("sha256").update(bytes).digest("hex")}`);
}
