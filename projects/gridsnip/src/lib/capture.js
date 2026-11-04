// GridSnip — take the screenshot and open the snip tab.
//
// Runs in the service worker after the user presses the shortcut or clicks "Snip a table" in
// the popup; both give the activeTab grant that captureVisibleTab needs. The screenshot is kept
// only in session storage (memory, cleared when the browser closes) until the snip tab reads it,
// and the snip tab deletes it straight away. Nothing is sent anywhere here.
export const CAPTURE_KEY = "gridsnipCapture";
const MAX_DATA_URL = 8 * 1024 * 1024;

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

export async function startSnip(tab, api) {
  if (!tab) {
    const [active] = await api.tabs.query({ active: true, lastFocusedWindow: true });
    tab = active;
  }
  if (!tab || tab.id === undefined) return { ok: false, error: "no-tab" };
  let dataUrl = null, error = "";
  try {
    dataUrl = await api.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    if (dataUrl && dataUrl.length > MAX_DATA_URL) {
      await pause(600); // captureVisibleTab allows about two calls per second
      dataUrl = await api.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 92 });
    }
  } catch (e) {
    dataUrl = null;
    error = "capture-blocked";
  }
  if (dataUrl && dataUrl.length > MAX_DATA_URL) { dataUrl = null; error = "too-large"; }
  const id = crypto.randomUUID();
  if (dataUrl) {
    try { await api.storage.session.set({ [CAPTURE_KEY]: { id, dataUrl, capturedAt: Date.now() } }); }
    catch (e) { dataUrl = null; error = "too-large"; }
  }
  const url = "snip.html?id=" + id + (error ? "&error=" + error : "");
  const create = { url };
  if (Number.isInteger(tab.index)) create.index = tab.index + 1;
  if (tab.id !== undefined) create.openerTabId = tab.id;
  await api.tabs.create(create);
  return error ? { ok: false, error } : { ok: true };
}
