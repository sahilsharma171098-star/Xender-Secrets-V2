// Xender SiteCheck — page audit (CLAUDE-EXT-001).
//
// Injected into the active tab ONLY when the user clicks the toolbar button
// (chrome.scripting.executeScript with the activeTab grant). It reads the
// rendered DOM, returns a plain JSON result to the popup and leaves nothing
// behind: no listeners, no globals, no network requests, no storage.
//
// Privacy rules enforced here (see extension/store/privacy-policy.md):
// - never read form field values, cookies, storage or credentials;
// - samples describe elements (tag, id, class, short label/href), never user input;
// - the URL returned is origin + path only (no query string or fragment).
//
// Check metadata (titles, why/fix copy, category, weight) lives in src/lib/checks.js;
// this file returns only { id, status, count, detail, samples } per check.
(() => {
  "use strict";
  const doc = document;
  const win = window;
  const started = (win.performance && performance.now()) || Date.now();
  const MAX_SAMPLES = 5;
  const results = [];

  // ------------------------------------------------------------------ helpers
  const norm = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  const styleCache = new Map();
  const cs = (el) => {
    let s = styleCache.get(el);
    if (!s) { s = win.getComputedStyle(el); styleCache.set(el, s); }
    return s;
  };

  /** Element takes up space and is not visibility:hidden. */
  function isRendered(el) {
    if (!el || !el.getClientRects || el.getClientRects().length === 0) return false;
    const s = cs(el);
    return s.visibility !== "hidden" && s.visibility !== "collapse";
  }
  /** Hidden from assistive technology (aria-hidden subtree or not rendered). */
  function isHiddenFromAT(el) {
    return !isRendered(el) || !!el.closest('[aria-hidden="true"]');
  }

  /** Short, privacy-safe description of an element for "examples". */
  function describe(el, label) {
    const tag = el.tagName.toLowerCase();
    let s = "<" + tag;
    if (el.id) s += "#" + cut(el.id, 30);
    const cls = typeof el.className === "string" ? norm(el.className).split(" ").filter(Boolean).slice(0, 2) : [];
    if (cls.length) s += "." + cls.map((c) => cut(c, 24)).join(".");
    if (tag === "input") s += ' type="' + (el.getAttribute("type") || "text") + '"';
    if ((tag === "input" || tag === "select" || tag === "textarea") && el.getAttribute("name")) s += ' name="' + cut(el.getAttribute("name"), 30) + '"';
    if (tag === "a" && el.hasAttribute("href")) s += ' href="' + cut(el.getAttribute("href"), 70) + '"';
    if ((tag === "img" || tag === "script" || tag === "iframe" || tag === "source") && el.getAttribute("src")) {
      const src = el.getAttribute("src");
      s += ' src="' + (/^data:/i.test(src) ? cut(src.split(/[,;]/)[0], 24) + ",…" : cut(src, 70)) + '"';
    }
    s += ">";
    if (label) s += " " + cut(norm(label), 60);
    return s;
  }

  function record(id, status, extra) {
    const r = { id, status, count: 0, detail: "", samples: [] };
    if (extra) Object.assign(r, extra);
    if (r.samples.length > MAX_SAMPLES) r.samples = r.samples.slice(0, MAX_SAMPLES);
    results.push(r);
  }
  /** pass/fail from a list of offending items ({el,label} or strings). na when not applicable. */
  function fromList(id, items, { applicable = true, detail = "", passDetail = "" } = {}) {
    if (!applicable) return record(id, "na");
    const samples = items.slice(0, MAX_SAMPLES).map((it) => (typeof it === "string" ? it : describe(it.el, it.label)));
    if (items.length) record(id, "fail", { count: items.length, detail, samples });
    else record(id, "pass", { detail: passDetail });
  }

  // ------------------------------------------------- accessible name (simplified)
  // A pragmatic subset of the accname spec: aria-labelledby, aria-label, native
  // labels/alt/value, then text content (including img alt and svg <title>), then title.
  function textName(node, seen) {
    let out = "";
    for (const child of node.childNodes) {
      if (child.nodeType === 3) { out += " " + child.data; continue; }
      if (child.nodeType !== 1) continue;
      const tag = child.tagName.toLowerCase();
      if (tag === "script" || tag === "style" || tag === "template" || tag === "noscript") continue;
      if (child.getAttribute("aria-hidden") === "true") continue;
      if (child.getClientRects && child.getClientRects().length === 0 && tag !== "title") {
        const d = cs(child).display;
        if (d === "none") continue;
      }
      out += " " + accName(child, seen, true);
    }
    return norm(out);
  }

  function accName(el, seen = new Set(), embedded = false) {
    if (seen.has(el)) return "";
    seen.add(el);
    const tag = el.tagName.toLowerCase();
    const labelledby = el.getAttribute("aria-labelledby");
    if (labelledby && !embedded) {
      const t = norm(labelledby.split(/\s+/).map((id) => doc.getElementById(id)).filter(Boolean).map((n) => textName(n, seen) || norm(n.getAttribute("aria-label"))).join(" "));
      if (t) return t;
    }
    const aria = norm(el.getAttribute("aria-label"));
    if (aria) return aria;
    if (tag === "img" || tag === "area" || (tag === "input" && (el.getAttribute("type") || "").toLowerCase() === "image")) {
      return norm(el.getAttribute("alt")) || norm(el.getAttribute("title"));
    }
    if (tag === "svg") {
      const t = el.querySelector("title");
      return t ? norm(t.textContent) : "";
    }
    if (tag === "input") {
      const type = (el.getAttribute("type") || "text").toLowerCase();
      if (type === "submit" || type === "reset" || type === "button") {
        const v = norm(el.getAttribute("value"));
        if (v) return v;
        if (type === "submit") return "Submit";
        if (type === "reset") return "Reset";
        return norm(el.getAttribute("title"));
      }
    }
    if (!embedded && (tag === "input" || tag === "select" || tag === "textarea")) {
      const fromLabels = el.labels ? norm([...el.labels].map((l) => textName(l, seen)).join(" ")) : "";
      return fromLabels || norm(el.getAttribute("title"));
    }
    if (embedded && (tag === "input" || tag === "select" || tag === "textarea")) return "";
    return textName(el, seen) || norm(el.getAttribute("title"));
  }

  // ------------------------------------------------------------------ context
  const loc = win.location;
  const isHttps = loc.protocol === "https:";
  const isHttp = loc.protocol === "http:";
  const isLocalHost = /^(localhost|127(?:\.\d+){3}|\[::1\]|0\.0\.0\.0)$/i.test(loc.hostname) || /\.(test|localhost|local)$/i.test(loc.hostname);
  const pageNoHash = loc.href.split("#")[0];
  const all = doc.getElementsByTagName("*");
  const meta = (attr, value) => {
    for (const m of doc.querySelectorAll("meta[" + attr + "]")) {
      if ((m.getAttribute(attr) || "").toLowerCase() === value) return m;
    }
    return null;
  };
  const metaContent = (attr, value) => { const m = meta(attr, value); return m ? norm(m.getAttribute("content")) : null; };

  // ================================================================== SEO
  const title = norm(doc.title);
  if (!title) record("seo-title-missing", "fail");
  else record("seo-title-missing", "pass", { detail: cut(title, 90) });

  if (title) {
    const generic = /^(home|homepage|home page|index|untitled|untitled document|document|new page|welcome|my site|website|page|default)$/i;
    if (generic.test(title)) record("seo-title-quality", "fail", { detail: `“${title}” is a generic title that doesn't describe this page.` });
    else if (title.length < 15) record("seo-title-quality", "fail", { detail: `The title is only ${title.length} characters: “${title}”.` });
    else if (title.length > 70) record("seo-title-quality", "fail", { detail: `The title is ${title.length} characters; search results usually cut it off around 60–65.` });
    else record("seo-title-quality", "pass", { detail: `${title.length} characters` });
  } else record("seo-title-quality", "na");

  const desc = metaContent("name", "description");
  if (!desc) record("seo-description-missing", "fail", { detail: desc === "" ? "A description tag exists but it is empty." : "" });
  else record("seo-description-missing", "pass", { detail: cut(desc, 120) });
  if (desc) {
    if (desc.length < 50) record("seo-description-length", "fail", { detail: `The description is only ${desc.length} characters.` });
    else if (desc.length > 170) record("seo-description-length", "fail", { detail: `The description is ${desc.length} characters; search results usually show about 150–160.` });
    else record("seo-description-length", "pass", { detail: `${desc.length} characters` });
  } else record("seo-description-length", "na");

  const canonicalEl = doc.querySelector('link[rel~="canonical" i][href]');
  if (!canonicalEl || !norm(canonicalEl.getAttribute("href"))) record("seo-canonical", "fail");
  else record("seo-canonical", "pass", { detail: cut(canonicalEl.href, 100) });

  const viewport = metaContent("name", "viewport");
  if (!viewport) record("seo-viewport", "fail");
  else if (!/width\s*=\s*device-width/i.test(viewport)) record("seo-viewport", "fail", { detail: `The viewport tag doesn't set width=device-width: “${cut(viewport, 80)}”.` });
  else record("seo-viewport", "pass", { detail: cut(viewport, 80) });

  const ogTitle = metaContent("property", "og:title") ?? metaContent("name", "og:title");
  const ogDesc = metaContent("property", "og:description") ?? metaContent("name", "og:description");
  const ogImage = metaContent("property", "og:image") ?? metaContent("name", "og:image");
  record("seo-og-title", ogTitle ? "pass" : "fail", { detail: ogTitle ? cut(ogTitle, 90) : "" });
  record("seo-og-description", ogDesc ? "pass" : "fail", { detail: ogDesc ? cut(ogDesc, 90) : "" });
  if (!ogImage) record("seo-og-image", "fail");
  else if (!/^https?:\/\//i.test(ogImage)) record("seo-og-image", "fail", { detail: `og:image should be a full URL starting with https://, not “${cut(ogImage, 60)}”.` });
  else record("seo-og-image", "pass", { detail: cut(ogImage, 90) });

  const robots = [metaContent("name", "robots"), metaContent("name", "googlebot")].filter(Boolean).join(", ");
  if (/\bnoindex\b|\bnone\b/i.test(robots)) record("seo-noindex", "fail", { detail: `Robots meta: “${cut(robots, 80)}”.` });
  else record("seo-noindex", "pass");

  const headings = [...doc.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter((h) => isRendered(h));
  const h1s = headings.filter((h) => h.tagName === "H1");
  if (!h1s.length) record("seo-h1-missing", "fail");
  else record("seo-h1-missing", "pass", { detail: cut(accName(h1s[0]) || "(empty)", 90) });
  if (h1s.length > 1) fromList("seo-h1-multiple", h1s.map((el) => ({ el, label: accName(el) })), { detail: `${h1s.length} H1 headings found.` });
  else record("seo-h1-multiple", h1s.length ? "pass" : "na");

  // ================================================================== ACCESSIBILITY
  const lang = norm(doc.documentElement.getAttribute("lang"));
  record("a11y-html-lang", lang ? "pass" : "fail", { detail: lang ? `lang="${cut(lang, 20)}"` : "" });

  if (viewport) {
    const noScale = /user-scalable\s*=\s*(no|0)\b/i.test(viewport);
    const maxScale = /maximum-scale\s*=\s*([\d.]+)/i.exec(viewport);
    const lowMax = maxScale && parseFloat(maxScale[1]) < 2;
    if (noScale || lowMax) record("a11y-zoom-disabled", "fail", { detail: `Viewport: “${cut(viewport, 80)}”.` });
    else record("a11y-zoom-disabled", "pass");
  } else record("a11y-zoom-disabled", "na");

  // Images
  const imgs = [...doc.images];
  const renderedImgs = imgs.filter((img) => isRendered(img));
  const isTiny = (img) => { const r = img.getBoundingClientRect(); return r.width <= 2 && r.height <= 2; };
  const missingAlt = renderedImgs.filter((img) => !img.hasAttribute("alt") && !isTiny(img) && !isHiddenFromAT(img) &&
    !/^(presentation|none)$/i.test(img.getAttribute("role") || "") && !norm(img.getAttribute("aria-label")) && !img.getAttribute("aria-labelledby"));
  fromList("a11y-img-alt", missingAlt.map((el) => ({ el })), { applicable: renderedImgs.length > 0, detail: `${missingAlt.length} of ${renderedImgs.length} visible images have no alt attribute.`, passDetail: `${renderedImgs.length} visible images checked.` });

  const bigEmptyAlt = renderedImgs.filter((img) => {
    if (img.getAttribute("alt") !== "" || isHiddenFromAT(img)) return false;
    if (img.closest("a[href],button,[role=button]")) return false; // covered by link/button name checks
    const r = img.getBoundingClientRect();
    return r.width >= 200 && r.height >= 150;
  });
  fromList("a11y-img-empty-alt", bigEmptyAlt.map((el) => ({ el })), { applicable: renderedImgs.length > 0, detail: `${bigEmptyAlt.length} large images are marked as decorative (alt="").` });

  // Links
  const links = [...doc.querySelectorAll("a[href], area[href]")];
  const renderedLinks = links.filter((a) => a.tagName === "AREA" || isRendered(a));
  const namelessLinks = renderedLinks.filter((a) => a.tagName === "A" && !isHiddenFromAT(a) && !accName(a));
  fromList("a11y-link-name", namelessLinks.map((el) => ({ el })), { applicable: renderedLinks.length > 0, detail: `${namelessLinks.length} links have no text or label a screen reader can announce.`, passDetail: `${renderedLinks.length} visible links checked.` });

  const VAGUE_LINK = /^(click here|click|here|read more|more|learn more|more info|more information|details|link|this|go|continue|view|view more|see more)[.!…]*$/i;
  const vague = new Map();
  for (const a of renderedLinks) {
    if (a.tagName !== "A" || isHiddenFromAT(a)) continue;
    const name = accName(a);
    if (name && VAGUE_LINK.test(name)) { const k = name.toLowerCase(); if (!vague.has(k)) vague.set(k, []); vague.get(k).push(a); }
  }
  const vagueItems = [...vague.values()].flat();
  fromList("a11y-link-vague", vagueItems.map((el) => ({ el, label: accName(el) })), { applicable: renderedLinks.length > 0,
    detail: `${vagueItems.length} links use vague text: ${[...vague.keys()].slice(0, 4).map((k) => "“" + k + "”").join(", ")}.` });

  // Buttons
  const buttons = [...doc.querySelectorAll('button, [role="button"], input[type="button" i], input[type="submit" i], input[type="reset" i], input[type="image" i]')]
    .filter((b) => isRendered(b) && !isHiddenFromAT(b));
  const namelessButtons = buttons.filter((b) => !accName(b));
  fromList("a11y-button-name", namelessButtons.map((el) => ({ el })), { applicable: buttons.length > 0, detail: `${namelessButtons.length} of ${buttons.length} buttons have no accessible name.`, passDetail: `${buttons.length} buttons checked.` });

  // Form controls
  const SKIP_TYPES = /^(hidden|submit|reset|button|image)$/i;
  const controls = [...doc.querySelectorAll("input, select, textarea")].filter((c) => !SKIP_TYPES.test(c.getAttribute("type") || "") && isRendered(c) && !isHiddenFromAT(c));
  const unlabelled = [];
  for (const c of controls) {
    if (accName(c)) continue;
    const ph = norm(c.getAttribute("placeholder"));
    unlabelled.push({ el: c, label: ph ? `(placeholder only: “${cut(ph, 30)}”)` : "" });
  }
  fromList("a11y-form-labels", unlabelled, { applicable: controls.length > 0, detail: `${unlabelled.length} of ${controls.length} form fields have no label.`, passDetail: `${controls.length} form fields checked.` });

  // Headings
  const emptyHeadings = headings.filter((h) => !isHiddenFromAT(h) && !accName(h));
  fromList("a11y-empty-heading", emptyHeadings.map((el) => ({ el })), { applicable: headings.length > 0 });

  const skips = [];
  let prev = 0;
  for (const h of headings) {
    if (isHiddenFromAT(h)) continue;
    const level = Number(h.tagName[1]);
    if (prev && level > prev + 1) skips.push({ el: h, label: `H${prev} → H${level}: ${accName(h)}` });
    prev = level;
  }
  fromList("a11y-heading-order", skips, { applicable: headings.length > 1, detail: `${skips.length} places skip a heading level.` });

  // ARIA
  const ROLES = new Set("alert alertdialog application article banner blockquote button caption cell checkbox code columnheader combobox complementary contentinfo definition deletion dialog directory document emphasis feed figure form generic grid gridcell group heading img image insertion link list listbox listitem log main mark marquee math menu menubar menuitem menuitemcheckbox menuitemradio meter navigation none note option paragraph presentation progressbar radio radiogroup region row rowgroup rowheader scrollbar search searchbox section sectionhead separator slider spinbutton status strong subscript suggestion superscript switch tab table tablist tabpanel term textbox time timer toolbar tooltip tree treegrid treeitem comment".split(" "));
  const ariaProblems = [];
  for (const el of doc.querySelectorAll("[role]")) {
    const tokens = norm(el.getAttribute("role")).toLowerCase().split(" ").filter(Boolean);
    if (tokens.length && !tokens.some((t) => ROLES.has(t) || /^(doc|graphics)-[a-z]+$/.test(t))) ariaProblems.push({ el, label: `role="${cut(tokens.join(" "), 30)}" is not a valid ARIA role` });
  }
  for (const attr of ["aria-labelledby", "aria-describedby"]) {
    for (const el of doc.querySelectorAll("[" + attr + "]")) {
      const ids = norm(el.getAttribute(attr)).split(" ").filter(Boolean);
      const missing = ids.filter((id) => !doc.getElementById(id));
      if (missing.length) ariaProblems.push({ el, label: `${attr} points to missing id “${cut(missing[0], 30)}”` });
    }
  }
  const FOCUSABLE = 'a[href], button, input:not([type="hidden" i]), select, textarea, [tabindex], [contenteditable=""], [contenteditable="true"]';
  for (const el of doc.querySelectorAll('[aria-hidden="true"]')) {
    const candidates = el.matches(FOCUSABLE) ? [el] : [];
    for (const f of el.querySelectorAll(FOCUSABLE)) candidates.push(f);
    for (const f of candidates) {
      if (f.matches(":disabled") || f.getAttribute("tabindex") === "-1" || !isRendered(f) || f.closest("[inert]")) continue;
      ariaProblems.push({ el: f, label: "focusable element inside aria-hidden=\"true\"" });
      break;
    }
  }
  fromList("a11y-aria", ariaProblems, { detail: `${ariaProblems.length} ARIA problems found.` });

  // Contrast — only measured where the background can be determined reliably.
  function parseColor(str) {
    const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(str || "");
    if (!m) return null;
    let a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const rootScheme = (cs(doc.documentElement).colorScheme || "").toLowerCase();
  function backgroundOf(el) {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = cs(n);
      if (s.backgroundImage && s.backgroundImage !== "none") return null;
      if (parseFloat(s.opacity) < 1 || (s.filter && s.filter !== "none") || (s.mixBlendMode && s.mixBlendMode !== "normal")) return null;
      const bg = parseColor(s.backgroundColor);
      if (!bg) return null;
      if (bg.a >= 1) return bg;
      if (bg.a > 0) return null;
      if (s.position === "absolute" || s.position === "fixed") return null;
    }
    if (rootScheme.includes("dark")) return null;
    return { r: 255, g: 255, b: 255, a: 1 };
  }
  const lowContrast = [];
  let contrastMeasured = 0;
  let scanned = 0;
  for (const el of all) {
    if (scanned > 2500) break;
    const tag = el.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEMPLATE" || tag === "svg" || tag === "OPTION") continue;
    let hasText = false;
    for (const c of el.childNodes) { if (c.nodeType === 3 && c.data.trim().length > 1) { hasText = true; break; } }
    if (!hasText) continue;
    scanned++;
    if (!isRendered(el) || el.closest(":disabled")) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const s = cs(el);
    if (s.textShadow && s.textShadow !== "none") continue;
    const fg = parseColor(s.color);
    if (!fg || fg.a < 1) continue;
    const fill = s.webkitTextFillColor;
    if (fill && fill !== s.color && parseColor(fill) && parseColor(fill).a > 0) continue;
    const bg = backgroundOf(el);
    if (!bg) continue;
    contrastMeasured++;
    const size = parseFloat(s.fontSize) || 16;
    const bold = (parseInt(s.fontWeight, 10) || 400) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    const got = ratio(fg, bg);
    if (got + 0.005 < need) {
      const text = [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.data).join(" ");
      lowContrast.push({ el, label: `${got.toFixed(2)}:1 (needs ${need}:1) “${cut(norm(text), 40)}”` });
    }
  }
  fromList("a11y-contrast", lowContrast, { applicable: contrastMeasured > 0, detail: `${lowContrast.length} of ${contrastMeasured} measurable text elements are below the WCAG AA contrast ratio.`, passDetail: `${contrastMeasured} text elements measured.` });

  // ================================================================== USABILITY
  const viewW = doc.documentElement.clientWidth || win.innerWidth;
  const scrollW = Math.max(doc.documentElement.scrollWidth, doc.body ? doc.body.scrollWidth : 0);
  const clipsX = (el) => el && /hidden|clip/.test(cs(el).overflowX);
  if (scrollW > viewW + 1 && !clipsX(doc.documentElement) && !clipsX(doc.body)) {
    const origins = [];
    for (const el of all) {
      if (origins.length >= MAX_SAMPLES) break;
      if (!el.getBoundingClientRect || el === doc.documentElement || el === doc.body) continue;
      const r = el.getBoundingClientRect();
      if (r.right <= viewW + 1 || r.width === 0) continue;
      const p = el.parentElement;
      if (p && p !== doc.body && p.getBoundingClientRect().right > viewW + 1) continue;
      let clipped = false;
      for (let a = p; a && a !== doc.body; a = a.parentElement) { if (/hidden|clip|auto|scroll/.test(cs(a).overflowX)) { clipped = true; break; } }
      if (clipped || cs(el).position === "fixed") continue;
      origins.push({ el, label: `ends at ${Math.round(r.right + win.scrollX)}px` });
    }
    record("ux-horizontal-overflow", "fail", { count: origins.length || 1, detail: `The page is ${scrollW}px wide but the window is ${viewW}px, so it scrolls sideways at this width.`, samples: origins.map((o) => describe(o.el, o.label)) });
  } else record("ux-horizontal-overflow", "pass", { detail: `Checked at ${viewW}px window width.` });

  const forms = [...doc.forms].filter((f) => isRendered(f));
  const fieldsOf = (f) => [...f.elements].filter((c) => /^(INPUT|SELECT|TEXTAREA)$/.test(c.tagName) && !SKIP_TYPES.test(c.getAttribute("type") || "") && isRendered(c));
  const submitOf = (f) => {
    const inside = [...f.querySelectorAll('button:not([type]), button[type="submit" i], input[type="submit" i], input[type="image" i]')];
    const outside = f.id ? [...doc.querySelectorAll('[form="' + CSS.escape(f.id) + '"]')].filter((b) => b.matches('button:not([type]), button[type="submit" i], input[type="submit" i], input[type="image" i]')) : [];
    return inside.concat(outside).filter((b) => isRendered(b));
  };
  const realForms = forms.filter((f) => fieldsOf(f).length > 0);
  const noSubmit = realForms.filter((f) => {
    if (submitOf(f).length) return false;
    const fields = fieldsOf(f);
    const searchy = f.getAttribute("role") === "search" || f.closest("search,[role=search]") || (fields.length === 1 && /^(search|text)$/i.test(fields[0].getAttribute("type") || "text") && /search|q\b|query/i.test((fields[0].name || "") + " " + (fields[0].id || "") + " " + (f.action || "")));
    return !searchy;
  });
  fromList("ux-form-submit", noSubmit.map((el) => ({ el })), { applicable: realForms.length > 0, detail: `${noSubmit.length} forms have no visible submit button.` });

  const HINT = /(e-?mail|phone|mobile|tel\b|whatsapp|first.?name|last.?name|full.?name|^name$|your.?name|address|postcode|postal|zip|city)/i;
  const autoMissing = controls.filter((c) => {
    if (c.hasAttribute("autocomplete") || c.closest("form[autocomplete]")) return false;
    const type = (c.getAttribute("type") || "text").toLowerCase();
    return type === "email" || type === "tel" || HINT.test(c.getAttribute("name") || "") || HINT.test(c.id || "");
  });
  fromList("ux-autocomplete", autoMissing.map((el) => ({ el })), { applicable: controls.length > 0, detail: `${autoMissing.length} contact fields don't use autocomplete.` });

  const wrongType = controls.filter((c) => {
    if (c.tagName !== "INPUT") return false;
    const type = (c.getAttribute("type") || "text").toLowerCase();
    if (type !== "text") return false;
    const key = (c.getAttribute("name") || "") + " " + (c.id || "") + " " + (c.getAttribute("autocomplete") || "");
    if (/e-?mail/i.test(key)) return true;
    if (/(phone|mobile|\btel\b|whatsapp)/i.test(key) && !c.hasAttribute("inputmode")) return true;
    return false;
  });
  fromList("ux-input-types", wrongType.map((el) => ({ el })), { applicable: controls.length > 0, detail: `${wrongType.length} email/phone fields use a plain text keyboard on mobile.` });

  // ================================================================== CONVERSION (heuristics)
  const clickables = [...doc.querySelectorAll('a[href], button, input[type="submit" i], input[type="button" i], [role="button"]')].filter((el) => isRendered(el) && !isHiddenFromAT(el));
  const ACTION = /\b(book|call|contact|get (a|an|your|my|started|in touch|quote|free|the)|start|buy|order|request|schedule|quote|sign ?up|subscribe|try|download|enquire|enquiry|inquire|whatsapp|register|join|apply|shop|add to (cart|bag|basket)|checkout|chat|reserve|hire|talk to|demo|free trial|claim|donate|message us|email us|send (us|a) message)\b/i;
  const ctas = clickables.filter((el) => ACTION.test(accName(el)));
  record("cro-cta-present", ctas.length ? "pass" : "fail", { count: ctas.length ? 0 : 1, detail: ctas.length ? `${ctas.length} action links/buttons, e.g. “${cut(accName(ctas[0]), 40)}”.` : "No link or button with an action label (book, call, contact, buy, get a quote…) was found." });

  const VAGUE_CTA = /^(submit|send|go|ok|okay|enter|click|click here|next|proceed)[.!]*$/i;
  const vagueCtas = [];
  for (const f of realForms) for (const b of submitOf(f)) { const n = accName(b); if (VAGUE_CTA.test(n)) vagueCtas.push({ el: b, label: n }); }
  fromList("cro-cta-vague", vagueCtas, { applicable: realForms.length > 0, detail: `${vagueCtas.length} submit buttons use generic labels.` });

  const buttonLike = (el) => {
    if (el.tagName !== "A") return true;
    const s = cs(el);
    const bg = parseColor(s.backgroundColor);
    const filled = (bg && bg.a > 0.5) || (s.borderStyle !== "none" && parseFloat(s.borderWidth) > 0);
    return filled && parseFloat(s.paddingLeft) >= 8 && /block|flex|grid/.test(s.display);
  };
  const vh = win.innerHeight;
  const fold = new Map();
  for (const el of ctas) {
    const r = el.getBoundingClientRect();
    const top = r.top + win.scrollY;
    if (top >= vh || r.bottom + win.scrollY <= 0 || !buttonLike(el)) continue;
    const k = accName(el).toLowerCase();
    if (!fold.has(k)) fold.set(k, el);
  }
  if (fold.size > 4) fromList("cro-cta-competing", [...fold.values()].map((el) => ({ el, label: accName(el) })), { detail: `${fold.size} different call-to-action buttons compete in the first screen.` });
  else record("cro-cta-competing", "pass", { detail: `${fold.size} distinct call-to-action buttons in the first screen.` });

  const bodyText = doc.body ? doc.body.innerText || "" : "";
  const contactLinks = links.filter((a) => /^(tel:|mailto:|sms:|whatsapp:)/i.test(a.getAttribute("href") || "") || /(^|\/\/)(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(a.href || ""));
  const emailText = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(bodyText);
  const phoneText = /(?:\+\d{1,3}[\s.-]?)\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/.test(bodyText) || /\b[6-9]\d{4}[\s-]?\d{5}\b/.test(bodyText);
  const contactPage = links.some((a) => /contact/i.test(accName(a) + " " + (a.getAttribute("href") || "")));
  if (contactLinks.length || emailText || phoneText) record("cro-contact", "pass", { detail: contactLinks.length ? `${contactLinks.length} phone, email or WhatsApp links.` : "Contact details are visible as text." });
  else record("cro-contact", "fail", { count: 1, detail: contactPage ? "There is a link to a contact page, but no phone, email or WhatsApp link on this page." : "No phone, email, WhatsApp or contact-page link found." });

  const trust = links.filter((a) => /(privacy|terms|about|contact|refund|return|review|testimonial|imprint|impressum)/i.test(accName(a) + " " + (a.getAttribute("href") || "")));
  record("cro-trust", trust.length ? "pass" : "fail", { count: trust.length ? 0 : 1, detail: trust.length ? `${trust.length} links to about, contact, privacy or policy pages.` : "No links to about, contact, privacy or policy pages found." });

  const longForms = realForms.filter((f) => fieldsOf(f).length > 8);
  fromList("cro-form-length", longForms.map((el) => ({ el, label: `${fieldsOf(el).length} fields` })), { applicable: realForms.length > 0, detail: longForms.length ? `The longest form asks for ${Math.max(...longForms.map((f) => fieldsOf(f).length))} fields.` : "" });

  const navs = [...doc.querySelectorAll('nav, [role="navigation"]')].filter((n) => isRendered(n) && (n.closest('header, [role="banner"]') || n.getBoundingClientRect().top + win.scrollY < 300));
  const navCount = navs.length ? Math.max(...navs.map((n) => [...n.querySelectorAll("a[href]")].filter((a) => isRendered(a)).length)) : 0;
  if (!navs.length) record("cro-nav", "na");
  else if (navCount > 10) record("cro-nav", "fail", { count: navCount, detail: `The main navigation shows ${navCount} links at once.` });
  else record("cro-nav", "pass", { detail: `${navCount} links in the main navigation.` });

  const placeholder = /\blorem ipsum\b|\bdolor sit amet\b|your (content|text|title|headline) (goes )?here|\binsert (text|content) here\b|\bsample text\b/i.exec(bodyText);
  record("cro-placeholder", placeholder ? "fail" : "pass", { count: placeholder ? 1 : 0, detail: placeholder ? `Found “${placeholder[0]}” on the page.` : "" });

  // ================================================================== TECHNICAL / SECURITY
  if (isHttp && !isLocalHost) record("tech-https", "fail", { count: 1 });
  else if (isHttps) record("tech-https", "pass");
  else record("tech-https", "na", { detail: isLocalHost ? "Local development address." : "" });

  const passwords = [...doc.querySelectorAll('input[type="password" i]')];
  if (!passwords.length) record("tech-password-http", "na");
  else if (isHttp && !isLocalHost) fromList("tech-password-http", passwords.map((el) => ({ el })), { detail: "Passwords typed here are sent without encryption." });
  else record("tech-password-http", "pass");

  const insecureRes = [];
  if (isHttps) {
    const isHttpUrl = (u) => /^http:\/\//i.test(norm(u));
    for (const el of doc.querySelectorAll("img[src], script[src], iframe[src], audio[src], video[src], source[src], embed[src], track[src]")) if (isHttpUrl(el.getAttribute("src"))) insecureRes.push({ el });
    for (const el of doc.querySelectorAll("object[data]")) if (isHttpUrl(el.getAttribute("data"))) insecureRes.push({ el });
    for (const el of doc.querySelectorAll('link[href]')) if (/\b(stylesheet|icon|preload|manifest)\b/i.test(el.getAttribute("rel") || "") && isHttpUrl(el.getAttribute("href"))) insecureRes.push({ el, label: el.getAttribute("href") });
    for (const el of doc.querySelectorAll("img[srcset], source[srcset]")) if (/(^|,)\s*http:\/\//i.test(el.getAttribute("srcset") || "")) insecureRes.push({ el, label: "srcset" });
  }
  fromList("tech-mixed-content", insecureRes, { applicable: isHttps, detail: `${insecureRes.length} images, scripts, styles or frames load over insecure http://.` });

  const formsAll = [...doc.forms];
  const insecureForms = formsAll.filter((f) => { const a = f.getAttribute("action"); if (!a) return false; try { const u = new URL(a, loc.href); return u.protocol === "http:" && !/^(localhost|127\.)/.test(u.hostname); } catch (e) { return false; } });
  // On an http:// page every form is insecure; that is reported once by tech-https.
  fromList("tech-form-http", insecureForms.map((el) => ({ el, label: "action=" + cut(el.getAttribute("action"), 60) })), { applicable: isHttps && formsAll.length > 0, detail: "Form data would be sent without encryption." });

  const deadLinks = [], malformed = [], brokenAnchors = [], insecureLinks = [], unsafeBlank = [];
  let anchorsChecked = 0;
  for (const a of links) {
    const raw = (a.getAttribute("href") || "").trim();
    const role = (a.getAttribute("role") || "").toLowerCase();
    if (raw === "" || /^javascript:/i.test(raw) || (raw === "#" && role !== "button" && role !== "tab")) {
      if (a.tagName === "A" && isRendered(a) && role !== "button") deadLinks.push({ el: a, label: accName(a) });
      continue;
    }
    let url = null;
    try { url = new URL(raw, doc.baseURI); } catch (e) { malformed.push({ el: a, label: accName(a) }); continue; }
    if (/^(https?:\/(?!\/)|https?\/\/|htps?:|htp:|ttps?:)/i.test(raw) || /^www\./i.test(raw) || /\s/.test(raw.replace(/%20/g, "")) && /^https?:/i.test(raw) ||
        (/^mailto:/i.test(raw) && !/^mailto:\??[^?]*@|^mailto:\?/i.test(raw)) || (/^tel:/i.test(raw) && (raw.replace(/\D/g, "").length < 5))) {
      malformed.push({ el: a, label: accName(a) });
      continue;
    }
    if ((url.protocol === "http:" || url.protocol === "https:") && url.href.split("#")[0] === pageNoHash && url.hash.length > 1) {
      let frag = url.hash.slice(1);
      try { frag = decodeURIComponent(frag); } catch (e) { /* keep raw */ }
      if (frag.toLowerCase() !== "top" && !/^[!/]/.test(frag) && !/^:~:/.test(frag)) {
        anchorsChecked++;
        if (!doc.getElementById(frag) && !doc.getElementsByName(frag).length) brokenAnchors.push({ el: a, label: accName(a) });
      }
    }
    if (isHttps && url.protocol === "http:" && !/^(localhost|127\.)/.test(url.hostname)) insecureLinks.push({ el: a, label: accName(a) });
    if ((a.getAttribute("target") || "").toLowerCase() === "_blank" && url.origin !== loc.origin && /^https?:$/.test(url.protocol) && !/\bnoopener\b|\bnoreferrer\b/i.test(a.getAttribute("rel") || "")) unsafeBlank.push({ el: a, label: accName(a) });
  }
  fromList("tech-dead-links", deadLinks, { applicable: links.length > 0, detail: `${deadLinks.length} links have an empty, “#” or javascript: address.` });
  fromList("tech-malformed-links", malformed, { applicable: links.length > 0, detail: `${malformed.length} link addresses look mistyped.` });
  fromList("tech-broken-anchors", brokenAnchors, { applicable: anchorsChecked > 0, detail: `${brokenAnchors.length} of ${anchorsChecked} same-page links point to a section that doesn't exist on this page.`, passDetail: `${anchorsChecked} same-page links verified.` });
  fromList("tech-insecure-links", insecureLinks, { applicable: isHttps && links.length > 0, detail: `${insecureLinks.length} links point to insecure http:// addresses.` });
  fromList("tech-target-blank", unsafeBlank, { applicable: links.length > 0, detail: `${unsafeBlank.length} external links open a new tab without rel="noopener".` });

  if (doc.compatMode === "BackCompat") record("tech-doctype", "fail", { count: 1, detail: "The page renders in quirks mode." });
  else record("tech-doctype", "pass");

  const idCounts = new Map();
  for (const el of doc.querySelectorAll("[id]")) { const id = el.id; if (id) idCounts.set(id, (idCounts.get(id) || 0) + 1); }
  const dupes = [...idCounts.entries()].filter(([, n]) => n > 1);
  fromList("tech-duplicate-ids", dupes.map(([id, n]) => `id="${cut(id, 40)}" ×${n}`), { detail: `${dupes.length} id values are used more than once.` });

  let depth = 0;
  (function walk(el, d) { if (d > depth) depth = d; if (d > 200) return; for (const c of el.children) walk(c, d + 1); })(doc.documentElement, 1);
  const elementCount = all.length;
  if (elementCount > 1500 || depth > 32) record("tech-dom-size", "fail", { count: 1, detail: `${elementCount.toLocaleString("en")} elements, nested up to ${depth} levels deep.` });
  else record("tech-dom-size", "pass", { detail: `${elementCount.toLocaleString("en")} elements, ${depth} levels deep.` });

  const dpr = win.devicePixelRatio || 1;
  const oversized = renderedImgs.filter((img) => {
    if (!img.complete || !img.naturalWidth) return false;
    const r = img.getBoundingClientRect();
    if (r.width < 16) return false;
    return img.naturalWidth >= 1200 && img.naturalWidth / (r.width * dpr) >= 2.5;
  });
  fromList("tech-oversized-images", oversized.map((el) => ({ el, label: `${el.naturalWidth}px wide, shown at ${Math.round(el.getBoundingClientRect().width)}px` })), { applicable: renderedImgs.length > 0, detail: `${oversized.length} images are much larger than the size they are shown at.` });

  // ------------------------------------------------------------------ result
  const ended = (win.performance && performance.now()) || Date.now();
  return {
    engine: "xender-sitecheck",
    engineVersion: 1,
    url: loc.origin + loc.pathname,
    host: loc.hostname,
    protocol: loc.protocol,
    title: cut(title, 120),
    viewport: { width: viewW, height: vh },
    stats: { elements: elementCount, depth, links: links.length, images: imgs.length, forms: formsAll.length, headings: headings.length },
    checks: results,
    durationMs: Math.round(ended - started),
  };
})();
