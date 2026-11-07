// XEND-PM-001 — share PM state between machines/agents through a dedicated Git branch.
//
// Local state (ops/pm/state/, git-ignored) is only on this disk until `xender-pm sync-state`.
// sync-state = pull + merge + secret scan + push, in one command:
//   * state lives on its own branch (default `xender-pm-state`), never on main or a code branch;
//   * commits are built with git plumbing and a temporary index, so the working tree, the index and
//     the checked-out branch are untouched;
//   * push is fast-forward only (never --force); if someone pushed meanwhile it re-merges once;
//   * task files merge by history: if one side's checkpoints/attempts extend the other's, the longer
//     one wins; if both added different history, it is a CONFLICT — nothing is overwritten or pushed;
//   * every file is scanned for credentials before anything leaves the machine.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { findSecrets, readJson, statePath, writeJson, isoNow } from "./util.mjs";

const SAFE_BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

export function stateBranch(cfg = {}) {
  const b = cfg.stateBranch || "xender-pm-state";
  if (!SAFE_BRANCH.test(b) || /^(main|master|HEAD)$/i.test(b) || b.includes("..")) throw new Error(`Unsafe state branch "${b}"`);
  return b;
}

function git(root, args, { env = {}, input, raw = false } = {}) {
  const out = execFileSync("git", args, { cwd: root, encoding: "utf8", input, env: { ...process.env, ...env }, stdio: ["pipe", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  return raw ? out : out.trimEnd();
}
function tryGit(root, args, opts) {
  try {
    return git(root, args, opts);
  } catch {
    return null;
  }
}

export function isRepo(root) {
  return tryGit(root, ["rev-parse", "--show-toplevel"]) !== null;
}

/** Files in local state, keyed by their path on the state branch. Conflict copies stay local. */
export function localStateFiles(root) {
  const out = {};
  const base = statePath(root);
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (!/\.conflict-|\.tmp$|^\.sync\.json$/.test(e.name)) out[path.relative(base, full).split(path.sep).join("/")] = fs.readFileSync(full, "utf8");
    }
  };
  walk(base);
  return out;
}

/** Reads the remote state branch. Returns { sha, files } ; sha null when the branch does not exist yet. */
export function fetchRemoteState(root, { remote = "origin", branch }) {
  const heads = tryGit(root, ["ls-remote", "--heads", remote, `refs/heads/${branch}`]);
  if (heads === null) throw new Error(`Cannot reach git remote "${remote}" (offline or no permission). Local state is unchanged.`);
  if (!heads.trim()) return { sha: null, files: {} };
  git(root, ["fetch", "--quiet", "--no-tags", remote, `+refs/heads/${branch}:refs/xender-pm/remote-state`]);
  const sha = git(root, ["rev-parse", "refs/xender-pm/remote-state"]);
  const files = {};
  for (const p of git(root, ["ls-tree", "-r", "--name-only", sha]).split("\n").filter(Boolean)) files[p] = git(root, ["show", `${sha}:${p}`], { raw: true });
  return { sha, files };
}

const cpKey = (c) => [c.at, c.agent, c.source, c.status, c.done, c.next].join("|");
const atKey = (a) => [a.at, a.agent, a.mode, a.result].join("|");
const isPrefix = (a, b) => a.length <= b.length && a.every((x, i) => x === b[i]);

/** "local" | "remote" | "equal" | "conflict" for two versions of one task. */
export function compareTasks(local, remote) {
  const lc = (local.checkpoints || []).map(cpKey);
  const rc = (remote.checkpoints || []).map(cpKey);
  const la = (local.attempts || []).map(atKey);
  const ra = (remote.attempts || []).map(atKey);
  const remoteHasAll = isPrefix(lc, rc) && isPrefix(la, ra);
  const localHasAll = isPrefix(rc, lc) && isPrefix(ra, la);
  if (remoteHasAll && localHasAll) {
    if (JSON.stringify(local) === JSON.stringify(remote)) return "equal";
    return String(remote.updatedAt) > String(local.updatedAt) ? "remote" : "local";
  }
  if (remoteHasAll) return "remote";
  if (localHasAll) return "local";
  return "conflict";
}

/**
 * Merges remote state into local state (writes local files). Returns { pulled, conflicts }.
 * prefer: { [taskId]: "local" | "remote" } resolves a reported conflict explicitly.
 */
export function mergeIntoLocal(root, remoteFiles, { prefer = {} } = {}) {
  const local = localStateFiles(root);
  const pulled = [];
  const conflicts = [];
  const write = (rel, content) => {
    const f = statePath(root, ...rel.split("/"));
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, content);
  };
  const decisions = {};
  for (const rel of Object.keys(remoteFiles).filter((p) => /^tasks\/[^/]+\.json$/.test(p))) {
    const id = path.basename(rel, ".json");
    if (!(rel in local)) {
      decisions[id] = "remote";
      continue;
    }
    const l = JSON.parse(local[rel]);
    const r = JSON.parse(remoteFiles[rel]);
    let d = compareTasks(l, r);
    if (d === "conflict" && prefer[id]) d = prefer[id];
    decisions[id] = d;
    if (d === "conflict") {
      conflicts.push(id);
      write(`tasks/${id}.conflict-remote.json`, remoteFiles[rel]);
    }
  }
  for (const [rel, content] of Object.entries(remoteFiles)) {
    const id = (rel.match(/^tasks\/([^.]+)\./) || [])[1];
    if (id) {
      if (decisions[id] === "remote" || (!decisions[id] && !(rel in local))) {
        if (local[rel] !== content) write(rel, content);
        if (rel.endsWith(".json")) pulled.push(id);
      }
      continue;
    }
    if (rel === "overrides.json") {
      const l = readJson(statePath(root, "overrides.json"), {});
      const r = JSON.parse(content);
      const merged = { ...l };
      for (const [k, v] of Object.entries(r)) if (!merged[k] || String(v.at) > String(merged[k].at)) merged[k] = v;
      if (JSON.stringify(merged) !== JSON.stringify(l)) writeJson(statePath(root, "overrides.json"), merged);
    } else if (rel === "github-snapshot.json") {
      const l = readJson(statePath(root, "github-snapshot.json"));
      const r = JSON.parse(content);
      if (!l || String(r.fetchedAt) > String(l.fetchedAt)) write(rel, content);
    } else if (!(rel in local)) write(rel, content);
  }
  for (const id of Object.keys(prefer)) {
    if (decisions[id] && decisions[id] !== "conflict") fs.rmSync(statePath(root, "tasks", `${id}.conflict-remote.json`), { force: true });
  }
  return { pulled, conflicts };
}

export function pullState(root, cfg, { remote = "origin", prefer } = {}) {
  const branch = stateBranch(cfg);
  const { sha, files } = fetchRemoteState(root, { remote, branch });
  if (!sha) return { ok: true, branch, sha: null, pulled: [], conflicts: [] };
  return { ok: true, branch, sha, ...mergeIntoLocal(root, files, { prefer }) };
}

function identityEnv(root) {
  const env = {};
  if (!tryGit(root, ["config", "user.name"])) Object.assign(env, { GIT_AUTHOR_NAME: "xender-pm", GIT_COMMITTER_NAME: "xender-pm" });
  if (!tryGit(root, ["config", "user.email"])) Object.assign(env, { GIT_AUTHOR_EMAIL: "xender-pm@users.noreply.github.com", GIT_COMMITTER_EMAIL: "xender-pm@users.noreply.github.com" });
  return env;
}

function commitState(root, files, parent, message) {
  const idx = path.join(os.tmpdir(), `xender-pm-index-${process.pid}-${Date.now()}`);
  const env = { GIT_INDEX_FILE: idx };
  try {
    git(root, ["read-tree", "--empty"], { env });
    for (const [rel, content] of Object.entries(files).sort()) {
      const blob = git(root, ["hash-object", "-w", "--stdin"], { input: content });
      git(root, ["update-index", "--add", "--cacheinfo", `100644,${blob},${rel}`], { env });
    }
    const tree = git(root, ["write-tree"], { env });
    if (parent && git(root, ["rev-parse", `${parent}^{tree}`]) === tree) return null; // nothing new
    return git(root, ["commit-tree", tree, ...(parent ? ["-p", parent] : []), "-m", message], { env: identityEnv(root) });
  } finally {
    fs.rmSync(idx, { force: true });
  }
}

/** One command: pull + merge + secret scan + fast-forward push. */
export function syncState(root, cfg, { remote = "origin", prefer, message, env = process.env } = {}) {
  if (!isRepo(root)) return { ok: false, reason: "not a git repository — state stays local to this folder" };
  const branch = stateBranch(cfg);
  for (let attempt = 0; attempt < 2; attempt++) {
    const remoteState = fetchRemoteState(root, { remote, branch });
    const merged = remoteState.sha ? mergeIntoLocal(root, remoteState.files, { prefer }) : { pulled: [], conflicts: [] };
    if (merged.conflicts.length) {
      return { ok: false, branch, conflicts: merged.conflicts, reason: `conflict on ${merged.conflicts.join(", ")}: both sides added different checkpoints. Remote copy saved as ops/pm/state/tasks/<ID>.conflict-remote.json. Nothing was pushed. Re-run with --prefer <ID>=local or <ID>=remote.` };
    }
    const files = localStateFiles(root);
    const leaks = Object.entries(files).flatMap(([rel, text]) => findSecrets(text).map((h) => `${rel}: ${h}`));
    if (leaks.length) return { ok: false, branch, reason: `possible credential in state, nothing pushed: ${leaks.slice(0, 5).join("; ")}. Remove it from the file and re-run.` };
    const ids = Object.keys(files).filter((p) => p.endsWith(".json") && p.startsWith("tasks/")).map((p) => path.basename(p, ".json"));
    const commit = commitState(root, files, remoteState.sha, message || `xender-pm state: ${ids.join(", ") || "metadata"} (${isoNow(env)})`);
    if (!commit) return finish(root, { ok: true, branch, sha: remoteState.sha, pushed: false, pulled: merged.pulled, tasks: ids }, env);
    try {
      git(root, ["push", "--quiet", remote, `${commit}:refs/heads/${branch}`]); // fast-forward only, never forced
      git(root, ["update-ref", "refs/xender-pm/remote-state", commit]);
      return finish(root, { ok: true, branch, sha: commit, pushed: true, pulled: merged.pulled, tasks: ids }, env);
    } catch (e) {
      if (attempt === 1 || !/rejected|non-fast-forward|fetch first|stale/i.test(String(e.stderr || e.message))) {
        return { ok: false, branch, reason: `push failed: ${String(e.stderr || e.message).split("\n")[0]}` };
      }
      // someone pushed between our fetch and push: loop once to re-merge
    }
  }
  return { ok: false, branch, reason: "remote kept changing; try again" };
}

function finish(root, result, env) {
  writeJson(statePath(root, ".sync.json"), { at: isoNow(env), branch: result.branch, sha: result.sha });
  return result;
}

export function lastSync(root) {
  return readJson(statePath(root, ".sync.json"));
}
