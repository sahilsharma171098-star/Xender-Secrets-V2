// Google Analytics opt-out guard (scripts/commercial/analytics.mjs): GA reports only from the
// production hostname, and never for GPC/DNT visitors or framed loads.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { GA_ID, gaOptOutJs, gaTag, withGaTag } from '../../scripts/commercial/analytics.mjs';

function run({ hostname, gpc = false, dnt = null, framed = false }) {
  const win = { doNotTrack: null };
  win.self = win;
  win.top = framed ? {} : win;
  const ctx = { window: win, location: { hostname }, navigator: { globalPrivacyControl: gpc, doNotTrack: dnt } };
  vm.runInNewContext(gaOptOutJs(), ctx);
  return win[`ga-disable-${GA_ID}`] === true;
}

test('GA reports only from the production hostname', () => {
  assert.equal(run({ hostname: 'www.xendersecrets.com' }), false);
  assert.equal(run({ hostname: 'xendersecrets.com' }), false);
  for (const host of [
    'claude-xend-master-backlog-20261103-xender-secrets-v2.fragrant-morning-6341.workers.dev',
    'beaad2f2-xender-secrets-v2.fragrant-morning-6341.workers.dev',
    'localhost', '127.0.0.1', 'xender.test',
    'www.xendersecrets.com.evil.example', 'notxendersecrets.com',
  ]) assert.equal(run({ hostname: host }), true, host);
});

test('GA is off for GPC, Do Not Track and framed loads on production', () => {
  assert.equal(run({ hostname: 'www.xendersecrets.com', gpc: true }), true);
  assert.equal(run({ hostname: 'www.xendersecrets.com', dnt: '1' }), true);
  assert.equal(run({ hostname: 'www.xendersecrets.com', framed: true }), true);
});

test('withGaTag refreshes an existing tag in place and is idempotent', () => {
  const old = '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><!-- Google tag (gtag.js) -->\n<script>old()</script>\n<script async src="x"></script>\n<script>\n  gtag(\'config\', \'' + GA_ID + '\');\n</script><title>t</title></head></html>';
  const once = withGaTag(old);
  assert.ok(once.includes(gaTag('')), 'fresh tag inserted');
  assert.ok(!once.includes('old()'), 'old snippet replaced');
  assert.equal(once.split('<!-- Google tag (gtag.js) -->').length - 1, 1);
  assert.equal(withGaTag(once), once);
  const bare = '<!doctype html><html><head><meta charset="UTF-8"><title>t</title></head></html>';
  assert.equal(withGaTag(withGaTag(bare)), withGaTag(bare));
});
