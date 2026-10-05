import { chromium } from "playwright";
import fs from "node:fs";

const url="https://liddread.com/absolute-god-chapter-1/";
const browser=await chromium.launch({headless:true,args:["--disable-blink-features=AutomationControlled","--no-sandbox"]});
const context=await browser.newContext({
  userAgent:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",
  viewport:{width:1365,height:768},
  locale:"en-US"
});
const page=await context.newPage();
let result={url};
try{
  const res=await page.goto(url,{waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForTimeout(8000);
  const title=await page.title();
  const body=await page.locator("body").innerText().catch(()=> "");
  const html=await page.content();
  result={url,status:res?.status()||0,title,bodyLength:body.length,bodyStart:body.slice(0,1600),hasChallenge:/just a moment|checking your browser|verify you are human|cloudflare/i.test(title+" "+body),htmlLength:html.length};
}catch(e){result.error=String(e)}
fs.writeFileSync("liddread-probe.json",JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
await browser.close();
