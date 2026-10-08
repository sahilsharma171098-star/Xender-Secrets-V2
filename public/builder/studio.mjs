// Xender Builder studio (XEND-BUILDER-001): chat → AI generation (streamed) → sandboxed preview,
// code editor, versions, export and the "launch it for me" funnel.
import { composePreview, pagesOf } from "/builder/compose.mjs";
import { highlight, langOf } from "/builder/highlight.mjs";

const { api, toast, track, status, openAuth, $ } = window.XB;
const el = {
  name: $("#projName"), log: $("#log"), empty: $("#chatEmpty"), composer: $("#composer"), input: $("#composerInput"), send: $("#sendBtn"), hint: $("#composerHint"),
  frame: $("#frame"), device: $("#device"), previewEmpty: $("#previewEmpty"), pageSel: $("#pageSel"), reload: $("#reloadBtn"), verPill: $("#verPill"),
  previewView: $("#previewView"), codeView: $("#codeView"), files: $("#fileList"), hl: $("#hl"), code: $("#codeInput"), save: $("#saveBtn"), discard: $("#discardBtn"),
  undo: $("#undoBtn"), exportBtn: $("#exportBtn"), launch: $("#launchBtn"), launchDlg: $("#launchDialog"), quota: $("#quota"),
};

const state = { project: null, page: "index.html", file: "index.html", drafts: {}, busy: false, frameReady: false, lastSent: null, view: "preview", status: null };

// ---------- helpers ----------
const files = () => ({ ...(state.project?.files || {}), ...state.drafts });
const dirty = () => Object.keys(state.drafts).length > 0;
const node = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };

function setQuota(q) {
  if (!q) return;
  el.quota.textContent = q.capacity && !q.capacity.available ? "Free AI capacity used up today" : `${q.remaining}/${q.limit} free generations left today`;
}
async function refreshStatus() { try { state.status = await status(); setQuota(state.status.quota); } catch {} }

// ---------- preview ----------
function renderPreview() {
  const f = files();
  const has = !!f["index.html"];
  el.previewEmpty.hidden = has;
  el.frame.style.visibility = has ? "visible" : "hidden";
  if (!has) return;
  const pages = pagesOf(f);
  if (!pages.includes(state.page)) state.page = "index.html";
  el.pageSel.replaceChildren(...pages.map((p) => { const o = node("option", "", p); o.value = p; o.selected = p === state.page; return o; }));
  sendToFrame(composePreview(f, state.page));
}
function sendToFrame(html, force = false) {
  if (!state.frameReady) { state.pendingHtml = html; return; }
  if (!force && html === state.lastSent) return;
  state.lastSent = html;
  el.frame.contentWindow.postMessage({ type: "xs-render", html }, "*");
}
function reloadFrame() {
  state.frameReady = false; state.lastSent = null; state.frameLoadedAt = Date.now();
  state.pendingHtml = files()["index.html"] ? composePreview(files(), state.page) : null;
  el.frame.src = "/builder/frame?r=" + Date.now();
}
addEventListener("message", (e) => {
  if (e.source !== el.frame.contentWindow) return; // only our sandboxed preview frame
  const d = e.data || {};
  if (d.type === "xs-frame-ready") {
    state.frameReady = true;
    const html = state.pendingHtml || (state.project ? composePreview(files(), state.page) : null);
    state.pendingHtml = null;
    if (html && html !== state.lastSent) sendToFrame(html);
  } else if (d.type === "xs-nav") {
    const page = String(d.page || "").toLowerCase();
    if (files()[page] !== undefined) { state.page = page; renderPreview(); }
    else toast("That page doesn't exist yet: " + page.slice(0, 60));
  } else if (d.type === "xs-toast") toast(String(d.text || "").slice(0, 160));
  else if (d.type === "xs-error") console.warn("[preview]", d.text);
});
// The frame is loaded only now, after the listener above exists, so its "ready" can't be missed.
reloadFrame();
setInterval(() => { if (!state.frameReady && state.pendingHtml && Date.now() - state.frameLoadedAt > 4000) reloadFrame(); }, 2000);
el.pageSel.addEventListener("change", () => { state.page = el.pageSel.value; renderPreview(); });
el.reload.addEventListener("click", reloadFrame);
document.querySelectorAll("[data-device]").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll("[data-device]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  el.device.dataset.device = b.dataset.device;
  track("cta_click", "builder-device-" + b.dataset.device);
}));

// ---------- code editor ----------
function renderFiles() {
  const f = files();
  const names = Object.keys(f).sort((a, b) => (a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b)));
  if (!names.includes(state.file)) state.file = names[0] || "index.html";
  el.files.replaceChildren(...names.map((n) => {
    const b = node("button", state.drafts[n] !== undefined ? "dirty" : "", n);
    b.type = "button";
    b.setAttribute("aria-current", String(n === state.file));
    b.onclick = () => { state.file = n; renderFiles(); };
    return b;
  }));
  el.code.value = f[state.file] ?? "";
  paintCode();
  el.save.disabled = el.discard.disabled = !dirty();
}
function paintCode() { el.hl.innerHTML = highlight(el.code.value, langOf(state.file)) + "\n"; el.hl.scrollTop = el.code.scrollTop; el.hl.scrollLeft = el.code.scrollLeft; }
el.code.addEventListener("input", () => {
  const original = state.project?.files?.[state.file] ?? "";
  if (el.code.value === original) delete state.drafts[state.file]; else state.drafts[state.file] = el.code.value;
  paintCode();
  el.save.disabled = el.discard.disabled = !dirty();
  el.files.querySelector('[aria-current="true"]')?.classList.toggle("dirty", state.drafts[state.file] !== undefined);
});
el.code.addEventListener("scroll", () => { el.hl.scrollTop = el.code.scrollTop; el.hl.scrollLeft = el.code.scrollLeft; });
el.code.addEventListener("keydown", (e) => {
  if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); el.code.setRangeText("  ", el.code.selectionStart, el.code.selectionEnd, "end"); el.code.dispatchEvent(new Event("input")); }
  if (e.key === "s" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveDrafts(); }
});
async function saveDrafts({ quiet = false } = {}) {
  if (!dirty() || !state.project) return true;
  el.save.disabled = true;
  try {
    const r = await api(`/api/builder/projects/${state.project.id}`, { method: "PATCH", body: { files: files(), note: "Edited " + Object.keys(state.drafts).join(", ") } });
    state.drafts = {};
    setProject(r.project);
    if (!quiet) toast("Saved as version " + r.project.version);
    (r.warnings || []).forEach((w) => toast(w, "bad"));
    return true;
  } catch (err) { toast(err.message, "bad"); el.save.disabled = false; return false; }
}
el.save.addEventListener("click", () => saveDrafts());
el.discard.addEventListener("click", () => { if (confirm("Discard unsaved code changes?")) { state.drafts = {}; renderFiles(); renderPreview(); } });

// ---------- views (desktop tabs + mobile tabs) ----------
function setView(view) {
  state.view = view;
  document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === view)));
  el.previewView.hidden = view !== "preview";
  el.codeView.hidden = view !== "code";
  if (view === "code") renderFiles(); else renderPreview();
}
document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
function setMobileTab(tab) {
  document.querySelectorAll("[data-mtab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mtab === tab)));
  $("#chatPanel").classList.toggle("active", tab === "chat");
  $("#stagePanel").classList.toggle("active", tab !== "chat");
  if (tab !== "chat") setView(tab);
}
document.querySelectorAll("[data-mtab]").forEach((b) => b.addEventListener("click", () => setMobileTab(b.dataset.mtab)));
const isMobile = () => matchMedia("(max-width:760px)").matches;

// ---------- project + chat log ----------
function setProject(p) {
  state.project = p;
  el.name.value = p.name; el.name.disabled = false;
  el.undo.disabled = !(p.versions && p.versions.length > 1);
  el.exportBtn.setAttribute("aria-disabled", "false");
  el.exportBtn.href = `/api/builder/projects/${p.id}/export`;
  el.verPill.hidden = false; el.verPill.textContent = "v" + p.version;
  el.send.textContent = "Update ✦";
  el.input.placeholder = "Ask for a change… e.g. “make the header sticky and add a pricing section”";
  $("#launchInterest").value = "AI Builder launch · project " + p.id + " v" + p.version;
  const url = new URL(location.href);
  if (url.searchParams.get("project") !== p.id || url.searchParams.has("new")) { url.search = "?project=" + p.id; history.replaceState(null, "", url); }
  renderLog();
  if (state.view === "code") renderFiles();
  renderPreview();
}
function renderLog() {
  const p = state.project;
  el.log.replaceChildren();
  if (!p) { el.log.append(el.empty); return; }
  for (const v of p.versions || []) {
    if (v.kind === "generate" || v.kind === "edit") el.log.append(node("div", "msg-me", v.instruction));
    const ai = node("div", "msg-ai");
    ai.append(node("div", "", v.summary || "Saved."));
    const meta = node("div", "meta");
    meta.append(node("span", "", "v" + v.version + " · " + ({ generate: "generated", edit: "AI edit", manual: "code edit", restore: "restore", duplicate: "copy" }[v.kind] || v.kind) + " · " + window.XB.timeAgo(v.created_at)));
    if (v.version !== p.version) {
      const b = node("button", "", "Restore"); b.type = "button"; b.onclick = () => restore(v.version);
      meta.append(b);
    } else meta.append(node("span", "pill ok", "current"));
    ai.append(meta);
    el.log.append(ai);
  }
  el.log.scrollTop = el.log.scrollHeight;
}
async function restore(version) {
  if (dirty() && !confirm("You have unsaved code changes. Discard them and restore?")) return;
  try { state.drafts = {}; const r = await api(`/api/builder/projects/${state.project.id}/restore`, { method: "POST", body: { version } }); setProject(r.project); toast("Restored version " + version); }
  catch (err) { toast(err.message, "bad"); }
}
el.undo.addEventListener("click", () => { const vs = state.project?.versions || []; if (vs.length > 1) restore(vs[vs.length - 2].version); });
el.name.addEventListener("change", async () => {
  if (!state.project) return;
  try { const r = await api(`/api/builder/projects/${state.project.id}`, { method: "PATCH", body: { name: el.name.value } }); state.project.name = r.project.name; toast("Renamed"); }
  catch (err) { toast(err.message, "bad"); el.name.value = state.project.name; }
});
el.exportBtn.addEventListener("click", (e) => {
  if (!state.project) { e.preventDefault(); toast("Generate a website first."); return; }
  if (dirty()) { e.preventDefault(); saveDrafts({ quiet: true }).then((ok) => { if (ok) location.href = el.exportBtn.href; }); }
  track("cta_click", "builder-export");
});

// ---------- generation (streamed NDJSON) ----------
function progressBox(mode) {
  const box = node("div", "progress");
  const ol = node("ol");
  const steps = [["reserve", "Reserving free AI capacity"], ["write", mode === "edit" ? "AI is editing your files" : "AI is writing your website"], ["save", "Checking & saving"]];
  const items = Object.fromEntries(steps.map(([k, t]) => { const li = node("li", "", t); ol.append(li); return [k, li]; }));
  const detail = node("div", "", "");
  detail.style.cssText = "font-size:.8rem;color:var(--muted);margin-top:8px";
  const track_ = node("div", "track"); track_.append(node("i"));
  box.append(ol, track_, detail);
  const set = (k) => { let past = true; for (const [key] of steps) { items[key].className = key === k ? "on" : past ? "done" : ""; if (key === k) past = false; } };
  set("reserve");
  return { box, set, detail, done: () => { for (const [k] of steps) items[k].className = "done"; track_.remove(); } };
}

function errorBlock(message, data = {}) {
  const box = node("div", "msg-ai");
  box.append(node("div", "", "⚠ " + message));
  const row = node("div", "meta");
  if (data.signInForMore) { const b = node("button", "", "Create a free account"); b.type = "button"; b.onclick = () => openAuth("register"); row.append(b); }
  const b2 = node("button", "", "Get our team to build it"); b2.type = "button"; b2.onclick = () => openLaunch("error"); row.append(b2);
  box.append(row);
  return box;
}

async function generate(prompt) {
  if (state.busy) return;
  const mode = state.project ? "edit" : "new";
  if (mode === "edit" && dirty() && !(await saveDrafts({ quiet: true }))) return;
  state.busy = true;
  el.send.disabled = true; el.input.disabled = true;
  el.empty.remove();
  el.log.append(node("div", "msg-me", prompt));
  const pr = progressBox(mode);
  el.log.append(pr.box);
  el.log.scrollTop = el.log.scrollHeight;
  track("cta_click", mode === "edit" ? "builder-edit" : "builder-generate");
  const url = mode === "edit" ? `/api/builder/projects/${state.project.id}/edit` : "/api/builder/generate";
  try {
    const res = await fetch(url, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt }) });
    if (!res.ok || !(res.headers.get("content-type") || "").includes("ndjson")) {
      const j = await res.json().catch(() => ({}));
      throw Object.assign(new Error(j.error || "Request failed (" + res.status + ")."), { data: j });
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", result = null, failure = null;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        if (!line.trim()) continue;
        let ev; try { ev = JSON.parse(line); } catch { continue; }
        if (ev.type === "start" || (ev.type === "progress" && ev.stage === "provider")) pr.set("write");
        if (ev.type === "progress" && ev.stage === "delta") { pr.set("write"); pr.detail.textContent = `${ev.kind === "reasoning" ? "Planning" : "Writing code"} · ${(ev.chars / 1000).toFixed(1)} KB · ${Math.round(ev.ms / 1000)} s`; }
        if (ev.type === "progress" && ev.stage === "waiting") pr.detail.textContent = `Waiting for the model · ${Math.round(ev.ms / 1000)} s`;
        if (ev.type === "progress" && ev.stage === "retry") pr.detail.textContent = ev.reason === "timeout" ? "That model was too slow — switching to a faster one…" : "The first answer wasn't usable — retrying…";
        if (ev.type === "progress" && ev.stage === "saving") { pr.set("save"); pr.detail.textContent = "Checking & saving…"; }
        if (ev.type === "done") result = ev;
        if (ev.type === "error") failure = ev;
      }
    }
    if (failure || !result) throw Object.assign(new Error(failure?.error || "The connection closed before the website was ready. Check My projects — it may still have saved."), { data: failure || {} });
    pr.set("save"); pr.done(); pr.box.remove();
    setProject(result.project);
    if (isMobile()) setMobileTab("preview");
    (result.warnings || []).slice(0, 3).forEach((w) => toast(w));
    toast(mode === "edit" ? `Updated ${result.changed.join(", ")}` : "Your website is ready ✦");
    el.input.value = "";
  } catch (err) {
    pr.box.remove();
    el.log.append(errorBlock(err.message, err.data || {}));
    if (!state.project) el.input.value = prompt;
  } finally {
    state.busy = false;
    el.send.disabled = false; el.input.disabled = false; el.input.focus();
    el.log.scrollTop = el.log.scrollHeight;
    refreshStatus();
  }
}
el.composer.addEventListener("submit", (e) => { e.preventDefault(); const p = el.input.value.trim(); if (p.length < 8) { toast("Describe it in a few more words."); return; } generate(p); });
el.input.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) el.composer.requestSubmit(); });

// ---------- launch funnel ----------
function openLaunch(src) {
  track("cta_click", "builder-launch-" + src);
  if (typeof el.launchDlg.showModal === "function") el.launchDlg.showModal(); else location.href = "/builder/pricing#quote";
}
el.launch.addEventListener("click", () => openLaunch("studio"));
el.launchDlg.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) el.launchDlg.close(); });

addEventListener("beforeunload", (e) => { if (dirty() || state.busy) { e.preventDefault(); e.returnValue = ""; } });
addEventListener("xb-auth", () => { refreshStatus(); if (state.project) load(state.project.id); });

// ---------- boot ----------
async function load(id) {
  try { const r = await api("/api/builder/projects/" + encodeURIComponent(id)); setProject(r.project); }
  catch (err) { toast(err.status === 404 ? "Project not found on this device or account." : err.message, "bad"); history.replaceState(null, "", "/builder/studio"); }
}
(async () => {
  await refreshStatus();
  const q = new URLSearchParams(location.search);
  if (q.get("project")) await load(q.get("project"));
  else {
    let pending = "";
    try { pending = sessionStorage.getItem("xb-pending") || ""; sessionStorage.removeItem("xb-pending"); } catch {}
    if (q.has("prompt")) pending = q.get("prompt") || pending; // no-JS fallback from the landing form
    if (pending) { el.input.value = pending; generate(pending); }
    else el.input.focus();
  }
})();
