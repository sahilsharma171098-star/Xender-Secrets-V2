// GridSnip popup: start a snip, manage the user's own Gemini key.
import { getSettings, removeKey, maskKey } from "./lib/settings.js";
import { mountKeyForm } from "./lib/key-form.js";

const api = globalThis.chrome;
const $ = (id) => document.getElementById(id);

async function showKeyState() {
  const { key, model } = await getSettings(api);
  $("keySaved").hidden = !key;
  $("keySetup").hidden = Boolean(key);
  if (key) {
    $("keyMask").textContent = maskKey(key);
    $("modelLine").textContent = model ? "Model: " + model : "";
  } else {
    mountKeyForm($("keySetup"), api, { onSaved: showKeyState });
  }
}

$("snipBtn").addEventListener("click", async () => {
  $("snipBtn").disabled = true;
  try { await api.runtime.sendMessage({ type: "gridsnip:start" }); } catch (e) { /* the snip tab explains any problem */ }
  window.close();
});

$("removeKey").addEventListener("click", async () => {
  await removeKey(api);
  await showKeyState();
});

$("changeShortcut").addEventListener("click", (event) => {
  event.preventDefault();
  api.tabs.create({ url: "chrome://extensions/shortcuts" });
});

api.commands.getAll().then((commands) => {
  const snip = commands.find((c) => c.name === "start-snip");
  $("shortcut").textContent = snip && snip.shortcut ? snip.shortcut : "not set";
}).catch(() => {});

showKeyState();
