// Shared, dependency-free reader logic used by BOTH the Cloudflare Worker (src/index.js)
// and the build script (scripts/build-novel-data.mjs).
// Ported verbatim from reader-server.js (the Render service) so output stays identical;
// reader-server.js is intentionally left untouched as the rollback path.

export function romanToInt(s=""){
  const vals={I:1,V:5,X:10,L:50,C:100,D:500,M:1000}; let total=0,prev=0;
  for(const ch of String(s).toUpperCase().replace(/[^IVXLCDM]/g,"").split("").reverse()){
    const v=vals[ch]||0; total+=v<prev?-v:v; if(v>prev)prev=v;
  }
  return total;
}
export function chineseChapterNumber(s=""){
  const chars=String(s).replace(/\s+/g,"");
  const digits={"〇":0,"○":0,"零":0,"一":1,"二":2,"兩":2,"两":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9};
  if(!/[十百千]/.test(chars)){
    const out=[...chars].map(c=>digits[c]).filter(v=>v!==undefined).join("");
    return out?Number(out):0;
  }
  let total=0,num=0;
  for(const c of chars){
    if(digits[c]!==undefined){num=digits[c];continue;}
    const unit=c==="十"?10:c==="百"?100:c==="千"?1000:0;
    if(unit){total+=(num||1)*unit;num=0;}
  }
  return total+num;
}
export function gutenbergBody(text){
  const start=text.indexOf("*** START OF THE PROJECT GUTENBERG EBOOK");
  const end=text.indexOf("*** END OF THE PROJECT GUTENBERG EBOOK");
  return text.slice(start>=0?start:0,end>0?end:text.length);
}
export function paragraphsFromRaw(raw){
  let parts=String(raw||"").trim().split(/\n\s*\n+/).map(x=>x.replace(/\n+/g," ").replace(/[ \t　]+/g," ").trim()).filter(Boolean);
  if(parts.length<2){
    parts=String(raw||"").split(/\n+/).map(x=>x.replace(/[ \t　]+/g," ").trim()).filter(x=>x.length>0);
  }
  return parts;
}
export function splitGutenbergRomanChapters(text){
  const body=gutenbergBody(text);
  const re=/^CHAPTER\s+([IVXLCDM]+)\.\s*$/gmi;
  const marks=[]; let m;
  while((m=re.exec(body)))marks.push({num:romanToInt(m[1]),start:m.index,contentStart:re.lastIndex,title:"Chapter "+romanToInt(m[1])});
  const out=new Map();
  for(let i=0;i<marks.length;i++){
    const cur=marks[i],next=marks[i+1];
    const raw=body.slice(cur.contentStart,next?next.start:body.length).trim();
    const paragraphs=paragraphsFromRaw(raw);
    const prev=out.get(cur.num);
    if(!prev || paragraphs.join(" ").length>prev.paragraphs.join(" ").length) out.set(cur.num,{title:cur.title,paragraphs});
  }
  return out;
}
export function splitGutenbergChineseChapters(text,maxChapter=999){
  const body=gutenbergBody(text);
  const re=/^\s*第([〇○零一二兩两三四五六七八九十百千]+)回[：:\s　]*(.*)$/gmi;
  const marks=[]; let m;
  while((m=re.exec(body))){
    const num=chineseChapterNumber(m[1]);
    if(num<1||num>maxChapter)continue;
    const heading=String(m[2]||"").replace(/[ \t　]+/g," ").trim();
    marks.push({num,start:m.index,contentStart:re.lastIndex,title:"Chapter "+num+(heading?" — "+heading.slice(0,180):"")});
  }
  const out=new Map();
  for(let i=0;i<marks.length;i++){
    const cur=marks[i],next=marks[i+1];
    const raw=body.slice(cur.contentStart,next?next.start:body.length).trim();
    const paragraphs=paragraphsFromRaw(raw);
    const size=paragraphs.join(" ").length;
    if(size<40)continue;
    const prev=out.get(cur.num);
    if(!prev || size>prev._size) out.set(cur.num,{title:cur.title,paragraphs,_size:size});
  }
  for(const [n,ch] of out)delete ch._size;
  return out;
}

export function decodeHtml(s="") {
  return String(s)
    .replace(/&nbsp;/g," ")
    .replace(/&amp;/g,"&")
    .replace(/&#8211;|&#8212;|&ndash;|&mdash;/g,"-")
    .replace(/&#8217;|&rsquo;/g,"'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g,'"')
    .replace(/&#\d+;/g," ");
}
export function stripTags(html="") {
  return decodeHtml(String(html).replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ")).trim();
}
export function extractLinks(html="") {
  const out=[]; const re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi; let m;
  while((m=re.exec(html))) out.push({url:decodeHtml(m[1]),text:stripTags(m[2])});
  return out;
}
export function chapterRange(s="") {
  const x=decodeHtml(s).replace(/,/g," ");
  const nums=[...x.matchAll(/(?:chapter|chapters|ch\.?|chapter-of)?[^0-9]{0,18}(\d{1,5})(?:\s*(?:-|–|—|to)\s*(\d{1,5}))?/gi)]
    .map(m=>[Number(m[1]), Number(m[2]||m[1])]).filter(([a,b])=>a>0&&b>=a&&b-a<10000);
  if(!nums.length) {
    const slug=x.match(/chapter(?:-of)?-(\d{1,5})(?:-(\d{1,5}))?/i);
    if(slug) return [Number(slug[1]),Number(slug[2]||slug[1])];
    return null;
  }
  return nums.sort((a,b)=>b[1]-a[1])[0];
}
export function safeUrl(u="") {
  try {
    const x = new URL(u);
    if (!/^(?:www\.)?(?:xperimentalhamid\.com|tales\.xperimentalhamid\.com)$/i.test(x.hostname)) return null;
    return x.toString();
  } catch { return null; }
}
export function cleanText(s="") {
  return stripTags(String(s)
    .replace(/<br\s*\/?\s*>/gi,"\n")
    .replace(/<\/p>/gi,"\n")
    .replace(/<\/h[1-6]>/gi,"\n"));
}
export function normalizeXhTitle(t="") {
  return stripTags(t).toLowerCase()
    .replace(/\bcomplete\b/g," ")
    .replace(/\bchapters?\b/g," ")
    .replace(/\blinks?\b/g," ")
    .replace(/\bnovel\b/g," ")
    .replace(/\bread\b/g," ")
    .replace(/\bonline\b/g," ")
    .replace(/\bfree\b/g," ")
    .replace(/\bfull\b/g," ")
    .replace(/\bchines(?:e)?\b/g," ")
    .replace(/\bnew\b/g," ")
    .replace(/\bfrom\s+\d+\s+to\s+\d+\b/g," ")
    .replace(/[:\-–—]+/g," ")
    .replace(/\s+/g," ").trim();
}
export function buildCoverage(ranges, finalChapter) {
  const covered = new Uint8Array(finalChapter + 1);
  for (const r of ranges) {
    const a=Math.max(1,r.start), b=Math.min(finalChapter,r.end);
    for(let n=a;n<=b;n++) covered[n]=1;
  }
  const gaps=[]; let start=null;
  for(let n=1;n<=finalChapter;n++){
    if(!covered[n] && start===null) start=n;
    if(covered[n] && start!==null){gaps.push([start,n-1]);start=null;}
  }
  if(start!==null) gaps.push([start,finalChapter]);
  return gaps;
}
export function extractArticleBlocks(html) {
  const article=(String(html).match(/<article\b[\s\S]*?<\/article>/i)||String(html).match(/<main\b[\s\S]*?<\/main>/i)||[String(html)])[0];
  const stripped=article
    .replace(/<script\b[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[\s\S]*?<\/style>/gi," ")
    .replace(/<form\b[\s\S]*?<\/form>/gi," ")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi," ");
  const blocks=[]; const re=/<(h[1-6]|p)\b[^>]*>([\s\S]*?)<\/\1>/gi; let m;
  while((m=re.exec(stripped))){
    const type=m[1].toLowerCase();
    const text=cleanText(m[2]).replace(/\s+/g," ").trim();
    if(text) blocks.push({type,text});
  }
  return blocks;
}
export function splitChapterPage(html, wanted, group) {
  const blocks=extractArticleBlocks(html);
  const sections=new Map(); let current=null;
  for(const b of blocks){
    const hm=b.text.match(/^Chapter\s+0*(\d{1,5})\b/i);
    if(/^h[1-6]$/.test(b.type) && hm){
      current=Number(hm[1]);
      if(!sections.has(current)) sections.set(current,[]);
      continue;
    }
    if(current!==null){
      if(/^Subscribe for more update|^Next Chapters?$|^Read Free Novels$|^Table of Content$/i.test(b.text)) continue;
      if(/^\d+ thoughts? on /i.test(b.text)) continue;
      sections.get(current).push(b.text);
    }
  }
  if(sections.has(wanted)){
    return {paragraphs:sections.get(wanted), detected:[...sections.keys()].sort((a,b)=>a-b)};
  }
  if(group.start===group.end){
    const fallback=blocks.map(b=>b.text).filter(t=>
      !/^Read\s+Chapter/i.test(t) &&
      !/^Subscribe for more update/i.test(t) &&
      !/^Next Chapters?$/i.test(t) &&
      !/^Read Free Novels$/i.test(t) &&
      !/^Intro$/i.test(t) &&
      !/^Table of Content$/i.test(t) &&
      !/thoughts? on/i.test(t)
    );
    return {paragraphs:fallback, detected:[...sections.keys()].sort((a,b)=>a-b)};
  }
  return {paragraphs:[],detected:[...sections.keys()].sort((a,b)=>a-b)};
}
