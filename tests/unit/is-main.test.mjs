// XEND-LOCAL-SETUP-001: CLI entry-point guards must work with Windows paths. The old
// `import.meta.url === \`file://${process.argv[1]}\`` guard was always false on Windows, so
// `npm run check:novels` / `build:novels` / `seo:audit` exited 0 without doing anything.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain } from '../../scripts/lib/is-main.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('isMain matches Windows argv paths (backslashes, any drive-letter case)', () => {
  const url = 'file:///C:/Users/T14/Xender/Xender-Secrets-V2/scripts/build-novel-data.mjs';
  assert.equal(isMain(url, 'C:\\Users\\T14\\Xender\\Xender-Secrets-V2\\scripts\\build-novel-data.mjs', { platform: 'win32' }), true);
  assert.equal(isMain(url, 'c:\\users\\t14\\xender\\xender-secrets-v2\\scripts\\build-novel-data.mjs', { platform: 'win32' }), true);
  assert.equal(isMain(url, 'C:\\Users\\T14\\Xender\\Xender-Secrets-V2\\scripts\\other.mjs', { platform: 'win32' }), false);
});

test('isMain matches POSIX paths, including spaces and percent-encoding', () => {
  assert.equal(isMain('file:///home/dev/my%20repo/s.mjs', '/home/dev/my repo/s.mjs', { platform: 'linux' }), true);
  assert.equal(isMain('file:///home/dev/repo/s.mjs', '/home/dev/repo/t.mjs', { platform: 'linux' }), false);
  assert.equal(isMain('file:///home/dev/repo/s.mjs', undefined, { platform: 'linux' }), false);
});

test('no script uses a POSIX-only entry-point guard', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(mjs|js)$/.test(e.name)) {
        const src = fs.readFileSync(p, 'utf8');
        if (/file:\/\/\$\{process\.argv\[1\]\}|process\.argv\[1\]\.split\(["']\/["']\)/.test(src)) offenders.push(path.relative(ROOT, p));
      }
    }
  };
  walk(path.join(ROOT, 'scripts'));
  assert.deepEqual(offenders, [], 'use isMain() from scripts/lib/is-main.mjs');
});
