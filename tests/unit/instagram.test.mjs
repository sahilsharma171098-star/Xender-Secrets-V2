import test from 'node:test';
import assert from 'node:assert/strict';
import { instagramClient, publicationPlan } from '../../scripts/social/instagram.mjs';

const post = { caption: 'Xender concept demo', images: ['https://assets.example.com/demo.jpg'] };
const env = { INSTAGRAM_API_VERSION: 'v25.0', INSTAGRAM_USER_ID: '123', INSTAGRAM_ACCESS_TOKEN: 'test-only-token' };
test('offline plans validate images and never require account credentials', () => {
  assert.equal(publicationPlan(post).type, 'IMAGE');
  assert.equal(publicationPlan({ ...post, images: [...post.images, 'https://assets.example.com/second.jpg'] }).type, 'CAROUSEL');
  for (const url of ['http://assets.example.com/x.jpg', 'https://127.0.0.1/x.jpg', 'https://user:password@example.com/x.jpg', 'https://host.local/x.jpg']) {
    assert.throws(() => publicationPlan({ ...post, images: [url] }), /public HTTPS/);
  }
  assert.throws(() => publicationPlan({ ...post, caption: 'a'.repeat(2201) }), /Caption/);
});
test('publishing stays disabled and credentials never enter URLs or provider errors', async () => {
  let calls = 0;
  const client = instagramClient(env, { fetchImpl: async (url, options) => {
    calls++; assert.ok(!url.includes(env.INSTAGRAM_ACCESS_TOKEN));
    assert.equal(options.headers.authorization, 'Bearer ' + env.INSTAGRAM_ACCESS_TOKEN);
    assert.equal(options.redirect, 'error');
    return new Response(JSON.stringify({ error: { message: env.INSTAGRAM_ACCESS_TOKEN } }), { status: 401 });
  } });
  await assert.rejects(client.publish(post), /disabled/); assert.equal(calls, 0);
  await assert.rejects(client.account(), error => !error.message.includes(env.INSTAGRAM_ACCESS_TOKEN));
});
test('publication checks quota and finished status before one final publish request', async () => {
  const calls = [];
  const client = instagramClient({ ...env, INSTAGRAM_ENABLE_WRITES: 'true' }, { sleep: async () => {}, fetchImpl: async (url, init) => {
    const path = new URL(url).pathname; calls.push([init.method, path]);
    const value = path.endsWith('/content_publishing_limit') ? { data: [{ quota_usage: 0, config: { quota_total: 100 } }] }
      : path.endsWith('/media_publish') ? { id: '789' }
      : init.method === 'POST' ? { id: '456' } : { status_code: 'FINISHED' };
    return new Response(JSON.stringify(value));
  } });
  assert.deepEqual(await client.publish(post), { id: '789' });
  assert.deepEqual(calls.map(x => x[0]), ['GET', 'POST', 'GET', 'POST']);
});
test('quota exhaustion and expired containers never publish or auto-retry', async () => {
  for (const exhausted of [true, false]) {
    let published = 0;
    const client = instagramClient({ ...env, INSTAGRAM_ENABLE_WRITES: 'true' }, { sleep: async () => {}, fetchImpl: async (url, init) => {
      const path = new URL(url).pathname;
      if (path.endsWith('/media_publish')) published++;
      const value = path.endsWith('/content_publishing_limit') ? { data: [{ quota_usage: exhausted ? 100 : 0, config: { quota_total: 100 } }] }
        : init.method === 'POST' ? { id: '456' } : { status_code: 'EXPIRED' };
      return new Response(JSON.stringify(value));
    } });
    await assert.rejects(client.publish(post), exhausted ? /limit reached/ : /not publishable/);
    assert.equal(published, 0);
  }
});
