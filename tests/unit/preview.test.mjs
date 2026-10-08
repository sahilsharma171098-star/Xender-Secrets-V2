// Client-preview system (Issue #19): sanitising, rendering and stored-preview routes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { sanitizeConfig, renderPreview, VERTICALS } from '../../public/preview/preview-core.mjs';
import { ensureGrowthSchema, handleGrowth } from '../../src/growth.mjs';

function doSql() {
  const db = new DatabaseSync(':memory:');
  return { exec(q, ...a) { let rows = []; if (!a.length && q.trim().replace(/;\s*$/, '').includes(';')) db.exec(q); else { const st = db.prepare(q); rows = st.columns().length ? st.all(...a) : (st.run(...a), []); } return { toArray: () => rows.map((r) => ({ ...r })), one: () => ({ ...rows[0] }) }; } };
}
const ADMIN = 'z'.repeat(32);
const env = { ADMIN_TOKEN: ADMIN };
const T0 = Date.parse('2026-10-06T06:00:00Z');
const req = (path, { method = 'GET', body, token } = {}) => new Request('https://www.xendersecrets.com' + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });

test('every vertical renders with banner, CTA and labelled sample services', () => {
  for (const v of Object.keys(VERTICALS)) {
    const { ok, config } = sanitizeConfig({ vertical: v, name: 'Test Biz', phone: '9876543210' });
    assert.ok(ok, v);
    const html = renderPreview(config, { id: 'abc234' });
    assert.match(html, /Draft website preview/);
    assert.match(html, /not the official website/);
    assert.match(html, /Sample items/);
    assert.ok(html.includes('https://wa.me/919876543210'), v + ' prospect WhatsApp');
    assert.ok(html.includes('https://wa.me/919821941814'), v + ' Xender CTA');
    assert.ok(!html.includes('<ul class="xp-hl">'), 'no invented highlights');
  }
});

test('sanitizer rejects bad input and neutralises injection', () => {
  assert.equal(sanitizeConfig({ name: 'X' }).ok, false);
  assert.equal(sanitizeConfig({ vertical: 'dental' }).ok, false);
  const { config } = sanitizeConfig({
    vertical: 'pro', name: '<img src=x onerror=alert(1)>Acme', tagline: '"><script>alert(1)</script>',
    googleUrl: 'javascript:alert(1)', instagram: 'data:text/html,x', heroImage: 'https://ok.example/a.jpg', logoImage: 'https://ok.example/logo.png', accent: 'red;background:url(x)',
    services: 'Audit | <b>bold</b> | ₹5,000\n\n | no name', hours: 'Mon | 9-5\nbad', email: 'not-an-email', phone: '12',
  });
  assert.equal(config.googleUrl, '');
  assert.equal(config.instagram, '');
  assert.equal(config.heroImage, 'https://ok.example/a.jpg');
  assert.equal(config.logoImage, 'https://ok.example/logo.png');
  assert.equal(config.accent, VERTICALS.pro.accent);
  assert.equal(config.services.length, 1);
  assert.deepEqual(config.hours, [['Mon', '9-5']]);
  assert.equal(config.email, '');
  assert.equal(config.phone, '');
  const html = renderPreview(config);
  assert.ok(!/<script>alert|<img src=x|<b>bold/.test(html), 'markup escaped');
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;Acme'));
  assert.match(html, /class="xp-logo-img"/);
  assert.ok(html.includes('https://ok.example/logo.png'));
});

test('stored previews: admin-only create, public read with view counts, expiry', async () => {
  const sql = doSql(); ensureGrowthSchema(sql);
  const cfg = { vertical: 'dental', name: 'Smile Clinic', phone: '9876543210' };
  assert.equal((await handleGrowth(req('/api/admin/previews', { method: 'POST', body: { config: cfg } }), { sql, env })).status, 401);
  let res = await handleGrowth(req('/api/admin/previews', { method: 'POST', token: ADMIN, body: { config: { vertical: 'nope' } } }), { sql, env });
  assert.equal(res.status, 400);
  res = await handleGrowth(req('/api/admin/previews', { method: 'POST', token: ADMIN, body: { config: cfg, days: 7, lead_id: 'XS-261006-ABCD' } }), { sql, env, nowMs: T0 });
  assert.equal(res.status, 201);
  const made = await res.json();
  assert.match(made.id, /^[a-z2-9]{6}$/);
  assert.equal(made.path, '/p/' + made.id);
  assert.equal(made.expires_at.slice(0, 10), '2026-10-13');

  res = await handleGrowth(req('/api/preview/' + made.id), { sql, env, nowMs: T0 + 1000 });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).config.name, 'Smile Clinic');
  await handleGrowth(req('/api/preview/' + made.id), { sql, env, nowMs: T0 + 2000 });
  await handleGrowth(req('/api/preview/' + made.id + '?nocount=1'), { sql, env, nowMs: T0 + 3000 });
  res = await handleGrowth(req('/api/admin/previews', { token: ADMIN }), { sql, env });
  const p = (await res.json()).previews[0];
  assert.equal(p.views, 2, 'nocount views are not counted');
  assert.equal(p.lead_id, 'XS-261006-ABCD');
  assert.ok(p.first_view_at && p.last_view_at > p.first_view_at);

  res = await handleGrowth(req('/api/preview/' + made.id), { sql, env, nowMs: T0 + 8 * 86400000 });
  assert.equal(res.status, 410);
  assert.equal((await handleGrowth(req('/api/preview/zzzzzz'), { sql, env })).status, 404);
  assert.equal(await handleGrowth(req('/api/preview/../admin'), { sql, env }), null);

  res = await handleGrowth(req('/api/admin/previews/' + made.id, { method: 'DELETE', token: ADMIN }), { sql, env });
  assert.equal(res.status, 200);
  assert.equal((await handleGrowth(req('/api/preview/' + made.id), { sql, env, nowMs: T0 })).status, 404);
});
