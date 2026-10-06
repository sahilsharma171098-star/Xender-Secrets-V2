// XEND-WARROOM-001 / CLAUDE-DATA-001 — first-party lead capture, funnel events and private MIS.
//
// Runs inside the existing AppState Durable Object (SQLite). Everything here is additive:
// new tables only, nothing in the legacy schema is altered or dropped.
//
// Privacy rules (see docs/DATA_MEASUREMENT_PLAN.md):
// - Events are stored as daily aggregate counters. No visitor IDs, no IPs, no cookies, no
//   cross-site identifiers. Rate limiting uses a salted, daily-rotating hash of the IP that is
//   kept for at most two days.
// - Lead rows hold only what the person typed into the form plus first-party attribution
//   (utm/referrer/landing page). Raw leads are readable only with the ADMIN_TOKEN secret.
//
// The module is dependency-injected (sql, env, now) so the same code runs in Node tests
// against node:sqlite.

export const LEAD_STAGES = ["new", "contacted", "qualified", "proposal", "won", "lost"];
export const OFFERS = [
  "free-website-check",
  "founding-website-999",
  "business-starter-1999",
  "business-pro-3499",
  "redesign",
  "custom-build",
  "not-sure",
];
export const EVENTS = new Set([
  "page_view", "cta_click", "whatsapp_click", "email_click", "phone_click",
  "lead_start", "lead_submit", "lead_error", "demo_view", "offer_view", "js_error",
]);

const LIMITS = {
  lead: { max: 6, windowSec: 3600 },
  event: { max: 240, windowSec: 600 },
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});
const str = (v, n) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const text = (v, n) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, n);
const slug = (v, n = 60) => String(v ?? "").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, n);
const validEmail = (e) => /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(e);
const money = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= 100000000 ? n : undefined;
};

export function normalizePhone(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const plus = s.startsWith("+");
  const digits = s.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  // Bare 10-digit Indian mobile numbers are the common case for this audience.
  if (!plus && digits.length === 10 && /^[6-9]/.test(digits)) return "+91" + digits;
  return (plus ? "+" : "") + digits;
}

export function normalizeUrl(raw) {
  const s = str(raw, 300);
  if (!s) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return null;
    return u.origin + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return null;
  }
}

/** Path only, no query string: keeps tokens/PII in query strings out of storage. */
export function cleanPath(raw) {
  const s = String(raw ?? "");
  let p = s;
  try { p = new URL(s, "https://x.invalid").pathname; } catch { p = "/"; }
  p = p.replace(/\/index\.html$/, "/").slice(0, 120);
  return p || "/";
}

/** Referrer reduced to its host; same-site referrers become "" (internal navigation). */
export function referrerHost(raw, ownHosts = ["xendersecrets.com", "www.xendersecrets.com"]) {
  try {
    const h = new URL(String(raw)).hostname.toLowerCase();
    return ownHosts.includes(h) ? "" : h.slice(0, 80);
  } catch {
    return "";
  }
}

/** Source attribution: explicit utm_source wins, then referrer host, then "direct". */
export function deriveSource(attr = {}) {
  const utm = slug(attr.utm_source || attr.source, 40);
  if (utm) return utm;
  const host = referrerHost(attr.referrer || "");
  if (!host) return "direct";
  if (/(^|\.)google\./.test(host)) return "google";
  if (/(^|\.)bing\.com$/.test(host)) return "bing";
  if (/duckduckgo/.test(host)) return "duckduckgo";
  if (/linkedin|lnkd\.in/.test(host)) return "linkedin";
  if (/instagram/.test(host)) return "instagram";
  if (/facebook|fb\.com/.test(host)) return "facebook";
  if (/(^|\.)t\.co$|twitter|x\.com/.test(host)) return "x";
  if (/whatsapp|wa\.me/.test(host)) return "whatsapp";
  if (/t\.me|telegram/.test(host)) return "telegram";
  if (/mail\.|gmail|outlook/.test(host)) return "email";
  return host;
}

export function ensureGrowthSchema(sql) {
  sql.exec(`
    CREATE TABLE IF NOT EXISTS growth_leads (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      business TEXT,
      website TEXT,
      offer TEXT,
      budget TEXT,
      timeline TEXT,
      message TEXT,
      contact_pref TEXT,
      source TEXT,
      medium TEXT,
      campaign TEXT,
      referrer TEXT,
      landing_page TEXT,
      page TEXT,
      cta TEXT,
      stage TEXT NOT NULL DEFAULT 'new',
      quote_value INTEGER,
      collected_value INTEGER,
      next_action TEXT,
      next_action_at TEXT,
      notes TEXT,
      is_test INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_growth_leads_created ON growth_leads(created_at);
    CREATE INDEX IF NOT EXISTS idx_growth_leads_stage ON growth_leads(stage,created_at);
    CREATE TABLE IF NOT EXISTS growth_daily (
      day TEXT NOT NULL,
      event TEXT NOT NULL,
      path TEXT NOT NULL,
      source TEXT NOT NULL,
      label TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(day,event,path,source,label)
    );
    CREATE TABLE IF NOT EXISTS growth_rate (
      key TEXT PRIMARY KEY,
      window_start INTEGER NOT NULL,
      count INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS growth_lead_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id TEXT NOT NULL,
      at TEXT NOT NULL,
      change TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_growth_lead_log_lead ON growth_lead_log(lead_id,at);
  `);
}

async function sha256Hex(value) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Fixed-window limiter keyed on a daily-rotating salted IP hash. Returns true when allowed. */
export async function allow(sql, kind, ip, salt, nowMs) {
  const { max, windowSec } = LIMITS[kind];
  const day = new Date(nowMs).toISOString().slice(0, 10);
  const key = kind + ":" + (await sha256Hex(salt + "|" + day + "|" + (ip || "unknown"))).slice(0, 32);
  const nowSec = Math.floor(nowMs / 1000);
  const row = sql.exec("SELECT window_start,count FROM growth_rate WHERE key=?", key).toArray()[0];
  if (!row || nowSec - Number(row.window_start) >= windowSec) {
    sql.exec("INSERT OR REPLACE INTO growth_rate (key,window_start,count) VALUES (?,?,1)", key, nowSec);
    return true;
  }
  if (Number(row.count) >= max) return false;
  sql.exec("UPDATE growth_rate SET count=count+1 WHERE key=?", key);
  return true;
}

function pruneRate(sql, nowMs) {
  sql.exec("DELETE FROM growth_rate WHERE window_start<?", Math.floor(nowMs / 1000) - 2 * 86400);
}

/** Human-friendly reference shown to the customer and used on WhatsApp: XS-YYMMDD-ABCD. */
export function leadRef(nowMs) {
  const d = new Date(nowMs).toISOString();
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rnd = crypto.getRandomValues(new Uint8Array(4));
  return "XS-" + d.slice(2, 4) + d.slice(5, 7) + d.slice(8, 10) + "-" + Array.from(rnd, (b) => alphabet[b % alphabet.length]).join("");
}

export function validateLead(body = {}) {
  const errors = [];
  const name = str(body.name, 80);
  const phone = normalizePhone(body.phone);
  const emailRaw = str(body.email, 254).toLowerCase();
  const email = emailRaw ? (validEmail(emailRaw) ? emailRaw : null) : "";
  const website = normalizeUrl(body.website);
  if (!name) errors.push("Please tell us your name.");
  if (phone === null) errors.push("Please enter a valid phone / WhatsApp number.");
  if (email === null) errors.push("Please enter a valid email address.");
  if (!phone && !email && phone !== null && email !== null) errors.push("Add a WhatsApp number or an email so we can reply.");
  if (website === null) errors.push("That website address doesn't look right.");
  const offer = OFFERS.includes(body.offer) ? body.offer : "not-sure";
  const attr = body.attribution && typeof body.attribution === "object" ? body.attribution : {};
  const lead = {
    name, phone: phone || "", email: email || "", website: website || "",
    business: str(body.business, 120),
    offer,
    budget: str(body.budget, 40),
    timeline: str(body.timeline, 40),
    message: text((str(body.interest, 120) ? "Interest: " + str(body.interest, 120) + "\n" : "") + text(body.message, 1500), 1600),
    contact_pref: ["whatsapp", "call", "email"].includes(body.contact_pref) ? body.contact_pref : (phone ? "whatsapp" : "email"),
    source: deriveSource(attr),
    medium: slug(attr.utm_medium, 40),
    campaign: slug(attr.utm_campaign, 60),
    referrer: referrerHost(attr.referrer || ""),
    landing_page: cleanPath(attr.landing_page || "/"),
    page: cleanPath(body.page || "/"),
    cta: slug(body.cta, 60),
    is_test: body.test === true ? 1 : 0,
  };
  return { ok: errors.length === 0, errors, lead };
}

export function leadSummaryText(id, lead) {
  const lines = [
    `New Xender lead ${id}${lead.is_test ? " (TEST)" : ""}`,
    `${lead.name}${lead.business ? " — " + lead.business : ""}`,
    `Offer: ${lead.offer}`,
    lead.phone && `Phone/WA: ${lead.phone}`,
    lead.email && `Email: ${lead.email}`,
    lead.website && `Site: ${lead.website}`,
    lead.budget && `Budget: ${lead.budget}`,
    lead.timeline && `Timeline: ${lead.timeline}`,
    `Source: ${lead.source}${lead.campaign ? " / " + lead.campaign : ""} · page ${lead.page}`,
    lead.message && `Msg: ${lead.message.slice(0, 400)}`,
  ];
  return lines.filter(Boolean).join("\n");
}

export async function createLead(sql, body, { ip = "", salt = "", nowMs = Date.now() } = {}) {
  // Honeypot: real people never see or fill this field. Pretend success, store nothing.
  if (str(body?.company_url, 200)) return { status: 201, body: { ok: true, id: leadRef(nowMs), message: "Enquiry received." } };
  if (!(await allow(sql, "lead", ip, salt, nowMs))) {
    return { status: 429, body: { ok: false, error: "Too many enquiries from this connection. Please WhatsApp us instead." } };
  }
  const { ok, errors, lead } = validateLead(body || {});
  if (!ok) return { status: 400, body: { ok: false, error: errors[0], errors } };
  const id = leadRef(nowMs);
  const now = new Date(nowMs).toISOString();
  sql.exec(
    `INSERT INTO growth_leads (id,created_at,updated_at,name,phone,email,business,website,offer,budget,timeline,message,contact_pref,
      source,medium,campaign,referrer,landing_page,page,cta,stage,is_test) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'new',?)`,
    id, now, now, lead.name, lead.phone, lead.email, lead.business, lead.website, lead.offer, lead.budget, lead.timeline,
    lead.message, lead.contact_pref, lead.source, lead.medium, lead.campaign, lead.referrer, lead.landing_page, lead.page,
    lead.cta, lead.is_test,
  );
  bump(sql, now.slice(0, 10), "lead_submit", lead.page, lead.source, lead.offer);
  pruneRate(sql, nowMs);
  return { status: 201, body: { ok: true, id, message: "Enquiry received." }, lead, notify: lead.is_test ? "" : leadSummaryText(id, lead) };
}

function bump(sql, day, event, path, source, label) {
  sql.exec(
    `INSERT INTO growth_daily (day,event,path,source,label,count) VALUES (?,?,?,?,?,1)
     ON CONFLICT(day,event,path,source,label) DO UPDATE SET count=count+1`,
    day, event, path, source, label,
  );
}

export async function recordEvents(sql, body, { ip = "", salt = "", nowMs = Date.now() } = {}) {
  const list = Array.isArray(body?.events) ? body.events.slice(0, 20) : [body];
  if (!(await allow(sql, "event", ip, salt, nowMs))) return { status: 202, body: { ok: true, stored: 0, limited: true } };
  const day = new Date(nowMs).toISOString().slice(0, 10);
  let stored = 0;
  for (const e of list) {
    if (!e || !EVENTS.has(e.name)) continue;
    // lead_submit is counted server-side when the lead is actually stored; a client-reported
    // lead_submit would double count, so it is ignored here.
    if (e.name === "lead_submit") continue;
    const attr = e.attribution && typeof e.attribution === "object" ? e.attribution : {};
    bump(sql, day, e.name, cleanPath(e.path || "/"), deriveSource(attr), slug(e.label, 60));
    stored++;
  }
  return { status: 202, body: { ok: true, stored } };
}

const LEAD_COLUMNS = "id,created_at,updated_at,name,phone,email,business,website,offer,budget,timeline,message,contact_pref,source,medium,campaign,referrer,landing_page,page,cta,stage,quote_value,collected_value,next_action,next_action_at,notes,is_test";

export function listLeads(sql, { stage = "", includeTest = false, limit = 200 } = {}) {
  const where = [];
  const args = [];
  if (LEAD_STAGES.includes(stage)) { where.push("stage=?"); args.push(stage); }
  if (!includeTest) where.push("is_test=0");
  const q = `SELECT ${LEAD_COLUMNS} FROM growth_leads ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC LIMIT ?`;
  return sql.exec(q, ...args, Math.min(500, Math.max(1, Number(limit) || 200))).toArray();
}

export function updateLead(sql, id, patch = {}, nowMs = Date.now()) {
  const row = sql.exec(`SELECT ${LEAD_COLUMNS} FROM growth_leads WHERE id=?`, id).toArray()[0];
  if (!row) return { status: 404, body: { ok: false, error: "Lead not found." } };
  const set = {};
  if (patch.stage !== undefined) {
    if (!LEAD_STAGES.includes(patch.stage)) return { status: 400, body: { ok: false, error: "Unknown stage." } };
    set.stage = patch.stage;
  }
  for (const k of ["quote_value", "collected_value"]) {
    if (patch[k] !== undefined) {
      const v = money(patch[k]);
      if (v === undefined) return { status: 400, body: { ok: false, error: `${k} must be a whole rupee amount.` } };
      set[k] = v;
    }
  }
  if (patch.next_action !== undefined) set.next_action = str(patch.next_action, 200);
  if (patch.next_action_at !== undefined) {
    const d = str(patch.next_action_at, 10);
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return { status: 400, body: { ok: false, error: "next_action_at must be YYYY-MM-DD." } };
    set.next_action_at = d;
  }
  if (patch.notes !== undefined) set.notes = text(patch.notes, 4000);
  if (patch.is_test !== undefined) set.is_test = patch.is_test ? 1 : 0;
  const keys = Object.keys(set);
  if (!keys.length) return { status: 400, body: { ok: false, error: "Nothing to update." } };
  const now = new Date(nowMs).toISOString();
  sql.exec(`UPDATE growth_leads SET ${keys.map((k) => k + "=?").join(",")},updated_at=? WHERE id=?`, ...keys.map((k) => set[k]), now, id);
  const change = keys.filter((k) => k !== "notes").map((k) => `${k}:${row[k] ?? ""}->${set[k]}`).join("; ") || "notes updated";
  sql.exec("INSERT INTO growth_lead_log (lead_id,at,change) VALUES (?,?,?)", id, now, change);
  return { status: 200, body: { ok: true, lead: sql.exec(`SELECT ${LEAD_COLUMNS} FROM growth_leads WHERE id=?`, id).toArray()[0] } };
}

/** MIS report: funnel, sources, CTAs, pipeline and booked vs collected revenue. */
export function buildReport(sql, { days = 30, nowMs = Date.now() } = {}) {
  const span = Math.min(365, Math.max(1, Number(days) || 30));
  const since = new Date(nowMs - (span - 1) * 86400000).toISOString().slice(0, 10);
  const rows = (q, ...a) => sql.exec(q, ...a).toArray();
  const total = (event) => Number(rows("SELECT COALESCE(SUM(count),0) AS n FROM growth_daily WHERE day>=? AND event=?", since, event)[0].n);
  const pageViews = total("page_view");
  const leadStarts = total("lead_start");
  const leadSubmits = total("lead_submit");
  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
  const pipeline = rows("SELECT stage,COUNT(*) AS leads,COALESCE(SUM(quote_value),0) AS quoted,COALESCE(SUM(collected_value),0) AS collected FROM growth_leads WHERE is_test=0 GROUP BY stage");
  const won = pipeline.find((p) => p.stage === "won");
  const openStages = ["new", "contacted", "qualified", "proposal"];
  return {
    ok: true,
    since,
    days: span,
    funnel: {
      page_views: pageViews,
      lead_starts: leadStarts,
      lead_submits: leadSubmits,
      start_rate_pct: pct(leadStarts, pageViews),
      submit_rate_pct: pct(leadSubmits, leadStarts),
      visit_to_lead_pct: pct(leadSubmits, pageViews),
      whatsapp_clicks: total("whatsapp_click"),
      email_clicks: total("email_click"),
      phone_clicks: total("phone_click"),
    },
    daily: rows("SELECT day,event,SUM(count) AS n FROM growth_daily WHERE day>=? GROUP BY day,event ORDER BY day", since),
    top_pages: rows("SELECT path,SUM(count) AS views FROM growth_daily WHERE day>=? AND event='page_view' GROUP BY path ORDER BY views DESC LIMIT 25", since),
    sources: rows(`SELECT source,
        SUM(CASE WHEN event='page_view' THEN count ELSE 0 END) AS views,
        SUM(CASE WHEN event='whatsapp_click' THEN count ELSE 0 END) AS whatsapp,
        SUM(CASE WHEN event='lead_submit' THEN count ELSE 0 END) AS leads
      FROM growth_daily WHERE day>=? GROUP BY source ORDER BY leads DESC, views DESC LIMIT 25`, since),
    ctas: rows("SELECT event,label,path,SUM(count) AS clicks FROM growth_daily WHERE day>=? AND event IN ('cta_click','whatsapp_click','email_click','phone_click') GROUP BY event,label,path ORDER BY clicks DESC LIMIT 40", since),
    offers: rows("SELECT offer,COUNT(*) AS leads,SUM(CASE WHEN stage='won' THEN 1 ELSE 0 END) AS won FROM growth_leads WHERE is_test=0 GROUP BY offer ORDER BY leads DESC"),
    errors: rows("SELECT label,path,SUM(count) AS n FROM growth_daily WHERE day>=? AND event IN ('js_error','lead_error') GROUP BY label,path ORDER BY n DESC LIMIT 20", since),
    pipeline,
    revenue: {
      open_pipeline_value: pipeline.filter((p) => openStages.includes(p.stage)).reduce((s, p) => s + Number(p.quoted), 0),
      booked: Number(won?.quoted || 0),
      collected: pipeline.reduce((s, p) => s + Number(p.collected), 0),
      deals_won: Number(won?.leads || 0),
    },
    follow_ups_due: rows("SELECT id,name,business,stage,next_action,next_action_at FROM growth_leads WHERE is_test=0 AND stage NOT IN ('won','lost') AND next_action_at<>'' AND next_action_at<=? ORDER BY next_action_at", new Date(nowMs).toISOString().slice(0, 10)),
  };
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

/** Admin auth: bearer token compared against the ADMIN_TOKEN Worker secret (min 24 chars). */
export function adminAuth(request, env) {
  const expected = String(env?.ADMIN_TOKEN || "");
  if (expected.length < 24) return { ok: false, status: 503, error: "Admin access is not configured (set the ADMIN_TOKEN secret)." };
  const header = request.headers.get("authorization") || "";
  const got = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!safeEqual(got, expected)) return { ok: false, status: 401, error: "Unauthorized." };
  return { ok: true };
}

/**
 * Router used by AppState.fetch. Returns a Response for growth routes, or null so the caller
 * can continue with its legacy routes.
 */
export async function handleGrowth(request, { sql, env = {}, nowMs = Date.now() } = {}) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();
  const ip = request.headers.get("cf-connecting-ip") || "";
  const salt = String(env.RATE_LIMIT_SALT || "xender-growth");

  if (path === "/api/lead" && method === "POST") {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ ok: false, error: "Invalid request." }, 400);
    const r = await createLead(sql, body, { ip, salt, nowMs });
    const res = json(r.body, r.status);
    if (r.notify) res.headers.set("x-xender-lead-notify", encodeURIComponent(r.notify).slice(0, 3500));
    return res;
  }
  if (path === "/api/event" && method === "POST") {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ ok: false, error: "Invalid request." }, 400);
    const r = await recordEvents(sql, body, { ip, salt, nowMs });
    return json(r.body, r.status);
  }
  if (path.startsWith("/api/admin/")) {
    const auth = adminAuth(request, env);
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
    if (path === "/api/admin/leads" && method === "GET") {
      return json({ ok: true, stages: LEAD_STAGES, leads: listLeads(sql, {
        stage: url.searchParams.get("stage") || "",
        includeTest: url.searchParams.get("test") === "1",
        limit: url.searchParams.get("limit"),
      }) });
    }
    const m = path.match(/^\/api\/admin\/leads\/(XS-\d{6}-[A-Z0-9]{4})$/);
    if (m && method === "PATCH") {
      const body = await request.json().catch(() => ({}));
      const r = updateLead(sql, m[1], body, nowMs);
      return json(r.body, r.status);
    }
    if (m && method === "GET") {
      const lead = sql.exec(`SELECT ${LEAD_COLUMNS} FROM growth_leads WHERE id=?`, m[1]).toArray()[0];
      if (!lead) return json({ ok: false, error: "Lead not found." }, 404);
      const log = sql.exec("SELECT at,change FROM growth_lead_log WHERE lead_id=? ORDER BY at", m[1]).toArray();
      return json({ ok: true, lead, log });
    }
    if (path === "/api/admin/report" && method === "GET") {
      return json(buildReport(sql, { days: url.searchParams.get("days"), nowMs }));
    }
    if (path === "/api/admin/leads.csv" && method === "GET") {
      const leads = listLeads(sql, { includeTest: url.searchParams.get("test") === "1", limit: 500 });
      const cols = LEAD_COLUMNS.split(",");
      const cell = (v) => {
        let s = String(v ?? "");
        if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // spreadsheet formula injection guard
        return '"' + s.replace(/"/g, '""') + '"';
      };
      const csv = [cols.join(","), ...leads.map((l) => cols.map((c) => cell(l[c])).join(","))].join("\r\n");
      return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "cache-control": "no-store", "content-disposition": "attachment; filename=xender-leads.csv" } });
    }
    return json({ ok: false, error: "Admin route not found." }, 404);
  }
  return null;
}

/** Optional free notification: Telegram bot message to Sahil. No-op unless both secrets exist. */
export async function notifyLead(env, summary, fetchImpl = fetch) {
  const token = env?.TELEGRAM_BOT_TOKEN;
  const chat = env?.TELEGRAM_CHAT_ID;
  if (!token || !chat || !summary) return { sent: false, reason: "not-configured" };
  try {
    const r = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: summary, disable_web_page_preview: true }),
    });
    return { sent: r.ok, status: r.status };
  } catch (e) {
    return { sent: false, reason: String(e).slice(0, 120) };
  }
}
