// GridSnip — "add your Gemini key" form, shared by the popup, the welcome page and the snip tab.
// Built with DOM methods only (no HTML strings).
import { saveKey } from "./settings.js";

export const AI_STUDIO_KEYS = "https://aistudio.google.com/apikey";

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  node.append(...children.filter((c) => c !== null && c !== undefined));
  return node;
}

export const FREE_TIER_NOTE = "On Google's free tier, Google may use what you send to improve its products, and people may review it. Don't snip confidential or personal information with a free key.";

export function mountKeyForm(container, api, { onSaved, heading = "Add your free Gemini API key" } = {}) {
  const input = el("input", { id: "gsKeyInput", type: "password", autocomplete: "off", spellcheck: "false", placeholder: "Paste your Gemini API key", maxlength: "200", "aria-describedby": "gsKeyHelp" });
  const save = el("button", { class: "btn primary", type: "submit", text: "Save key" });
  const status = el("p", { class: "key-status", role: "status", "aria-live": "polite" });
  const form = el("form", { class: "key-form" },
    el("label", { for: "gsKeyInput", text: "Gemini API key" }),
    el("div", { class: "key-row" }, input, save));
  container.replaceChildren(
    el("h2", { text: heading }),
    el("p", { id: "gsKeyHelp", text: "GridSnip reads tables with Google Gemini using your own key, so there is no GridSnip account and no GridSnip fee. In Google AI Studio, sign in, choose Create API key, then paste it here." }),
    el("p", {}, el("a", { href: AI_STUDIO_KEYS, target: "_blank", rel: "noopener", text: "Get a free key in Google AI Studio ↗" })),
    form, status,
    el("p", { class: "note", text: FREE_TIER_NOTE }),
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    save.disabled = true;
    status.textContent = "Checking the key with Google…";
    try {
      const model = await saveKey(input.value, api);
      input.value = "";
      status.textContent = "Key saved on this device. Using " + model + ".";
      if (onSaved) onSaved(model);
    } catch (error) {
      status.textContent = (error && error.message) || "Couldn't save the key.";
    } finally {
      save.disabled = false;
    }
  });
  return { focus: () => input.focus() };
}
