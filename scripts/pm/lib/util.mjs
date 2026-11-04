// XEND-PM-001 — small shared helpers for xender-pm. No dependencies.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Root that holds ops/pm and docs. Tests point XENDER_PM_HOME at a temp copy. */
export function pmRoot(env = process.env) {
  return path.resolve(env.XENDER_PM_HOME || REPO_ROOT);
}

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  fs.renameSync(tmp, file); // atomic on the same filesystem: a crash never leaves half a task file
}

export function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

// Anything that looks like a credential is replaced before it is saved or printed.
// Task files are committed to a PUBLIC repository.
const SECRET_PATTERNS = [
  /\b(gh[pousr]_[A-Za-z0-9]{20,})\b/g,
  /\b(github_pat_[A-Za-z0-9_]{20,})\b/g,
  /\b(sk-(?:ant-)?[A-Za-z0-9_-]{16,})\b/g,
  /\b(AIza[0-9A-Za-z_-]{30,})\b/g,
  /\b(xox[abpr]-[A-Za-z0-9-]{10,})\b/g,
  /\b(GOCSPX-[A-Za-z0-9_-]{10,})\b/g,
  /\b(ya29\.[A-Za-z0-9._-]{20,})\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\b((?:password|passwd|secret|token|api[_-]?key|salt|client_secret|authorization)\s*[:=]\s*)("[^"]{6,}"|'[^']{6,}'|[^\s,;]{6,})/gi,
  /\b(Bearer\s+)[A-Za-z0-9._~+/-]{16,}=*/g,
  /([?&](?:code|state|token|access_token)=)[^&\s]{8,}/g,
];

export function redact(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v)]));
  }
  if (typeof value !== "string") return value;
  let s = value;
  for (const re of SECRET_PATTERNS) {
    s = s.replace(re, (m, p1) => {
      // keep a key name / "Bearer " prefix when the pattern captured one, drop the value
      if (p1 && /[:=]\s*$|Bearer\s+$|[?&][a-z_]+=$/i.test(p1)) return `${p1}[REDACTED]`;
      return "[REDACTED]";
    });
  }
  return s;
}

export function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9#\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isoNow(env = process.env) {
  return env.XENDER_PM_NOW || new Date().toISOString();
}

export function list(values) {
  if (values == null) return [];
  if (Array.isArray(values)) return values.flatMap(list);
  return String(values)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
