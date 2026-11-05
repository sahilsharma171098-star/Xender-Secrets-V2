// XEND-PM-001 — project memory: reads the repo's existing records and reconciles them.
//
// Sources (in priority order, all already in the repository — nothing new to maintain):
//   1. docs/MASTER_PENDING_TASKS.md + docs/RELEASE_GATES.md (PR #100). While #100 is unmerged the
//      committed cache in ops/pm/cache/ (or `git show <fallbackRef>:docs/...`) is used.
//   2. GitHub issue + PR metadata: ops/pm/state/github-snapshot.json (refreshed by `sync`, shared by
//      `sync-state`), falling back to the committed seed ops/pm/github-snapshot.json.
//   3. docs/TASKS.md — XEND-* task statuses.
//   4. ops/pm/state/overrides.json — evidence-backed corrections recorded with `xender-pm mark`.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { readJson, readText, writeJson, isoNow, redact, statePath } from "./util.mjs";

export function readSnapshot(root) {
  return readJson(statePath(root, "github-snapshot.json")) || readJson(path.join(root, "ops/pm/github-snapshot.json"), { pulls: [], issues: {} });
}

export function loadConfig(root) {
  const projects = readJson(path.join(root, "ops/pm/projects.json"));
  if (!projects) throw new Error(`ops/pm/projects.json missing under ${root}`);
  const agents = readJson(path.join(root, "ops/pm/agents.json"), { agents: {}, interruptPatterns: [] });
  return { projects, agents };
}

/** Returns { text, source } for a backlog doc: local file → git ref → committed cache. */
export function loadDoc(root, cfg, relPath, { git = gitShow } = {}) {
  const local = readText(path.join(root, relPath));
  if (local) return { text: local, source: relPath };
  const ref = cfg.backlog?.fallbackRef;
  if (ref) {
    const t = git(root, `${ref}:${relPath}`);
    if (t) return { text: t, source: `${ref}:${relPath} (PR #${cfg.backlog.fallbackPr}, unmerged)` };
  }
  const cached = readText(path.join(root, cfg.backlog?.cacheDir || "ops/pm/cache", path.basename(relPath)));
  if (cached) return { text: cached, source: `ops/pm/cache/${path.basename(relPath)} (cached copy of PR #${cfg.backlog?.fallbackPr})` };
  return { text: "", source: "missing" };
}

function gitShow(root, spec) {
  try {
    return execFileSync("git", ["show", spec], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

/** Splits a markdown table row on | while ignoring pipes inside `code`. */
export function splitRow(line) {
  const cells = [];
  let cur = "";
  let code = false;
  const s = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "`") code = !code;
    if (ch === "\\" && s[i + 1] === "|") {
      cur += "|";
      i++;
      continue;
    }
    if (ch === "|" && !code) {
      cells.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

/** Parses every table under "## <section>" headings into row objects keyed by lower-case header. */
export function parseTables(md) {
  const rows = [];
  let section = "";
  let header = null;
  for (const line of String(md || "").split("\n")) {
    const h = line.match(/^##\s+(.+)$/);
    if (h) {
      section = h[1].trim();
      header = null;
      continue;
    }
    if (!line.trim().startsWith("|")) {
      header = null;
      continue;
    }
    const cells = splitRow(line);
    if (!header) {
      header = cells.map((c) => c.toLowerCase().replace(/[^a-z0-9#]+/g, " ").trim());
      continue;
    }
    if (cells.every((c) => /^:?-{3,}:?$/.test(c))) continue;
    const row = { section };
    header.forEach((k, i) => (row[k || `col${i}`] = cells[i] ?? ""));
    rows.push(row);
  }
  return rows;
}

export function classify(status, nextAction = "") {
  const s = String(status || "").toUpperCase();
  let category = "pending";
  if (/^(DONE|MERGED|PASS)\b/.test(s)) category = "done";
  else if (/BLOCKED|FAIL\b/.test(s)) category = "blocked";
  else if (/IN REVIEW|CODE COMPLETE|PARTLY DONE|IN PROGRESS|AUDITED/.test(s)) category = "in_progress";
  else if (/WAITING/.test(s)) category = "blocked";
  const unverified = /UNVERIFIED|NOT VERIFIED|NOT AUDITED/.test(s);
  const ownerAction = /\[Sahil\]/i.test(`${status} ${nextAction}`);
  return { category, unverified, ownerAction };
}

const ID_RE = /\b(MT-\d{3})\b/g;
const GATE_RE = /\b([GR]\d{1,2})\b/g;

export function parseBacklog(md) {
  return parseTables(md)
    .filter((r) => /^MT-\d{3}$/.test(r.id || ""))
    .map((r) => {
      const next = r["next action"] || "";
      const c = classify(r.status, next);
      const deps = r["depends on"] || "";
      return {
        id: r.id,
        section: r.section,
        priority: (r.section.match(/^P(\d)/) || [])[1] ?? "9",
        task: r.task,
        status: r.status,
        ...c,
        dependsOn: [...deps.matchAll(ID_RE)].map((m) => m[1]),
        dependsText: deps,
        dependsOnOwner: /sahil/i.test(deps),
        evidence: r.evidence || "",
        next,
        links: r.links || "",
        gates: [...(r.links || "").matchAll(GATE_RE)].map((m) => m[1]),
        notes: [],
      };
    });
}

export function parseGates(md) {
  return parseTables(md)
    .filter((r) => /^[GR]\d{1,2}$/.test(r["#"] || ""))
    .map((r) => ({
      id: r["#"],
      section: r.section,
      gate: r.gate,
      status: r.status,
      category: classify(r.status).category,
      evidence: r["evidence how to check"] || r.evidence || "",
    }));
}

/** XEND-* tasks from docs/TASKS.md with their status line. */
export function parseTaskBoard(md) {
  const out = {};
  for (const b of String(md || "").split(/^## /m).slice(1)) {
    const title = b.split("\n")[0].trim();
    const id = (title.match(/^([A-Z][A-Z0-9-]*-\d+)/) || [])[1];
    if (!id) continue;
    const status = (b.match(/^Status:\s*(.+)$/m) || [])[1]?.trim() || "UNKNOWN";
    out[id] = { id, title, status, done: /^DONE\b/i.test(status) };
  }
  return out;
}

/**
 * Applies GitHub facts and recorded overrides to backlog items.
 * Returns conflicts: places where the written backlog disagrees with GitHub.
 */
export function reconcile(items, snapshot, overrides = {}) {
  const pulls = snapshot?.pulls || [];
  const conflicts = [];
  for (const it of items) {
    const text = `${it.status} ${it.evidence} ${it.next} ${it.links}`;
    const linked = pulls.filter(
      (p) => new RegExp(`(?:PR\\s*#|#)${p.number}\\b`).test(text) || (p.head && text.includes(p.head)),
    );
    it.prs = linked.map((p) => ({ number: p.number, state: p.merged ? "merged" : p.draft ? "draft" : p.state, head: p.head }));
    const merged = linked.filter((p) => p.merged && p.head && text.includes(p.head));
    if (merged.length && it.category === "in_progress") {
      const was = it.status;
      it.category = "done";
      it.reconciled = true;
      it.status = `DONE (GitHub: ${merged.map((p) => `PR #${p.number} merged`).join(", ")})`;
      it.notes.push(`backlog said "${was}" but GitHub shows ${merged.map((p) => `#${p.number}`).join(", ")} merged`);
      conflicts.push({ id: it.id, backlog: was, github: it.status });
    }
    const ov = overrides[it.id];
    if (ov) {
      const was = it.status;
      it.status = `${ov.status} (${ov.evidence})`;
      Object.assign(it, classify(ov.status, it.next));
      if (/^DONE/i.test(ov.status)) it.category = "done";
      it.notes.push(`override ${ov.at || ""}: ${ov.evidence}`);
      if (was !== it.status) conflicts.push({ id: it.id, backlog: was, override: it.status });
    }
  }
  const done = new Set(items.filter((i) => i.category === "done").map((i) => i.id));
  for (const it of items) {
    it.waitingOn = it.dependsOn.filter((d) => !done.has(d));
    it.ready =
      it.category !== "done" &&
      it.category !== "blocked" &&
      !it.ownerAction &&
      !it.dependsOnOwner &&
      it.waitingOn.length === 0;
  }
  return conflicts;
}

/** Everything the manager knows, loaded once per command. */
export function loadMemory(root, { git } = {}) {
  const { projects, agents } = loadConfig(root);
  const backlogDoc = loadDoc(root, projects, projects.backlog.path, { git });
  const gatesDoc = loadDoc(root, projects, projects.backlog.gates, { git });
  const snapshot = readSnapshot(root);
  const overrides = readJson(statePath(root, "overrides.json"), {});
  const items = parseBacklog(backlogDoc.text);
  const conflicts = reconcile(items, snapshot, overrides);
  return {
    root,
    projects,
    agents,
    items,
    gates: parseGates(gatesDoc.text),
    board: parseTaskBoard(readText(path.join(root, "docs/TASKS.md"))),
    snapshot,
    conflicts,
    sources: { backlog: backlogDoc.source, gates: gatesDoc.source, snapshot: snapshot.fetchedAt || "missing" },
  };
}

/** Records an evidence-backed status correction (e.g. MT-003 freed by XEND-CF-PREVIEW-001). */
export function markItem(root, id, status, evidence, env = process.env) {
  if (!/^MT-\d{3}$/.test(id)) throw new Error(`mark expects an MT-### id, got "${id}"`);
  if (!evidence || evidence.length < 8) throw new Error("mark needs --evidence (run ID, commit, PR or dashboard record)");
  const file = statePath(root, "overrides.json");
  const all = readJson(file, {});
  all[id] = { status: String(status).toUpperCase(), evidence: redact(evidence), at: isoNow(env) };
  writeJson(file, all);
  return all[id];
}

/** Refreshes the GitHub snapshot through the REST API. Curated fields (verified/blockers) are kept. */
export async function syncGithub(root, { env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const token = env.GITHUB_TOKEN || env.GH_TOKEN;
  const { projects } = loadConfig(root);
  const file = statePath(root, "github-snapshot.json");
  const snap = readSnapshot(root);
  if (!token) return { ok: false, reason: "no GITHUB_TOKEN/GH_TOKEN in this shell; using saved snapshot", snapshot: snap };
  const api = (p) =>
    fetchImpl(`https://api.github.com/repos/${projects.repo}${p}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "xender-pm" },
    }).then((r) => {
      if (!r.ok) throw new Error(`GitHub ${p} → HTTP ${r.status}`);
      return r.json();
    });
  const numbers = [...new Set(projects.projects.flatMap((p) => p.prs || []))];
  const pulls = [];
  for (const n of numbers) {
    const p = await api(`/pulls/${n}`);
    pulls.push({ number: p.number, title: p.title, state: p.state, merged: !!p.merged_at, draft: !!p.draft, head: p.head?.ref, updatedAt: p.updated_at });
  }
  for (const n of [...new Set(projects.projects.map((p) => p.issue).filter(Boolean))]) {
    const i = await api(`/issues/${n}`);
    const prev = snap.issues?.[n] || {};
    snap.issues[n] = { ...prev, number: i.number, title: i.title, state: i.state, url: i.html_url, updatedAt: i.updated_at };
    if (prev.updatedAt && prev.updatedAt !== i.updated_at) snap.issues[n].changedSinceCuration = true;
  }
  const main = await api("/commits/main");
  Object.assign(snap, { pulls, fetchedAt: isoNow(env), source: "github-rest", mainSha: main.sha });
  writeJson(file, snap);
  return { ok: true, snapshot: snap };
}
