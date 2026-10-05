const PLACEHOLDER_PATTERNS = [
  /your content goes here/i,
  /lorem ipsum/i,
  /\bjohn doe\b/i,
  /\bproject\s*[1-9]\b/i,
  /\bcoming soon\b/i,
  /\bunder maintenance\b/i
];

const PRIVATE_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".home",
  ".test"
];

function collapse(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function decodeBasicEntities(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripTags(html) {
  return decodeBasicEntities(
    String(html || "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ").trim();
}

function firstMatch(html, regex) {
  const match = String(html || "").match(regex);
  return match ? collapse(stripTags(match[1] || "")) : "";
}

function getAttribute(tag, name) {
  const escaped = name.replace(/[.*+?^{}()|[\]\\]/g, "\\$&");
  const quoted = new RegExp("\\b" + escaped + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", "i").exec(tag);
  if (quoted) return collapse(decodeBasicEntities(quoted[2]));
  const plain = new RegExp("\\b" + escaped + "\\s*=\\s*([^\\s>]+)", "i").exec(tag);
  return plain ? collapse(decodeBasicEntities(plain[1])) : "";
}

function findMeta(html, key, expected) {
  const tags = String(html || "").match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (getAttribute(tag, key).toLowerCase() === expected.toLowerCase()) {
      return getAttribute(tag, "content");
    }
  }
  return "";
}

function countMatches(value, regex) {
  return (String(value || "").match(regex) || []).length;
}

function isIpLiteral(hostname) {
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return true;
  return hostname.includes(":");
}

export function normalizePublicUrl(input) {
  let url;
  try {
    url = new URL(String(input || "").trim());
  } catch {
    throw new Error("Invalid URL: " + input);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http/https URLs are allowed.");
  }
  if (url.username || url.password) {
    throw new Error("URLs with embedded credentials are not allowed.");
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || isIpLiteral(host)) {
    throw new Error("Localhost and IP-literal targets are not allowed.");
  }
  if (PRIVATE_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw new Error("Private/local network hostnames are not allowed.");
  }
  if (url.port && !["80", "443"].includes(url.port)) {
    throw new Error("Non-standard ports are not allowed.");
  }
  if (!host.includes(".")) {
    throw new Error("A public domain name is required.");
  }

  url.hash = "";
  return url.toString();
}

async function fetchPublicHtml(input, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = Number(options.timeoutMs || 10000);
  const maxRedirects = Number(options.maxRedirects || 5);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let current = normalizePublicUrl(input);
  const started = Date.now();

  try {
    for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
      const response = await fetchImpl(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
          "user-agent": "XenderSecrets-Audit/1.0 (+https://www.xendersecrets.com/)"
        }
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          throw new Error("Redirect response did not include a Location header.");
        }
        current = normalizePublicUrl(new URL(location, current).toString());
        continue;
      }

      const contentType = response.headers.get("content-type") || "";
      const html = (await response.text()).slice(0, 1_500_000);
      return {
        html,
        status: response.status,
        responseMs: Date.now() - started,
        finalUrl: current,
        contentType
      };
    }
    throw new Error("Too many redirects.");
  } finally {
    clearTimeout(timer);
  }
}

export function auditHtml(html, context = {}) {
  const source = String(html || "");
  const text = stripTags(source);
  const lowerText = text.toLowerCase();
  const issues = [];
  const strengths = [];
  let score = 100;

  const addIssue = (code, title, points, severity, evidence = "") => {
    issues.push({ code, title, points, severity, evidence: collapse(evidence).slice(0, 180) });
    score -= points;
  };

  const url = context.url ? new URL(context.url) : null;
  const status = Number(context.status || 200);
  const responseMs = Number(context.responseMs || 0);
  const contentType = String(context.contentType || "text/html");

  if (url && url.protocol !== "https:") {
    addIssue("insecure-http", "Site is not using HTTPS", 10, "high", url.origin);
  } else if (url) {
    strengths.push("HTTPS enabled");
  }

  if (status < 200 || status >= 300) {
    addIssue("http-status", "Page returned HTTP " + status, 20, "critical", String(status));
  } else {
    strengths.push("Page returned a successful HTTP status");
  }

  if (responseMs > 3000) {
    addIssue("slow-response", "Initial response was slower than 3 seconds", 10, "high", responseMs + " ms");
  } else if (responseMs > 1500) {
    addIssue("slow-response", "Initial response was slower than 1.5 seconds", 5, "medium", responseMs + " ms");
  } else if (responseMs > 0) {
    strengths.push("Initial response completed in " + responseMs + " ms");
  }

  if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
    addIssue("content-type", "Target did not return an HTML content type", 20, "critical", contentType);
  }

  const title = firstMatch(source, /<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!title) {
    addIssue("missing-title", "Missing page title", 12, "high");
  } else if (title.length < 12 || title.length > 65) {
    addIssue("title-length", "Page title length could be improved", 4, "low", title);
  } else {
    strengths.push("Page title is present");
  }

  const description = findMeta(source, "name", "description");
  if (!description) {
    addIssue("missing-description", "Missing meta description", 8, "medium");
  } else {
    strengths.push("Meta description is present");
  }

  const viewport = findMeta(source, "name", "viewport");
  if (!viewport) {
    addIssue("missing-viewport", "Missing mobile viewport meta tag", 8, "high");
  } else {
    strengths.push("Mobile viewport is configured");
  }

  const h1Count = countMatches(source, /<h1\b[^>]*>/gi);
  if (h1Count === 0) {
    addIssue("missing-h1", "No H1 heading detected", 8, "medium");
  } else if (h1Count > 2) {
    addIssue("multiple-h1", "Too many H1 headings detected", 4, "low", String(h1Count));
  } else {
    strengths.push("Primary H1 heading is present");
  }

  if (!/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>/i.test(source)) {
    addIssue("missing-schema", "No JSON-LD structured data detected", 4, "low");
  } else {
    strengths.push("Structured data detected");
  }

  const hasEmail = /mailto:/i.test(source) || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text);
  const hasPhone = /tel:/i.test(source) || /(?:\+?91[\s-]?)?[6-9]\d{9}\b/.test(text);
  const hasWhatsapp = /wa\.me|whatsapp/i.test(source);
  if (!hasEmail && !hasPhone && !hasWhatsapp) {
    addIssue("weak-contact", "No direct email, phone or WhatsApp contact signal detected", 7, "high");
  } else {
    strengths.push("Direct contact channel detected");
  }

  if (!/\b(book|appointment|contact|call|whatsapp|get quote|request quote|enquire|inquire|schedule|start project)\b/i.test(lowerText)) {
    addIssue("weak-cta", "No clear high-intent call to action detected", 7, "high");
  } else {
    strengths.push("High-intent call to action detected");
  }

  const placeholderHits = PLACEHOLDER_PATTERNS
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source.replace(/\\b/g, ""));
  if (placeholderHits.length) {
    addIssue(
      "placeholder-copy",
      "Placeholder or unfinished copy is visible",
      15,
      "critical",
      placeholderHits.join(", ")
    );
  }

  if (/<h[1-6]\b[^>]*>\s*(?:<[^>]+>\s*)*(?:IMG|IMAGE|DSC)[-_]?\d{4,}/i.test(source)) {
    addIssue("raw-filename-heading", "Raw image filename appears as a visible heading", 8, "high");
  }

  if (/<form\b[^>]*action\s*=\s*["']http:\/\//i.test(source)) {
    addIssue("insecure-form", "A form submits over insecure HTTP", 10, "high");
  }

  score = Math.max(0, Math.min(100, score));

  const priority = [...issues].sort((a, b) => b.points - a.points).slice(0, 3);
  const hostname = url ? url.hostname.replace(/^www\./, "") : "your website";
  const salesAngle = priority.length
    ? "Lead with: " + priority.map((item) => item.title).join("; ")
    : "Site is comparatively healthy; avoid a generic redesign pitch and look for a deeper business-specific opportunity.";

  const subject = priority.length
    ? "Quick website fix I noticed on " + hostname
    : "One website idea for " + hostname;

  const outreachBody = priority.length
    ? [
        "Hi,",
        "",
        "I ran a lightweight public-site audit on " + hostname + " and found a few concrete items worth checking:",
        ...priority.map((item) => "• " + item.title),
        "",
        "I run Xender Secrets. I can prepare a free before/after preview focused on these exact issues so you can judge the improvement before deciding on any paid work.",
        "",
        "If useful, reply “send preview”.",
        "",
        "https://www.xendersecrets.com/"
      ].join("\n")
    : [
        "Hi,",
        "",
        "I reviewed " + hostname + ". The basics look comparatively solid, so I would not recommend a generic rebuild.",
        "If you are trying to improve enquiries or a specific customer journey, I can prepare a focused conversion review instead.",
        "",
        "https://www.xendersecrets.com/"
      ].join("\n");

  return {
    url: context.url || "",
    score,
    title,
    metaDescription: description,
    h1Count,
    issues,
    strengths,
    salesAngle,
    subject,
    outreachBody
  };
}

export async function auditUrl(input, options = {}) {
  const fetched = await fetchPublicHtml(input, options);
  const result = auditHtml(fetched.html, {
    url: fetched.finalUrl,
    status: fetched.status,
    responseMs: fetched.responseMs,
    contentType: fetched.contentType
  });

  return {
    requestedUrl: normalizePublicUrl(input),
    finalUrl: fetched.finalUrl,
    status: fetched.status,
    responseMs: fetched.responseMs,
    contentType: fetched.contentType,
    ...result
  };
}

function csvEscape(value) {
  const text = Array.isArray(value) || (value && typeof value === "object")
    ? JSON.stringify(value)
    : String(value ?? "");
  return '"' + text.replace(/"/g, '""') + '"';
}

export function resultsToCsv(results) {
  const header = [
    "requestedUrl",
    "finalUrl",
    "status",
    "responseMs",
    "score",
    "issueCount",
    "issues",
    "salesAngle",
    "subject",
    "outreachBody",
    "error"
  ];

  const rows = results.map((item) => [
    item.requestedUrl || item.input || "",
    item.finalUrl || "",
    item.status || "",
    item.responseMs || "",
    item.score ?? "",
    item.issues?.length ?? "",
    item.issues?.map((issue) => issue.title).join(" | ") || "",
    item.salesAngle || "",
    item.subject || "",
    item.outreachBody || "",
    item.error || ""
  ]);

  return [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}
