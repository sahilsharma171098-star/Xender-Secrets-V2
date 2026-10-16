// XEND-HQ-001 — lead pipeline automation: "what do I do today" for outbound prospects + leads.
//
// One daily queue, built from the prospect list (src/prospects.mjs) and the lead pipeline
// (src/growth.mjs):
//   1. follow-ups that are due (interested → replied → messaged, oldest first),
//   2. prospects to close (no reply after MAX_FOLLOW_UPS follow-ups),
//   3. fresh prospects to message, never more than the daily cap allows,
//   4. inbound leads whose next action is due.
// /admin shows it, and a free Worker cron sends a short morning digest to Sahil's Telegram.
//
// Nothing here sends a WhatsApp message. Messages stay manual, human-paced and capped.
// No paid services. Dependency-free so it runs in Node tests against node:sqlite.

import { FOLLOW_UP_DAYS, MAX_FOLLOW_UPS, addDays, prospectStats } from "./prospects.mjs";

export const DAILY_CAP = 25;
const SITE = "https://www.xendersecrets.com";
const DAY_MS = 86400000;
const dayOf = (nowMs) => new Date(nowMs).toISOString().slice(0, 10);
const daysBetween = (from, to) => (from && to ? Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(String(from).slice(0, 10) + "T00:00:00Z")) / DAY_MS) : 0);

/** WhatsApp follow-up text (Hinglish, same voice as the first-touch templates in /admin). */
export function followUpMessage(p, attempt = 1) {
  const preview = p.preview_id ? `${SITE}/p/${p.preview_id}` : "";
  if (p.stage === "interested" || p.stage === "replied") {
    return `Namaste! Sahil, Xender Secrets se. ${p.name} ki website ke baare mein baat aage badhayein?`
      + (preview ? `\n\nSample yahan hai: ${preview}` : "")
      + "\n\nAapke liye kaunsa time theek rahega — aaj ya kal? 🙏";
  }
  if (attempt >= MAX_FOLLOW_UPS) {
    return `Namaste! Sahil, Xender Secrets se — last message, promise 🙂 ${p.name} ke liye free sample website ka offer abhi bhi open hai.`
      + (preview ? `\n${preview}` : "")
      + "\n\nInterest ho toh bas \"Yes\" likh dijiye. Nahi toh koi baat nahi, dobara message nahi karunga.";
  }
  return `Namaste! Sahil, Xender Secrets se. Pichhla message shayad miss ho gaya — ${p.name} ke liye free sample website bana ke bhej doon?`
    + (preview ? `\n\nYa yeh dekh lijiye: ${preview}` : "")
    + "\n\nNo charge, no commitment. Interest nahi hai toh \"No\" likh dijiye 🙏";
}

const waLink = (phone, message) => (phone ? "https://wa.me/" + String(phone).replace(/\D/g, "") + "?text=" + encodeURIComponent(message) : "");

/** The day's work list. `cap` = max first-touch messages per day (same cap as /admin). */
export function todayQueue(sql, nowMs = Date.now(), { cap = DAILY_CAP } = {}) {
  const day = dayOf(nowMs);
  const yesterday = addDays(day, -1);
  const rows = (q, ...a) => sql.exec(q, ...a).toArray();
  const count = (q, ...a) => Number(rows(q, ...a)[0]?.n || 0);
  const stats = prospectStats(sql, nowMs);

  const due = rows(`SELECT p.id,p.name,p.category,p.area,p.phone,p.stage,p.score,p.contacted_at,p.replied_at,p.next_action_at,p.preview_id,
      (SELECT COUNT(*) FROM growth_prospect_touches t WHERE t.prospect_id=p.id AND t.kind='follow_up') AS follow_ups
    FROM growth_prospects p
    WHERE p.stage IN ('messaged','replied','interested') AND COALESCE(p.next_action_at,'')<>'' AND p.next_action_at<=?
    ORDER BY CASE p.stage WHEN 'interested' THEN 0 WHEN 'replied' THEN 1 ELSE 2 END, p.next_action_at, p.score DESC
    LIMIT 100`, day).map((p) => ({ ...p, follow_ups: Number(p.follow_ups), overdue_days: Math.max(0, daysBetween(p.next_action_at, day)) }));

  // A messaged prospect who ignored the first message plus MAX_FOLLOW_UPS follow-ups is done.
  const close = due.filter((p) => p.stage === "messaged" && p.follow_ups >= MAX_FOLLOW_UPS);
  const followUps = due.filter((p) => !close.includes(p)).map((p) => {
    const message = followUpMessage(p, p.follow_ups + 1);
    return { ...p, message, whatsapp: waLink(p.phone, message) };
  });

  const remaining = Math.max(0, cap - stats.messaged_today);
  const fresh = remaining
    ? rows(`SELECT id,name,category,area,phone,score,preview_id FROM growth_prospects
        WHERE stage='new' AND COALESCE(phone,'')<>'' ORDER BY score DESC, created_at DESC LIMIT ?`, remaining)
    : [];

  const leadsDue = rows(`SELECT id,name,business,stage,next_action,next_action_at FROM growth_leads
    WHERE is_test=0 AND stage NOT IN ('won','lost') AND COALESCE(next_action_at,'')<>'' AND next_action_at<=?
    ORDER BY next_action_at LIMIT 50`, day);
  const newLeads = count("SELECT COUNT(*) AS n FROM growth_leads WHERE is_test=0 AND stage='new'");

  return {
    ok: true,
    day,
    cap,
    remaining_today: remaining,
    stats,
    yesterday: {
      day: yesterday,
      found: count("SELECT COUNT(*) AS n FROM growth_prospects WHERE substr(created_at,1,10)=?", yesterday),
      messaged: count("SELECT COUNT(*) AS n FROM growth_prospects WHERE substr(contacted_at,1,10)=?", yesterday),
      replies: count("SELECT COUNT(*) AS n FROM growth_prospects WHERE substr(replied_at,1,10)=?", yesterday),
      follow_ups: count("SELECT COUNT(*) AS n FROM growth_prospect_touches WHERE kind='follow_up' AND substr(at,1,10)=?", yesterday),
      leads: count("SELECT COUNT(*) AS n FROM growth_leads WHERE is_test=0 AND substr(created_at,1,10)=?", yesterday),
    },
    follow_ups: followUps,
    close,
    fresh,
    leads_due: leadsDue,
    new_leads: newLeads,
    cadence_days: FOLLOW_UP_DAYS,
  };
}

/**
 * Morning digest for Telegram (Sahil's private chat). Business names only — no phone numbers,
 * the admin page has those. Plain text: Telegram is sent without a parse mode.
 */
export function digestText(q, { site = SITE, maxNames = 6 } = {}) {
  const names = (list) => list.slice(0, maxNames).map((p) => `  • ${p.name}${p.stage ? ` (${p.stage}${p.overdue_days ? `, ${p.overdue_days}d late` : ""})` : ""}`);
  const more = (list) => (list.length > maxNames ? [`  …aur ${list.length - maxNames}`] : []);
  const s = q.stats.by_stage || {};
  const open = (s.new || 0) + (s.messaged || 0) + (s.replied || 0) + (s.interested || 0);
  const lines = [
    `Xender — aaj ka lead plan (${q.day})`,
    "",
    `Kal: ${q.yesterday.messaged} messaged · ${q.yesterday.follow_ups} follow-ups · ${q.yesterday.replies} replies · ${q.yesterday.leads} website leads`,
    `Pipeline: ${open} open · ${s.interested || 0} interested · ${s.converted || 0} converted`,
    "",
  ];
  const todo = [];
  if (q.new_leads) todo.push(`🔥 ${q.new_leads} naye website lead(s) — pehle inhe reply karo`);
  if (q.leads_due.length) todo.push(`📌 ${q.leads_due.length} lead follow-up due`, ...names(q.leads_due.map((l) => ({ name: l.business || l.name, stage: l.stage }))), ...more(q.leads_due));
  if (q.follow_ups.length) todo.push(`💬 ${q.follow_ups.length} prospect follow-up due`, ...names(q.follow_ups), ...more(q.follow_ups));
  if (q.fresh.length) todo.push(`✉️ ${q.fresh.length} naye businesses ko message kar sakte ho (cap ${q.cap}/day)`, ...names(q.fresh.map((p) => ({ name: p.name }))), ...more(q.fresh));
  else if (!q.stats.by_stage?.new) todo.push("🔎 Message karne ko naye prospects nahi bache — laptop pe finder chalao");
  if (q.close.length) todo.push(`🧹 ${q.close.length} ko close kar do (${MAX_FOLLOW_UPS} follow-up, koi reply nahi)`);
  lines.push(...(todo.length ? ["Aaj karna hai:", ...todo] : ["Aaj koi pending kaam nahi. Naye prospects dhoondo."]));
  lines.push("", `Admin: ${site}/admin`);
  return lines.join("\n").slice(0, 3900);
}

/** Admin routes (caller has already checked ADMIN_TOKEN). Returns null when not a pipeline route. */
export async function handlePipelineAdmin(request, { sql, url, env = {}, nowMs = Date.now(), json, notify }) {
  const path = url.pathname, method = request.method.toUpperCase();
  if (path === "/api/admin/pipeline/today" && method === "GET") return json(todayQueue(sql, nowMs));
  if (path === "/api/admin/pipeline/digest" && method === "POST") {
    const text = digestText(todayQueue(sql, nowMs));
    if (url.searchParams.get("dry") === "1" || typeof notify !== "function") return json({ ok: true, sent: false, reason: "dry-run", text });
    const r = await notify(env, text);
    return json({ ok: true, sent: Boolean(r?.sent), reason: r?.reason || (r?.sent ? "" : "telegram-error"), text });
  }
  return null;
}
