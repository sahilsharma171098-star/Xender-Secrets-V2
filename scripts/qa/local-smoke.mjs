// Release QA against a local Worker only. No provider calls or production writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const root = process.cwd(), port = 8871, base = `http://127.0.0.1:${port}`;
const out = path.join(root, '.local/qa'); fs.mkdirSync(out, { recursive: true });
const proc = spawn(process.execPath, [path.join(root, 'node_modules/wrangler/bin/wrangler.js'), 'dev', '--local', '-c', 'tests/worker/wrangler.test.jsonc', '--ip', '127.0.0.1', '--port', String(port), '--persist-to', '.local/qa-state'],
  { cwd: root, detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NO_PROXY: '*', WRANGLER_SEND_METRICS: 'false' } });
let log = '', startupError, browser;
const results = [];
proc.on('error', error => { startupError = error; });
proc.on('exit', (code, signal) => { log += `\nQA Worker parent exited: code=${code}, signal=${signal}\n`; });
proc.stdout.on('data', chunk => { log += chunk; }); proc.stderr.on('data', chunk => { log += chunk; });
try {
  for (let i = 0; !/Ready on/.test(log); i++) {
    if (startupError) throw startupError;
    if (proc.exitCode !== null || i >= 120) throw Error('Local Worker startup failed: ' + log.slice(-3000));
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  browser = await chromium.launch();
  for (const width of [390, 1366]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== base) return route.abort('blockedbyclient');
      if (url.pathname === '/api/event') return route.fulfill({ status: 204, body: '' });
      if (!['GET', 'HEAD'].includes(request.method())) return route.abort('blockedbyclient');
      return route.continue();
    });
    for (const route of ['/', '/portfolio', '/services', '/contact', '/website-cost-calculator']) {
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        const response = await page.goto(base + route, { waitUntil: 'load' });
        assert.equal(response.status(), 200);
        assert.equal(await page.locator('h1').count(), 1, 'one primary heading');
        assert.ok(await page.locator('main').innerText(), 'content visible');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow');
        if (width === 390 && await page.locator('#menu').count()) {
          await page.locator('#menu').click(); assert.equal(await page.locator('#menu').getAttribute('aria-expanded'), 'true');
          await page.keyboard.press('Escape'); assert.equal(await page.locator('#menu').getAttribute('aria-expanded'), 'false');
        }
        if (await page.locator('#themeToggle').count()) {
          await page.locator('#themeToggle').click();
          assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
          await page.locator('#themeToggle').click();
        }
        assert.deepEqual(errors, [], 'no page runtime errors');
        results.push({ route, width, passed: true });
      } catch (error) {
        results.push({ route, width, passed: false, error: error.message });
      }
      await page.screenshot({ path: path.join(out, `${width}-${route === '/' ? 'home' : route.slice(1)}.png`) });
      await page.close();
    }
    await context.close();
  }
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
  for (const result of results) console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.width} ${result.route}${result.error ? ': ' + result.error : ''}`);
  assert.ok(results.every(result => result.passed), 'Local release QA has failures; inspect .local/qa/results.json.');
} finally {
  fs.writeFileSync(path.join(out, 'worker.log'), log);
  await browser?.close();
  if (proc?.pid && proc.exitCode === null) {
    if (process.platform === 'win32') {
      const stopped = spawnSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { encoding: 'utf8', timeout: 10000 });
      if (stopped.error || stopped.status !== 0) throw new Error('Local QA Worker cleanup failed.');
    } else process.kill(-proc.pid, 'SIGTERM');
  }
}
