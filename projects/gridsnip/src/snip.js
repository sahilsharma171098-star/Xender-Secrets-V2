// GridSnip snip tab: show the screenshot, let the user drag a box, read the table with Gemini,
// copy it as TSV. The screenshot lives only in this tab's memory; it was deleted from session
// storage as soon as it was loaded.
import { CAPTURE_KEY } from "./lib/capture.js";
import { getSettings, refreshModel } from "./lib/settings.js";
import { readTable } from "./lib/gemini.js";
import { rowsFromModelText, toTsv, toCsv, shape } from "./lib/tsv.js";
import { normalizeRect, toSourceRect, fitWithin } from "./lib/crop.js";
import { mountKeyForm } from "./lib/key-form.js";

const api = globalThis.chrome;
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const PROBLEMS = {
  "capture-blocked": "Chrome doesn't allow screenshots of this page (browser settings pages and the Chrome Web Store are protected). Go to the page with your table and press the shortcut there.",
  "too-large": "This screen is too large to capture. Zoom the page out a little and try again.",
  expired: "This snip has expired. Go back to your page and press the shortcut again.",
};
const HINT_SELECT = "Drag a box around the table you want.";

let shot = null;
let rows = [];
let running = null;
let pendingSelection = null;
let drag = null;

function setHint(text) { $("hint").textContent = text; }
function showMessage(text, kind = "info") {
  const box = $("message");
  box.textContent = text;
  box.className = "panel" + (kind === "error" ? " msg-error" : "");
  box.hidden = !text;
}

async function showKeySetup(reason) {
  $("keySetup").hidden = false;
  const form = mountKeyForm($("keySetup"), api, {
    heading: reason || "Add your free Gemini API key to read tables",
    onSaved: () => {
      $("keySetup").hidden = true;
      if (pendingSelection) { const s = pendingSelection; pendingSelection = null; extract(s); }
      else setHint(HINT_SELECT);
    },
  });
  form.focus();
}

// ---------------------------------------------------------------- selection
function pointIn(event) {
  const r = shot.getBoundingClientRect();
  return { x: Math.min(Math.max(event.clientX - r.left, 0), r.width), y: Math.min(Math.max(event.clientY - r.top, 0), r.height) };
}
function drawSelection(rect) {
  const s = $("selection");
  s.hidden = false;
  s.style.left = rect.x + "px"; s.style.top = rect.y + "px";
  s.style.width = rect.w + "px"; s.style.height = rect.h + "px";
}
function wireSelection() {
  const stage = $("stage");
  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || running) return;
    stage.setPointerCapture(event.pointerId);
    const p = pointIn(event);
    drag = { x: p.x, y: p.y };
    drawSelection({ x: p.x, y: p.y, w: 0, h: 0 });
  });
  stage.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const p = pointIn(event);
    drawSelection(normalizeRect(drag.x, drag.y, p.x, p.y));
  });
  stage.addEventListener("pointerup", (event) => {
    if (!drag) return;
    const p = pointIn(event);
    const rect = normalizeRect(drag.x, drag.y, p.x, p.y);
    drag = null;
    if (rect.w < 8 || rect.h < 8) { $("selection").hidden = true; return; }
    extract(rect);
  });
}

// ---------------------------------------------------------------- extraction
function cropToPngBase64(rect) {
  const src = toSourceRect(rect, { w: shot.clientWidth, h: shot.clientHeight }, { w: shot.naturalWidth, h: shot.naturalHeight });
  if (!src) return null;
  const out = fitWithin(src.w, src.h);
  const canvas = document.createElement("canvas");
  canvas.width = out.w; canvas.height = out.h;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(shot, src.x, src.y, src.w, src.h, 0, 0, out.w, out.h);
  return canvas.toDataURL("image/png").split(",")[1];
}

async function extract(rect) {
  const settings = await getSettings(api);
  if (!settings.key) { pendingSelection = rect; await showKeySetup(); return; }
  const png = cropToPngBase64(rect);
  if (!png) { showMessage("That area is too small. Drag a box around the whole table."); return; }
  showMessage("");
  running = new AbortController();
  $("stage").classList.add("busy");
  $("cancelBtn").hidden = false;
  setHint("Reading the table with Gemini…");
  try {
    let model = settings.model || await refreshModel(settings.key, api);
    let answer;
    try {
      answer = await readTable({ key: settings.key, model, pngBase64: png, signal: running.signal });
    } catch (error) {
      if (error.code !== "model-missing") throw error;
      model = await refreshModel(settings.key, api);
      answer = await readTable({ key: settings.key, model, pngBase64: png, signal: running.signal });
    }
    rows = rowsFromModelText(answer.text);
    if (!rows.length) {
      showMessage("No table found in that area. Try a box around just the table, including its header row.");
      setHint(HINT_SELECT);
      return;
    }
    await showResult(answer.truncated);
  } catch (error) {
    if (error.code === "cancelled") { setHint(HINT_SELECT); return; }
    showMessage(error.message || "Something went wrong while reading the table.", "error");
    setHint(HINT_SELECT);
    if (["key-invalid", "key-denied", "key-format"].includes(error.code)) { pendingSelection = rect; await showKeySetup("Update your Gemini API key"); }
  } finally {
    running = null;
    $("stage").classList.remove("busy");
    $("cancelBtn").hidden = true;
  }
}

function renderPreview() {
  const table = $("preview");
  table.replaceChildren(...rows.slice(0, 200).map((r) => {
    const tr = document.createElement("tr");
    for (const cell of r) { const td = document.createElement("td"); td.textContent = cell; tr.append(td); }
    return tr;
  }));
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fall back below */ }
  const area = $("tsvOutput");
  area.focus(); area.select();
  try { return document.execCommand("copy"); } catch (e) { return false; }
}

async function showResult(truncated) {
  const tsv = toTsv(rows);
  $("tsvOutput").value = tsv;
  renderPreview();
  $("result").hidden = false;
  const { rows: r, cols: c } = shape(rows);
  const copied = await copyText(tsv);
  const size = `${r} row${r === 1 ? "" : "s"} × ${c} column${c === 1 ? "" : "s"}`;
  $("resultStatus").textContent = (copied
    ? `Copied ${size}. Paste into Excel or Google Sheets with Ctrl+V (⌘V on a Mac).`
    : `Read ${size}, but the browser blocked the clipboard. Click "Copy again" or copy the text below.`)
    + (truncated ? " The table may be cut off — snip very large tables in parts." : "")
    + " Check the numbers before you rely on them.";
  setHint("Done. Select another area to snip more.");
  $("result").scrollIntoView({ block: "start" });
}

// ---------------------------------------------------------------- buttons
$("copyBtn").addEventListener("click", async () => {
  const ok = await copyText($("tsvOutput").value);
  $("resultStatus").textContent = ok ? "Copied again. Paste with Ctrl+V (⌘V on a Mac)." : "The browser blocked the clipboard. Select the text below and copy it.";
});
$("csvBtn").addEventListener("click", () => {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  a.href = url; a.download = "gridsnip-table-" + stamp + ".csv";
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
});
$("againBtn").addEventListener("click", () => {
  $("selection").hidden = true;
  setHint(HINT_SELECT);
  $("stage").scrollIntoView({ block: "start" });
});
$("cancelBtn").addEventListener("click", () => { if (running) running.abort(); });
$("closeBtn").addEventListener("click", () => window.close());
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (running) running.abort();
  else $("selection").hidden = true;
});

// ---------------------------------------------------------------- start
async function init() {
  const problem = params.get("error");
  let capture = null;
  try { capture = (await api.storage.session.get(CAPTURE_KEY))[CAPTURE_KEY] || null; } catch (e) { capture = null; }
  try { await api.storage.session.remove(CAPTURE_KEY); } catch (e) { /* already gone */ }
  if (problem || !capture || capture.id !== params.get("id")) {
    setHint("Nothing to snip");
    showMessage(PROBLEMS[problem] || PROBLEMS.expired, "error");
    return;
  }
  shot = $("shot");
  shot.src = capture.dataUrl;
  try { await shot.decode(); } catch (e) { showMessage(PROBLEMS.expired, "error"); return; }
  // Show the screenshot at the size it had on screen (it was captured at the device pixel ratio).
  shot.style.width = Math.round(shot.naturalWidth / (window.devicePixelRatio || 1)) + "px";
  $("stage").hidden = false;
  wireSelection();
  setHint(HINT_SELECT);
  const { key } = await getSettings(api);
  if (!key) await showKeySetup();
}

init();
