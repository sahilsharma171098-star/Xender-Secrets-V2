// CLAUDE-SOCIAL-001: first-party integration scaffold. Dry-run is the default.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const id = value => {
  if (!/^\d+$/.test(String(value || ''))) throw new Error('Expected a numeric Instagram identifier.');
  return String(value);
};
const publicImage = value => {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || !host.includes('.')
    || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')
    || host.endsWith('.invalid') || /^[\d.]+$/.test(host) || host.includes(':')) {
    throw new Error('Images must use public HTTPS URLs without embedded credentials.');
  }
  return url.href;
};

export function publicationPlan(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected a post object.');
  const caption = String(input.caption || '').trim();
  if (!caption || [...caption].length > 2200) throw new Error('Caption must contain 1–2200 characters.');
  if (!Array.isArray(input.images) || input.images.length < 1 || input.images.length > 10) {
    throw new Error('Provide 1–10 public JPEG image URLs.');
  }
  const images = input.images.map(publicImage);
  if (new Set(images).size !== images.length) throw new Error('Image URLs must be distinct.');
  return { type: images.length === 1 ? 'IMAGE' : 'CAROUSEL', caption, images };
}

export function instagramClient(env = {}, { fetchImpl = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  const login = env.INSTAGRAM_LOGIN || 'instagram';
  if (!['instagram', 'facebook'].includes(login)) throw new Error('Choose instagram or facebook login.');
  if (!/^v\d+\.\d+$/.test(env.INSTAGRAM_API_VERSION || '')) throw new Error('Set the API version supported by your Meta app.');
  const userId = id(env.INSTAGRAM_USER_ID);
  if (!env.INSTAGRAM_ACCESS_TOKEN) throw new Error('Authorize the account through the official Meta login flow first.');
  const base = `https://${login === 'instagram' ? 'graph.instagram.com' : 'graph.facebook.com'}/${env.INSTAGRAM_API_VERSION}`;
  const request = async (method, route, fields = {}) => {
    const url = new URL(base + '/' + route);
    const init = { method, redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { authorization: 'Bearer ' + env.INSTAGRAM_ACCESS_TOKEN } };
    if (method === 'GET') for (const [key, value] of Object.entries(fields)) url.searchParams.set(key, value);
    else { init.headers['content-type'] = 'application/x-www-form-urlencoded'; init.body = new URLSearchParams(fields); }
    let response;
    try { response = await fetchImpl(url.href, init); }
    catch { throw new Error('Meta request did not complete. Check account status before retrying a write.'); }
    const body = await response.json().catch(() => null);
    if (!response.ok || !body || body.error) {
      // Provider messages and pagination URLs can contain credentials; never echo them.
      throw new Error(`Meta request failed (HTTP ${response.status}). Reauthorize or check permissions/rate limits in Meta.`);
    }
    return body;
  };
  const writeAllowed = () => {
    if (env.INSTAGRAM_ENABLE_WRITES !== 'true') throw new Error('Live publishing is disabled. Verify the account and approve the post first.');
  };
  const ready = async container => {
    for (let attempt = 0; attempt < 12; attempt++) {
      const status = await request('GET', id(container), { fields: 'status_code' });
      if (status.status_code === 'FINISHED') return;
      if (['ERROR', 'EXPIRED', 'PUBLISHED'].includes(status.status_code)) throw new Error('Container is not publishable. Check Meta before retrying.');
      await sleep(5000);
    }
    throw new Error('Container is still processing. Do not recreate or publish it blindly.');
  };
  return {
    account: () => request('GET', userId, { fields: 'id,username' }),
    quota: () => request('GET', userId + '/content_publishing_limit', { fields: 'config,quota_usage' }),
    media: () => request('GET', userId + '/media', { fields: 'id,media_type,timestamp', limit: '25' }),
    comments: mediaId => request('GET', id(mediaId) + '/comments', { fields: 'id,text,timestamp', limit: '25' }),
    async publish(input) {
      const plan = publicationPlan(input);
      writeAllowed();
      const quota = await request('GET', userId + '/content_publishing_limit', { fields: 'config,quota_usage' });
      const usage = quota.data?.[0];
      if (!usage || !Number.isFinite(usage.quota_usage) || !Number.isFinite(usage.config?.quota_total)) {
        throw new Error('Publishing quota could not be verified.');
      }
      if (usage.quota_usage >= usage.config.quota_total) throw new Error('Publishing limit reached. Wait for Meta capacity to reset.');
      let container;
      if (plan.type === 'IMAGE') {
        container = await request('POST', userId + '/media', { image_url: plan.images[0], caption: plan.caption });
      } else {
        const children = [];
        for (const image of plan.images) {
          const child = await request('POST', userId + '/media', { image_url: image, is_carousel_item: 'true' });
          await ready(id(child.id)); children.push(child.id);
        }
        container = await request('POST', userId + '/media', { media_type: 'CAROUSEL', children: children.join(','), caption: plan.caption });
      }
      await ready(id(container.id));
      // Never auto-retry publication: an uncertain response may already represent a public post.
      return request('POST', userId + '/media_publish', { creation_id: container.id });
    }
  };
}

async function main(args) {
  const command = args[0] || 'help';
  if (command === 'plan') {
    if (!args[1]) throw new Error('Usage: node scripts/social/instagram.mjs plan post.json');
    console.log(JSON.stringify({ dryRun: true, ...publicationPlan(JSON.parse(fs.readFileSync(args[1], 'utf8'))) }, null, 2));
  } else if (command === 'check') {
    const client = instagramClient(process.env);
    const account = await client.account(), quota = await client.quota();
    console.log(JSON.stringify({ connected: Boolean(account.id), quota: quota.data }));
  } else if (command === 'publish') {
    throw new Error('The CLI supports dry-run and read-only verification. Use the library only after account verification and explicit post approval.');
  } else console.log('Instagram scaffold: plan <post.json> (offline) | check (read-only, authorized environment required)');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
