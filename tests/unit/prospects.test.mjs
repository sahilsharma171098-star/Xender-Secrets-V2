// XEND-ACQ-002 — outbound prospects (src/prospects.mjs) + finder parsing helpers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { ensureGrowthSchema, handleGrowth, buildReport, listLeads } from '../../src/growth.mjs';
import {
  prospectPhone, isIndianMobile, mapsUrl, verticalFor, scoreProspect, validateProspect,
  importProspects, listProspects, updateProspect, convertProspect, prospectStats,
} from '../../src/prospects.mjs';
import {
  parseRating, parseReviews, parsePhone, areaFromAddress, parseArgs, queriesFromText, toCsv, dedupe,
} from '../../scripts/prospecting/maps-parse.mjs';

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
const T0 = Date.parse('2026-10-10T06:00:00Z');
const ADMIN = 'b'.repeat(32);
const req = (path, { method = 'GET', body, token } = {}) => new Request('https://www.xendersecrets.com' + path, {
  method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const SAMPLE = [
  { name: 'Smile Dental Care', category: 'Dentist', area: 'Sector 56', address: 'SCO 12, Sector 56, Gurugram, Haryana 122011', phone: '098101 23456', rating: 4.7, reviews: 212, maps_url: 'https://www.google.com/maps/place/Smile+Dental/@28.4,77.1', query: 'dentist Sector 56 Gurugram' },
  { name: 'Iron Den Gym', category: 'Gym', area: 'DLF Phase 3', phone: '0124 4012345', rating: 4.1, reviews: 38, maps_url: 'https://maps.app.goo.gl/abc' },
  { name: 'Has Site Cafe', category: 'Cafe', phone: '9811111111', website: 'https://hassite.in' },
  { name: '', phone: '9822222222' },
  { name: 'No Phone Bakery', category: 'Bakery', area: 'Sector 46', rating: 4.9, reviews: 500, maps_url: 'javascript:alert(1)' },
];

test('finder parsing helpers', () => {
  assert.equal(parseRating('4.6'), 4.6);
  assert.equal(parseRating('4,3'), 4.3);
  assert.equal(parseRating('No reviews'), null);
  assert.equal(parseReviews('(1,234)'), 1234);
  assert.equal(parseReviews('312 reviews'), 312);
  assert.equal(parseReviews('1.2K reviews'), 1200);
  assert.equal(parseReviews(''), null);
  assert.equal(parsePhone({ itemId: 'phone:tel:09810123456' }), '09810123456');
  assert.equal(parsePhone({ label: 'Phone: 098101 23456 ' }), '09810123456');
  assert.equal(parsePhone({}), '');
  assert.equal(areaFromAddress('SCO 12, Sector 56, Gurugram, Haryana 122011'), 'Sector 56');
  assert.equal(areaFromAddress('Shop 4, Galleria Market, DLF Phase 4, Gurugram, Haryana 122009'), 'DLF Phase 4');
  const o = parseArgs(['--q', 'gym DLF', 'cafe Sector 29', '--max', '500', '--upload', '--headless']);
  assert.deepEqual(o.queries, ['gym DLF', 'cafe Sector 29']);
  assert.equal(o.max, 60);
  assert.ok(o.upload && o.headless);
  assert.deepEqual(queriesFromText('# c\ndentist A\n\n gym B # note\n'), ['dentist A', 'gym B']);
  assert.match(toCsv([{ name: '=HYPERLINK("x")', phone: '+919810123456' }]).split('\r\n')[1], /^"'=HYPERLINK\(""x""\)"/);
  assert.equal(dedupe([{ name: 'A', phone: '+919810123456' }, { name: 'A (2)', phone: '09810123456' }, { name: 'B', address: 'x' }]).length, 2);
});

test('normalisers, vertical mapping and score', () => {
  assert.equal(prospectPhone('098101 23456'), '+919810123456');
  assert.equal(prospectPhone('0124 4012345'), '+911244012345');
  assert.equal(prospectPhone('919810123456'), '+919810123456');
  assert.equal(prospectPhone('123'), '');
  assert.ok(isIndianMobile('+919810123456'));
  assert.ok(!isIndianMobile('+911244012345'));
  assert.equal(mapsUrl('https://maps.app.goo.gl/abc'), 'https://maps.app.goo.gl/abc');
  assert.equal(mapsUrl('https://www.google.com/search?q=x'), '');
  assert.equal(mapsUrl('https://evil.example/maps'), '');
  assert.equal(verticalFor('Dental clinic'), 'dental');
  assert.equal(verticalFor('Gym'), 'fitness');
  assert.equal(verticalFor('Café'), 'restaurant');
  assert.equal(verticalFor('Chartered Accountant'), 'pro');
  assert.equal(verticalFor('Real estate agency'), 'realestate');
  assert.equal(verticalFor('Hardware store'), null);
  assert.equal(scoreProspect({ phone: '', rating: 5, reviews: 900 }), 0);
  const busy = scoreProspect({ phone: '+919810123456', rating: 4.8, reviews: 300 });
  const quiet = scoreProspect({ phone: '+919810123456', rating: 3.9, reviews: 4 });
  const landline = scoreProspect({ phone: '+911244012345', rating: 4.8, reviews: 300 });
  assert.ok(busy > quiet && busy > landline && busy <= 100, `${busy} ${quiet} ${landline}`);
  // sweet spot: a 4.6★ / 200-review clinic outranks a 4.3★ / 5,853-review chain restaurant
  const clinic = scoreProspect({ phone: '+919810123456', rating: 4.6, reviews: 200 });
  const chain = scoreProspect({ phone: '+919667180466', rating: 4.3, reviews: 5853 });
  const bakery = scoreProspect({ phone: '+918510800040', rating: 4.9, reviews: 1318 });
  assert.ok(clinic > chain + 30 && bakery > chain + 30, `${clinic} ${bakery} ${chain}`);
  assert.equal(validateProspect({ name: 'X', website: 'x.com' }).error, 'has a website');
});

test('import validates, de-duplicates and never overwrites working fields', () => {
  const sql = setup();
  const r = importProspects(sql, SAMPLE, T0);
  assert.equal(r.status, 200);
  assert.equal(r.body.added, 3);
  assert.deepEqual(r.body.skipped, { 'has a website': 1, 'missing name': 1 });
  const rows = listProspects(sql);
  assert.equal(rows[0].name, 'Smile Dental Care'); // highest score first
  assert.equal(rows[0].vertical, 'dental');
  assert.equal(rows.find((x) => x.name === 'No Phone Bakery').maps_url, '');
  assert.equal(rows.find((x) => x.name === 'No Phone Bakery').score, 0);

  const id = rows[0].id;
  updateProspect(sql, id, { stage: 'messaged', notes: 'Spoke to Dr. Mehta' }, T0);
  const again = importProspects(sql, [{ ...SAMPLE[0], phone: '+91 98101 23456', reviews: 230 }], T0 + 86400000);
  assert.equal(again.body.added, 0);
  assert.equal(again.body.updated, 1);
  const after = listProspects(sql, { stage: 'all' }).find((x) => x.id === id);
  assert.equal(after.reviews, 230);
  assert.equal(after.stage, 'messaged');
  assert.equal(after.notes, 'Spoke to Dr. Mehta');

  assert.equal(importProspects(sql, 'nope').status, 400);
  assert.equal(importProspects(sql, Array(501).fill({ name: 'x' })).status, 413);
  assert.equal(listProspects(sql, { q: 'gym' }).length, 1);
});

test('stage changes stamp contact/reply times and feed the scorecard', () => {
  const sql = setup();
  importProspects(sql, SAMPLE, T0);
  const [a, b] = listProspects(sql);
  assert.equal(updateProspect(sql, a.id, { stage: 'bogus' }, T0).status, 400);
  assert.equal(updateProspect(sql, a.id, { next_action_at: '10/12/2026' }, T0).status, 400);
  assert.equal(updateProspect(sql, a.id, { preview_id: '<x>' }, T0).status, 400);
  assert.equal(updateProspect(sql, 'P-NOPE2345', { stage: 'messaged' }, T0).status, 404);
  updateProspect(sql, a.id, { stage: 'messaged', next_action_at: '2026-10-10' }, T0);
  updateProspect(sql, b.id, { stage: 'interested' }, T0);
  const s = prospectStats(sql, T0);
  assert.equal(s.found_today, 3);
  assert.equal(s.messaged_today, 2);
  assert.equal(s.replies_today, 1);
  assert.equal(s.follow_ups_due, 1);
  assert.equal(s.by_stage.interested, 1);
  assert.equal(buildReport(sql, { days: 1, nowMs: T0 }).outreach.messaged_today, 2);
  // skip hides it from the default (open) list
  updateProspect(sql, a.id, { stage: 'skip' }, T0);
  assert.ok(!listProspects(sql).some((x) => x.id === a.id));
});

test('convert creates a qualified outbound lead exactly once', () => {
  const sql = setup();
  importProspects(sql, SAMPLE, T0);
  const p = listProspects(sql)[0];
  updateProspect(sql, p.id, { preview_id: 'abc234' }, T0);
  let n = 0;
  const ref = () => 'XS-261010-TST' + (++n);
  const r = convertProspect(sql, p.id, ref, T0);
  assert.equal(r.status, 201);
  const lead = listLeads(sql)[0];
  assert.equal(lead.id, r.body.lead_id);
  assert.equal(lead.stage, 'qualified');
  assert.equal(lead.source, 'outbound');
  assert.equal(lead.phone, '+919810123456');
  assert.match(lead.message, /\/p\/abc234/);
  assert.equal(convertProspect(sql, p.id, ref, T0).status, 409);
  assert.equal(listProspects(sql, { stage: 'converted' })[0].lead_id, lead.id);
});

test('admin routes require the token and round-trip through handleGrowth', async () => {
  const sql = setup();
  const env = { ADMIN_TOKEN: ADMIN };
  assert.equal((await handleGrowth(req('/api/admin/prospects'), { sql, env, nowMs: T0 })).status, 401);
  assert.equal((await handleGrowth(req('/api/admin/prospects/import', { method: 'POST', body: { prospects: SAMPLE } }), { sql, env, nowMs: T0 })).status, 401);
  const imp = await handleGrowth(req('/api/admin/prospects/import', { method: 'POST', token: ADMIN, body: { prospects: SAMPLE } }), { sql, env, nowMs: T0 });
  assert.equal((await imp.json()).added, 3);
  const list = await (await handleGrowth(req('/api/admin/prospects', { token: ADMIN }), { sql, env, nowMs: T0 })).json();
  assert.equal(list.prospects.length, 3);
  assert.equal(list.stats.total, 3);
  const id = list.prospects[0].id;
  const patched = await handleGrowth(req('/api/admin/prospects/' + id, { method: 'PATCH', token: ADMIN, body: { stage: 'interested' } }), { sql, env, nowMs: T0 });
  assert.equal(patched.status, 200);
  const conv = await handleGrowth(req('/api/admin/prospects/' + id + '/convert', { method: 'POST', token: ADMIN }), { sql, env, nowMs: T0 });
  assert.equal(conv.status, 201);
  assert.match((await conv.json()).lead_id, /^XS-261010-[A-Z0-9]{4}$/);
  // unknown admin route still 404s; lead routes unaffected
  assert.equal((await handleGrowth(req('/api/admin/prospects/xyz', { token: ADMIN }), { sql, env, nowMs: T0 })).status, 404);
  assert.equal((await handleGrowth(req('/api/admin/leads', { token: ADMIN }), { sql, env, nowMs: T0 })).status, 200);
});
