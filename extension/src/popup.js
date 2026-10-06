// Xender SiteCheck popup. Runs src/audit.js in the active tab (activeTab + scripting),
// scores the result locally and renders it. No network requests, no storage.
import { CATEGORIES } from "./lib/checks.js";
import { scoreReport } from "./lib/score.js";
import { restrictionFor, messageForError } from "./lib/restricted.js";
import { reportText } from "./lib/report.js";

const api = globalThis.browser ?? globalThis.chrome;
const $ = (id) => document.getElementById(id);
const RING = 326.7;
const SEVERITY_LABEL = { critical: "Critical", warning: "Warnings", recommendation: "Recommendations" };
const SEVERITY_SINGULAR = { critical: "Critical", warning: "Warning", recommendation: "Recommendation" };
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

let current = null; // { result, scored }
let filter = "all";

/** Tiny DOM builder: text is always set via textContent, never parsed as HTML. */
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}

function show(id) {
  for (const s of ["loading", "blocked", "report"]) $(s).hidden = s !== id;
  $("cta").hidden = id !== "report";
  $("rerun").hidden = id === "loading";
}

function blocked(message) {
  $("blockedMsg").textContent = message;
  show("blocked");
}

async function targetTab() {
  // ?tab=<id> is used only by the automated extension test (tests/extension-e2e.test.mjs).
  const forced = Number(new URLSearchParams(location.search).get("tab"));
  if (forced) return api.tabs.get(forced);
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function run() {
  show("loading");
  $("domain").textContent = "Checking this page…";
  let tab;
  try { tab = await targetTab(); } catch (e) { return blocked(messageForError(e)); }
  if (!tab || tab.id === undefined) return blocked(messageForError(null));
  if (tab.url) {
    try { $("domain").textContent = new URL(tab.url).host || tab.url; } catch (e) { $("domain").textContent = ""; }
    const restriction = restrictionFor(tab.url);
    if (restriction) return blocked(restriction.message);
  }
  let result;
  try {
    const out = await api.scripting.executeScript({ target: { tabId: tab.id }, files: ["audit.js"] });
    result = out && out[0] && out[0].result;
  } catch (e) {
    return blocked(messageForError(e, tab.url));
  }
  if (!result || result.engine !== "xender-sitecheck" || !Array.isArray(result.checks)) {
    return blocked(messageForError(null, tab.url));
  }
  $("domain").textContent = result.host || $("domain").textContent;
  current = { result, scored: scoreReport(result.checks) };
  render();
}

function render() {
  const { scored } = current;
  const score = scored.overall;
  $("scoreNum").textContent = score === null ? "–" : String(score);
  $("ring").dataset.band = scored.band.id;
  $("ring").setAttribute("aria-label", `Website Health Score ${score ?? "unavailable"} out of 100`);
  $("ringFg").style.strokeDashoffset = String(RING - (RING * (score || 0)) / 100);
  $("band").textContent = scored.band.label;

  const counts = $("counts");
  counts.replaceChildren(
    ...["critical", "warning", "recommendation"].filter((k) => scored.counts[k]).map((k) => h("li", { class: "c-" + k, text: `${scored.counts[k]} ${scored.counts[k] === 1 ? SEVERITY_SINGULAR[k].toLowerCase() : SEVERITY_LABEL[k].toLowerCase()}` })),
    h("li", { class: "c-passed", text: `${scored.counts.passed} passed` }),
  );

  $("cats").replaceChildren(...scored.categories.map((c) => h("li", { title: c.score === null ? "No applicable checks on this page" : `${c.passed} passed, ${c.failed} to fix` }, h("b", { text: c.score === null ? "–" : String(c.score) }), h("span", { text: c.label }))));

  const cats = ["all", ...CATEGORIES.map((c) => c.id).filter((id) => scored.issues.some((i) => i.category === id))];
  if (!cats.includes(filter)) filter = "all";
  $("filters").replaceChildren(...cats.map((id) => h("button", {
    class: "chip", type: "button", "aria-pressed": String(filter === id),
    onclick: () => { filter = id; render(); },
    text: id === "all" ? `All issues (${scored.issues.length})` : `${CAT_LABEL[id]} (${scored.issues.filter((i) => i.category === id).length})`,
  })));
  $("filters").hidden = scored.issues.length === 0;

  const visible = scored.issues.filter((i) => filter === "all" || i.category === filter);
  const groups = $("groups");
  groups.replaceChildren();
  if (!scored.issues.length) groups.append(h("p", { class: "none", text: "No issues found by these checks. Nice work." }));
  for (const sev of ["critical", "warning", "recommendation"]) {
    const list = visible.filter((i) => i.severity === sev);
    if (!list.length) continue;
    groups.append(h("section", { class: "group g-" + sev, "aria-label": SEVERITY_LABEL[sev] },
      h("h2", {}, h("span", { class: "dot", "aria-hidden": "true" }), `${SEVERITY_LABEL[sev]} (${list.length})`),
      list.map(issueCard),
    ));
  }

  $("passedLabel").textContent = `Passed checks (${scored.passed.length})`;
  $("passedList").replaceChildren(...scored.passed.map((p) => h("li", {}, p.passTitle, p.detail ? h("span", { class: "pd", text: " — " + p.detail }) : null)));
  $("passedBox").hidden = scored.passed.length === 0;
  show("report");
}

function issueCard(i) {
  const meta = [CAT_LABEL[i.category], i.category === "conversion" ? "heuristic" : null, i.count > 1 ? `${i.count} found` : null].filter(Boolean).join(" · ");
  return h("details", { class: "issue", "data-check": i.id },
    h("summary", {}, h("span", {}, h("span", { class: "issue-title", text: i.title }), h("span", { class: "issue-meta", text: meta }))),
    h("div", { class: "issue-body" },
      i.detail ? h("p", { class: "detail", text: i.detail }) : null,
      h("h3", { text: "Why it matters" }), h("p", { text: i.why }),
      h("h3", { text: "Recommended fix" }), h("p", { text: i.fix }),
      i.samples && i.samples.length ? [h("h3", { text: i.count > i.samples.length ? `Examples (${i.samples.length} of ${i.count})` : "Found on this page" }), h("ul", { class: "samples" }, i.samples.map((s) => h("li", { text: s })))] : null,
    ),
  );
}

async function copyReport() {
  if (!current) return;
  const text = reportText(current.result, current.scored);
  try {
    await navigator.clipboard.writeText(text);
    $("copyStatus").textContent = "Copied to clipboard";
  } catch (e) {
    $("copyStatus").textContent = "Couldn't copy — your browser blocked clipboard access";
  }
  setTimeout(() => { $("copyStatus").textContent = ""; }, 2500);
}

$("rerun").addEventListener("click", run);
$("copy").addEventListener("click", copyReport);
run();
