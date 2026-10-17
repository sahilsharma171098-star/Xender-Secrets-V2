import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../dist/chrome/', import.meta.url);
test('Chrome package uses MV3 worker, bundled decoders and no broad permissions', async () => {
  const manifest = JSON.parse(await fs.readFile(new URL('manifest.json', root), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.background, {service_worker: 'background.js'});
  assert.equal(manifest.browser_specific_settings, undefined);
  assert.equal(manifest.permissions, undefined);
  assert.equal(manifest.host_permissions, undefined);
  assert.ok(manifest.content_security_policy.extension_pages.includes("'wasm-unsafe-eval'"));
  await fs.access(new URL('vendor/pdfjs/pdf.worker.mjs', root));
  await assert.rejects(fs.access(new URL('vendor/pdfjs/wasm/quickjs-eval.wasm', root)));
  const html = await fs.readFile(new URL('app.html', root), 'utf8');
  assert.ok(html.includes('right in Chrome'));
});
test('Chrome toolbar worker opens only its bundled tools page', async () => {
  const code = await fs.readFile(new URL('background.js', root), 'utf8');
  let click;
  const opened = [];
  vm.runInNewContext(code, {chrome: {
    action: {onClicked: {addListener(fn) {click = fn;}}},
    tabs: {create(options) {opened.push(options.url);}},
    runtime: {getURL(file) {return `chrome-extension://test/${file}`;}}
  }});
  click();
  assert.deepEqual(opened, ['chrome-extension://test/app.html']);
});
