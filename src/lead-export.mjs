// XEND-HQ-01 — one-way export of inbound website leads to the Command Center.
//
// Decision (Sahil, 2026-10-22): the Worker is the source of truth for website leads. The Command
// Center (Google Sheet) owns outreach, approvals and suppression, and only *reads* leads from here.
// Nothing in the Sheet ever writes back into the Worker.
//
// How it works — a pull feed, so the Worker needs no outbound secrets, cron or retry loop:
//   1. Every lead change bumps growth_leads.updated_at (createLead / updateLead / convertProspect).
//   2. On each feed read, any (lead_id, updated_at) pair not yet queued gets a new, strictly
//      increasing `seq` in growth_lead_export. UNIQUE(lead_id, version) makes this idempotent, so
//      no write path has to remember to enqueue anything.
//   3. The consumer (operations/apps-script/LeadImport.gs) asks for `seq > cursor`, upserts rows
//      by lead_id only when `version` is newer, and moves its cursor only after the write.
//      Retry = ask again with the same cursor; duplicates are skipped by version.
//   4. The consumer acks the last seq it stored. Acks are audit-only (export lag in /admin), they
//      never delete or change anything here.
//
// Test leads (is_test=1) are never exported. Internal notes are not exported.

export const EXPORT_COLUMNS = [
  "id", "created_at", "updated_at", "name", "phone", "email", "business", "website", "offer", "budget",
  "timeline", "message", "contact_pref", "source", "medium", "campaign", "landing_page", "page", "cta",
  "stage", "quote_value", "collected_value", "next_action", "next_action_at",
];
export const MAX_PAGE = 200;
const CONSUMER_RE = /^[a-z0-9][a-z0-9_-]{1,39}$/;

export function ensureExportSchema(sql) {
  sql.exec(`
    CREATE TABLE IF NOT EXISTS growth_lead_export (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id TEXT NOT NULL,
      version TEXT NOT NULL,
      queued_at TEXT NOT NULL,
      UNIQUE(lead_id, version)
    );
    CREATE TABLE IF NOT EXISTS growth_export_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      consumer TEXT NOT NULL,
      kind TEXT NOT NULL,
      after_seq INTEGER NOT NULL,
      last_seq INTEGER NOT NULL,
      count INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_growth_export_log ON growth_export_log(consumer,kind,id);
  `);
}

/** Queue every lead version that is not queued yet. Safe to call any number of times. */
export function syncExportQueue(sql, nowMs = Date.now()) {
  const now = new Date(nowMs).toISOString();
  sql.exec(
    `INSERT OR IGNORE INTO growth_lead_export (lead_id, version, queued_at)
     SELECT id, updated_at, ? FROM growth_leads WHERE is_test=0 ORDER BY updated_at, id`,
    now,
  );
}

const maxSeq = (sql) => Number(sql.exec("SELECT COALESCE(MAX(seq),0) AS n FROM growth_lead_export").toArray()[0]?.n || 0);
const toInt = (v, d = 0) => (Number.isSafeInteger(Number(v)) && Number(v) >= 0 ? Number(v) : d);

/**
 * Feed page: queue entries with seq > after, each carrying the lead's *current* snapshot.
 * A lead can appear more than once across pages; consumers keep the highest `version`.
 */
export function exportFeed(sql, { after = 0, limit = 100, consumer = "command-center", nowMs = Date.now() } = {}) {
  if (!CONSUMER_RE.test(consumer)) return { status: 400, body: { ok: false, error: "consumer must be 2-40 chars: a-z 0-9 _ -" } };
  const from = toInt(after, -1);
  if (from < 0) return { status: 400, body: { ok: false, error: "after must be a non-negative integer." } };
  const size = Math.min(MAX_PAGE, Math.max(1, toInt(limit, 100) || 100));
  syncExportQueue(sql, nowMs);
  // The page is a fixed seq window; entries for leads later marked as test are skipped inside it,
  // and the cursor still moves past them.
  const scanned = sql.exec("SELECT seq FROM growth_lead_export WHERE seq>? ORDER BY seq LIMIT ?", from, size).toArray();
  const lastScanned = scanned.length ? Number(scanned[scanned.length - 1].seq) : from;
  const cols = EXPORT_COLUMNS.map((c) => "l." + c).join(",");
  const rows = sql.exec(
    `SELECT q.seq AS seq, ${cols} FROM growth_lead_export q JOIN growth_leads l ON l.id=q.lead_id
     WHERE q.seq>? AND q.seq<=? AND l.is_test=0 ORDER BY q.seq`,
    from, lastScanned,
  ).toArray();
  const items = rows.map(({ seq, ...lead }) => ({ seq: Number(seq), lead_id: lead.id, version: lead.updated_at, lead }));
  const head = maxSeq(sql);
  sql.exec(
    "INSERT INTO growth_export_log (at,consumer,kind,after_seq,last_seq,count) VALUES (?,?,?,?,?,?)",
    new Date(nowMs).toISOString(), consumer, "read", from, lastScanned, items.length,
  );
  return { status: 200, body: { ok: true, after: from, next_after: lastScanned, has_more: lastScanned < head, head_seq: head, items } };
}

/** Consumer confirms it stored everything up to through_seq. Audit only. */
export function ackExport(sql, { consumer = "", through_seq } = {}, nowMs = Date.now()) {
  if (!CONSUMER_RE.test(consumer)) return { status: 400, body: { ok: false, error: "consumer must be 2-40 chars: a-z 0-9 _ -" } };
  const through = toInt(through_seq, -1);
  const head = maxSeq(sql);
  if (through < 0 || through > head) return { status: 400, body: { ok: false, error: "through_seq must be between 0 and the head of the feed." } };
  const prev = lastAck(sql, consumer);
  sql.exec(
    "INSERT INTO growth_export_log (at,consumer,kind,after_seq,last_seq,count) VALUES (?,?,?,?,?,?)",
    new Date(nowMs).toISOString(), consumer, "ack", prev?.last_seq ?? 0, through, 0,
  );
  return { status: 200, body: { ok: true, consumer, through_seq: through, lag: head - through } };
}

function lastAck(sql, consumer) {
  return sql.exec("SELECT at,last_seq FROM growth_export_log WHERE consumer=? AND kind='ack' ORDER BY id DESC LIMIT 1", consumer).toArray()[0] || null;
}

/** Export health for /admin and for the Command Center audit. */
export function exportStatus(sql, nowMs = Date.now()) {
  syncExportQueue(sql, nowMs);
  const head = maxSeq(sql);
  const consumers = sql.exec("SELECT DISTINCT consumer FROM growth_export_log ORDER BY consumer").toArray().map(({ consumer }) => {
    const ack = lastAck(sql, consumer);
    const read = sql.exec("SELECT at FROM growth_export_log WHERE consumer=? AND kind='read' ORDER BY id DESC LIMIT 1", consumer).toArray()[0];
    return { consumer, last_read_at: read?.at || "", last_ack_at: ack?.at || "", acked_through: ack ? Number(ack.last_seq) : 0, lag: head - (ack ? Number(ack.last_seq) : 0) };
  });
  return { ok: true, head_seq: head, consumers };
}
