// Development integration test. Optional prerequisite: Playwright with Firefox.
// Serves the exact built files with the same CSP as the extension. No user session.
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import * as PDFLib from "pdf-lib";
const require = createRequire(import.meta.url);
const hardStop = setTimeout(() => { console.error("Browser integration test exceeded 90 seconds; check browser/container support."); process.exit(1); }, 90_000);
hardStop.unref();
const { firefox } = require("playwright");
const root = fileURLToPath(new URL("../", import.meta.url));
const built = path.join(root,"dist/firefox"), output=path.join(root,"test-output");
await fs.mkdir(output,{recursive:true});
const manifest=JSON.parse(await fs.readFile(path.join(built,"manifest.json"),"utf8"));
const mime={".html":"text/html",".mjs":"text/javascript",".js":"text/javascript",".css":"text/css",".png":"image/png",".wasm":"application/wasm"};
const server=http.createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    const target=path.resolve(built,"."+pathname);
    if(!target.startsWith(built+path.sep)){res.writeHead(403);res.end();return;}
    const bytes=await fs.readFile(target);
    res.writeHead(200,{"Content-Type":mime[path.extname(target)]||"application/octet-stream","Content-Security-Policy":manifest.content_security_policy.extension_pages});res.end(bytes);
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const url=`http://127.0.0.1:${server.address().port}/app.html`;
const browser=await firefox.launch({headless:true,timeout:15000});
const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1100}});
const page=await context.newPage(); const errors=[],external=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("request",req=>{if(/^https?:/.test(req.url())&&!req.url().startsWith(new URL(url).origin))external.push(req.url());});
async function fixture(name,widths){const doc=await PDFLib.PDFDocument.create();for(let i=0;i<widths.length;i++){const p=doc.addPage([widths[i],500]);p.drawText(`XENDER TEST PAGE ${i+1}`,{x:30,y:430,size:20});}const file=path.join(output,name);await fs.writeFile(file,await doc.save());return file;}
const first=await fixture("sample.pdf",[300,400,500]),second=await fixture("second.pdf",[250]);
const sampleImage=path.join(built,"icons/icon-128.png");
async function tool(name,files){await page.getByRole("button",{name,exact:false}).click();await page.locator("#file-input").setInputFiles(files);}
async function download(name){await page.locator("#run").click();await page.locator("#result").waitFor({state:"visible",timeout:60000});const pending=page.waitForEvent("download");await page.locator("#download").click();const d=await pending;const file=path.join(output,name);await d.saveAs(file);return file;}
try{
  await page.goto(url);
  await page.locator("#file-input").setInputFiles([sampleImage,sampleImage]);
  const imagePDF=await download("images.pdf");assert.equal((await PDFLib.PDFDocument.load(await fs.readFile(imagePDF))).getPageCount(),2);
  console.log("PASS image to PDF (2 pages), download");
  await tool("Merge PDFs",[first,second]);
  await page.getByRole("button",{name:"Move up second.pdf",exact:true}).click();
  const merged=await download("merged.pdf");assert.deepEqual((await PDFLib.PDFDocument.load(await fs.readFile(merged))).getPages().map(p=>p.getWidth()),[250,300,400,500]);
  console.log("PASS merge with file reorder");
  await tool("Extract pages",[first]);await page.locator("#pages").fill("3,1");
  const extracted=await download("extracted.pdf");assert.deepEqual((await PDFLib.PDFDocument.load(await fs.readFile(extracted))).getPages().map(p=>p.getWidth()),[500,300]);
  console.log("PASS extract with page reorder");
  await tool("Rotate PDF",[first]);await page.locator("#pages").fill("2");
  const rotated=await download("rotated.pdf");assert.deepEqual((await PDFLib.PDFDocument.load(await fs.readFile(rotated))).getPages().map(p=>p.getRotation().angle),[0,90,0]);
  console.log("PASS selected-page rotation");
  await tool("PDF to images",[first]);await page.locator("#pages").fill("1");
  const png=await download("page.png");assert.equal((await fs.readFile(png)).subarray(1,4).toString(),"PNG");
  console.log("PASS PDF to PNG with packaged worker/fonts");
  await page.locator("#pages").fill("2-3");await page.locator("#image-format").selectOption("jpeg");
  const zip=await download("pages.zip");assert.equal((await fs.readFile(zip)).readUInt32LE(),0x04034b50);
  console.log("PASS PDF to JPG ZIP (2 pages)");
  await page.locator("#pages").fill("99");await page.locator("#run").click();await page.locator("#status.error").waitFor();assert.match(await page.locator("#status").textContent(),/between 1 and 3/);
  console.log("PASS invalid range error");
  await tool("Images to PDF",[sampleImage]);await page.locator("#clear").click();assert.equal(await page.locator(".file-item").count(),0);assert.equal(await page.locator("#run").isDisabled(),true);
  console.log("PASS clear file state");
  await page.screenshot({path:path.join(output,"desktop.png"),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:path.join(output,"mobile.png"),fullPage:true});
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  console.log("PASS no external requests, no JS errors, mobile width, desktop/mobile screenshots");
}finally{clearTimeout(hardStop);await browser.close();server.close();}
