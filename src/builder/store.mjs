// XEND-BUILDER-001 — builder persistence, ownership, quotas and the free-tier spend guard.
//
// Runs inside the existing AppState Durable Object (SQLite), next to users/sessions. Additive
// tables only (builder_*); nothing in the existing schema is touched. Dependency-injected
// (sql, env, user, now) so the same code runs in Node tests against node:sqlite.
//
// Ownership: a project belongs to "u:<user id>" (signed in) or "g:<hash of guest cookie>".
// Every query filters on owner, so one visitor can never read another visitor's project.
// Guests can claim their projects into an account after signing in.
//
// Spend guard: before any AI call the Worker must obtain a reservation here. A reservation
// holds the worst-case neuron cost of one request against today's budget (default 8,000 of
// the 10,000 free Workers AI neurons/day) and is settled with the real usage afterwards.
// When the budget cannot cover another worst-case request, generation pauses until 00:00 UTC.

import { adminAuth } from "../growth.mjs";
import { cleanFileMap, checkPrompt, projectNameFrom, LIMITS } from "./output.mjs";
import { describeProviders } from "./ai.mjs";
import { zipFiles } from "./zip.mjs";

export const GUEST_COOKIE = "xs_bguest";

export function builderConfig(env = {}) {
  const num = (v, d) => (Number.isFinite(Number(v)) && String(v).trim() !== "" ? Number(v) : d);
  return {
    enabled: env.BUILDER_ENABLED !== "false",
    dailyNeuronBudget: num(env.BUILDER_DAILY_NEURON_BUDGET, 8000),
    requestNeuronCap: num(env.BUILDER_REQUEST_NEURON_CAP, 1200),
    guestDaily: num(env.BUILDER_GUEST_DAILY, 3),
    userDaily: num(env.BUILDER_USER_DAILY, 12),
    ipDaily: num(env.BUILDER_IP_DAILY, 15),
    guestProjects: num(env.BUILDER_GUEST_PROJECTS, 3),
    userProjects: num(env.BUILDER_USER_PROJECTS, 25),
    versionsKept: num(env.BUILDER_VERSIONS_KEPT, 30),
    reservationTtlSec: 300,
  };
}

// Bump when generation/edit behaviour changes: the live check waits until a deployment reports it,
// so it never tests a stale Cloudflare preview.
export const BUILDER_API_VERSION = 2;

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
});
const day = (ms) => new Date(ms).toISOString().slice(0, 10);
const iso = (ms) => new Date(ms).toISOString();
const str = (v, n) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const nextResetIso = (ms) => { const d = new Date(ms); d.setUTCHours(24, 0, 0, 0); return d.toISOString(); };

async function sha256Hex(value) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
const projectId = () => "bp_" + Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");

export function cookieValue(header, name) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) { try { return decodeURIComponent(v.join("=")); } catch { return null; } }
  }
  return null;
}
const guestCookie = (token) => `${GUEST_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 60}`;

export function ensureBuilderSchema(sql) {
  sql.exec(`
    CREATE TABLE IF NOT EXISTS builder_projects (
      id TEXT PRIMARY KEY,
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      prompt TEXT NOT NULL DEFAULT '',
      files TEXT NOT NULL DEFAULT '{}',
      version INTEGER NOT NULL DEFAULT 0,
      bytes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_builder_projects_owner ON builder_projects(owner,updated_at);
    CREATE TABLE IF NOT EXISTS builder_versions (
      project_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      kind TEXT NOT NULL,
      instruction TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      files TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      PRIMARY KEY(project_id,version)
    );
    CREATE TABLE IF NOT EXISTS builder_usage (
      day TEXT NOT NULL,
      subject TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(day,subject)
    );
    CREATE TABLE IF NOT EXISTS builder_budget (
      day TEXT PRIMARY KEY,
      reserved REAL NOT NULL DEFAULT 0,
      used REAL NOT NULL DEFAULT 0,
      requests INTEGER NOT NULL DEFAULT 0,
      ok INTEGER NOT NULL DEFAULT 0,
      failed INTEGER NOT NULL DEFAULT 0,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS builder_reservations (
      id TEXT PRIMARY KEY,
      owner TEXT NOT NULL,
      ip_key TEXT NOT NULL,
      project_id TEXT,
      mode TEXT NOT NULL,
      prompt TEXT NOT NULL,
      day TEXT NOT NULL,
      neurons REAL NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS builder_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      owner_kind TEXT NOT NULL,
      mode TEXT NOT NULL,
      ok INTEGER NOT NULL,
      provider TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      neurons REAL NOT NULL DEFAULT 0,
      ms INTEGER NOT NULL DEFAULT 0,
      error TEXT NOT NULL DEFAULT ''
    );
  `);
}

const one = (sql, q, ...a) => sql.exec(q, ...a).toArray()[0];
const parseFiles = (s) => { try { const o = JSON.parse(s || "{}"); return o && typeof o === "object" ? o : {}; } catch { return {}; } };
const bytesOf = (files) => new TextEncoder().encode(JSON.stringify(files)).length;

function budgetRow(sql, d) {
  sql.exec("INSERT OR IGNORE INTO builder_budget (day) VALUES (?)", d);
  return one(sql, "SELECT * FROM builder_budget WHERE day=?", d);
}

/** Expire abandoned reservations: their worst-case cost is kept as "used" (conservative). */
function expireReservations(sql, nowMs, cfg) {
  const cutoff = Math.floor(nowMs / 1000) - cfg.reservationTtlSec;
  for (const r of sql.exec("SELECT id,day,neurons FROM builder_reservations WHERE created_at<?", cutoff).toArray()) {
    budgetRow(sql, r.day);
    sql.exec("UPDATE builder_budget SET reserved=MAX(0,reserved-?), used=used+?, failed=failed+1 WHERE day=?", r.neurons, r.neurons, r.day);
    sql.exec("DELETE FROM builder_reservations WHERE id=?", r.id);
  }
}

function usageCount(sql, d, subject) {
  return Number(one(sql, "SELECT count FROM builder_usage WHERE day=? AND subject=?", d, subject)?.count || 0);
}
function bumpUsage(sql, d, subject, by) {
  sql.exec("INSERT INTO builder_usage (day,subject,count) VALUES (?,?,MAX(0,?)) ON CONFLICT(day,subject) DO UPDATE SET count=MAX(0,count+?)", d, subject, by, by);
}

export function quotaFor(sql, owner, nowMs, env) {
  const cfg = builderConfig(env);
  const d = day(nowMs);
  const limit = owner.startsWith("u:") ? cfg.userDaily : cfg.guestDaily;
  const used = usageCount(sql, d, owner);
  const b = budgetRow(sql, d);
  const left = cfg.dailyNeuronBudget - Number(b.used) - Number(b.reserved);
  return {
    limit, used, remaining: Math.max(0, limit - used),
    capacity: { available: cfg.enabled && left >= cfg.requestNeuronCap, percentLeft: Math.max(0, Math.round((left / cfg.dailyNeuronBudget) * 100)) },
    resetsAt: nextResetIso(nowMs),
  };
}

// ---------- owner resolution ----------

/** user: {id,name,email}|null from the session. Returns owner + a Set-Cookie to mint a guest id. */
export async function resolveOwner(request, user, { mint = false } = {}) {
  if (user?.id) return { owner: "u:" + user.id, kind: "user", user, setCookie: null };
  let token = cookieValue(request.headers.get("cookie"), GUEST_COOKIE);
  if (token && !/^[a-f0-9]{48}$/.test(token)) token = null;
  let setCookie = null;
  if (!token) {
    if (!mint) return { owner: null, kind: "anonymous", user: null, setCookie: null };
    token = randomToken();
    setCookie = guestCookie(token);
  }
  return { owner: "g:" + (await sha256Hex("guest|" + token)).slice(0, 32), kind: "guest", user: null, setCookie };
}

// ---------- projects ----------

export function listProjects(sql, owner) {
  return sql.exec("SELECT id,name,version,bytes,created_at,updated_at,files FROM builder_projects WHERE owner=? ORDER BY updated_at DESC LIMIT 100", owner)
    .toArray().map((p) => {
      const files = parseFiles(p.files);
      return { id: p.id, name: p.name, version: Number(p.version), bytes: Number(p.bytes), files: Object.keys(files), created_at: p.created_at, updated_at: p.updated_at };
    });
}

export function getProject(sql, owner, id, { withVersions = true } = {}) {
  const p = one(sql, "SELECT * FROM builder_projects WHERE id=? AND owner=?", String(id), owner);
  if (!p) return null;
  const out = { id: p.id, name: p.name, prompt: p.prompt, files: parseFiles(p.files), version: Number(p.version), bytes: Number(p.bytes), created_at: p.created_at, updated_at: p.updated_at };
  if (withVersions) {
    out.versions = sql.exec("SELECT version,kind,instruction,summary,provider,model,created_at FROM builder_versions WHERE project_id=? ORDER BY version ASC", p.id)
      .toArray().map((v) => ({ ...v, version: Number(v.version) }));
  }
  return out;
}

function addVersion(sql, projectRow, files, { kind, instruction = "", summary = "", provider = "", model = "" }, nowMs, cfg) {
  const version = Number(projectRow.version) + 1;
  const now = iso(nowMs);
  const body = JSON.stringify(files);
  sql.exec("INSERT INTO builder_versions (project_id,version,kind,instruction,summary,files,provider,model,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    projectRow.id, version, kind, str(instruction, LIMITS.maxPromptChars), str(summary, 400), body, provider, model, now);
  sql.exec("UPDATE builder_projects SET files=?, version=?, bytes=?, updated_at=? WHERE id=?", body, version, bytesOf(files), now, projectRow.id);
  sql.exec("DELETE FROM builder_versions WHERE project_id=? AND version<=?", projectRow.id, version - cfg.versionsKept);
  return version;
}

function projectCount(sql, owner) {
  return Number(one(sql, "SELECT COUNT(*) AS n FROM builder_projects WHERE owner=?", owner).n);
}

function createProjectRow(sql, owner, { name, prompt = "" }, nowMs) {
  const id = projectId();
  const now = iso(nowMs);
  sql.exec("INSERT INTO builder_projects (id,owner,name,prompt,files,version,bytes,created_at,updated_at) VALUES (?,?,?,?, '{}',0,2,?,?)", id, owner, str(name, LIMITS.maxNameChars) || "Untitled site", str(prompt, LIMITS.maxPromptChars), now, now);
  return one(sql, "SELECT * FROM builder_projects WHERE id=?", id);
}

// ---------- reservations (called by the Worker around each AI request) ----------

export async function reserve(sql, { owner, ownerKind, ipKey, projectId: pid, prompt, mode }, { env = {}, nowMs = Date.now() } = {}) {
  const cfg = builderConfig(env);
  if (!cfg.enabled) return { status: 503, body: { ok: false, code: "disabled", error: "The AI builder is paused right now. You can still request a professional build." } };
  const check = checkPrompt(prompt);
  if (!check.ok) return { status: 400, body: { ok: false, code: "bad_prompt", error: check.error } };
  expireReservations(sql, nowMs, cfg);
  const d = day(nowMs);
  if (one(sql, "SELECT id FROM builder_reservations WHERE owner=?", owner)) return { status: 429, body: { ok: false, code: "busy", error: "A generation is already running for you. Wait for it to finish." } };
  const limit = ownerKind === "user" ? cfg.userDaily : cfg.guestDaily;
  if (usageCount(sql, d, owner) >= limit) {
    return { status: 429, body: { ok: false, code: "quota", error: ownerKind === "user" ? `You've used today's ${limit} free AI generations. They reset at 00:00 UTC.` : `You've used today's ${limit} free guest generations. Create a free account for more, or come back after 00:00 UTC.`, resetsAt: nextResetIso(nowMs), signInForMore: ownerKind !== "user" } };
  }
  if (usageCount(sql, d, "ip:" + ipKey) >= cfg.ipDaily) return { status: 429, body: { ok: false, code: "quota", error: "This connection has reached today's free generation limit. It resets at 00:00 UTC.", resetsAt: nextResetIso(nowMs) } };
  const b = budgetRow(sql, d);
  if (cfg.dailyNeuronBudget - Number(b.used) - Number(b.reserved) < cfg.requestNeuronCap) {
    return { status: 503, body: { ok: false, code: "capacity", error: "Today's free AI capacity is used up. It resets at 00:00 UTC — or let our team build it for you.", resetsAt: nextResetIso(nowMs) } };
  }
  let files = {};
  if (mode === "edit") {
    const p = one(sql, "SELECT id,files FROM builder_projects WHERE id=? AND owner=?", String(pid || ""), owner);
    if (!p) return { status: 404, body: { ok: false, code: "not_found", error: "Project not found." } };
    files = parseFiles(p.files);
    if (!files["index.html"]) return { status: 409, body: { ok: false, code: "empty", error: "This project has no website yet. Describe one to generate it first." } };
    // Bounds the input side of one request (~45k tokens) so it always fits the reservation.
    if (bytesOf(files) > 140_000) return { status: 413, body: { ok: false, code: "too_large", error: "This project is too large for AI edits on the free tier. Edit the code directly, or ask our team to extend it." } };
  } else {
    const max = ownerKind === "user" ? cfg.userProjects : cfg.guestProjects;
    if (projectCount(sql, owner) >= max) return { status: 409, body: { ok: false, code: "project_limit", error: ownerKind === "user" ? `You have ${max} projects. Delete one to create another.` : `Guests can keep ${max} projects. Create a free account to keep more, or delete one.`, signInForMore: ownerKind !== "user" } };
  }
  const id = "rsv_" + randomToken().slice(0, 20);
  sql.exec("INSERT INTO builder_reservations (id,owner,ip_key,project_id,mode,prompt,day,neurons,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    id, owner, ipKey, mode === "edit" ? String(pid) : null, mode, check.prompt, d, cfg.requestNeuronCap, Math.floor(nowMs / 1000));
  sql.exec("UPDATE builder_budget SET reserved=reserved+?, requests=requests+1 WHERE day=?", cfg.requestNeuronCap, d);
  bumpUsage(sql, d, owner, 1);
  bumpUsage(sql, d, "ip:" + ipKey, 1);
  return { status: 200, body: { ok: true, reservation: id, neuronAllowance: cfg.requestNeuronCap, prompt: check.prompt, files } };
}

function settle(sql, rsv, spent = []) {
  const neurons = Math.min(spent.reduce((n, s) => n + Number(s.neurons || 0), 0), Math.max(Number(rsv.neurons), 0) * 4);
  const inTok = spent.reduce((n, s) => n + Number(s.usage?.input || 0), 0);
  const outTok = spent.reduce((n, s) => n + Number(s.usage?.output || 0), 0);
  budgetRow(sql, rsv.day);
  sql.exec("UPDATE builder_budget SET reserved=MAX(0,reserved-?), used=used+?, input_tokens=input_tokens+?, output_tokens=output_tokens+? WHERE day=?", rsv.neurons, neurons, inTok, outTok, rsv.day);
  sql.exec("DELETE FROM builder_reservations WHERE id=?", rsv.id);
  return neurons;
}

export function commit(sql, { reservation, files, summary = "", provider = "", model = "", spent = [], ms = 0 }, { env = {}, nowMs = Date.now() } = {}) {
  const cfg = builderConfig(env);
  const rsv = one(sql, "SELECT * FROM builder_reservations WHERE id=?", String(reservation || ""));
  if (!rsv) return { status: 409, body: { ok: false, error: "Reservation expired. Please try again." } };
  const { files: clean } = cleanFileMap(files);
  const neurons = settle(sql, rsv, spent);
  sql.exec("UPDATE builder_budget SET ok=ok+1 WHERE day=?", rsv.day);
  let row;
  if (rsv.mode === "edit") {
    row = one(sql, "SELECT * FROM builder_projects WHERE id=? AND owner=?", rsv.project_id, rsv.owner);
    if (!row) return { status: 404, body: { ok: false, error: "Project not found." } };
  } else {
    row = createProjectRow(sql, rsv.owner, { name: projectNameFrom(rsv.prompt), prompt: rsv.prompt }, nowMs);
  }
  const version = addVersion(sql, row, clean, { kind: rsv.mode === "edit" ? "edit" : "generate", instruction: rsv.prompt, summary, provider, model }, nowMs, cfg);
  sql.exec("INSERT INTO builder_log (at,owner_kind,mode,ok,provider,model,neurons,ms) VALUES (?,?,?,1,?,?,?,?)", iso(nowMs), rsv.owner.slice(0, 1), rsv.mode, provider, model, neurons, Math.round(ms));
  return { status: 200, body: { ok: true, project: getProject(sql, rsv.owner, row.id), version } };
}

export function release(sql, { reservation, spent = [], error = "", ms = 0 }, { nowMs = Date.now() } = {}) {
  const rsv = one(sql, "SELECT * FROM builder_reservations WHERE id=?", String(reservation || ""));
  if (!rsv) return { status: 200, body: { ok: true } };
  const neurons = settle(sql, rsv, spent);
  sql.exec("UPDATE builder_budget SET failed=failed+1 WHERE day=?", rsv.day);
  // Our failure, not theirs: give the generation back to the visitor (the budget still pays).
  bumpUsage(sql, rsv.day, rsv.owner, -1);
  bumpUsage(sql, rsv.day, "ip:" + rsv.ip_key, -1);
  const last = spent[spent.length - 1] || {};
  sql.exec("INSERT INTO builder_log (at,owner_kind,mode,ok,provider,model,neurons,ms,error) VALUES (?,?,?,0,?,?,?,?,?)", iso(nowMs), rsv.owner.slice(0, 1), rsv.mode, last.provider || "", last.model || "", neurons, Math.round(ms), str(error, 200));
  return { status: 200, body: { ok: true } };
}

// ---------- admin report ----------

export function builderReport(sql, { days = 14, nowMs = Date.now(), env = {} } = {}) {
  const cfg = builderConfig(env);
  const n = Math.max(1, Math.min(90, Number(days) || 14));
  const since = day(nowMs - (n - 1) * 864e5);
  const budget = sql.exec("SELECT * FROM builder_budget WHERE day>=? ORDER BY day DESC", since).toArray();
  const projects = one(sql, "SELECT COUNT(*) AS n, SUM(CASE WHEN owner LIKE 'u:%' THEN 1 ELSE 0 END) AS users FROM builder_projects");
  const owners = one(sql, "SELECT COUNT(DISTINCT owner) AS n FROM builder_projects");
  const recent = sql.exec("SELECT at,owner_kind,mode,ok,provider,model,ROUND(neurons,1) AS neurons,ms,error FROM builder_log ORDER BY id DESC LIMIT 40").toArray();
  const byModel = sql.exec("SELECT provider,model,COUNT(*) AS calls,SUM(ok) AS ok,ROUND(SUM(neurons),1) AS neurons,ROUND(AVG(ms)) AS avg_ms FROM builder_log WHERE at>=? GROUP BY provider,model", since).toArray();
  return { ok: true, days: n, config: { dailyNeuronBudget: cfg.dailyNeuronBudget, requestNeuronCap: cfg.requestNeuronCap, guestDaily: cfg.guestDaily, userDaily: cfg.userDaily, enabled: cfg.enabled },
    totals: { projects: Number(projects?.n || 0), userProjects: Number(projects?.users || 0), owners: Number(owners?.n || 0) }, budget, byModel, recent };
}

// ---------- router (inside AppState.fetch) ----------

/**
 * Handles /api/builder/* (public, cookie-scoped) and /__builder/* (internal, only reachable
 * from the Worker because the Worker forwards nothing but /api/* to this Durable Object).
 * Returns null for other paths.
 */
export async function handleBuilderStore(request, { sql, env = {}, user = null, nowMs = Date.now() } = {}) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();
  const cfg = builderConfig(env);

  if (path === "/api/admin/builder" && method === "GET") {
    const auth = adminAuth(request, env);
    if (!auth.ok) return json({ ok: false, error: auth.error, ...(auth.code ? { code: auth.code } : {}) }, auth.status);
    return json(builderReport(sql, { days: url.searchParams.get("days"), nowMs, env }));
  }

  if (path.startsWith("/__builder/")) {
    const body = await request.json().catch(() => ({}));
    if (path === "/__builder/reserve" && method === "POST") {
      const who = await resolveOwner(request, user, { mint: true });
      const ipKey = (await sha256Hex(String(env.RATE_LIMIT_SALT || "xender-builder") + "|" + day(nowMs) + "|" + (request.headers.get("x-xs-ip") || "unknown"))).slice(0, 24);
      const r = await reserve(sql, { owner: who.owner, ownerKind: who.kind, ipKey, projectId: body.projectId, prompt: body.prompt, mode: body.mode === "edit" ? "edit" : "new" }, { env, nowMs });
      return json(r.body, r.status, who.setCookie ? { "x-xs-set-cookie": who.setCookie } : {});
    }
    if (path === "/__builder/commit" && method === "POST") { const r = commit(sql, body, { env, nowMs }); return json(r.body, r.status); }
    if (path === "/__builder/release" && method === "POST") { const r = release(sql, body, { nowMs }); return json(r.body, r.status); }
    return json({ ok: false, error: "not found" }, 404);
  }

  if (!path.startsWith("/api/builder/")) return null;

  if (path === "/api/builder/status" && method === "GET") {
    const who = await resolveOwner(request, user);
    const host = url.hostname;
    const q = who.owner ? quotaFor(sql, who.owner, nowMs, env) : { ...quotaFor(sql, "g:none", nowMs, env), used: 0, remaining: cfg.guestDaily, limit: cfg.guestDaily };
    return json({ ok: true, enabled: cfg.enabled, signedIn: who.kind === "user", user: who.user ? { name: who.user.name } : null,
      api: BUILDER_API_VERSION, providers: describeProviders(env, { host }), quota: q, limits: { guestDaily: cfg.guestDaily, userDaily: cfg.userDaily, guestProjects: cfg.guestProjects, userProjects: cfg.userProjects, maxPromptChars: LIMITS.maxPromptChars },
      output: "static HTML, CSS and JavaScript" });
  }

  const who = await resolveOwner(request, user, { mint: method !== "GET" });
  const withCookie = (res) => { if (who.setCookie) res.headers.append("set-cookie", who.setCookie); return res; };
  if (!who.owner) {
    if (path === "/api/builder/projects" && method === "GET") return json({ ok: true, projects: [] });
    return json({ ok: false, error: "Project not found." }, 404);
  }
  const owner = who.owner;

  if (path === "/api/builder/projects" && method === "GET") return json({ ok: true, projects: listProjects(sql, owner), signedIn: who.kind === "user" });

  if (path === "/api/builder/claim" && method === "POST") {
    if (who.kind !== "user") return json({ ok: false, error: "Sign in first." }, 401);
    const guest = await resolveOwner(new Request(url, { headers: { cookie: request.headers.get("cookie") || "" } }), null);
    if (!guest.owner) return json({ ok: true, claimed: 0 });
    const room = Math.max(0, cfg.userProjects - projectCount(sql, owner));
    const ids = sql.exec("SELECT id FROM builder_projects WHERE owner=? ORDER BY updated_at DESC LIMIT ?", guest.owner, room).toArray().map((r) => r.id);
    for (const id of ids) sql.exec("UPDATE builder_projects SET owner=? WHERE id=? AND owner=?", owner, id, guest.owner);
    return json({ ok: true, claimed: ids.length });
  }

  const m = path.match(/^\/api\/builder\/projects\/(bp_[a-z2-9]{9})(?:\/([a-z]+)(?:\/(\d{1,6}))?)?$/);
  if (!m) return json({ ok: false, error: "Builder route not found." }, 404);
  const [, id, action = "", arg] = m;
  const row = one(sql, "SELECT * FROM builder_projects WHERE id=? AND owner=?", id, owner);
  if (!row) return json({ ok: false, error: "Project not found." }, 404);

  if (!action && method === "GET") return json({ ok: true, project: getProject(sql, owner, id) });

  if (!action && method === "PATCH") {
    const body = await request.json().catch(() => ({}));
    if (body.name !== undefined) {
      const name = str(body.name, LIMITS.maxNameChars);
      if (!name) return json({ ok: false, error: "Name can't be empty." }, 400);
      sql.exec("UPDATE builder_projects SET name=?, updated_at=? WHERE id=?", name, iso(nowMs), id);
    }
    let warnings = [];
    if (body.files && typeof body.files === "object") {
      const { files, errors } = cleanFileMap(body.files);
      if (!files["index.html"]) return json({ ok: false, error: "index.html is required.", errors }, 400);
      warnings = errors;
      addVersion(sql, one(sql, "SELECT * FROM builder_projects WHERE id=?", id), files, { kind: "manual", instruction: "Manual code edit", summary: str(body.note, 200) || "Saved manual code changes." }, nowMs, cfg);
    }
    return json({ ok: true, project: getProject(sql, owner, id), warnings });
  }

  if (!action && method === "DELETE") {
    sql.exec("DELETE FROM builder_versions WHERE project_id=?", id);
    sql.exec("DELETE FROM builder_projects WHERE id=? AND owner=?", id, owner);
    return json({ ok: true, deleted: id });
  }

  if (action === "duplicate" && method === "POST") {
    const max = who.kind === "user" ? cfg.userProjects : cfg.guestProjects;
    if (projectCount(sql, owner) >= max) return withCookie(json({ ok: false, error: `Project limit reached (${max}). Delete one first.` }, 409));
    const copy = createProjectRow(sql, owner, { name: (row.name + " (copy)").slice(0, LIMITS.maxNameChars), prompt: row.prompt }, nowMs);
    addVersion(sql, copy, parseFiles(row.files), { kind: "duplicate", instruction: "Duplicated from " + row.name, summary: "Copy of version " + row.version + "." }, nowMs, cfg);
    return withCookie(json({ ok: true, project: getProject(sql, owner, copy.id) }, 201));
  }

  if (action === "versions" && arg && method === "GET") {
    const v = one(sql, "SELECT version,kind,instruction,summary,files,created_at FROM builder_versions WHERE project_id=? AND version=?", id, Number(arg));
    if (!v) return json({ ok: false, error: "Version not found." }, 404);
    return json({ ok: true, version: { ...v, version: Number(v.version), files: parseFiles(v.files) } });
  }

  if (action === "restore" && method === "POST") {
    const body = await request.json().catch(() => ({}));
    const v = one(sql, "SELECT version,files FROM builder_versions WHERE project_id=? AND version=?", id, Number(body.version));
    if (!v) return json({ ok: false, error: "Version not found." }, 404);
    addVersion(sql, row, parseFiles(v.files), { kind: "restore", instruction: "Restored version " + v.version, summary: "Restored version " + v.version + "." }, nowMs, cfg);
    return json({ ok: true, project: getProject(sql, owner, id) });
  }

  if (action === "export" && method === "GET") {
    const files = parseFiles(row.files);
    if (!Object.keys(files).length) return json({ ok: false, error: "Nothing to export yet." }, 409);
    const readme = `${row.name}\n${"=".repeat(Math.min(60, row.name.length))}\n\nGenerated with Xender Builder (https://www.xendersecrets.com/builder) on ${iso(nowMs).slice(0, 10)}.\nVersion ${row.version}.\n\nThis is a static website: open index.html in a browser, or upload these files to any static\nhost (Cloudflare Pages, Netlify, GitHub Pages, cPanel...).\n\nWant it launched on your own domain, connected to real forms, or extended?\nXender Secrets can do it for you: https://www.xendersecrets.com/builder/pricing\n`;
    const entries = [...Object.entries(files).map(([name, data]) => ({ name, data })), ...(files["README.txt"] ? [] : [{ name: "README.txt", data: readme }])];
    const zip = zipFiles(entries, new Date(nowMs));
    const fname = (row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "website").slice(0, 40);
    return new Response(zip, { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${fname}.zip"`, "cache-control": "no-store" } });
  }

  return json({ ok: false, error: "Builder route not found." }, 404);
}
