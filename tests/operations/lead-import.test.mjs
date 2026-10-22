// XEND-HQ-01 — operations/apps-script/LeadImport.gs against the real export feed (src/lead-export.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { ensureGrowthSchema, createLead, updateLead } from '../../src/growth.mjs';
import { exportFeed, ackExport } from '../../src/lead-export.mjs';

function doSql() {
  const db = new DatabaseSync(':memory:');
  return { exec(q, ...a) { let rows = []; if (!a.length && q.trim().replace(/;\s*$/, '').includes(';')) db.exec(q); else { const st = db.prepare(q); rows = st.columns().length ? st.all(...a) : (st.run(...a), []); } return { toArray: () => rows.map((r) => ({ ...r })), one: () => ({ ...rows[0] }) }; } };
}
const T0 = Date.parse('2026-10-22T06:00:00Z');

function harness({ failures = [], token = 'e'.repeat(32) } = {}) {
  const sql = doSql(); ensureGrowthSchema(sql);
  const tabs = { 'Website Leads': [], 'OS Audit': [['event_id', 'request_id', 'occurred_at', 'actor', 'action', 'entity_id', 'phase', 'before_version', 'after_version', 'detail']] };
  const props = { OS_SHEET_ID: 'sheet', XENDER_EXPORT_TOKEN: token };
  const calls = [];
  const sheet = (name) => {
    const rows = tabs[name];
    return {
      getDataRange: () => ({ getValues: () => (rows.length ? rows.map((r) => [...r]) : [['']]) }),
      getRange: (row, col, nr = 1, nc = 1) => ({
        getValues: () => [Array.from({ length: nc }, (_, j) => (rows[row - 1] || [])[col - 1 + j] ?? '')],
        setValues: (v) => { rows[row - 1] = rows[row - 1] || []; v[0].forEach((x, j) => { rows[row - 1][col - 1 + j] = x; }); },
        setNumberFormat: () => {},
      }),
      appendRow: (r) => rows.push(r),
    };
  };
  const fetchImpl = (url, opts) => {
    calls.push(url);
    if (opts.headers.Authorization !== 'Bearer ' + 'e'.repeat(32)) return resp(401, {});
    const f = failures.shift();
    if (f === 'throw') throw new Error('socket hang up');
    if (f) return resp(f, {});
    const u = new URL(url);
    if (u.pathname === '/api/admin/export/leads') { const r = exportFeed(sql, { after: u.searchParams.get('after'), limit: u.searchParams.get('limit'), consumer: u.searchParams.get('consumer'), nowMs: T0 + 3600000 }); return resp(r.status, r.body); }
    if (u.pathname === '/api/admin/export/ack') return resp(200, ackExport(sql, JSON.parse(opts.payload), T0 + 3600000).body);
    return resp(404, {});
  };
  const resp = (code, body) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(body) });
  const ctx = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null, setProperty: (k, v) => { props[k] = v; } }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: (n) => (tabs[n] ? sheet(n) : null), insertSheet: (n) => { tabs[n] = []; return sheet(n); } }), flush: () => {} },
    UrlFetchApp: { fetch: fetchImpl },
    Utilities: { sleep: () => {}, getUuid: () => crypto.randomUUID() },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    ScriptApp: { getProjectTriggers: () => [], newTrigger: () => ({ timeBased: () => ({ everyMinutes: () => ({ create: () => {} }) }) }) },
  });
  vm.runInContext(fs.readFileSync(new URL('../../operations/apps-script/LeadImport.gs', import.meta.url), 'utf8'), ctx);
  return { sql, tabs, props, calls, run: () => ctx.importWebsiteLeads(), headers: () => vm.runInContext('WL_HEADERS', ctx) };
}
async function add(sql, i, t, extra = {}) {
  const r = await createLead(sql, { name: `Person ${i}`, phone: `+91 98100000${String(i).padStart(2, '0')}`, business: `=HYPERLINK("x") ${i}`, page: '/services', ...extra }, { ip: '10.0.0.' + i, nowMs: t });
  return r.body.id;
}

test('imports new leads once, keeps text safe, moves the cursor and writes one audit row per page', async () => {
  const h = harness();
  const a = await add(h.sql, 1, T0); const b = await add(h.sql, 2, T0 + 60000);
  const r = h.run();
  assert.equal(r.ok, true); assert.equal(r.written, 2);
  const rows = h.tabs['Website Leads'];
  assert.equal(rows[0].join('|'), h.headers().join('|'));
  assert.deepEqual(rows.slice(1).map((x) => x[0]), [a, b]);
  const H = h.headers();
  assert.equal(rows[1][H.indexOf('business')].startsWith("'="), true, 'formula injection guard');
  assert.equal(rows[1][H.indexOf('phone')].startsWith("'+"), true, 'phone kept as text');
  assert.equal(h.props.LEAD_EXPORT_CURSOR, '2');
  assert.equal(h.tabs['OS Audit'].length, 2);
  // second run: nothing new, nothing duplicated
  assert.equal(h.run().written, 0);
  assert.equal(h.tabs['Website Leads'].length, 3);
});

test('a lead update replaces its row instead of adding a duplicate', async () => {
  const h = harness();
  const a = await add(h.sql, 1, T0);
  h.run();
  updateLead(h.sql, a, { stage: 'qualified' }, T0 + 120000);
  h.run();
  const rows = h.tabs['Website Leads'];
  assert.equal(rows.length, 2);
  assert.equal(rows[1][h.headers().indexOf('stage')], 'qualified');
});

test('a crash after writing but before saving the cursor is replayed without duplicates', async () => {
  const h = harness();
  await add(h.sql, 1, T0); await add(h.sql, 2, T0 + 60000);
  h.run();
  h.props.LEAD_EXPORT_CURSOR = '0'; // as if the cursor write was lost
  const r = h.run();
  assert.equal(r.written, 0); assert.equal(r.skipped, 2);
  assert.equal(h.tabs['Website Leads'].length, 3);
});

test('retries network errors and 5xx, but stops at once on a rejected token', async () => {
  const h = harness({ failures: ['throw', 503] });
  await add(h.sql, 1, T0);
  assert.equal(h.run().written, 1);
  const bad = harness({ token: 'wrong'.repeat(8) });
  await add(bad.sql, 1, T0);
  assert.throws(() => bad.run(), /HTTP 401/);
  assert.equal(bad.calls.length, 1, 'no retry on 401');
  assert.equal(bad.props.LEAD_EXPORT_CURSOR, undefined);
  const down = harness({ failures: [503, 503, 503] });
  await add(down.sql, 1, T0);
  assert.throws(() => down.run(), /after 3 attempts/);
  assert.equal(down.props.LEAD_EXPORT_CURSOR, undefined, 'cursor untouched when the feed is down');
});

test('audit 2026-10-22: a cursor ahead of the Worker feed surfaces as an error and is left untouched', async () => {
  const h = harness();
  await add(h.sql, 1, T0);
  h.props.LEAD_EXPORT_CURSOR = '40';
  assert.throws(() => h.run(), /HTTP 409/);
  assert.equal(h.props.LEAD_EXPORT_CURSOR, '40');
});
