import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const FIXTURES = path.join(ROOT, 'tests/fixtures');
export const AUDIT_JS = path.join(ROOT, 'src/core/audit.js');
export const ORIGIN = 'https://fixtures.sitecheck.test';
export const HTTP_ORIGIN = 'http://fixtures.sitecheck.test';

/**
 * Serves tests/fixtures/* from fake https:// and http:// origins so that
 * protocol-dependent checks (mixed content, HTTPS, same-origin link checks)
 * behave exactly as on a real site. Paths named in `statuses` return that
 * status; any other unknown path returns 404; external hosts are aborted.
 */
export async function routeFixtures(context, statuses = {}) {
  const handler = async (route) => {
    const url = new URL(route.request().url());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return route.continue();
    if (url.hostname !== 'fixtures.sitecheck.test') return route.abort();
    const name = url.pathname.replace(/^\//, '') || 'healthy.html';
    if (statuses[url.pathname]) return route.fulfill({ status: statuses[url.pathname], body: 'status fixture' });
    try {
      const body = await readFile(path.join(FIXTURES, path.basename(name)), 'utf8');
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body });
    } catch {
      return route.fulfill({ status: url.pathname === '/ok.html' ? 200 : 404, contentType: 'text/html', body: 'x' });
    }
  };
  await context.route('**/*', handler);
}

export async function launch() {
  return chromium.launch({ headless: true });
}

export async function audit(browser, fixture, { origin = ORIGIN, viewport = { width: 1280, height: 800 } } = {}) {
  const context = await browser.newContext({ viewport });
  await routeFixtures(context);
  const page = await context.newPage();
  await page.goto(`${origin}/${fixture}`, { waitUntil: 'load' });
  await page.addScriptTag({ path: AUDIT_JS });
  const result = await page.evaluate(() => globalThis.XenderSiteCheck.run(document, window));
  await context.close();
  return result;
}

export const ids = (result) => result.issues.map((i) => i.id);
export const issue = (result, id) => result.issues.find((i) => i.id === id);
