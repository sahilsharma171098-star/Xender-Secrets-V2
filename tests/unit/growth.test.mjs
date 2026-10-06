// Offline tests for src/growth.mjs (lead capture, events, admin MIS) against real SQLite
// via node:sqlite, wrapped to look like the Durable Object `ctx.storage.sql` API.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureGrowthSchema, handleGrowth, createLead, recordEvents, buildReport, updateLead,
  normalizePhone, normalizeUrl, deriveSource, cleanPath, notifyLead, validateLead,
} from '../../src/growth.mjs';

function doSql() {
  const db = new DatabaseSync(':memory:');
  return {
    exec(query, ...args) {
      let rows = [];
      if (!args.length && query.trim().replace(/;\s*$/, '').includes(';')) {
        db.exec(query); // multi-statement DDL, like ctx.storage.sql.exec
      } else {
        const st = db.prepare(query);
        rows = st.columns().length ? st.all(...args) : (st.run(...args), []);
      }
      return { toArray: () => rows.map((r) => ({ ...r })), one: () => ({ ...rows[0] }) };
    },
  };
}

const ADMIN = 'a'.repeat(32);
const env = { ADMIN_TOKEN: ADMIN, RATE_LIMIT_SALT: 'test' };
const T0 = Date.parse('2026-10-06T05:00:00Z');
const req = (path, { method = 'GET', body, token, ip = '203.0.113.9' } = {}) => new Request('https://www.xendersecrets.com' + path, {
  method,
  headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, ...(token ? { authorization: 'Bearer ' + token } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});
function setup() { const sql = doSql(); ensureGrowthSchema(sql); ensureGrowthSchema(sql); return sql; }

test('normalisers', () => {
  assert.equal(normalizePhone('98219 41814'), '+919821941814');
  assert.equal(normalizePhone('+44 20 7946 0958'), '+442079460958');
  assert.equal(normalizePhone('12'), null);
  assert.equal(normalizePhone(''), '');
  assert.equal(normalizeUrl('example.in'), 'https://example.in');
  assert.equal(normalizeUrl('https://shop.example.com/about?x=1'), 'https://shop.example.com/about');
  assert.equal(normalizeUrl('javascript:alert(1)'), null);
  assert.equal(normalizeUrl('not a url'), null);
  assert.equal(cleanPath('/services.html?email=a@b.com&token=x'), '/services.html');
  assert.equal(cleanPath('https://www.xendersecrets.com/index.html'), '/');
  assert.equal(deriveSource({ utm_source: 'LinkedIn Post' }), 'linkedin-post');
  assert.equal(deriveSource({ referrer: 'https://www.google.co.in/' }), 'google');
  assert.equal(deriveSource({ referrer: 'https://lnkd.in/abc' }), 'linkedin');
  assert.equal(deriveSource({ referrer: 'https://www.xendersecrets.com/services.html' }), 'direct');
  assert.equal(deriveSource({}), 'direct');
});

test('lead validation requires a name and a reachable contact', () => {
  assert.equal(validateLead({}).ok, false);
  assert.equal(validateLead({ name: 'A' }).ok, false);
  assert.equal(validateLead({ name: 'A', email: 'bad' }).ok, false);
  assert.equal(validateLead({ name: 'A', phone: '9821941814' }).ok, true);
  assert.equal(validateLead({ name: 'A', email: 'a@b.co' }).ok, true);
  assert.equal(validateLead({ name: 'A', email: 'a@b.co', website: 'javascript:x' }).ok, false);
  assert.equal(validateLead({ name: 'A', email: 'a@b.co', offer: 'free-everything' }).lead.offer, 'not-sure');
  assert.match(validateLead({ name: 'A', email: 'a@b.co', interest: 'AI Workflow', message: 'hi' }).lead.message, /^Interest: AI Workflow\nhi$/);
});

test('lead is stored with attribution and a human reference; notify summary produced', async () => {
  const sql = setup();
  const r = await createLead(sql, {
    name: 'Riya Dental', phone: '9876543210', business: 'Riya Dental Clinic', website: 'riyadental.in',
    offer: 'founding-website-999', message: 'Need a site', page: '/?utm_source=x',
    attribution: { utm_source: 'linkedin', utm_campaign: 'Clinics Oct', referrer: 'https://lnkd.in/x', landing_page: '/dental?ref=1' },
  }, { ip: '1.1.1.1', salt: 's', nowMs: T0 });
  assert.equal(r.status, 201);
  assert.match(r.body.id, /^XS-261006-[A-Z2-9]{4}$/);
  const row = sql.exec('SELECT * FROM growth_leads').toArray()[0];
  assert.equal(row.phone, '+919876543210');
  assert.equal(row.source, 'linkedin');
  assert.equal(row.campaign, 'clinics-oct');
  assert.equal(row.landing_page, '/dental');
  assert.equal(row.page, '/');
  assert.equal(row.stage, 'new');
  assert.match(r.notify, /Riya Dental/);
  assert.match(r.notify, /founding-website-999/);
  const ev = sql.exec("SELECT * FROM growth_daily WHERE event='lead_submit'").toArray();
  assert.equal(ev[0].count, 1);
});

test('honeypot submissions look successful but are not stored', async () => {
  const sql = setup();
  const r = await createLead(sql, { name: 'Bot', email: 'b@b.co', company_url: 'http://spam' }, { nowMs: T0 });
  assert.equal(r.status, 201);
  assert.equal(sql.exec('SELECT COUNT(*) AS n FROM growth_leads').one().n, 0);
});

test('lead rate limit per connection', async () => {
  const sql = setup();
  const statuses = [];
  for (let i = 0; i < 8; i++) statuses.push((await createLead(sql, { name: 'N' + i, email: `n${i}@x.co` }, { ip: '9.9.9.9', salt: 's', nowMs: T0 + i })).status);
  assert.deepEqual(statuses, [201, 201, 201, 201, 201, 201, 429, 429]);
  // a different connection is unaffected
  assert.equal((await createLead(sql, { name: 'Other', email: 'o@x.co' }, { ip: '8.8.8.8', salt: 's', nowMs: T0 })).status, 201);
  // window expiry
  assert.equal((await createLead(sql, { name: 'Later', email: 'l@x.co' }, { ip: '9.9.9.9', salt: 's', nowMs: T0 + 3601000 })).status, 201);
});

test('events are aggregated, whitelisted and carry no identifiers', async () => {
  const sql = setup();
  await recordEvents(sql, { events: [
    { name: 'page_view', path: '/?gclid=secret', attribution: { referrer: 'https://www.google.com/' } },
    { name: 'page_view', path: '/', attribution: { referrer: 'https://www.google.com/' } },
    { name: 'cta_click', path: '/', label: 'Hero: Get free check' },
    { name: 'lead_submit', path: '/' },
    { name: 'drop_table', path: '/' },
  ] }, { nowMs: T0 });
  const rows = sql.exec('SELECT * FROM growth_daily ORDER BY event').toArray();
  assert.deepEqual(rows.map((r) => [r.event, r.path, r.source, r.label, r.count]), [
    ['cta_click', '/', 'direct', 'hero-get-free-check', 1],
    ['page_view', '/', 'google', '', 2],
  ]);
  assert.ok(!JSON.stringify(rows).includes('secret'));
});

test('admin routes require the ADMIN_TOKEN secret', async () => {
  const sql = setup();
  let res = await handleGrowth(req('/api/admin/leads'), { sql, env: {} });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).code, 'admin_token_missing');
  res = await handleGrowth(req('/api/admin/leads'), { sql, env: { ADMIN_TOKEN: 'Qz7mK2' } });
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.code, 'admin_token_too_short');
  assert.ok(!JSON.stringify(body).includes('Qz7mK2'), 'never echoes the token');
  res = await handleGrowth(req('/api/admin/leads', { token: ADMIN }), { sql, env: { ADMIN_TOKEN: '  ' + ADMIN + '\n' } });
  assert.equal(res.status, 200, 'surrounding whitespace from copy-paste is ignored');
  res = await handleGrowth(req('/api/admin/leads', { token: 'b'.repeat(32) }), { sql, env });
  assert.equal(res.status, 401);
  res = await handleGrowth(req('/api/admin/leads'), { sql, env });
  assert.equal(res.status, 401);
  res = await handleGrowth(req('/api/admin/leads', { token: ADMIN }), { sql, env });
  assert.equal(res.status, 200);
});

test('end-to-end: submit, list, pipeline update, report, csv', async () => {
  const sql = setup();
  let res = await handleGrowth(req('/api/lead', { method: 'POST', body: { name: 'Acme CA', email: 'ca@acme.in', offer: 'business-starter-1999', attribution: { utm_source: 'gmail-outreach' } } }), { sql, env, nowMs: T0 });
  assert.equal(res.status, 201);
  assert.ok(res.headers.get('x-xender-lead-notify'));
  const { id } = await res.json();
  await handleGrowth(req('/api/lead', { method: 'POST', body: { name: 'Demo', email: 'd@d.co', test: true } }), { sql, env, nowMs: T0 });
  await handleGrowth(req('/api/event', { method: 'POST', body: { events: [{ name: 'page_view', path: '/' }, { name: 'page_view', path: '/' }, { name: 'lead_start', path: '/' }] } }), { sql, env, nowMs: T0 });

  res = await handleGrowth(req('/api/admin/leads', { token: ADMIN }), { sql, env });
  let body = await res.json();
  assert.equal(body.leads.length, 1, 'test leads hidden by default');
  res = await handleGrowth(req('/api/admin/leads?test=1', { token: ADMIN }), { sql, env });
  assert.equal((await res.json()).leads.length, 2);

  res = await handleGrowth(req('/api/admin/leads/' + id, { method: 'PATCH', token: ADMIN, body: { stage: 'proposal', quote_value: 1999, next_action: 'Send proposal PDF', next_action_at: '2026-10-06' } }), { sql, env, nowMs: T0 });
  assert.equal(res.status, 200);
  res = await handleGrowth(req('/api/admin/leads/' + id, { method: 'PATCH', token: ADMIN, body: { stage: 'paid' } }), { sql, env });
  assert.equal(res.status, 400);
  res = await handleGrowth(req('/api/admin/leads/' + id, { method: 'PATCH', token: ADMIN, body: { quote_value: -5 } }), { sql, env });
  assert.equal(res.status, 400);

  res = await handleGrowth(req('/api/admin/report?days=7', { token: ADMIN }), { sql, env, nowMs: T0 });
  body = await res.json();
  assert.equal(body.funnel.page_views, 2);
  assert.equal(body.funnel.lead_starts, 1);
  assert.equal(body.funnel.lead_submits, 2);
  assert.equal(body.revenue.open_pipeline_value, 1999);
  assert.equal(body.revenue.collected, 0);
  assert.equal(body.follow_ups_due.length, 1);

  updateLead(sql, id, { stage: 'won', collected_value: 1000 }, T0);
  body = buildReport(sql, { nowMs: T0 });
  assert.equal(body.revenue.booked, 1999);
  assert.equal(body.revenue.collected, 1000, 'booked and collected tracked separately');
  assert.equal(body.revenue.deals_won, 1);

  res = await handleGrowth(req('/api/admin/leads/' + id, { token: ADMIN }), { sql, env });
  body = await res.json();
  assert.equal(body.log.length, 2);

  await handleGrowth(req('/api/lead', { method: 'POST', body: { name: '=HYPERLINK("x")', email: 'f@f.co' } }), { sql, env, nowMs: T0 });
  res = await handleGrowth(req('/api/admin/leads.csv', { token: ADMIN }), { sql, env });
  const csv = await res.text();
  assert.match(csv, /"'=HYPERLINK\(""x""\)"/, 'formula injection neutralised');
});

test('non-growth routes fall through to legacy handlers', async () => {
  const sql = setup();
  assert.equal(await handleGrowth(req('/api/auth/me'), { sql, env }), null);
  assert.equal(await handleGrowth(req('/api/lead'), { sql, env }), null, 'GET /api/lead is not handled');
});

test('telegram notification is optional and never throws', async () => {
  assert.deepEqual(await notifyLead({}, 'x'), { sent: false, reason: 'not-configured' });
  let called;
  const r = await notifyLead({ TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: '1' }, 'hello', async (u, o) => { called = [u, JSON.parse(o.body)]; return { ok: true, status: 200 }; });
  assert.equal(r.sent, true);
  assert.equal(called[0], 'https://api.telegram.org/bott/sendMessage');
  assert.equal(called[1].text, 'hello');
  const failing = await notifyLead({ TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: '1' }, 'x', async () => { throw new Error('down'); });
  assert.equal(failing.sent, false);
});
