import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";

const ROOT=process.cwd();
const MANIFEST_PATH=path.join(ROOT,"liddread-completed-catalog.json");
const ARCHIVE_ROOT=path.join(ROOT,"archives","liddread");
const CHUNK_SIZE=200;
const CONCURRENCY=Math.max(1,Math.min(8,Number(process.env.LIDDREAD_CONCURRENCY||5)));
const MAX_RETRIES=4;
const UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 XenderArchive/1.0";

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ensureDir=p=>fs.mkdirSync(p,{recursive:true});
const sha256=s=>crypto.createHash("sha256").update(s).digest("hex");

function decodeHtml(s=""){
  const named={amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" ",rsquo:"'",lsquo:"'",ldquo:'"',rdquo:'"',ndash:"-",mdash:"-",hellip:"..."};
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16)))
    .replace(/&#(\d+);/g,(_,d)=>String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi,(m,n)=>Object.hasOwn(named,n.toLowerCase())?named[n.toLowerCase()]:m);
}
function stripTags(html=""){
  return decodeHtml(String(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[\s\S]*?<\/style>/gi," ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi," ")
    .replace(/<br\s*\/?\s*>/gi,"\n")
    .replace(/<\/p\s*>/gi,"\n")
    .replace(/<\/h[1-6]\s*>/gi,"\n")
    .replace(/<[^>]+>/g," "))
    .replace(/\r/g,"")
    .replace(/[ \t]+/g," ")
    .replace(/\n[ \t]+/g,"\n")
    .replace(/\n{3,}/g,"\n\n")
    .trim();
}
function isChallenge(text="",status=200){
  const x=String(text).slice(0,20000).toLowerCase();
  return status===403||status===429||
    x.includes("cf-chl-")||
    x.includes("just a moment...")||
    x.includes("checking your browser")||
    x.includes("attention required! | cloudflare")||
    x.includes("verify you are human");
}
async function directFetch(url,accept="text/html,application/xhtml+xml"){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),35000);
  try{
    const res=await fetch(url,{
      redirect:"follow",
      signal:ctrl.signal,
      headers:{
        "user-agent":UA,
        "accept":accept,
        "accept-language":"en-US,en;q=0.9",
        "cache-control":"no-cache",
        "pragma":"no-cache",
        "referer":"https://liddread.com/"
      }
    });
    const text=await res.text();
    if(!res.ok||isChallenge(text,res.status)) throw new Error("direct HTTP "+res.status);
    return {text,url:res.url,status:res.status,via:"direct",contentType:res.headers.get("content-type")||""};
  } finally {clearTimeout(timer);}
}
async function jinaFetch(url){
  const target="https://r.jina.ai/"+url;
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),60000);
  try{
    const res=await fetch(target,{
      redirect:"follow",
      signal:ctrl.signal,
      headers:{"user-agent":UA,"accept":"text/plain,text/markdown;q=0.9,*/*;q=0.8"}
    });
    const text=await res.text();
    if(!res.ok||text.length<80) throw new Error("jina HTTP "+res.status);
    return {text,url,finalUrl:url,status:res.status,via:"jina",contentType:"text/markdown"};
  } finally {clearTimeout(timer);}
}
async function fetchSource(url,{allowJina=true}={}){
  let last;
  for(let attempt=1;attempt<=MAX_RETRIES;attempt++){
    try{return await directFetch(url);}
    catch(e){
      last=e;
      if(attempt<MAX_RETRIES) await sleep(350*attempt+Math.floor(Math.random()*250));
    }
  }
  if(allowJina){
    for(let attempt=1;attempt<=3;attempt++){
      try{return await jinaFetch(url);}
      catch(e){last=e; if(attempt<3) await sleep(900*attempt);}
    }
  }
  throw last||new Error("Unable to fetch "+url);
}
function normalizeUrl(href,base){
  try{
    const u=new URL(decodeHtml(href),base);
    if(!/^(?:www\.)?liddread\.com$/i.test(u.hostname)) return null;
    u.hash="";
    return u.toString();
  }catch{return null;}
}
function extractLinks(text,base,via){
  const out=[];
  if(via==="direct"){
    const re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while((m=re.exec(text))){
      const url=normalizeUrl(m[1],base);
      if(url) out.push({url,label:stripTags(m[2])});
    }
  }else{
    const re=/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
    let m;
    while((m=re.exec(text))){
      const url=normalizeUrl(m[2],base);
      if(url) out.push({url,label:m[1]});
    }
    const bare=/https?:\/\/(?:www\.)?liddread\.com\/[^\s)>"']+/gi;
    while((m=bare.exec(text))){
      const url=normalizeUrl(m[0],base);
      if(url) out.push({url,label:""});
    }
  }
  return out;
}
function chapterNo(value=""){
  const s=decodeHtml(String(value));
  const patterns=[
    /(?:^|[\/_-])chapter[-_\s]*(\d{1,6})(?:\D|$)/i,
    /\bchapter\s+(\d{1,6})\b/i
  ];
  for(const p of patterns){const m=s.match(p);if(m)return Number(m[1]);}
  return null;
}
function chapterPrefix(url){
  try{
    const p=new URL(url).pathname;
    const m=p.match(/^(.*?chapter-)(\d{1,6})(.*)$/i);
    return m?m[1]:null;
  }catch{return null;}
}
function discoverChapterMap(indexText,indexUrl,via,expectedFinal){
  const links=extractLinks(indexText,indexUrl,via);
  const candidates=[];
  for(const l of links){
    const n=chapterNo(l.url)||chapterNo(l.label);
    if(!n||n<1)continue;
    if(expectedFinal&&n>expectedFinal+5) continue;
    candidates.push({...l,n,prefix:chapterPrefix(l.url)});
  }
  const prefixCounts=new Map();
  for(const c of candidates){
    if(c.prefix) prefixCounts.set(c.prefix,(prefixCounts.get(c.prefix)||0)+1);
  }
  const dominant=[...prefixCounts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
  let filtered=candidates;
  if(dominant){
    const same=candidates.filter(c=>c.prefix===dominant);
    if(same.length>=Math.min(20,Math.max(3,candidates.length*0.25))) filtered=same;
  }
  const map=new Map();
  for(const c of filtered){
    if(!map.has(c.n)||c.url.length<map.get(c.n).url.length) map.set(c.n,c);
  }
  let max=Math.max(0,...map.keys());
  const final=expectedFinal||max;
  const generated=[];
  if(dominant&&final){
    const origin=new URL(indexUrl).origin;
    for(let n=1;n<=final;n++){
      if(!map.has(n)){
        const u=new URL(dominant+n+"/",origin).toString();
        map.set(n,{n,url:u,label:"Generated from dominant chapter URL pattern",prefix:dominant,generated:true});
        generated.push(n);
      }
    }
  }
  max=Math.max(0,...map.keys());
  return {map,dominant,discoveredCount:filtered.length,generated,max,final:expectedFinal||max,totalRawLinks:links.length};
}
function contentRegion(html){
  let s=String(html);
  const selectors=[
    /<div\b[^>]*class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div\b[^>]*class=["'][^"']*post-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
    /<main\b[^>]*>([\s\S]*?)<\/main>/i
  ];
  for(const re of selectors){const m=s.match(re);if(m&&stripTags(m[1]).length>250){s=m[1];break;}}
  return s
    .replace(/<script\b[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[\s\S]*?<\/style>/gi," ")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi," ")
    .replace(/<aside\b[\s\S]*?<\/aside>/gi," ")
    .replace(/<form\b[\s\S]*?<\/form>/gi," ")
    .replace(/<footer\b[\s\S]*?<\/footer>/gi," ");
}
function pageTitle(html=""){
  const m=String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m?stripTags(m[1]):"";
}
function cleanReadable(source,chapter){
  if(source.via==="jina"){
    let t=String(source.text)
      .replace(/^Title:.*$/gmi,"")
      .replace(/^URL Source:.*$/gmi,"")
      .replace(/^Markdown Content:.*$/gmi,"")
      .trim();
    if(t.length<150) throw new Error("Too little readable text from Jina");
    return {title:"Chapter "+chapter,body:t,format:"markdown"};
  }
  const region=contentRegion(source.text);
  let body=stripTags(region);
  const boiler=[
    /Join Telegram Group for fast update/gi,
    /Previous Chapter/gi,
    /Next Chapter/gi,
    /Recent Posts/gi
  ];
  for(const re of boiler) body=body.replace(re," ");
  body=body.replace(/\n{3,}/g,"\n\n").trim();
  if(body.length<150) throw new Error("Too little readable text");
  return {title:pageTitle(source.text)||("Chapter "+chapter),body,format:"text"};
}
async function findWpChapter(title,chapter){
  const q=encodeURIComponent(title+" "+chapter);
  const url="https://liddread.com/wp-json/wp/v2/search?search="+q+"&per_page=20&page=1";
  try{
    const src=await directFetch(url,"application/json,text/plain,*/*");
    const rows=JSON.parse(src.text);
    for(const x of Array.isArray(rows)?rows:[]){
      const n=chapterNo((x.title||"")+" "+(x.url||""));
      if(n===chapter&&x.url) return x.url;
    }
  }catch{}
  return null;
}
async function fetchChapter(entry,chapterInfo){
  const chapter=chapterInfo.n;
  const tried=[];
  const urls=[chapterInfo.url];
  for(const u of urls){
    if(!u||tried.includes(u))continue;
    tried.push(u);
    try{
      const src=await fetchSource(u);
      const readable=cleanReadable(src,chapter);
      return {
        ok:true,chapter,url:u,finalUrl:src.url||u,via:src.via,
        title:readable.title,format:readable.format,body:readable.body,
        sha256:sha256(readable.body),bytes:Buffer.byteLength(readable.body,"utf8"),
        generatedUrl:!!chapterInfo.generated
      };
    }catch{}
  }
  const searched=await findWpChapter(entry.title,chapter);
  if(searched&&!tried.includes(searched)){
    tried.push(searched);
    try{
      const src=await fetchSource(searched);
      const readable=cleanReadable(src,chapter);
      return {
        ok:true,chapter,url:searched,finalUrl:src.url||searched,via:src.via,
        title:readable.title,format:readable.format,body:readable.body,
        sha256:sha256(readable.body),bytes:Buffer.byteLength(readable.body,"utf8"),
        generatedUrl:false,resolvedBy:"wp-search"
      };
    }catch{}
  }
  return {ok:false,chapter,tried,error:"Could not fetch or extract chapter"};
}
async function pool(items,limit,fn){
  const out=new Array(items.length);let cursor=0;
  async function worker(){
    while(true){
      const i=cursor++;if(i>=items.length)return;
      try{out[i]=await fn(items[i],i);}catch(e){out[i]={ok:false,error:String(e),item:items[i]};}
      await sleep(70+Math.floor(Math.random()*90));
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));
  return out;
}
function gzipWrite(file,content){
  ensureDir(path.dirname(file));
  fs.writeFileSync(file,zlib.gzipSync(Buffer.from(content),{level:9}));
}
function loadGlobalReport(){
  const p=path.join(ARCHIVE_ROOT,"archive-report.json");
  try{return JSON.parse(fs.readFileSync(p,"utf8"));}catch{return {source:"LiddRead",updatedAt:null,novels:{}};}
}
function saveGlobalReport(slug,report){
  const global=loadGlobalReport();
  global.updatedAt=new Date().toISOString();
  global.novels[slug]=report;
  ensureDir(ARCHIVE_ROOT);
  fs.writeFileSync(path.join(ARCHIVE_ROOT,"archive-report.json"),JSON.stringify(global,null,2)+"\n");
}

const slug=process.argv[2];
if(!slug){
  console.error("Usage: node scripts/archive-liddread.mjs <slug>");
  process.exit(2);
}
if(!fs.existsSync(MANIFEST_PATH)) throw new Error("Missing "+MANIFEST_PATH);
const manifest=JSON.parse(fs.readFileSync(MANIFEST_PATH,"utf8"));
const entry=(manifest.completed||[]).find(x=>x.slug===slug&&x.archive===true);
if(!entry) throw new Error("Slug is not an approved completed archive target: "+slug);

const novelDir=path.join(ARCHIVE_ROOT,slug);
const reportPath=path.join(novelDir,"report.json");
if(fs.existsSync(reportPath)){
  try{
    const old=JSON.parse(fs.readFileSync(reportPath,"utf8"));
    if(old.complete===true&&old.permissionScope==="completed-only"){
      console.log(slug+": already archived completely; skipping");
      saveGlobalReport(slug,old);
      process.exit(0);
    }
  }catch{}
}
fs.rmSync(novelDir,{recursive:true,force:true});
ensureDir(path.join(novelDir,"chapters"));

console.log("Archiving",entry.title,entry.indexUrl);
let indexSource;
try{
  indexSource=await fetchSource(entry.indexUrl);
}catch(e){
  const report={
    slug,title:entry.title,indexUrl:entry.indexUrl,permissionScope:"completed-only",
    complete:false,startedAt:new Date().toISOString(),finishedAt:new Date().toISOString(),
    fatalError:"Could not fetch index: "+String(e),finalChapter:entry.finalChapter||null,
    archivedChapters:0,errors:[]
  };
  ensureDir(novelDir);
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n");
  saveGlobalReport(slug,report);
  console.error(report.fatalError);
  process.exit(1);
}
gzipWrite(path.join(novelDir,indexSource.via==="direct"?"index.html.gz":"index.md.gz"),indexSource.text);

const discovery=discoverChapterMap(indexSource.text,entry.indexUrl,indexSource.via,Number.isInteger(entry.finalChapter)?entry.finalChapter:null);
let finalChapter=Number.isInteger(entry.finalChapter)?entry.finalChapter:discovery.final;
if(!finalChapter||finalChapter<1){
  const report={slug,title:entry.title,indexUrl:entry.indexUrl,permissionScope:"completed-only",complete:false,
    fatalError:"No chapter range discovered",finishedAt:new Date().toISOString(),archivedChapters:0,errors:[]};
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n");saveGlobalReport(slug,report);process.exit(1);
}

const indexMeta={
  slug,title:entry.title,indexUrl:entry.indexUrl,indexVia:indexSource.via,
  expectedFinalChapter:entry.finalChapter||null,derivedFinalChapter:finalChapter,
  discoveredChapterLinks:discovery.discoveredCount,rawLinks:discovery.totalRawLinks,
  generatedMissingIndexUrls:discovery.generated.length,dominantChapterPrefix:discovery.dominant,
  statusEvidence:entry.statusEvidence||null,knownIssues:entry.knownIssues||[],
  archivedAt:new Date().toISOString()
};
fs.writeFileSync(path.join(novelDir,"meta.json"),JSON.stringify(indexMeta,null,2)+"\n");

const chapterInfos=[];
for(let n=1;n<=finalChapter;n++){
  chapterInfos.push(discovery.map.get(n)||{n,url:null,generated:true});
}
let successes=0,totalBytes=0;const errors=[];const chunkFiles=[];
const startedAt=new Date().toISOString();

for(let offset=0;offset<chapterInfos.length;offset+=CHUNK_SIZE){
  const batch=chapterInfos.slice(offset,offset+CHUNK_SIZE);
  console.log(slug+": chapters "+batch[0].n+"-"+batch[batch.length-1].n);
  const records=await pool(batch,CONCURRENCY,info=>fetchChapter(entry,info));
  const lines=[];
  for(const rec of records){
    if(rec?.ok){successes++;totalBytes+=rec.bytes||0;lines.push(JSON.stringify(rec));}
    else{
      const chapter=rec?.chapter||rec?.item?.n||null;
      errors.push({chapter,error:rec?.error||"Unknown error",tried:rec?.tried||[]});
      lines.push(JSON.stringify({ok:false,chapter,error:rec?.error||"Unknown error",tried:rec?.tried||[]}));
    }
  }
  const start=String(batch[0].n).padStart(6,"0");
  const end=String(batch[batch.length-1].n).padStart(6,"0");
  const rel="chapters/"+start+"-"+end+".jsonl.gz";
  gzipWrite(path.join(novelDir,rel),lines.join("\n")+"\n");
  chunkFiles.push(rel);
}

const failedSet=new Set(errors.map(x=>x.chapter).filter(Number.isInteger));
const missing=[];
for(let n=1;n<=finalChapter;n++) if(failedSet.has(n)) missing.push(n);
const complete=successes===finalChapter&&errors.length===0;
const report={
  slug,title:entry.title,indexUrl:entry.indexUrl,permissionScope:"completed-only",
  startedAt,finishedAt:new Date().toISOString(),complete,
  finalChapter,archivedChapters:successes,failedChapters:errors.length,
  missingChapters:missing,errors,totalReadableBytes:totalBytes,
  chunkFiles,indexVia:indexSource.via,knownIssues:entry.knownIssues||[],
  needsManualReview:(entry.knownIssues||[]).length>0,
  note:complete
    ?"Every numbered chapter from 1 through finalChapter was fetched and archived."
    :"Archive is preserved but incomplete; failed chapters are explicitly listed and must not be silently skipped."
};
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n");
saveGlobalReport(slug,report);
console.log(JSON.stringify({slug,complete,finalChapter,successes,errors:errors.length,totalBytes},null,2));
if(!complete) process.exitCode=1;
