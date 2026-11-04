// GridSnip — the user's own Gemini key and the model picked for it.
// Stored in local extension storage on this device only (never sync); sent only to Google.
import { checkKeyFormat, listModels, pickModel, GeminiError } from "./gemini.js";

export const KEY_STORE = "gridsnipGeminiKey";
export const MODEL_STORE = "gridsnipGeminiModel";

export async function getSettings(api) {
  const s = await api.storage.local.get([KEY_STORE, MODEL_STORE]);
  return { key: s[KEY_STORE] || "", model: s[MODEL_STORE] || "" };
}

/** Checks the key with Google (models.list), picks a model, then saves both. */
export async function saveKey(rawKey, api, fetchImpl = fetch) {
  const key = checkKeyFormat(rawKey);
  const model = pickModel(await listModels(key, fetchImpl));
  if (!model) throw new GeminiError("no-model");
  await api.storage.local.set({ [KEY_STORE]: key, [MODEL_STORE]: model });
  return model;
}

/** Re-picks the model after Google retires the saved one. */
export async function refreshModel(key, api, fetchImpl = fetch) {
  const model = pickModel(await listModels(key, fetchImpl));
  if (!model) throw new GeminiError("no-model");
  await api.storage.local.set({ [MODEL_STORE]: model });
  return model;
}

export async function removeKey(api) {
  await api.storage.local.remove([KEY_STORE, MODEL_STORE]);
}

export const maskKey = (key) => (key ? key.slice(0, 4) + "…" + key.slice(-4) : "");
