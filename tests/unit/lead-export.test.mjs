// XEND-HQ-01 — one-way website-lead export (src/lead-export.mjs) and its auth in src/growth.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { ensureGrowthSchema, createLead, updateLead, handleGrowth } from '../../src/growth.mjs';
import { exportFeed, ackExport, exportStatus, EXPORT_COLUMNS } from '../../src/lead-export.mjs';

function doSql() {
  const db = new DatabaseSync(':memory:');
  return {
    exec(query, ...args) {
      let rows = [];
      if (!args.length && query.trim().replace(/;\s*$/, '').includes(';')) db.exec(query);
      else { const st = db.prepare(query); rows = st.columns().length ? st.all(...args) : (st.run(...args), []); }
      return { toArray: () => rows.map((r) => ({ ...r })), one: () => ({ ...rows[0] }) };
    },
  };
}
const setup = () => { const sql = doSql(); ensureGrowthSchema(sql); ensureGrowthSchema(sql); return sql; };
const T0 = Date.parse('2026-10-22T06:00:00Z');
const MIN = 60000;
const ADMIN = 'a'.repeat(32);
const EXPORT = 'e'.repeat(32);
const lead = (i, extra = {}) => ({ name: `Person ${i}`, phone: `98100000${String(i).padStart(2, '0')}`, business: `Shop ${i}`, offer: 'website', message: 'Need a site', page: '/services', ...extra });
async function add(sql, i, t, extra) {
  const r = await createLead(sql, lead(i, extra), { ip: '10.0.0.' + i, nowMs: t });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.id;
}
const req = (path, { method = 'GET', body, token } = {}) => new Request('https://www.xendersecrets.com' + path, {
  method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});

test('existing leads are back-filled once, in order, and test leads never leave the Worker', async () => {
  const sql = setup();
  const a = await add(sql, 1, T0);
  await add(sql, 2, T0 + MIN, { test: true, name: 'test lead' });
  const b = await add(sql, 3, T0 + 2 * MIN);
  const page = exportFeed(sql, { after: 0, nowMs: T0 + 3 * MIN }).body;
  assert.deepEqual(page.items.map((x) => x.lead_id), [a, b]);
  assert.equal(page.items[0].version, page.items[0].lead.updated_at);
  assert.deepEqual(Object.keys(page.items[0].lead), EXPORT_COLUMNS);
  assert.equal('notes' in page.items[0].lead, false, 'internal notes are not exported');
  // reading again does not re-queue anything
  assert.equal(exportFeed(sql, { after: page.next_after, nowMs: T0 + 4 * MIN }).body.items.length, 0);
  assert.equal(page.has_more, false);
});

test('a change re-exports the lead with a newer version and a higher seq; retries are idempotent', async () => {
  const sql = setup();
  const a = await add(sql, 1, T0);
  const first = exportFeed(sql, { after: 0, nowMs: T0 + MIN }).body;
  updateLead(sql, a, { stage: 'contacted' }, T0 + 5 * MIN);
  const again = exportFeed(sql, { after: first.next_after, nowMs: T0 + 6 * MIN }).body;
  assert.equal(again.items.length, 1);
  assert.equal(again.items[0].lead.stage, 'contacted');
  assert.ok(again.items[0].seq > first.items[0].seq);
  assert.ok(again.items[0].version > first.items[0].version);
  // consumer crashed before saving its cursor: same cursor returns the same entries, nothing new
  const retry = exportFeed(sql, { after: first.next_after, nowMs: T0 + 7 * MIN }).body;
  assert.deepEqual(retry.items.map((x) => x.seq), again.items.map((x) => x.seq));
});

test('paging walks the whole feed without gaps', async () => {
  const sql = setup();
  const ids = [];
  for (let i = 1; i <= 7; i++) ids.push(await add(sql, i, T0 + i * MIN));
  const seen = [];
  let after = 0, guard = 0;
  for (;;) {
    const p = exportFeed(sql, { after, limit: 3, nowMs: T0 + 20 * MIN }).body;
    seen.push(...p.items.map((x) => x.lead_id));
    after = p.next_after;
    if (!p.has_more || ++guard > 10) break;
  }
  assert.deepEqual(seen, ids);
});

test('a lead marked as test after export is skipped and the cursor still moves', async () => {
  const sql = setup();
  const a = await add(sql, 1, T0);
  const b = await add(sql, 2, T0 + MIN);
  const first = exportFeed(sql, { after: 0, nowMs: T0 + 2 * MIN }).body;
  updateLead(sql, a, { is_test: true }, T0 + 3 * MIN);
  updateLead(sql, b, { stage: 'qualified' }, T0 + 4 * MIN);
  const next = exportFeed(sql, { after: first.next_after, nowMs: T0 + 5 * MIN }).body;
  assert.deepEqual(next.items.map((x) => x.lead_id), [b]);
});

test('ack is audit-only and reports lag; bad input is rejected', async () => {
  const sql = setup();
  await add(sql, 1, T0);
  await add(sql, 2, T0 + MIN);
  const p = exportFeed(sql, { after: 0, nowMs: T0 + 2 * MIN }).body;
  assert.equal(ackExport(sql, { consumer: 'command-center', through_seq: 1 }, T0 + 3 * MIN).body.lag, p.head_seq - 1);
  const s = exportStatus(sql, T0 + 4 * MIN);
  assert.equal(s.consumers[0].consumer, 'command-center');
  assert.equal(s.consumers[0].acked_through, 1);
  assert.equal(ackExport(sql, { consumer: 'command-center', through_seq: 999 }).status, 400);
  assert.equal(ackExport(sql, { consumer: 'Bad Name!', through_seq: 1 }).status, 400);
  assert.equal(exportFeed(sql, { after: -1 }).status, 400);
  // ack never deletes anything
  assert.equal(exportFeed(sql, { after: 0, nowMs: T0 + 5 * MIN }).body.items.length, 2);
});

test('EXPORT_TOKEN reads the feed only; ADMIN_TOKEN still works; no token is rejected', async () => {
  const sql = setup();
  await add(sql, 1, T0);
  const env = { ADMIN_TOKEN: ADMIN, EXPORT_TOKEN: EXPORT };
  const call = (path, opts) => handleGrowth(req(path, opts), { sql, env, nowMs: T0 + MIN });
  assert.equal((await call('/api/admin/export/leads?after=0', { token: EXPORT })).status, 200);
  assert.equal((await call('/api/admin/export/leads?after=0', { token: ADMIN })).status, 200);
  assert.equal((await call('/api/admin/export/leads?after=0')).status, 401);
  assert.equal((await call('/api/admin/export/leads?after=0', { token: 'x'.repeat(32) })).status, 401);
  assert.equal((await call('/api/admin/leads', { token: EXPORT })).status, 401, 'export token cannot open the CRM');
  assert.equal((await call('/api/admin/export/ack', { method: 'POST', token: EXPORT, body: { consumer: 'command-center', through_seq: 1 } })).status, 200);
  assert.equal((await call('/api/admin/export/status', { token: EXPORT })).status, 200);
  // a short EXPORT_TOKEN is ignored rather than accepted
  const weak = await handleGrowth(req('/api/admin/export/leads', { token: 'short' }), { sql, env: { ADMIN_TOKEN: ADMIN, EXPORT_TOKEN: 'short' }, nowMs: T0 });
  assert.equal(weak.status, 401);
});

test('audit 2026-10-22: a cursor ahead of the feed fails loudly instead of stalling', async () => {
  const sql = setup();
  await add(sql, 1, T0);
  const r = exportFeed(sql, { after: 50, nowMs: T0 + MIN });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'cursor_ahead');
  assert.equal(r.body.head_seq, 1);
  assert.equal(exportFeed(sql, { after: 1, nowMs: T0 + MIN }).status, 200, 'cursor == head is fine');
});
