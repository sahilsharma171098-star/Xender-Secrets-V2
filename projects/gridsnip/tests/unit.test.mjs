// GridSnip unit tests (Node only): TSV cleaning, spreadsheet safety, model choice, Gemini error
// handling, crop geometry, capture hand-off, key handling, packaging and manifest policy.
// Run: npm run gridsnip:test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { rowsFromModelText, safeCell, toTsv, toCsv, shape } from "../src/lib/tsv.js";
import { pickModel, readTable, listModels, checkKeyFormat, GeminiError, GEMINI_ORIGIN, PROMPT } from "../src/lib/gemini.js";
import { normalizeRect, toSourceRect, fitWithin } from "../src/lib/crop.js";
import { startSnip, CAPTURE_KEY } from "../src/lib/capture.js";
import { saveKey, getSettings, removeKey, refreshModel, maskKey, KEY_STORE, MODEL_STORE } from "../src/lib/settings.js";
import { build, manifest, sourceFiles } from "../scripts/build.mjs";

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("model answers become clean, rectangular rows in every format models actually return", () => {
  assert.deepEqual(rowsFromModelText("Name\tQty\nApple\t3\nPear\t"), [["Name", "Qty"], ["Apple", "3"], ["Pear", ""]]);
  assert.deepEqual(rowsFromModelText("```tsv\nA\tB\n1\t2\n```"), [["A", "B"], ["1", "2"]], "code fences stripped");
  assert.deepEqual(rowsFromModelText("| Quarter | Revenue |\n|---|---:|\n| Q1 | 12.4 |\n| Q2 | 13.9 |"), [["Quarter", "Revenue"], ["Q1", "12.4"], ["Q2", "13.9"]], "markdown table");
  assert.deepEqual(rowsFromModelText('City,Note\nPune,"rain, wind"\nGoa,"said ""hi"""'), [["City", "Note"], ["Pune", "rain, wind"], ["Goa", 'said "hi"']], "CSV with quotes");
  assert.deepEqual(rowsFromModelText("A\tB\tC\n1\n2\t3"), [["A", "B", "C"], ["1", "", ""], ["2", "3", ""]], "short rows padded");
  assert.deepEqual(rowsFromModelText("a  b \t  c\r\n\r\n"), [["a b", "c"]], "whitespace tidied, CRLF handled");
  for (const none of ["NO_TABLE", " no table. ", "", null]) assert.deepEqual(rowsFromModelText(none), [], String(none));
  assert.deepEqual(shape(rowsFromModelText("x\ty\n1\t2\n3\t4")), { rows: 3, cols: 2 });
});

test("cells that would start a formula are neutralised; real numbers stay numbers", () => {
  for (const keep of ["-12.5", "- 3", "+91 98100 00000", "(1,200)", "5%", "₹1,299", "-.5", "+4.2%", "Total", ""]) assert.equal(safeCell(keep), keep, keep);
  for (const bad of ["=SUM(A1:A3)", "@cmd", "-cmd|' /C calc'!A0", "+HYPERLINK(\"x\")", "- item"]) assert.equal(safeCell(bad), "'" + bad, bad);
  assert.equal(safeCell("a\tb\nc"), "a b c", "no tab/newline inside a cell");
  assert.equal(toTsv([["=1+1", "2"], ["x", "-3"]]), "'=1+1\t2\nx\t-3");
  const csv = toCsv([["Name", "Note"], ["A", 'he said "hi", ok']]);
  assert.ok(csv.startsWith("﻿"));
  assert.match(csv, /"he said ""hi"", ok"\r\n$/);
});

test("model choice survives Google retiring models", () => {
  const m = (name, methods = ["generateContent"]) => ({ name: "models/" + name, supportedGenerationMethods: methods });
  const list = [m("gemini-2.5-flash"), m("gemini-3-flash-preview"), m("gemini-3.1-flash-lite"), m("gemini-3.1-pro-preview"), m("text-embedding-004", ["embedContent"]), m("gemini-2.5-flash-image"), m("gemini-flash-latest")];
  assert.equal(pickModel(list), "gemini-2.5-flash", "newest stable flash wins over preview and alias");
  assert.equal(pickModel([...list, m("gemini-3.5-flash")]), "gemini-3.5-flash", "newer stable flash wins");
  assert.equal(pickModel(list.filter((x) => x.name !== "models/gemini-2.5-flash")), "gemini-flash-latest", "alias next");
  assert.equal(pickModel([m("gemini-3-flash-preview"), m("gemini-3.1-flash-lite")]), "gemini-3-flash-preview", "preview flash before lite");
  assert.equal(pickModel([m("gemini-3.1-flash-lite"), m("gemini-2.5-flash-lite")]), "gemini-3.1-flash-lite");
  assert.equal(pickModel([m("gemini-2.5-flash-image"), m("text-embedding-004", ["embedContent"])]), "", "nothing usable");
  assert.equal(pickModel(null), "");
});

test("Gemini requests: key in a header, prompt + PNG, and answers parsed", async () => {
  let seen;
  const fetchImpl = async (url, init) => { seen = { url, init }; return json(200, { candidates: [{ content: { parts: [{ text: "A\tB" }] }, finishReason: "STOP" }] }); };
  const out = await readTable({ key: "AIzaTESTKEY0000000000000", model: "gemini-2.5-flash", pngBase64: "iVBORw0KGgo=", fetchImpl });
  assert.deepEqual(out, { text: "A\tB", truncated: false });
  assert.equal(seen.url, GEMINI_ORIGIN + "/v1beta/models/gemini-2.5-flash:generateContent");
  assert.equal(seen.url.includes("AIza"), false, "key never in the URL");
  assert.equal(seen.init.headers["x-goog-api-key"], "AIzaTESTKEY0000000000000");
  const body = JSON.parse(seen.init.body);
  assert.equal(body.contents[0].parts[0].text, PROMPT);
  assert.deepEqual(body.contents[0].parts[1], { inline_data: { mime_type: "image/png", data: "iVBORw0KGgo=" } });
  assert.equal(body.generationConfig.temperature, 0);
  const cut = await readTable({ key: "k".repeat(20), model: "m", pngBase64: "x", fetchImpl: async () => json(200, { candidates: [{ content: { parts: [{ text: "partial", thought: false }, { text: "", thought: true }] }, finishReason: "MAX_TOKENS" }] }) });
  assert.deepEqual(cut, { text: "partial", truncated: true });
});

test("every Gemini failure maps to a clear, specific error", async () => {
  const cases = [
    [() => json(400, { error: { code: 400, message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT", details: [{ reason: "API_KEY_INVALID" }] } }), "key-invalid"],
    [() => json(403, { error: { code: 403, status: "PERMISSION_DENIED" } }), "key-denied"],
    [() => json(404, { error: { code: 404, status: "NOT_FOUND" } }), "model-missing"],
    [() => json(429, { error: { code: 429, status: "RESOURCE_EXHAUSTED" } }), "quota"],
    [() => json(503, { error: { code: 503 } }), "unavailable"],
    [() => json(400, { error: { code: 400, message: "Bad image" } }), "failed"],
    [() => json(200, { promptFeedback: { blockReason: "SAFETY" } }), "blocked"],
    [() => json(200, { candidates: [{ content: { parts: [] }, finishReason: "SAFETY" }] }), "blocked"],
    [() => json(200, { candidates: [{ content: { parts: [{ text: "  " }] }, finishReason: "STOP" }] }), "empty"],
    [() => { throw new TypeError("Failed to fetch"); }, "network"],
    [() => { const e = new Error("aborted"); e.name = "AbortError"; throw e; }, "cancelled"],
  ];
  for (const [respond, code] of cases) {
    await assert.rejects(readTable({ key: "k".repeat(20), model: "m", pngBase64: "x", fetchImpl: async () => respond() }), (e) => e instanceof GeminiError && e.code === code && e.message.length > 5, code);
  }
  assert.throws(() => checkKeyFormat("short"), (e) => e.code === "key-format");
  assert.throws(() => checkKeyFormat("has spaces in it 1234567890"), (e) => e.code === "key-format");
  assert.equal(checkKeyFormat("  AIzaSyA-valid_key.0123456789  "), "AIzaSyA-valid_key.0123456789");
});

test("selection maps from the displayed screenshot to its real pixels", () => {
  assert.deepEqual(normalizeRect(50, 80, 10, 20), { x: 10, y: 20, w: 40, h: 60 });
  assert.deepEqual(toSourceRect({ x: 10, y: 20, w: 100, h: 50 }, { w: 1280, h: 800 }, { w: 2560, h: 1600 }), { x: 20, y: 40, w: 200, h: 100 }, "2x screen");
  assert.deepEqual(toSourceRect({ x: 1200, y: 760, w: 200, h: 200 }, { w: 1280, h: 800 }, { w: 1280, h: 800 }), { x: 1200, y: 760, w: 80, h: 40 }, "clipped to the image");
  assert.equal(toSourceRect({ x: 0, y: 0, w: 4, h: 4 }, { w: 100, h: 100 }, { w: 100, h: 100 }), null, "too small");
  assert.equal(toSourceRect({ x: 0, y: 0, w: 40, h: 40 }, { w: 0, h: 0 }, { w: 100, h: 100 }), null);
  assert.deepEqual(fitWithin(6000, 1500), { w: 3072, h: 768 });
  assert.deepEqual(fitWithin(800, 400), { w: 800, h: 400 }, "never upscaled");
});

function fakeApi({ capture, sessionSet } = {}) {
  const calls = { capture: [], created: [], session: {} };
  return {
    calls,
    tabs: {
      query: async () => [{ id: 7, index: 2, windowId: 3 }],
      captureVisibleTab: async (windowId, opts) => { calls.capture.push({ windowId, opts }); return capture ? capture(opts) : "data:image/png;base64,AAAA"; },
      create: async (props) => { calls.created.push(props); return { id: 8 }; },
    },
    storage: {
      session: { set: async (items) => { if (sessionSet) sessionSet(items); Object.assign(calls.session, items); } },
      local: (() => { const data = {}; return { data, get: async (keys) => Object.fromEntries(keys.filter((k) => k in data).map((k) => [k, data[k]])), set: async (items) => { Object.assign(data, items); }, remove: async (keys) => { for (const k of keys) delete data[k]; } }; })(),
    },
  };
}

test("capture: screenshot handed to the snip tab through session storage only", async () => {
  const api = fakeApi();
  const out = await startSnip(null, api);
  assert.deepEqual(out, { ok: true });
  assert.deepEqual(api.calls.capture, [{ windowId: 3, opts: { format: "png" } }]);
  const saved = api.calls.session[CAPTURE_KEY];
  assert.equal(saved.dataUrl, "data:image/png;base64,AAAA");
  assert.match(api.calls.created[0].url, new RegExp("^snip\\.html\\?id=" + saved.id + "$"));
  assert.equal(api.calls.created[0].index, 3, "opens next to the page");
  assert.equal(api.calls.created[0].openerTabId, 7);
});

test("capture: protected pages and huge screens still open the snip tab with a clear reason", async () => {
  const blocked = fakeApi({ capture: () => { throw new Error("Cannot access contents of url chrome://settings"); } });
  assert.deepEqual(await startSnip({ id: 1, index: 0, windowId: 1 }, blocked), { ok: false, error: "capture-blocked" });
  assert.match(blocked.calls.created[0].url, /&error=capture-blocked$/);
  assert.equal(Object.keys(blocked.calls.session).length, 0);
  const big = "data:image/png;base64," + "A".repeat(9 * 1024 * 1024);
  const huge = fakeApi({ capture: (opts) => (opts.format === "png" ? big : "data:image/jpeg;base64,BBBB") });
  assert.deepEqual(await startSnip({ id: 1, index: 0, windowId: 1 }, huge), { ok: true });
  assert.deepEqual(huge.calls.capture.map((c) => c.opts.format), ["png", "jpeg"], "falls back to JPEG for very large screens");
  const full = fakeApi({ sessionSet: () => { throw new Error("QUOTA_BYTES quota exceeded"); } });
  assert.deepEqual(await startSnip({ id: 1, index: 0, windowId: 1 }, full), { ok: false, error: "too-large" });
  assert.match(full.calls.created[0].url, /&error=too-large$/);
});

test("key handling: validated with Google, stored locally with the picked model, removable", async () => {
  const api = fakeApi();
  const models = { models: [{ name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] }] };
  let auth;
  const fetchImpl = async (url, init) => { auth = init.headers["x-goog-api-key"]; assert.equal(url, GEMINI_ORIGIN + "/v1beta/models?pageSize=200"); return json(200, models); };
  assert.equal(await saveKey("  AIzaSyTESTKEY000000000000000  ", api, fetchImpl), "gemini-2.5-flash");
  assert.equal(auth, "AIzaSyTESTKEY000000000000000");
  assert.deepEqual(await getSettings(api), { key: "AIzaSyTESTKEY000000000000000", model: "gemini-2.5-flash" });
  assert.equal(maskKey("AIzaSyTESTKEY000000000000000"), "AIza…0000");
  await assert.rejects(saveKey("AIzaSyBADKEY0000000000000000", fakeApi(), async () => json(400, { error: { message: "API key not valid", details: [{ reason: "API_KEY_INVALID" }] } })), (e) => e.code === "key-invalid");
  await assert.rejects(saveKey("AIzaSyNOMODEL000000000000000", fakeApi(), async () => json(200, { models: [] })), (e) => e.code === "no-model");
  const swapped = fakeApi();
  await swapped.storage.local.set({ [KEY_STORE]: "k".repeat(30), [MODEL_STORE]: "gemini-2.0-flash" });
  assert.equal(await refreshModel("k".repeat(30), swapped, async () => json(200, { models: [{ name: "models/gemini-3.1-flash-lite", supportedGenerationMethods: ["generateContent"] }] })), "gemini-3.1-flash-lite");
  await removeKey(api);
  assert.deepEqual(await getSettings(api), { key: "", model: "" });
  assert.deepEqual(await listModels("k".repeat(20), async () => json(200, {})), []);
});

test("manifest stays minimal and the package ships only extension files", () => {
  const m = manifest();
  assert.equal(m.manifest_version, 3);
  assert.deepEqual(m.permissions, ["activeTab", "storage", "clipboardWrite"]);
  assert.deepEqual(m.host_permissions, ["https://generativelanguage.googleapis.com/*"]);
  for (const k of ["content_scripts", "web_accessible_resources", "externally_connectable", "optional_host_permissions"]) assert.equal(m[k], undefined, k);
  assert.equal(m.background.type, "module");
  assert.equal(m.commands["start-snip"].suggested_key.default, "Alt+S");
  const files = sourceFiles();
  for (const f of ["background.js", "popup.html", "snip.html", "welcome.html", "lib/gemini.js", "icons/icon-128.png"]) assert.ok(files.includes(f), f);
  assert.ok(files.every((f) => !/test|\.md$|assets\//.test(f)), "no tests, docs or sources in the package");
  const first = fs.readFileSync(build({ pack: true, log: () => {} }).zip);
  const second = fs.readFileSync(build({ pack: true, log: () => {} }).zip);
  assert.ok(first.equals(second), "packaging is reproducible");
});
