// Builds unpacked extensions for each browser from one shared source tree.
//
//   node scripts/build.mjs           → dist/{chrome,edge,firefox}/
//   node scripts/build.mjs --zip     → also dist/xender-sitecheck-<browser>-<version>.zip
//   node scripts/build.mjs --test    → also dist/test-chromium/ (adds <all_urls> host
//                                      permission so automated tests can inject
//                                      without a toolbar click; never shipped)
import { cp, mkdir, readFile, rm, writeFile, readdir, utimes, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');
const args = new Set(process.argv.slice(2));
const BROWSERS = ['chrome', 'edge', 'firefox'];
const ICON_SIZES = [16, 32, 48, 64, 128];
// Fixed timestamp so zips are byte-for-byte reproducible.
const FIXED_TIME = new Date(Number(process.env.SOURCE_DATE_EPOCH || 1767225600) * 1000);

const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'));

function merge(base, extra) {
  const out = structuredClone(base);
  for (const [k, v] of Object.entries(extra)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' ? merge(out[k], v) : v;
  }
  return out;
}

async function listFiles(dir, prefix = '') {
  const out = [];
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(path.join(dir, entry.name), rel)));
    else out.push(rel);
  }
  return out;
}

async function buildOne(name, manifest) {
  const out = path.join(dist, name);
  await rm(out, { recursive: true, force: true });
  await mkdir(path.join(out, 'icons'), { recursive: true });
  await cp(path.join(root, 'src/core'), path.join(out, 'core'), { recursive: true });
  await cp(path.join(root, 'src/popup'), path.join(out, 'popup'), { recursive: true });
  for (const size of ICON_SIZES) {
    await cp(path.join(root, `assets/icons/icon-${size}.png`), path.join(out, `icons/icon-${size}.png`));
  }
  await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return out;
}

async function zipDir(dir, zipPath) {
  const files = await listFiles(dir);
  for (const f of files) await utimes(path.join(dir, f), FIXED_TIME, FIXED_TIME);
  await rm(zipPath, { force: true });
  // -X: no extra file attributes, -D: no directory entries → reproducible.
  execFileSync('zip', ['-X', '-D', '-q', '-9', zipPath, ...files], { cwd: dir, env: { ...process.env, TZ: 'UTC' } });
  return (await stat(zipPath)).size;
}

const base = await readJson(path.join(root, 'manifests/base.json'));
const pkg = await readJson(path.join(root, 'package.json'));
if (base.version !== pkg.version) {
  throw new Error(`Version mismatch: manifests/base.json ${base.version} vs package.json ${pkg.version}`);
}

await mkdir(dist, { recursive: true });
for (const browser of BROWSERS) {
  const manifest = merge(base, await readJson(path.join(root, `manifests/${browser}.json`)));
  const dir = await buildOne(browser, manifest);
  console.log(`built ${path.relative(root, dir)}/`);
  if (args.has('--zip')) {
    const zip = path.join(dist, `xender-sitecheck-${browser}-${base.version}.zip`);
    const size = await zipDir(dir, zip);
    console.log(`packaged ${path.relative(root, zip)} (${(size / 1024).toFixed(1)} KB)`);
  }
}

if (args.has('--test')) {
  const manifest = merge(base, { host_permissions: ['<all_urls>'] });
  const dir = await buildOne('test-chromium', manifest);
  console.log(`built ${path.relative(root, dir)}/ (test only, not for release)`);
}
