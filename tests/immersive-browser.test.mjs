// Real Chromium/WebGL regression for /immersive-lab (no external network).
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT=fileURLToPath(new URL("../public/",import.meta.url));
const OUT=fileURLToPath(new URL("../immersive-qa-screenshots/",import.meta.url));
const scenes=["gym","fashion","cinema","property","bistro"];
const type={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8"};

function startServer(){
  const server=createServer((req,res)=>{
    const url=new URL(req.url||"/", "http://127.0.0.1");
    let filename=url.pathname==="/immersive-lab"?"immersive-lab.html":url.pathname.slice(1);
    // Only serve the three self-contained lab files, not other repo resources.
    if(!["immersive-lab.html","immersive-lab.css","immersive-lab.js"].includes(filename)){
      res.writeHead(404,{"content-type":"text/plain"});res.end("not found");return;
    }
    try{
      const contents=readFileSync(join(ROOT,filename));
      res.writeHead(200,{"content-type":type[extname(filename)],"cache-control":"no-store"});
      res.end(contents);
    }catch(e){res.writeHead(500);res.end(String(e))}
  });
  return new Promise(resolve=>server.listen(0,"127.0.0.1",()=>resolve(server)));
}
async function testViewport(browser,url,viewport,deviceLabel){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:deviceLabel==="mobile",hasTouch:deviceLabel==="mobile",reducedMotion:"reduce"});
  const page=await context.newPage();
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",message=>{if(message.type()==="error")errors.push(message.text())});
  page.on("request",request=>{
    if(!request.url().startsWith(url.split("/immersive-lab")[0]))errors.push("Unexpected cross-origin request: "+request.url());
  });
  await page.goto(url,{waitUntil:"load"});
  await page.waitForFunction(()=>/WEBGL ·/.test(document.getElementById("renderStatus")?.textContent||""),null,{timeout:15000});
  const sizing=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}));
  assert.ok(sizing.scrollWidth<=sizing.viewport+1,"horizontal overflow: "+JSON.stringify(sizing));
  const canvas=page.locator("#showroom");
  assert.equal(await canvas.count(),1);
  const canvasArea=await canvas.evaluate(x=>{const r=x.getBoundingClientRect();return {width:r.width,height:r.height,pixels:x.width*x.height}});
  assert.ok(canvasArea.width>=320&&canvasArea.height>=400&&canvasArea.pixels>100000,JSON.stringify(canvasArea));
  for(const [index,scene] of scenes.entries()){
    await page.locator('[data-scene="'+scene+'"]').click();
    await page.waitForTimeout(90);
    const selected=await page.locator('[data-scene="'+scene+'"]').getAttribute("aria-selected");
    assert.equal(selected,"true");
    const currentIndex=await page.locator("#sceneIndex").textContent();
    assert.equal(currentIndex?.slice(0,2),String(index+1).padStart(2,"0"));
    const selections=await page.locator(".inspector select option").count();
    assert.ok(selections>2,scene+" should contain selectable objects");
    const snapshot=await canvas.evaluate(x=>x.toDataURL("image/png"));
    assert.ok(snapshot.length>2500,scene+" WebGL scene must render nonempty image ("+snapshot.length+")");
    await page.screenshot({path:join(OUT,scene+"-"+deviceLabel+".png"),fullPage:false,animations:"disabled"});
    await page.locator(".stage-shell").screenshot({path:join(OUT,scene+"-"+deviceLabel+"-stage.png"),animations:"disabled"});
  }
  await page.locator('[data-scene="cinema"]').click();
  await page.locator(".inspector select").selectOption("seat-A1");
  assert.equal(await page.locator("#objectTitle").textContent(),"Seat A1");
  await page.locator("#objectAction").click();
  assert.match(await page.locator("#objectAction").textContent(),/Deselect demo seat/);
  await page.locator("#objectAction").click();
  assert.match(await page.locator("#objectAction").textContent(),/Select demo seat/);
  await page.locator("#orbitRight").click();
  await page.locator("#zoomIn").click();
  await page.locator("#resetCamera").click();
  assert.deepEqual(errors,[],deviceLabel+" browser errors");
  await context.close();
  return canvasArea;
}

test("headless Chromium draws all five interactive WebGL scenes on desktop and mobile", {timeout:120000}, async()=>{
  mkdirSync(OUT,{recursive:true});
  const server=await startServer();
  const addr=server.address();
  assert.ok(addr&&typeof addr==="object");
  const url="http://127.0.0.1:"+addr.port+"/immersive-lab";
  let browser;
  try{
    browser=await chromium.launch({
      headless:true,
      args:["--no-sandbox","--enable-webgl","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]
    });
    const desktop=await testViewport(browser,url,{width:1440,height:900},"desktop");
    const mobile=await testViewport(browser,url,{width:390,height:844},"mobile");
    console.log("WebGL visual smoke check PASSED",JSON.stringify({desktop,mobile,scenes:sccount()}));
  }finally{
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
function sccount(){return scenes.length}
