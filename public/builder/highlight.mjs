// XEND-BUILDER-001 — tiny dependency-free syntax highlighter for the studio code editor.
// Output is HTML-escaped first, then wrapped in <span class="t-*"> tokens; never executes code.

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const span = (cls, s) => `<span class="t-${cls}">${esc(s)}</span>`;

function tokenize(code, rules) {
  let out = "", i = 0;
  const re = new RegExp(rules.map((r) => `(${r[1].source})`).join("|"), "gy");
  while (i < code.length) {
    re.lastIndex = i;
    const m = re.exec(code);
    if (!m || m[0] === "") { out += esc(code[i]); i++; continue; }
    const idx = m.slice(1).findIndex((g) => g !== undefined);
    out += rules[idx][0] ? span(rules[idx][0], m[0]) : esc(m[0]);
    i += m[0].length;
  }
  return out;
}

const JS = [
  ["com", /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/],
  ["str", /`(?:\\[\s\S]|[^`\\])*`?|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?/],
  ["kw", /\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|this|null|undefined|true|false)\b/],
  ["num", /\b\d+(?:\.\d+)?\b/],
  [null, /[A-Za-z_$][\w$]*|\s+|./],
];
const CSS = [
  ["com", /\/\*[\s\S]*?(?:\*\/|$)/],
  ["str", /"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?/],
  ["prop", /[a-z-]+(?=\s*:[^{}]*;|\s*:[^{}]*})/],
  ["num", /#[0-9a-fA-F]{3,8}\b|-?\d*\.?\d+(?:px|rem|em|%|vh|vw|s|ms|deg|fr)?\b/],
  ["kw", /@[a-z-]+|!important/],
  [null, /[\w-]+|\s+|./],
];

function html(code) {
  let out = "", i = 0;
  while (i < code.length) {
    if (code.startsWith("<!--", i)) { const e = code.indexOf("-->", i + 4); const end = e < 0 ? code.length : e + 3; out += span("com", code.slice(i, end)); i = end; continue; }
    const scriptOrStyle = /^<(script|style)\b[^>]*>/i.exec(code.slice(i, i + 400));
    if (code[i] === "<" && /[A-Za-z!/]/.test(code[i + 1] || "")) {
      const end = code.indexOf(">", i);
      const stop = end < 0 ? code.length : end + 1;
      const tag = code.slice(i, stop);
      out += tag.replace(/^(<\/?[\w!-]+)|(\s[\w:@.-]+)(?==)|("[^"]*"|'[^']*')|(\/?>)$/g, (m, t, a, s, c) => t ? span("tag", t) : a ? span("attr", a) : s ? span("str", s) : c ? span("tag", c) : esc(m))
        .replace(/(<span class="t-[a-z]+">[\s\S]*?<\/span>)|([^<]+)/g, (m, sp, raw) => sp || esc(raw));
      i = stop;
      if (scriptOrStyle) {
        const close = code.toLowerCase().indexOf("</" + scriptOrStyle[1].toLowerCase(), i);
        const bodyEnd = close < 0 ? code.length : close;
        out += scriptOrStyle[1].toLowerCase() === "script" ? tokenize(code.slice(i, bodyEnd), JS) : tokenize(code.slice(i, bodyEnd), CSS);
        i = bodyEnd;
      }
      continue;
    }
    const next = code.indexOf("<", i + 1);
    const stop = next < 0 ? code.length : next;
    out += esc(code.slice(i, stop));
    i = stop;
  }
  return out;
}

export function langOf(name) {
  const ext = String(name).split(".").pop();
  return ext === "js" ? "js" : ext === "css" ? "css" : ext === "html" || ext === "svg" ? "html" : "text";
}

export function highlight(code, lang) {
  const src = String(code ?? "");
  if (src.length > 200_000) return esc(src);
  if (lang === "js" || lang === "json") return tokenize(src, JS);
  if (lang === "css") return tokenize(src, CSS);
  if (lang === "html") return html(src);
  return esc(src);
}
