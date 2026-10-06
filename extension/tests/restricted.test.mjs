import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyUrl, RESTRICTED_MESSAGES } from '../src/core/restricted.js';

test('normal websites are allowed', () => {
  for (const u of ['https://www.xendersecrets.com/', 'http://example.com/page?x=1', 'https://shop.example.co.in/cart']) {
    assert.deepEqual(classifyUrl(u), { ok: true }, u);
  }
});

test('browser-internal pages are protected', () => {
  for (const u of ['chrome://settings', 'edge://extensions', 'about:blank', 'about:addons', 'chrome-extension://abc/popup.html',
    'moz-extension://abc/x.html', 'view-source:https://example.com', 'data:text/html,hi', 'devtools://devtools/x']) {
    assert.equal(classifyUrl(u).reason, 'protected', u);
  }
});

test('extension stores are protected', () => {
  for (const u of ['https://chromewebstore.google.com/detail/x', 'https://chrome.google.com/webstore/detail/x',
    'https://microsoftedge.microsoft.com/addons/detail/x', 'https://addons.mozilla.org/en-US/firefox/']) {
    assert.equal(classifyUrl(u).reason, 'store', u);
  }
  assert.deepEqual(classifyUrl('https://chrome.google.com/other'), { ok: true });
});

test('PDFs, local files and garbage', () => {
  assert.equal(classifyUrl('https://example.com/menu.pdf').reason, 'pdf');
  assert.equal(classifyUrl('file:///home/me/a.pdf').reason, 'pdf');
  assert.equal(classifyUrl('file:///home/me/index.html').reason, 'file');
  assert.equal(classifyUrl('').reason, 'protected');
  assert.equal(classifyUrl(undefined).reason, 'protected');
  assert.equal(classifyUrl('not a url').reason, 'unknown');
});

test('every reason has a friendly message', () => {
  for (const r of ['protected', 'store', 'pdf', 'file', 'unknown']) assert.ok(RESTRICTED_MESSAGES[r]);
  assert.equal(RESTRICTED_MESSAGES.protected, 'SiteCheck cannot analyze this browser-protected page. Open a normal website and try again.');
});
