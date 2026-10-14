// True when the module at `moduleUrl` is the script Node was started with (`node path/to/script.mjs`).
//
// Comparing `import.meta.url` with "file://" + argv[1] only works on POSIX paths without
// spaces or special characters: on Windows argv[1] is `C:\...\script.mjs` while the module URL is
// `file:///C:/.../script.mjs`, so the guard is always false and the script exits 0 without doing
// anything. Resolve both sides to file-system paths instead (case-insensitive on Windows).
import path from "node:path";
import { fileURLToPath } from "node:url";

export function isMain(moduleUrl, argv1 = process.argv[1], { platform = process.platform } = {}) {
  if (!argv1) return false;
  const p = platform === "win32" ? path.win32 : path.posix;
  const modulePath = fileURLToPath(moduleUrl, { windows: platform === "win32" });
  const a = p.resolve(argv1);
  const b = p.resolve(modulePath);
  return platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}
