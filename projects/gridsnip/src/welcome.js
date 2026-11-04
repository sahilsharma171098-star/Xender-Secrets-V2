// GridSnip first-run page: key setup and a practice table.
import { getSettings } from "./lib/settings.js";
import { mountKeyForm } from "./lib/key-form.js";

const api = globalThis.chrome;
const $ = (id) => document.getElementById(id);

async function show() {
  const { key } = await getSettings(api);
  $("keyDone").hidden = !key;
  $("keySetup").hidden = Boolean(key);
  if (!key) mountKeyForm($("keySetup"), api, { onSaved: show });
}

api.commands.getAll().then((commands) => {
  const snip = commands.find((c) => c.name === "start-snip");
  if (snip && snip.shortcut) $("shortcut").textContent = snip.shortcut;
}).catch(() => {});

show();
