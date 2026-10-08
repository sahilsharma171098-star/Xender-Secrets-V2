// XEND-BUILDER-001 — prompts, output parsing, validation and sanitising for generated sites.
//
// The model answers in a plain-text file protocol (more robust than JSON for large code):
//   === FILE: index.html ===
//   ...file content...
//   === END FILE ===
//   === SUMMARY ===
//   one or two sentences
//   === END SUMMARY ===
// On edits the model returns ONLY the files it changed; every other file is kept as it was,
// so manual code edits survive follow-up prompts.

export const LIMITS = {
  maxFiles: 12,
  maxFileBytes: 150_000,
  maxTotalBytes: 400_000,
  maxPromptChars: 2000,
  maxNameChars: 80,
};

const FILE_RE = /^[a-z0-9][a-z0-9_-]{0,40}(?:\/[a-z0-9][a-z0-9_-]{0,40})?\.(?:html|css|js|svg|json|txt|md)$/;
export const validPath = (p) => typeof p === "string" && FILE_RE.test(p) && !p.includes("..");

// CDNs a generated page may load scripts/styles/fonts from (also mirrored in the preview CSP).
export const SCRIPT_HOSTS = ["cdn.jsdelivr.net", "unpkg.com", "cdnjs.cloudflare.com", "cdn.tailwindcss.com"];
export const FRAME_HOSTS = ["www.google.com", "maps.google.com", "www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"];

export const SYSTEM_PROMPT = `You are Xender Builder, a senior front-end engineer and web designer.
You build complete, production-quality STATIC websites using only HTML, CSS and vanilla JavaScript.

Hard rules:
- Output ONLY files, using exactly this format, with nothing before or after:
=== FILE: index.html ===
(full file content)
=== END FILE ===
=== SUMMARY ===
(one or two plain sentences describing what you built or changed)
=== END SUMMARY ===
- Always include index.html. Put styles in styles.css and behaviour in script.js and link them with relative paths (<link rel="stylesheet" href="styles.css">, <script src="script.js"></script>). Extra pages (about.html, contact.html...) are allowed when asked for; link between pages with relative hrefs.
- File names: lowercase letters, digits, dashes; extensions html, css, js, svg, json, txt, md only.
- No backend, no build step, no npm, no frameworks that need compiling. No fetch() or XHR to any API, no analytics, no trackers, no cookies, no localStorage of personal data.
- Forms must not submit anywhere real: use a JavaScript handler that shows a friendly confirmation message.
- Images: use https://images.unsplash.com/... photo URLs, https://picsum.photos/... or inline SVG. Never hot-link logos of real companies.
- Mobile-first, responsive, accessible (semantic HTML, labels, alt text, good contrast, visible focus states), fast (no heavy libraries). Use modern CSS (grid, flex, custom properties, clamp()).
- Write real, specific, persuasive copy for the business described. Never claim fake awards, fake certifications, fake reviews or real people's names; label sample testimonials as "Sample testimonial".
- Never build login pages that imitate a real brand, phishing pages, malware, or anything illegal or deceptive. If asked, build a harmless generic landing page instead and say so in the summary.
- Keep the whole answer compact: aim for under 9,000 tokens in total.`;

export function newSiteMessages(prompt) {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Build a new website.\n\nREQUEST: ${prompt}\n\nReturn index.html, styles.css and script.js (plus any extra pages the request needs).` },
  ];
}

export function editMessages(prompt, files) {
  const listing = Object.entries(files)
    .map(([name, body]) => `=== FILE: ${name} ===\n${body}\n=== END FILE ===`)
    .join("\n");
  return [
    { role: "system", content: SYSTEM_PROMPT + `\n\nYou are editing an EXISTING website. Return ONLY the files you change, each in full. Do not return unchanged files. Preserve everything the user did not ask to change: content, structure, class names and any manual edits. To delete a file, return it with the single line DELETE as its content.` },
    { role: "user", content: `CURRENT FILES:\n${listing}\n\nREQUEST: ${prompt}\n\nApply this change with the smallest set of edits that fully satisfies it.` },
  ];
}

/** Parse the model's file protocol. Tolerates ``` fences and a missing END FILE on the last file. */
export function parseFiles(text) {
  const src = String(text || "").replace(/\r\n/g, "\n");
  const files = {};
  const re = /^===\s*FILE:\s*([^\n=]+?)\s*===\s*$/gm;
  const marks = [];
  let m;
  while ((m = re.exec(src))) marks.push({ name: m[1].trim().replace(/^\.?\//, "").toLowerCase(), start: m.index, bodyStart: m.index + m[0].length });
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].start : src.length;
    let body = src.slice(marks[i].bodyStart, end);
    const endIdx = body.search(/^===\s*END FILE\s*===\s*$/m);
    if (endIdx >= 0) body = body.slice(0, endIdx);
    else {
      const sum = body.search(/^===\s*SUMMARY\s*===\s*$/m);
      if (sum >= 0) body = body.slice(0, sum);
    }
    body = body.replace(/^\n/, "").replace(/\n$/, "");
    // Models sometimes wrap a file in a markdown fence inside the protocol.
    const fence = body.match(/^\s*```[a-z]*\n([\s\S]*?)\n```\s*$/i);
    if (fence) body = fence[1];
    files[marks[i].name] = body;
  }
  const s = src.match(/===\s*SUMMARY\s*===\s*\n([\s\S]*?)(?:\n===\s*END SUMMARY\s*===|$)/);
  const summary = s ? s[1].trim().slice(0, 400) : "";
  return { files, summary };
}

const byteLen = (s) => new TextEncoder().encode(s).length;

/** Validate + sanitise a whole file map (used for AI output, manual edits and restores). */
export function cleanFileMap(input) {
  const out = {};
  const errors = [];
  let total = 0;
  const entries = Object.entries(input || {});
  for (const [rawName, rawBody] of entries) {
    const name = String(rawName).trim().toLowerCase();
    if (!validPath(name)) { errors.push(`Skipped file with unsupported name: ${String(rawName).slice(0, 60)}`); continue; }
    if (Object.keys(out).length >= LIMITS.maxFiles) { errors.push("Too many files; extra files were dropped."); break; }
    let body = String(rawBody ?? "");
    if (byteLen(body) > LIMITS.maxFileBytes) { errors.push(`${name} is too large (max ${LIMITS.maxFileBytes / 1000} KB).`); continue; }
    body = sanitizeFile(name, body);
    total += byteLen(body);
    if (total > LIMITS.maxTotalBytes) { errors.push("Project is too large (max 400 KB)."); break; }
    out[name] = body;
  }
  return { files: out, errors };
}

const hostOf = (u) => { try { return new URL(u, "https://x.invalid/").hostname; } catch { return ""; } };
const isAbs = (u) => /^\s*(https?:)?\/\//i.test(u);

/**
 * Defence in depth for generated code. The real security boundary is the opaque-origin
 * sandboxed preview frame + its CSP; this removes the obvious foot-guns before storage/export.
 */
export function sanitizeFile(name, body) {
  if (name.endsWith(".html")) return sanitizeHtml(body);
  if (name.endsWith(".svg")) return body.replace(/<script[\s\S]*?<\/script\s*>/gi, "").replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/javascript:/gi, "");
  return body.replace(/\u0000/g, "");
}

export function sanitizeHtml(html) {
  let h = String(html).replace(/\u0000/g, "");
  h = h.replace(/<base\b[^>]*>/gi, "");
  h = h.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?\s*(refresh|content-security-policy|set-cookie)[^>]*>/gi, "");
  h = h.replace(/<(object|embed|applet)\b[\s\S]*?(<\/\1\s*>|\/?>)/gi, "");
  // javascript: / vbscript: / data:text/html URLs in navigable attributes.
  h = h.replace(/(\s(?:href|src|action|formaction|xlink:href)\s*=\s*)(["']?)\s*(?:javascript|vbscript|data:text\/html)[^"'\s>]*\2/gi, "$1$2#$2");
  // External scripts only from the allow-listed CDNs.
  h = h.replace(/<script\b([^>]*)\bsrc\s*=\s*(["']?)([^"'\s>]+)\2([^>]*)>\s*<\/script\s*>/gi, (all, a, q, src) => {
    if (!isAbs(src)) return all;
    return SCRIPT_HOSTS.includes(hostOf(src.startsWith("//") ? "https:" + src : src)) ? all : `<!-- removed external script: ${hostOf(src) || "unknown host"} -->`;
  });
  h = h.replace(/<iframe\b([^>]*)>([\s\S]*?)<\/iframe\s*>/gi, (all, attrs) => {
    const src = (attrs.match(/\bsrc\s*=\s*(["']?)([^"'\s>]+)\1/i) || [])[2] || "";
    return src && FRAME_HOSTS.includes(hostOf(src)) ? all : "<!-- removed iframe -->";
  });
  return h;
}

/** Validator for runWithFallback: new sites need index.html with real markup. */
export function validateGenerated(text, { mode = "new", current = {} } = {}) {
  const { files, summary } = parseFiles(text);
  const deletes = Object.keys(files).filter((k) => files[k].trim() === "DELETE");
  for (const k of deletes) delete files[k];
  const { files: clean, errors } = cleanFileMap(files);
  if (mode === "new") {
    const idx = clean["index.html"] || "";
    if (!/<body[\s>]/i.test(idx) && !/<main[\s>]|<section[\s>]|<header[\s>]/i.test(idx)) return { ok: false, error: "The AI answer did not contain a usable index.html." };
    if (idx.length < 200) return { ok: false, error: "The generated index.html was too short." };
    return { ok: true, value: { files: clean, summary: summary || "Generated a new website.", warnings: errors } };
  }
  if (!Object.keys(clean).length && !deletes.length) return { ok: false, error: "The AI answer did not change any files." };
  const merged = { ...current, ...clean };
  for (const k of deletes) if (k !== "index.html") delete merged[k];
  const { files: final, errors: e2 } = cleanFileMap(merged);
  if (!final["index.html"]) return { ok: false, error: "The edit removed index.html." };
  return { ok: true, value: { files: final, changed: Object.keys(clean), deleted: deletes, summary: summary || "Updated the website.", warnings: [...errors, ...e2] } };
}

// ---------- prompt policy ----------

const BLOCK = [
  /\b(phishing|phish|credential[s]? harvest|steal(ing)? (passwords?|credentials|logins?|cards?)|keylogger|malware|ransomware|botnet|crypto ?drainer|wallet drainer|seed phrase|carding)\b/i,
  /\b(paypal|chase|wells ?fargo|hsbc|barclays|santander|natwest|lloyds|sbi|hdfc|icici|metamask|coinbase|binance|apple ?id|icloud|microsoft|office ?365|outlook|gmail|google account|facebook|instagram|netflix|amazon|irs|hmrc)\b[\s\S]{0,60}\b(log ?in|sign ?in|verify|verification|password|account recovery)\b/i,
  /\b(child|minor|underage)\b[\s\S]{0,40}\b(sex|porn|nude|explicit)/i,
];

export function checkPrompt(raw) {
  const prompt = String(raw ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  if (prompt.length < 8) return { ok: false, error: "Describe the website in a few more words." };
  if (prompt.length > LIMITS.maxPromptChars) return { ok: false, error: `Keep the request under ${LIMITS.maxPromptChars} characters.` };
  if (BLOCK.some((re) => re.test(prompt))) return { ok: false, error: "That request isn't something the builder can help with. Try describing a legitimate business or personal website." };
  return { ok: true, prompt };
}

export function projectNameFrom(prompt) {
  const words = String(prompt).replace(/[^\p{L}\p{N}\s&'-]/gu, " ").split(/\s+/).filter(Boolean).slice(0, 6).join(" ");
  const name = words.charAt(0).toUpperCase() + words.slice(1);
  return (name || "Untitled site").slice(0, LIMITS.maxNameChars);
}
