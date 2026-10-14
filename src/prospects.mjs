// XEND-ACQ-002 — outbound prospect list: local businesses found with no website.
//
// The finder runs on Sahil's laptop (scripts/prospecting/find-no-website.mjs) because Google
// Maps cannot be read from a Worker or a browser page. It uploads what it found to the admin
// routes below, where /admin.html shows a prioritised, de-duplicated call/WhatsApp list.
//
// Stored per prospect: only public business-listing facts (name, category, area/address,
// public business phone, rating, review count, Maps link) plus Sahil's own working notes.
// No personal profiles, no scraping of individuals. Everything is behind ADMIN_TOKEN.
//
// Additive only: new tables, created next to the growth tables in the AppState SQLite DO.
// Dependency-free so it runs unchanged in Node tests against node:sqlite.

export const PROSPECT_STAGES = ["new", "messaged", "replied", "interested", "converted", "not_interested", "skip"];
const REPLIED = new Set(["replied", "interested", "converted", "not_interested"]);
const MAX_IMPORT = 500;

const str = (v, n) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const text = (v, n) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, n);

/** Same rules as the lead form: bare 10-digit Indian mobiles become +91…; junk becomes "". */
export function prospectPhone(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const plus = s.startsWith("+");
  let d = s.replace(/\D/g, "");
  if (!plus && d.length === 11 && d.startsWith("0")) d = d.slice(1); // 0124 2xxxxxx / 098xxxxxxxx
  if (d.length < 7 || d.length > 15) return "";
  if (!plus && d.length === 10) return "+91" + d;
  if (!plus && d.length === 12 && d.startsWith("91")) return "+" + d;
  return (plus ? "+" : "") + d;
}

/** True for +91 mobile numbers — the only ones worth a WhatsApp message. */
export const isIndianMobile = (p) => /^\+91[6-9]\d{9}$/.test(String(p || ""));

const MAPS_HOSTS = /^(www\.)?(google\.[a-z.]+|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl)$/i;
export function mapsUrl(raw) {
  try {
    const u = new URL(String(raw || ""));
    if (u.protocol !== "https:" || !MAPS_HOSTS.test(u.hostname)) return "";
    if (/google\./i.test(u.hostname) && !u.pathname.startsWith("/maps")) return "";
    return u.href.slice(0, 600);
  } catch { return ""; }
}

/** Category text → preview-builder vertical (null when no preview template fits yet). */
export function verticalFor(category) {
  const c = String(category || "").toLowerCase();
  if (/dent|clinic|doctor|physio|hospital|diagnost|skin|derma|eye|ortho|pediatric|homeopath|ayurved/.test(c)) return "dental";
  if (/real estate|property|realtor|builder|developer|broker/.test(c)) return "realestate";
  if (/chartered|accountant|\bca\b|tax|lawyer|advocate|legal|consult|insurance|financial|architect|interior/.test(c)) return "pro";
  if (/gym|fitness|yoga|crossfit|pilates|martial|zumba|dance/.test(c)) return "fitness";
  if (/restaurant|cafe|café|bakery|food|dhaba|sweet|caterer|cloud kitchen|bar|pub|pizza|biryani/.test(c)) return "restaurant";
  return null;
}

/**
 * Priority 0–100. Established independents (roughly 30–800 reviews, high rating, WhatsApp-able
 * number) come first: real demand, owner-reachable, most to gain from a site. Very large
 * listings are tapered down because they are usually chains/brands with a site elsewhere.
 * No phone → 0 (nothing to act on).
 */
export function scoreProspect({ phone, rating, reviews }) {
  if (!phone) return 0;
  const n = Math.max(0, Number(reviews) || 0);
  let reviewsPart = Math.min(50, (50 * Math.log10(1 + n)) / Math.log10(301));
  // Past ~800 reviews a listing is usually a chain or established brand: likely has a site
  // elsewhere, an agency, and a front-desk number. Taper them down (floor 10 at ~4,000+).
  if (n > 800) reviewsPart = Math.max(10, 50 - (40 * Math.log10(n / 800)) / Math.log10(5));
  const r = Number(rating);
  const ratingPart = Number.isFinite(r) && r > 0 ? Math.min(1, Math.max(0, (r - 3.5) / 1.5)) * 40 : 0;
  const mobilePart = isIndianMobile(phone) ? 10 : 0;
  return Math.round(reviewsPart + ratingPart + mobilePart);
}

const dedupeKey = (p) => (p.phone ? "tel:" + p.phone : "name:" + (p.name + "|" + (p.area || p.address)).toLowerCase().replace(/[^a-z0-9|]+/g, "").slice(0, 120));

/** Validate one uploaded record. Returns { ok, error, prospect }. */
export function validateProspect(raw = {}) {
  const name = str(raw.name, 120);
  if (!name) return { ok: false, error: "missing name" };
  if (str(raw.website, 300)) return { ok: false, error: "has a website" };
  const rating = Number(raw.rating);
  const reviews = Math.round(Number(raw.reviews));
  const p = {
    name,
    category: str(raw.category, 80),
    area: str(raw.area, 80),
    address: str(raw.address, 200),
    phone: prospectPhone(raw.phone),
    rating: Number.isFinite(rating) && rating >= 0 && rating <= 5 ? Math.round(rating * 10) / 10 : null,
    reviews: Number.isFinite(reviews) && reviews >= 0 && reviews < 10_000_000 ? reviews : null,
    maps_url: mapsUrl(raw.maps_url),
    query: str(raw.query, 120),
  };
  p.vertical = verticalFor(p.category);
  p.score = scoreProspect(p);
  p.dedupe = dedupeKey(p);
  return { ok: true, prospect: p };
}

export function ensureProspectSchema(sql) {
  sql.exec(`
    CREATE TABLE IF NOT EXISTS growth_prospects (
      id TEXT PRIMARY KEY,
      dedupe TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      vertical TEXT,
      area TEXT,
      address TEXT,
      phone TEXT,
      rating REAL,
      reviews INTEGER,
      maps_url TEXT,
      query TEXT,
      score INTEGER NOT NULL DEFAULT 0,
      stage TEXT NOT NULL DEFAULT 'new',
      contacted_at TEXT,
      replied_at TEXT,
      next_action_at TEXT,
      notes TEXT,
      preview_id TEXT,
      lead_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_growth_prospects_stage ON growth_prospects(stage,score);
    CREATE INDEX IF NOT EXISTS idx_growth_prospects_contacted ON growth_prospects(contacted_at);
  `);
}

function prospectId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "P-" + Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * Upsert a batch. Re-running the finder refreshes rating/reviews/score of known businesses
 * but never touches Sahil's stage, notes or dates.
 */
export function importProspects(sql, list, nowMs = Date.now()) {
  if (!Array.isArray(list)) return { status: 400, body: { ok: false, error: "Send { prospects: [...] }." } };
  if (list.length > MAX_IMPORT) return { status: 413, body: { ok: false, error: `At most ${MAX_IMPORT} prospects per upload.` } };
  const now = new Date(nowMs).toISOString();
  let added = 0, updated = 0;
  const skipped = {};
  for (const raw of list) {
    const v = validateProspect(raw && typeof raw === "object" ? raw : {});
    if (!v.ok) { skipped[v.error] = (skipped[v.error] || 0) + 1; continue; }
    const p = v.prospect;
    const existing = sql.exec("SELECT id FROM growth_prospects WHERE dedupe=?", p.dedupe).toArray()[0];
    if (existing) {
      sql.exec(
        `UPDATE growth_prospects SET updated_at=?,rating=COALESCE(?,rating),reviews=COALESCE(?,reviews),score=?,
          category=COALESCE(NULLIF(?,''),category),vertical=COALESCE(?,vertical),address=COALESCE(NULLIF(?,''),address),
          maps_url=COALESCE(NULLIF(?,''),maps_url) WHERE id=?`,
        now, p.rating, p.reviews, p.score, p.category, p.vertical, p.address, p.maps_url, existing.id,
      );
      updated++;
    } else {
      sql.exec(
        `INSERT INTO growth_prospects (id,dedupe,created_at,updated_at,name,category,vertical,area,address,phone,rating,reviews,maps_url,query,score)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        prospectId(), p.dedupe, now, now, p.name, p.category, p.vertical, p.area, p.address, p.phone, p.rating, p.reviews, p.maps_url, p.query, p.score,
      );
      added++;
    }
  }
  return { status: 200, body: { ok: true, added, updated, skipped } };
}

const COLUMNS = "id,created_at,updated_at,name,category,vertical,area,address,phone,rating,reviews,maps_url,query,score,stage,contacted_at,replied_at,next_action_at,notes,preview_id,lead_id";

export function listProspects(sql, { stage = "", q = "", limit = 300 } = {}) {
  const where = [], args = [];
  if (PROSPECT_STAGES.includes(stage)) { where.push("stage=?"); args.push(stage); }
  else if (stage !== "all") where.push("stage NOT IN ('skip','not_interested','converted')");
  const term = str(q, 60).toLowerCase();
  if (term) { where.push("(lower(name) LIKE ? OR lower(category) LIKE ? OR lower(area) LIKE ? OR lower(query) LIKE ?)"); const t = "%" + term + "%"; args.push(t, t, t, t); }
  const sqlText = `SELECT ${COLUMNS} FROM growth_prospects ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY CASE stage WHEN 'interested' THEN 0 WHEN 'replied' THEN 1 WHEN 'new' THEN 2 WHEN 'messaged' THEN 3 ELSE 4 END, score DESC, created_at DESC LIMIT ?`;
  return sql.exec(sqlText, ...args, Math.min(1000, Math.max(1, Number(limit) || 300))).toArray();
}

/** Outreach numbers for the daily scorecard and the "messages sent today" cap. */
export function prospectStats(sql, nowMs = Date.now()) {
  const day = new Date(nowMs).toISOString().slice(0, 10);
  const one = (q, ...a) => Number(sql.exec(q, ...a).toArray()[0]?.n || 0);
  const by = Object.fromEntries(PROSPECT_STAGES.map((s) => [s, 0]));
  for (const r of sql.exec("SELECT stage,COUNT(*) AS n FROM growth_prospects GROUP BY stage").toArray()) by[r.stage] = Number(r.n);
  return {
    total: Object.values(by).reduce((a, b) => a + b, 0),
    by_stage: by,
    found_today: one("SELECT COUNT(*) AS n FROM growth_prospects WHERE substr(created_at,1,10)=?", day),
    messaged_today: one("SELECT COUNT(*) AS n FROM growth_prospects WHERE substr(contacted_at,1,10)=?", day),
    replies_today: one("SELECT COUNT(*) AS n FROM growth_prospects WHERE substr(replied_at,1,10)=?", day),
    follow_ups_due: one("SELECT COUNT(*) AS n FROM growth_prospects WHERE stage IN ('messaged','replied','interested') AND next_action_at<>'' AND next_action_at<=?", day),
  };
}

export function updateProspect(sql, id, patch = {}, nowMs = Date.now()) {
  const row = sql.exec(`SELECT ${COLUMNS} FROM growth_prospects WHERE id=?`, id).toArray()[0];
  if (!row) return { status: 404, body: { ok: false, error: "Prospect not found." } };
  const now = new Date(nowMs).toISOString();
  const set = {};
  if (patch.stage !== undefined) {
    if (!PROSPECT_STAGES.includes(patch.stage)) return { status: 400, body: { ok: false, error: "Unknown stage." } };
    set.stage = patch.stage;
    if (patch.stage !== "new" && patch.stage !== "skip" && !row.contacted_at) set.contacted_at = now;
    if (REPLIED.has(patch.stage) && !row.replied_at) set.replied_at = now;
  }
  if (patch.notes !== undefined) set.notes = text(patch.notes, 2000);
  if (patch.next_action_at !== undefined) {
    const d = str(patch.next_action_at, 10);
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return { status: 400, body: { ok: false, error: "next_action_at must be YYYY-MM-DD." } };
    set.next_action_at = d;
  }
  if (patch.preview_id !== undefined) {
    const p = str(patch.preview_id, 6);
    if (p && !/^[a-z2-9]{6}$/.test(p)) return { status: 400, body: { ok: false, error: "Invalid preview id." } };
    set.preview_id = p;
  }
  const keys = Object.keys(set);
  if (!keys.length) return { status: 400, body: { ok: false, error: "Nothing to update." } };
  sql.exec(`UPDATE growth_prospects SET ${keys.map((k) => k + "=?").join(",")},updated_at=? WHERE id=?`, ...keys.map((k) => set[k]), now, id);
  return { status: 200, body: { ok: true, prospect: sql.exec(`SELECT ${COLUMNS} FROM growth_prospects WHERE id=?`, id).toArray()[0] } };
}

/**
 * Interested prospect → a real pipeline lead (stage "qualified", source "outbound"), so it
 * shows up in the MIS revenue numbers. `newLeadId` is injected (growth.mjs leadRef).
 */
export function convertProspect(sql, id, newLeadId, nowMs = Date.now()) {
  const p = sql.exec(`SELECT ${COLUMNS} FROM growth_prospects WHERE id=?`, id).toArray()[0];
  if (!p) return { status: 404, body: { ok: false, error: "Prospect not found." } };
  if (p.lead_id) return { status: 409, body: { ok: false, error: "Already converted to " + p.lead_id + ".", lead_id: p.lead_id } };
  const now = new Date(nowMs).toISOString();
  const leadId = newLeadId(nowMs);
  const message = [
    "Outbound prospect " + p.id + " (no website).",
    [p.category, p.area].filter(Boolean).join(" · "),
    p.rating != null ? `Google ${p.rating}★ (${p.reviews ?? 0} reviews)` : "",
    p.maps_url, p.preview_id ? "Preview /p/" + p.preview_id : "",
    p.notes ? "Notes: " + p.notes : "",
  ].filter(Boolean).join("\n").slice(0, 1600);
  sql.exec(
    `INSERT INTO growth_leads (id,created_at,updated_at,name,phone,email,business,website,offer,budget,timeline,message,contact_pref,
      source,medium,campaign,referrer,landing_page,page,cta,stage,is_test) VALUES (?,?,?,?,?,'',?,'','founding-website-999','','',?,'whatsapp','outbound','whatsapp','maps-prospecting','','/','/admin','prospect','qualified',0)`,
    leadId, now, now, p.name, p.phone, p.name, message,
  );
  sql.exec("INSERT INTO growth_lead_log (lead_id,at,change) VALUES (?,?,?)", leadId, now, "created from prospect " + p.id);
  sql.exec("UPDATE growth_prospects SET stage='converted',lead_id=?,updated_at=?,replied_at=COALESCE(replied_at,?),contacted_at=COALESCE(contacted_at,?) WHERE id=?", leadId, now, now, now, id);
  return { status: 201, body: { ok: true, lead_id: leadId } };
}

/** Admin routes (caller has already checked ADMIN_TOKEN). Returns null when not a prospect route. */
export async function handleProspectsAdmin(request, { sql, url, nowMs = Date.now(), json, leadRef }) {
  const path = url.pathname, method = request.method.toUpperCase();
  if (path === "/api/admin/prospects" && method === "GET") {
    return json({ ok: true, stages: PROSPECT_STAGES, stats: prospectStats(sql, nowMs), prospects: listProspects(sql, {
      stage: url.searchParams.get("stage") || "", q: url.searchParams.get("q") || "", limit: url.searchParams.get("limit"),
    }) });
  }
  if (path === "/api/admin/prospects/import" && method === "POST") {
    const body = await request.json().catch(() => null);
    const r = importProspects(sql, Array.isArray(body) ? body : body?.prospects, nowMs);
    return json(r.body, r.status);
  }
  const m = path.match(/^\/api\/admin\/prospects\/(P-[A-Z2-9]{8})(\/convert)?$/);
  if (m && !m[2] && method === "PATCH") {
    const r = updateProspect(sql, m[1], await request.json().catch(() => ({})), nowMs);
    return json(r.body, r.status);
  }
  if (m && m[2] && method === "POST") {
    const r = convertProspect(sql, m[1], leadRef, nowMs);
    return json(r.body, r.status);
  }
  return null;
}
