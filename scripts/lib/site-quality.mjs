const PLACEHOLDER_PATTERNS = [
  /your content goes here/i,
  /lorem ipsum/i,
  /\bjohn doe\b/i,
  /\bproject\s*[1-9]\b/i,
  /\bcoming soon\b/i,
  /\bunder maintenance\b/i
];

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function textOnly(html) {
  return String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getAttribute(tag, name) {
  const quoted = new RegExp("\\b" + name + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", "i").exec(tag);
  if (quoted) return clean(quoted[2]);
  const plain = new RegExp("\\b" + name + "\\s*=\\s*([^\\s>]+)", "i").exec(tag);
  return plain ? clean(plain[1]) : "";
}

function findMeta(html, key, expected) {
  for (const tag of String(html || "").match(/<meta\b[^>]*>/gi) || []) {
    if (getAttribute(tag, key).toLowerCase() === expected.toLowerCase()) {
      return getAttribute(tag, "content");
    }
  }
  return "";
}

function firstText(html, regex) {
  const match = String(html || "").match(regex);
  return match ? clean(textOnly(match[1] || "")) : "";
}

export function reviewHtml(html) {
  const source = String(html || "");
  const visible = textOnly(source);
  const issues = [];
  const strengths = [];
  let score = 100;

  function issue(code, title, points, severity) {
    issues.push({ code, title, points, severity });
    score -= points;
  }

  const title = firstText(source, /<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!title) issue("missing-title", "Missing page title", 12, "high");
  else if (title.length < 12 || title.length > 65) issue("title-length", "Page title length could be improved", 4, "low");
  else strengths.push("Page title present");

  const description = findMeta(source, "name", "description");
  if (!description) issue("missing-description", "Missing meta description", 8, "medium");
  else strengths.push("Meta description present");

  const viewport = findMeta(source, "name", "viewport");
  if (!viewport) issue("missing-viewport", "Missing mobile viewport meta tag", 8, "high");
  else strengths.push("Mobile viewport configured");

  const h1Count = (source.match(/<h1\b[^>]*>/gi) || []).length;
  if (h1Count === 0) issue("missing-h1", "No H1 heading detected", 8, "medium");
  else if (h1Count > 2) issue("multiple-h1", "Too many H1 headings detected", 4, "low");
  else strengths.push("Primary H1 present");

  if (!/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>/i.test(source)) {
    issue("missing-schema", "No JSON-LD structured data detected", 4, "low");
  } else {
    strengths.push("Structured data detected");
  }

  const hasEmail = /mailto:/i.test(source) || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(visible);
  const hasPhone = /tel:/i.test(source) || /(?:\+?91[\s-]?)?[6-9]\d{9}\b/.test(visible);
  const hasWhatsapp = /wa\.me|whatsapp/i.test(source);

  if (!hasEmail && !hasPhone && !hasWhatsapp) {
    issue("weak-contact", "No direct email, phone or WhatsApp signal detected", 7, "high");
  } else {
    strengths.push("Direct contact channel detected");
  }

  if (!/\b(book|appointment|contact|call|whatsapp|get quote|request quote|enquire|inquire|schedule|start project)\b/i.test(visible)) {
    issue("weak-cta", "No clear high-intent call to action detected", 7, "high");
  } else {
    strengths.push("High-intent CTA detected");
  }

  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(visible))) {
    issue("placeholder-copy", "Placeholder or unfinished copy is visible", 15, "critical");
  }

  if (/<h[1-6]\b[^>]*>\s*(?:<[^>]+>\s*)*(?:IMG|IMAGE|DSC)[-_]?\d{4,}/i.test(source)) {
    issue("raw-filename-heading", "Raw image filename appears as a visible heading", 8, "high");
  }

  if (/<form\b[^>]*action\s*=\s*["']http:\/\//i.test(source)) {
    issue("insecure-form", "A form submits over insecure HTTP", 10, "high");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    title,
    metaDescription: description,
    h1Count,
    issues: issues.sort((a, b) => b.points - a.points),
    strengths
  };
}
