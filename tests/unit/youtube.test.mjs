// Offline tests for src/youtube.mjs (the course page's channel video list).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed, handleYouTubeVideos, CHANNEL_URL } from '../../src/youtube.mjs';

const entry = (id, title, link, published = '2026-10-20T12:00:00+00:00') =>
  `<entry><id>yt:video:${id}</id><yt:videoId>${id}</yt:videoId><title>${title}</title><link rel="alternate" href="${link}"/><published>${published}</published></entry>`;
const FEED = `<?xml version="1.0"?><feed>
${entry('F8Na0s-2Q5Q', '21 October 2026', 'https://www.youtube.com/shorts/F8Na0s-2Q5Q')}
${entry('IRTkN5MxnX0', 'इडली या डोसा? &amp; हिसाब', 'https://www.youtube.com/watch?v=IRTkN5MxnX0')}
${entry('abcdefghijk', 'A short &lt;b&gt;test&lt;/b&gt;', 'https://www.youtube.com/shorts/abcdefghijk')}
${entry('bad', 'Broken id', 'https://www.youtube.com/watch?v=bad')}
${entry('zzzzzzzzzz9', '7 November 2026', 'https://www.youtube.com/watch?v=zzzzzzzzzz9')}
</feed>`;

test('parseFeed keeps real videos, drops hidden/date-only/bad entries, unescapes titles', () => {
  const v = parseFeed(FEED);
  assert.deepEqual(v.map((x) => x.id), ['IRTkN5MxnX0', 'abcdefghijk']);
  assert.equal(v[0].title, 'इडली या डोसा? & हिसाब');
  assert.equal(v[0].kind, 'video');
  assert.equal(v[0].url, 'https://www.youtube.com/watch?v=IRTkN5MxnX0');
  assert.equal(v[1].kind, 'short');
  assert.equal(v[1].url, 'https://www.youtube.com/shorts/abcdefghijk');
  assert.equal(v[1].title, 'A short <b>test</b>'); // raw text; the page renders it with textContent
});

test('handler returns videos, caches them, and serves the cache next time', async () => {
  const store = new Map();
  const cache = {
    match: async (req) => store.get(req.url)?.clone(),
    put: async (req, res) => { store.set(req.url, res); },
  };
  let calls = 0;
  const fetchImpl = async () => { calls++; return new Response(FEED, { status: 200 }); };
  const waits = [];
  const ctx = { waitUntil: (p) => waits.push(p) };
  const r1 = await handleYouTubeVideos(new Request('https://www.xendersecrets.com/api/youtube/videos'), { cache, ctx, fetchImpl });
  await Promise.all(waits);
  const j1 = await r1.json();
  assert.equal(r1.status, 200);
  assert.equal(j1.ok, true);
  assert.equal(j1.channelUrl, CHANNEL_URL);
  assert.equal(j1.videos.length, 2);
  const r2 = await handleYouTubeVideos(new Request('https://www.xendersecrets.com/api/youtube/videos'), { cache, ctx, fetchImpl });
  assert.equal((await r2.json()).videos.length, 2);
  assert.equal(calls, 1, 'second request served from the edge cache');
});

test('handler fails soft when YouTube is unreachable, and rejects non-GET', async () => {
  const r = await handleYouTubeVideos(new Request('https://x/api/youtube/videos'), { fetchImpl: async () => { throw new Error('down'); } });
  assert.equal(r.status, 502);
  const j = await r.json();
  assert.equal(j.ok, false);
  assert.equal(j.channelUrl, CHANNEL_URL);
  const p = await handleYouTubeVideos(new Request('https://x/api/youtube/videos', { method: 'POST' }));
  assert.equal(p.status, 405);
});
