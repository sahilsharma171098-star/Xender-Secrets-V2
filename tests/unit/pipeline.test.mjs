// XEND-HQ-001 — lead pipeline automation (src/pipeline.mjs + follow-up cadence in src/prospects.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { ensureGrowthSchema, handleGrowth, updateLead } from '../../src/growth.mjs';
import { importProspects, listProspects, updateProspect, convertProspect, followUpCount, addDays, MAX_FOLLOW_UPS } from '../../src/prospects.mjs';
import { todayQueue, digestText, followUpMessage, DAILY_CAP } from '../../src/pipeline.mjs';

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
const DAY = 86400000;
const T0 = Date.parse('2026-10-10T06:00:00Z');
const ADMIN = 'c'.repeat(32);
const req = (path, { method = 'GET', body, token } = {}) => new Request('https://www.xendersecrets.com' + path, {
  method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const biz = (i, extra = {}) => ({ name: `Biz ${i}`, category: 'Dentist', area: 'Sector 56', phone: `98101${String(10000 + i).slice(-5)}`, rating: 4.5, reviews: 100 + i, maps_url: 'https://maps.app.goo.gl/x' + i, ...extra });
const byName = (sql, name) => listProspects(sql, { stage: 'all' }).find((p) => p.name === name);

test('stage changes schedule or clear the next follow-up automatically', () => {
  const sql = setup();
  importProspects(sql, [biz(1), biz(2), biz(3), biz(4)], T0);
  const [a, b, c, d] = ['Biz 1', 'Biz 2', 'Biz 3', 'Biz 4'].map((n) => byName(sql, n));
  assert.equal(updateProspect(sql, a.id, { stage: 'messaged' }, T0).body.prospect.next_action_at, '2026-10-12');
  assert.equal(updateProspect(sql, b.id, { stage: 'replied' }, T0).body.prospect.next_action_at, '2026-10-11');
  // an explicit date always wins
  assert.equal(updateProspect(sql, c.id, { stage: 'messaged', next_action_at: '2026-10-20' }, T0).body.prospect.next_action_at, '2026-10-20');
  // closing clears it; re-saving the same stage does not reschedule
  assert.equal(updateProspect(sql, a.id, { stage: 'not_interested' }, T0).body.prospect.next_action_at, '');
  updateProspect(sql, d.id, { stage: 'messaged' }, T0);
  assert.equal(updateProspect(sql, d.id, { stage: 'messaged' }, T0 + 5 * DAY).body.prospect.next_action_at, '2026-10-12');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('followed_up logs the touch and pushes the next date without changing the stage', () => {
  const sql = setup();
  importProspects(sql, [biz(1), biz(2)], T0);
  const a = byName(sql, 'Biz 1'), b = byName(sql, 'Biz 2');
  assert.equal(updateProspect(sql, b.id, { followed_up: true }, T0).status, 400); // still "new"
  updateProspect(sql, a.id, { stage: 'messaged' }, T0);
  const r = updateProspect(sql, a.id, { followed_up: true }, T0 + 2 * DAY);
  assert.equal(r.status, 200);
  assert.equal(r.body.prospect.stage, 'messaged');
  assert.equal(r.body.prospect.follow_ups, 1);
  assert.equal(r.body.prospect.next_action_at, '2026-10-15'); // 2 + 1 days after the follow-up
  assert.equal(followUpCount(sql, a.id), 1);
});

test('today queue: due follow-ups first, then capped fresh messages, then closes', () => {
  const sql = setup();
  importProspects(sql, Array.from({ length: 30 }, (_, i) => biz(i + 1)), T0);
  importProspects(sql, [biz(99, { phone: '' })], T0); // no phone → never offered as fresh
  const hot = byName(sql, 'Biz 5'), warm = byName(sql, 'Biz 6'), cold = byName(sql, 'Biz 7');
  updateProspect(sql, cold.id, { stage: 'messaged' }, T0);
  updateProspect(sql, warm.id, { stage: 'messaged' }, T0);
  updateProspect(sql, hot.id, { stage: 'interested' }, T0);

  const q = todayQueue(sql, T0 + 2 * DAY);
  assert.equal(q.day, '2026-10-12');
  assert.deepEqual(q.follow_ups.map((p) => p.name), ['Biz 5', 'Biz 6', 'Biz 7']);
  assert.equal(q.follow_ups[0].overdue_days, 1);
  assert.match(q.follow_ups[0].message, /Biz 5/);
  assert.match(q.follow_ups[0].whatsapp, /^https:\/\/wa\.me\/91981\d+\?text=/);
  assert.equal(q.remaining_today, DAILY_CAP);
  assert.equal(q.fresh.length, DAILY_CAP);
  assert.ok(!q.fresh.some((p) => p.name === 'Biz 99'));
  assert.equal(q.yesterday.day, '2026-10-11');

  // a day's first-touch messages eat the cap
  const queueT0 = todayQueue(sql, T0);
  assert.equal(queueT0.remaining_today, DAILY_CAP - 3);
  assert.equal(queueT0.fresh.length, DAILY_CAP - 3);
  assert.equal(queueT0.yesterday.messaged, 0);
  assert.equal(todayQueue(sql, T0 + DAY).yesterday.messaged, 3);

  // no reply after MAX_FOLLOW_UPS follow-ups → suggested close, not another message
  let t = T0 + 2 * DAY;
  for (let i = 0; i < MAX_FOLLOW_UPS; i++) { updateProspect(sql, cold.id, { followed_up: true }, t); t += 3 * DAY; }
  const later = todayQueue(sql, t);
  assert.ok(later.close.some((p) => p.id === cold.id));
  assert.ok(!later.follow_ups.some((p) => p.id === cold.id));
});

test('follow-up copy: polite, offers an out, links the preview, escalates to a last message', () => {
  const p = { name: 'Smile Dental', stage: 'messaged', preview_id: 'abc234' };
  assert.match(followUpMessage(p, 1), /Smile Dental/);
  assert.match(followUpMessage(p, 1), /xendersecrets\.com\/p\/abc234/);
  assert.match(followUpMessage(p, 1), /"No"/);
  assert.match(followUpMessage(p, MAX_FOLLOW_UPS), /last message/);
  assert.match(followUpMessage({ name: 'X', stage: 'interested' }, 1), /time theek/);
});

test('digest text: counts and business names, never phone numbers', () => {
  const sql = setup();
  importProspects(sql, [biz(1), biz(2), biz(3)], T0);
  updateProspect(sql, byName(sql, 'Biz 1').id, { stage: 'interested' }, T0);
  const n = { v: 0 };
  convertProspect(sql, byName(sql, 'Biz 2').id, () => 'XS-261010-PIP' + (++n.v), T0);
  const lead = listProspects(sql, { stage: 'converted' })[0].lead_id;
  updateLead(sql, lead, { next_action: 'Send quote', next_action_at: '2026-10-11' }, T0);
  const text = digestText(todayQueue(sql, T0 + DAY));
  assert.match(text, /aaj ka lead plan \(2026-10-11\)/);
  assert.match(text, /1 lead follow-up due/);
  assert.match(text, /1 prospect follow-up due/);
  assert.match(text, /Biz 1 \(interested\)/);
  assert.match(text, /Biz 3/);
  assert.match(text, /https:\/\/www\.xendersecrets\.com\/admin/);
  assert.doesNotMatch(text, /\d{7,}/, 'no phone numbers in the digest');
  // empty system still says something useful
  assert.match(digestText(todayQueue(setup(), T0)), /finder chalao/);
});

test('admin routes: token required, today queue, dry-run and Telegram digest', async () => {
  const sql = setup();
  const env = { ADMIN_TOKEN: ADMIN };
  importProspects(sql, [biz(1)], T0);
  assert.equal((await handleGrowth(req('/api/admin/pipeline/today'), { sql, env, nowMs: T0 })).status, 401);
  assert.equal((await handleGrowth(req('/api/admin/pipeline/digest', { method: 'POST' }), { sql, env, nowMs: T0 })).status, 401);
  const today = await (await handleGrowth(req('/api/admin/pipeline/today', { token: ADMIN }), { sql, env, nowMs: T0 })).json();
  assert.equal(today.fresh.length, 1);

  const dry = await (await handleGrowth(req('/api/admin/pipeline/digest?dry=1', { method: 'POST', token: ADMIN }), { sql, env, nowMs: T0 })).json();
  assert.equal(dry.sent, false);
  assert.match(dry.text, /Biz 1/);

  // without Telegram secrets: reported, not thrown
  const off = await (await handleGrowth(req('/api/admin/pipeline/digest', { method: 'POST', token: ADMIN }), { sql, env, nowMs: T0 })).json();
  assert.equal(off.sent, false);
  assert.equal(off.reason, 'not-configured');

  // with Telegram secrets: one sendMessage to the configured chat
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), body: JSON.parse(init.body) }); return new Response('{}', { status: 200 }); };
  try {
    const tg = { ...env, TELEGRAM_BOT_TOKEN: 'bot-test', TELEGRAM_CHAT_ID: '42' };
    const sent = await (await handleGrowth(req('/api/admin/pipeline/digest', { method: 'POST', token: ADMIN }), { sql, env: tg, nowMs: T0 })).json();
    assert.equal(sent.sent, true);
  } finally { globalThis.fetch = realFetch; }
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /api\.telegram\.org\/botbot-test\/sendMessage$/);
  assert.equal(calls[0].body.chat_id, '42');
  assert.match(calls[0].body.text, /lead plan/);
});
