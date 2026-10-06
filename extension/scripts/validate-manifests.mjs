// Validates the built manifests and source against SiteCheck's release rules:
// minimum permissions, every referenced file exists, store text limits, and
// no remote or dynamic code. Run after `node scripts/build.mjs`.
import { readFile, readdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const errors = [];
const fail = (msg) => errors.push(msg);
const exists = (p) => access(p).then(() => true, () => false);

const ALLOWED_PERMISSIONS = ['activeTab', 'scripting'];

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    out.push(...(e.isDirectory() ? await walk(p) : [p]));
  }
  return out;
}

for (const browser of ['chrome', 'edge', 'firefox']) {
  const dir = path.join(root, 'dist', browser);
  if (!(await exists(path.join(dir, 'manifest.json')))) {
    fail(`${browser}: dist missing — run node scripts/build.mjs first`);
    continue;
  }
  const m = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8'));
  if (m.manifest_version !== 3) fail(`${browser}: manifest_version must be 3`);
  if (!/^\d+\.\d+\.\d+$/.test(m.version)) fail(`${browser}: version must be x.y.z`);
  if (!m.name || m.name.length > 45) fail(`${browser}: name missing or longer than 45 chars`);
  if (!m.description || m.description.length > 132) fail(`${browser}: description must be 1–132 chars (is ${m.description?.length})`);
  const perms = m.permissions || [];
  for (const p of perms) if (!ALLOWED_PERMISSIONS.includes(p)) fail(`${browser}: unexpected permission "${p}"`);
  if (m.host_permissions?.length) fail(`${browser}: host_permissions must be empty (uses activeTab)`);
  if (m.optional_permissions?.length || m.optional_host_permissions?.length) fail(`${browser}: optional permissions not expected`);
  if (m.content_scripts) fail(`${browser}: no persistent content scripts expected`);
  if (m.background) fail(`${browser}: no background script expected`);
  if (m.content_security_policy) fail(`${browser}: custom CSP not expected (MV3 default is strict)`);
  const refs = [m.action?.default_popup, ...Object.values(m.icons || {}), ...Object.values(m.action?.default_icon || {}), 'core/audit.js'];
  for (const ref of refs) if (ref && !(await exists(path.join(dir, ref)))) fail(`${browser}: referenced file missing: ${ref}`);
  if (browser === 'firefox') {
    const g = m.browser_specific_settings?.gecko;
    if (!g?.id) fail('firefox: gecko.id required for AMO');
    if (JSON.stringify(g?.data_collection_permissions?.required) !== '["none"]') fail('firefox: data_collection_permissions.required must be ["none"]');
  } else if (m.browser_specific_settings) {
    fail(`${browser}: browser_specific_settings should only be in the Firefox build`);
  }

  for (const file of await walk(dir)) {
    if (!/\.(js|html)$/.test(file)) continue;
    const src = await readFile(file, 'utf8');
    const rel = path.relative(dir, file);
    if (/\beval\s*\(|new\s+Function\s*\(|setTimeout\s*\(\s*['"`]/.test(src)) fail(`${browser}/${rel}: dynamic code evaluation is not allowed`);
    if (/<script[^>]+src\s*=\s*["']https?:/i.test(src) || /import\s*\(?\s*['"]https?:/.test(src)) fail(`${browser}/${rel}: remote code is not allowed`);
    if (/<link[^>]+href\s*=\s*["']https?:[^"']*["'][^>]*stylesheet|stylesheet[^>]+href\s*=\s*["']https?:/i.test(src)) fail(`${browser}/${rel}: remote stylesheets not allowed`);
    if (/innerHTML\s*=|outerHTML\s*=|insertAdjacentHTML|document\.write/.test(src)) fail(`${browser}/${rel}: HTML string injection is not allowed`);
    // The only fetch() is the user-triggered same-origin link check in audit.js.
    if (/\bfetch\s*\(/.test(src) && rel !== path.join('core', 'audit.js')) fail(`${browser}/${rel}: unexpected network call`);
    if (/XMLHttpRequest|sendBeacon|WebSocket\s*\(/.test(src)) fail(`${browser}/${rel}: unexpected network API`);
  }
}

if (errors.length) {
  console.error(errors.map((e) => '✗ ' + e).join('\n'));
  process.exit(1);
}
console.log('✓ manifests and sources pass SiteCheck release rules (chrome, edge, firefox)');
