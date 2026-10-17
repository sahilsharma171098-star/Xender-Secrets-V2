import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import * as PDFLib from "pdf-lib";
import { parsePages, safeFilename, validateFiles, fitImage, editPDF } from "../src/core.mjs";
import { createZip } from "../src/zip.mjs";

test("page selections preserve custom order, remove duplicates and reject invalid ranges", () => {
  assert.deepEqual(parsePages("3, 1-2, 2", 4), [2,0,1]);
  assert.deepEqual(parsePages("", 3), [0,1,2]);
  for (const value of ["0", "-1", "4", "2-1", "1,", "1.5", "1e2", "1-9999999999"]) assert.throws(() => parsePages(value, 3));
});
test("file validation enforces format, size, counts and merge minimum", () => {
  const pdf = { name: "file.pdf", type: "application/pdf", size: 50 };
  assert.throws(() => validateFiles([pdf], "merge"));
  assert.doesNotThrow(() => validateFiles([pdf,pdf], "merge"));
  assert.throws(() => validateFiles([pdf,pdf], "rotate"));
  assert.throws(() => validateFiles([{ ...pdf, size: 81*1024*1024 }], "rotate"));
  assert.throws(() => validateFiles([{ ...pdf, name: "file.svg", type: "image/svg+xml" }], "images"));
  assert.throws(() => validateFiles([{ ...pdf, size: 0 }], "rotate"));
});
test("output filenames do not contain paths, controls or reserved device names", () => {
  assert.equal(safeFilename("../../report.pdf", "zip"), "-..-report.zip");
  assert.equal(safeFilename("CON", "pdf"), "xender-CON.pdf");
  assert.equal(safeFilename("", "pdf"), "xender-document.pdf");
  assert.equal(safeFilename("test\u202e.pdf", "png"), "test-.png");
});
test("image fitting stays inside A4/Letter margins and handles orientation", () => {
  for (const size of [[100,200],[200,100]]) {
    const fitted=fitImage(...size,"a4"); assert.ok(fitted.x>=23.99 && fitted.y>=23.99);
    assert.ok(fitted.x+fitted.width<=fitted.page[0]-23.99);
  }
  assert.deepEqual(fitImage(100,200,"image").page,[75,150]);
});
async function fixture(widths) { const doc=await PDFLib.PDFDocument.create(); for(const w of widths) doc.addPage([w,500]); return doc.save(); }
test("merge and extraction preserve requested document/page order", async () => {
  const input=await fixture([300,400,500]);
  const selected=await editPDF([input],"extract","3,1-2",0,PDFLib);
  const doc=await PDFLib.PDFDocument.load(selected.bytes);
  assert.deepEqual(doc.getPages().map(p=>p.getWidth()),[500,300,400]);
  const merged=await editPDF([await fixture([200]),input],"merge","",0,PDFLib);
  assert.deepEqual((await PDFLib.PDFDocument.load(merged.bytes)).getPages().map(p=>p.getWidth()),[200,300,400,500]);
});
test("rotation changes only selected pages, keeps existing rotations, and preserves count", async () => {
  const doc=await PDFLib.PDFDocument.load(await fixture([300,400,500])); doc.getPage(1).setRotation(PDFLib.degrees(270));
  const output=await editPDF([await doc.save()],"rotate","2",90,PDFLib);
  const rotated=await PDFLib.PDFDocument.load(output.bytes);
  assert.equal(rotated.getPageCount(),3); assert.deepEqual(rotated.getPages().map(p=>p.getRotation().angle),[0,0,0]);
  await assert.rejects(editPDF([await fixture([200])],"rotate","",45,PDFLib));
});
test("bad PDF bytes are rejected", async () => { await assert.rejects(editPDF([new Uint8Array([1,2,3])],"extract","",0,PDFLib)); });
test("ZIP headers and file content agree, including UTF-8 names", async () => {
  const data=new Uint8Array([1,2,3,4]); const zip=new Uint8Array(await createZip([{name:"page-0001.png",bytes:data}]).arrayBuffer());
  const view=new DataView(zip.buffer); assert.equal(view.getUint32(0,true),0x04034b50); assert.equal(view.getUint32(18,true),4);
  assert.deepEqual(zip.slice(30+view.getUint16(26,true),30+view.getUint16(26,true)+4),data);
  assert.equal(view.getUint32(zip.length-22,true),0x06054b50);
});
test("privacy contract: no permissions or remote code, fixed optional quote link", async () => {
  const manifest=JSON.parse(await fs.readFile(new URL("../src/manifest.json",import.meta.url),"utf8"));
  assert.equal(manifest.permissions,undefined); assert.equal(manifest.host_permissions,undefined);
  assert.deepEqual(manifest.browser_specific_settings.gecko.data_collection_permissions.required,["none"]);
  const html=await fs.readFile(new URL("../src/app.html",import.meta.url),"utf8");
  assert.ok(html.includes("OPTIONAL PAID SERVICE")); assert.ok(html.includes("utm_campaign=pdf_automation#start"));
  assert.ok(!/<script[^>]+src=["']https?:/i.test(html));
  const js=await fs.readFile(new URL("../src/app.mjs",import.meta.url),"utf8");
  assert.ok(!/\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage)\b/.test(js));
  assert.ok(js.includes("isEvalSupported: false"));
});
