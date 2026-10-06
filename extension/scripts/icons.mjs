// Regenerates PNG icons from assets/icons/icon.svg by rendering it in
// headless Chromium (Playwright). The PNGs are committed, so normal builds
// do not need this step.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const svg = await readFile(path.join(root, 'assets/icons/icon.svg'), 'utf8');
const browser = await chromium.launch();
try {
  for (const size of [16, 32, 48, 64, 128, 300]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    const out = path.join(root, `assets/icons/icon-${size}.png`);
    await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
    console.log('wrote', path.relative(root, out));
  }
} finally {
  await browser.close();
}
