// Xender SiteCheck popup. Runs src/audit.js in the active tab (activeTab + scripting),
// scores locally. Optional Pro sends only a license key to Xender for verification.
import { CATEGORIES } from "./lib/checks.js";
import { scoreReport } from "./lib/score.js";
import { restrictionFor, messageForError } from "./lib/restricted.js";
import { reportText } from "./lib/report.js";
import { prioritizedCsv } from "./lib/pro-export.js";
import { BASELINE_STORAGE_KEY, snapshotOf, withSavedBaseline, findSavedBaseline, compareWithBaseline } from "./lib/baseline.js";

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
  $("exportCsv").hidden = !proActive;
  show("report");
  refreshBaselineControls();
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

// License keys are stored only on this device and only sent to the Xender license API.
// Audited URLs, page content and reports are never sent to the license service.
const LICENSE_API = "https://www.xendersecrets.com/api/sitecheck/license/verify";
let proActive = false;
const proStatus = (message) => { $("proStatus").textContent = message; };
function showLicenseState(active) {
  proActive = Boolean(active);
  $("exportCsv").hidden = !proActive || !current;
  $("deactivatePro").hidden = !active;
  proStatus(active ? "Pro active · CSV export and before/after comparison enabled" : "Free edition · Pro tools locked");
  refreshBaselineControls();
}
async function validateKey(key) {
  if (!/^sc1_[a-f0-9]{64}$/.test(key)) throw new Error("Invalid SiteCheck license key format");
  const response = await fetch(LICENSE_API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ licenseKey: key }),
    credentials: "omit",
    cache: "no-store"
  });
  if (!response.ok) throw new Error("License server unavailable or key invalid");
  const data = await response.json();
  return data.ok === true && data.product === "sitecheck" && data.pro === true;
}
async function refreshLicense() {
  try {
    const saved = await api.storage.local.get("sitecheckLicenseKey");
    if (!saved.sitecheckLicenseKey) { showLicenseState(false); return; }
    showLicenseState(await validateKey(saved.sitecheckLicenseKey));
  } catch {
    showLicenseState(false);
    proStatus("Unable to verify Pro. Free audit remains available; reconnect to retry.");
  }
}
$("proForm").addEventListener("submit", async event => {
  event.preventDefault();
  const key = $("licenseKey").value.trim();
  $("activatePro").disabled = true;
  proStatus("Verifying your Pro license…");
  try {
    if (!await validateKey(key)) throw new Error("No active purchase for this key");
    await api.storage.local.set({ sitecheckLicenseKey: key });
    $("licenseKey").value = "";
    showLicenseState(true);
  } catch (error) {
    showLicenseState(false);
    proStatus(error?.message || "License could not be verified.");
  } finally {
    $("activatePro").disabled = false;
  }
});
$("deactivatePro").addEventListener("click", async () => {
  await api.storage.local.remove("sitecheckLicenseKey");
  showLicenseState(false);
});
$("exportCsv").addEventListener("click", () => {
  if (!proActive || !current) return;
  const csv = prioritizedCsv(current.result, current.scored);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  const host = String(current.result.host || "website").replace(/[^a-z0-9.-]/gi, "-").slice(0, 80);
  link.download = "xender-sitecheck-" + host + ".csv";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
});
// Only a deliberate click stores a minimal local page snapshot. Saved snapshots are
// never sent to Xender or to the website under audit.
async function readSavedBaselines() {
  const result = await api.storage.local.get(BASELINE_STORAGE_KEY);
  return Array.isArray(result[BASELINE_STORAGE_KEY]) ? result[BASELINE_STORAGE_KEY] : [];
}
async function refreshBaselineControls() {
  $("baselinePanel").hidden = !proActive || !current;
  if (!proActive || !current) return;
  const report = current.result;
  try {
    const saved = findSavedBaseline(await readSavedBaselines(), report.url);
    if (!proActive || current?.result !== report) return;
    $("compareBaseline").disabled = !saved;
    $("baselineStatus").textContent = saved
      ? "Baseline saved on " + saved.savedAt.slice(0, 10) + ". Rerun this exact page after making fixes."
      : "No baseline saved for this page yet.";
  } catch {
    $("compareBaseline").disabled = true;
    $("baselineStatus").textContent = "Saved comparisons unavailable on this browser.";
  }
}
$("saveBaseline").addEventListener("click", async () => {
  if (!proActive || !current) return;
  try {
    const baseline = snapshotOf(current.result, current.scored);
    const updated = withSavedBaseline(await readSavedBaselines(), baseline);
    if (!proActive) return;
    await api.storage.local.set({ [BASELINE_STORAGE_KEY]: updated });
    await refreshBaselineControls();
  } catch {
    $("baselineStatus").textContent = "Could not save baseline on this device.";
  }
});
$("compareBaseline").addEventListener("click", async () => {
  if (!proActive || !current) return;
  try {
    const latest = snapshotOf(current.result, current.scored);
    const original = findSavedBaseline(await readSavedBaselines(), latest.url);
    const diff = compareWithBaseline(original, latest);
    if (!proActive) return;
    const score = diff.delta == null ? "Score difference unavailable" :
      "Score " + diff.before + " → " + diff.after + " (" +
      (diff.delta > 0 ? "+" : "") + diff.delta + ")";
    $("baselineStatus").textContent = score + " · " + diff.resolved +
      " issue types resolved · " + diff.introduced + " new issue types · " +
      diff.fewerOccurrences + " fewer issue instances · " +
      diff.moreOccurrences + " more issue instances. Same-page heuristic only.";
  } catch {
    $("baselineStatus").textContent = "Save a baseline for this exact page first.";
  }
});
$("clearBaselines").addEventListener("click", async () => {
  try {
    await api.storage.local.remove(BASELINE_STORAGE_KEY);
    $("baselineStatus").textContent = "Saved comparisons deleted from this browser.";
    await refreshBaselineControls();
  } catch {
    $("baselineStatus").textContent = "Couldn't delete saved comparisons on this device.";
  }
});

refreshLicense();

$("rerun").addEventListener("click", run);
$("copy").addEventListener("click", copyReport);
run();
