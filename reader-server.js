const http = require("http");

const BOOKS = {
  "9603": {
    title: "Hung Lou Meng, or, The Dream of the Red Chamber — Book I",
    author: "Cao Xueqin",
    translator: "H. Bencraft Joly",
    source: "https://www.gutenberg.org/cache/epub/9603/pg9603.txt"
  },
  "9604": {
    title: "Hung Lou Meng, or, The Dream of the Red Chamber — Book II",
    author: "Cao Xueqin",
    translator: "H. Bencraft Joly",
    source: "https://www.gutenberg.org/cache/epub/9604/pg9604.txt"
  },
  "43627": {
    title: "Strange Stories from a Chinese Studio — Vol. 1",
    author: "Pu Songling",
    translator: "Herbert A. Giles",
    source: "https://www.gutenberg.org/cache/epub/43627/pg43627.txt"
  },
  "43628": {
    title: "Strange Stories from a Chinese Studio — Vol. 2",
    author: "Pu Songling",
    translator: "Herbert A. Giles",
    source: "https://www.gutenberg.org/cache/epub/43628/pg43628.txt"
  },
  "43629": {
    title: "Strange Stories from a Chinese Studio — Volumes 1 & 2",
    author: "Pu Songling",
    translator: "Herbert A. Giles",
    source: "https://www.gutenberg.org/cache/epub/43629/pg43629.txt"
  },
  "77416": {
    title: "San Kuo; or, Romance of the Three Kingdoms — Vol. 1",
    author: "Luo Guanzhong",
    translator: "C. H. Brewitt-Taylor",
    source: "https://www.gutenberg.org/cache/epub/77416/pg77416.txt"
  },
  "12086": {
    title: "Eastern Shame Girl",
    author: "Traditional Chinese stories",
    translator: "G. Soulié de Morant",
    source: "https://www.gutenberg.org/cache/epub/12086/pg12086.txt"
  },
  "37766": {
    title: "Strange Stories from the Lodge of Leisures",
    author: "Pu Songling",
    translator: "G. Soulié de Morant",
    source: "https://www.gutenberg.org/cache/epub/37766/pg37766.txt"
  },
  "29939": {
    title: "The Chinese Fairy Book",
    author: "Traditional Chinese stories",
    translator: "Frederick H. Martens",
    source: "https://www.gutenberg.org/cache/epub/29939/pg29939.txt"
  }
};



const GUTENBERG_SERIALS = {
  "journey-to-the-west-zh": {
    title: "Journey to the West — Complete Chinese Edition",
    author: "Wu Cheng'en",
    finalChapter: 100,
    language: "zh-CN",
    genres: ["Chinese Classic","Cultivation","Mythology","Adventure","Supernatural"],
    summary: "The complete 100-chapter Chinese classic following Sun Wukong, Xuanzang and their supernatural pilgrimage to obtain Buddhist scriptures.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"23962",url:"https://www.gutenberg.org/cache/epub/23962/pg23962.txt",from:1,to:100,mode:"chinese"}]
  },
  "romance-three-kingdoms-zh": {
    title: "Romance of the Three Kingdoms — Complete Chinese Edition",
    author: "Luo Guanzhong",
    finalChapter: 120,
    language: "zh-CN",
    genres: ["Chinese Classic","War","Strategy","Power","Revenge"],
    summary: "The complete 120-chapter Chinese epic of warlords, sworn brothers, betrayal, strategy and the struggle to rule a fractured empire.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"23950",url:"https://www.gutenberg.org/cache/epub/23950/pg23950.txt",from:1,to:120,mode:"chinese"}]
  },
  "water-margin-zh": {
    title: "Water Margin — Complete 70-Chapter Chinese Edition",
    author: "Shi Nai'an",
    finalChapter: 70,
    language: "zh-CN",
    genres: ["Chinese Classic","Outlaws","Martial Arts","Rebellion","Brotherhood"],
    summary: "A complete 70-chapter Chinese edition of the classic story of outlaws who gather at Mount Liang against corrupt authority.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"23863",url:"https://www.gutenberg.org/cache/epub/23863/pg23863.txt",from:1,to:70,mode:"chinese"}]
  },
  "dream-red-chamber-zh": {
    title: "Dream of the Red Chamber — Complete Chinese Edition",
    author: "Cao Xueqin",
    finalChapter: 120,
    language: "zh-CN",
    genres: ["Chinese Classic","Family","Romance","Supernatural","Drama"],
    summary: "The complete 120-chapter Chinese edition chronicling the rise and decline of an aristocratic family through love, dreams and spiritual symbolism.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"24264",url:"https://www.gutenberg.org/cache/epub/24264/pg24264.txt",from:1,to:120,mode:"chinese"}]
  },
  "flowers-in-the-mirror-zh": {
    title: "Flowers in the Mirror — Complete Chinese Edition",
    author: "Li Ruzhen",
    finalChapter: 100,
    language: "zh-CN",
    genres: ["Chinese Classic","Fantasy","Adventure","Mythology","Satire"],
    summary: "A complete 100-chapter Chinese fantasy about banished flower spirits, strange kingdoms, adventure and social satire.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"25377",url:"https://www.gutenberg.org/cache/epub/25377/pg25377.txt",from:1,to:100,mode:"chinese"}]
  },
  "three-heroes-five-gallants-zh": {
    title: "Three Heroes and Five Gallants — Complete Chinese Edition",
    author: "Shi Yukun",
    finalChapter: 120,
    language: "zh-CN",
    genres: ["Chinese Classic","Wuxia","Justice","Martial Arts","Mystery"],
    summary: "A complete 120-chapter Chinese侠义 classic of martial heroes, intrigue, loyalty and Judge Bao's pursuit of justice.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"25376",url:"https://www.gutenberg.org/cache/epub/25376/pg25376.txt",from:1,to:120,mode:"chinese"}]
  },
  "sui-tang-romance-zh": {
    title: "Romance of Sui and Tang Dynasties — Complete Chinese Edition",
    author: "Chu Renhu",
    finalChapter: 100,
    language: "zh-CN",
    genres: ["Chinese Classic","War","Strategy","Dynasty","Adventure"],
    summary: "A complete 100-chapter historical epic of the fall of Sui, the rise of Tang, rebellion, court intrigue and battlefield ambition.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"23835",url:"https://www.gutenberg.org/cache/epub/23835/pg23835.txt",from:1,to:100,mode:"chinese"}]
  },
  "han-xiangzi-zh": {
    title: "The Story of Han Xiangzi — Complete Chinese Edition",
    author: "Yang Erzeng",
    finalChapter: 30,
    language: "zh-CN",
    genres: ["Chinese Classic","Cultivation","Daoism","Immortals","Supernatural"],
    summary: "A complete 30-chapter Daoist fantasy about Han Xiangzi's spiritual cultivation, immortals and the tension between worldly duty and transcendence.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"24231",url:"https://www.gutenberg.org/cache/epub/24231/pg24231.txt",from:1,to:30,mode:"chinese"}]
  },
  "heroic-sons-daughters-zh": {
    title: "The Tale of Heroic Sons and Daughters — Complete Chinese Edition",
    author: "Wenkang",
    finalChapter: 40,
    language: "zh-CN",
    genres: ["Chinese Classic","Wuxia","Romance","Adventure","Justice"],
    summary: "A complete 40-chapter Qing novel combining martial heroism, romance, family duty and adventure.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"25327",url:"https://www.gutenberg.org/cache/epub/25327/pg25327.txt",from:1,to:40,mode:"chinese"}]
  },
  "travels-lao-can-zh": {
    title: "The Travels of Lao Can — Complete Chinese Edition",
    author: "Liu E",
    finalChapter: 20,
    language: "zh-CN",
    genres: ["Chinese Classic","Mystery","Satire","Travel","Justice"],
    summary: "A complete 20-chapter late-Qing novel following a wandering physician through injustice, investigation, social decay and reform.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"23850",url:"https://www.gutenberg.org/cache/epub/23850/pg23850.txt",from:1,to:20,mode:"chinese"}]
  }
};

const gutenbergTextCache = new Map();
function romanToInt(s=""){
  const vals={I:1,V:5,X:10,L:50,C:100,D:500,M:1000}; let total=0,prev=0;
  for(const ch of String(s).toUpperCase().replace(/[^IVXLCDM]/g,"").split("").reverse()){
    const v=vals[ch]||0; total+=v<prev?-v:v; if(v>prev)prev=v;
  }
  return total;
}
function chineseChapterNumber(s=""){
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
async function fetchGutenbergText(url){
  const cached=gutenbergTextCache.get(url);
  if(cached && Date.now()-cached.at<6*60*60*1000)return cached.text;
  const r=await fetch(url,{headers:{"user-agent":"XenderSecretsReader/3.2 (+https://xendersecrets.com)","accept":"text/plain"}});
  if(!r.ok)throw new Error("Project Gutenberg upstream "+r.status);
  const text=await r.text();
  gutenbergTextCache.set(url,{at:Date.now(),text});
  if(gutenbergTextCache.size>12){const first=gutenbergTextCache.keys().next().value;gutenbergTextCache.delete(first);}
  return text;
}
function gutenbergBody(text){
  const start=text.indexOf("*** START OF THE PROJECT GUTENBERG EBOOK");
  const end=text.indexOf("*** END OF THE PROJECT GUTENBERG EBOOK");
  return text.slice(start>=0?start:0,end>0?end:text.length);
}
function paragraphsFromRaw(raw){
  let parts=String(raw||"").trim().split(/\n\s*\n+/).map(x=>x.replace(/\n+/g," ").replace(/[ \t　]+/g," ").trim()).filter(Boolean);
  if(parts.length<2){
    parts=String(raw||"").split(/\n+/).map(x=>x.replace(/[ \t　]+/g," ").trim()).filter(x=>x.length>0);
  }
  return parts;
}
function splitGutenbergRomanChapters(text){
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
function splitGutenbergChineseChapters(text,maxChapter=999){
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
async function getGutenbergSerialChapter(slug,chapter){
  const novel=GUTENBERG_SERIALS[slug];
  if(!novel)throw new Error("Novel not found");
  if(!Number.isInteger(chapter)||chapter<1||chapter>novel.finalChapter)throw new Error("Chapter out of range");
  const src=novel.sources.find(x=>chapter>=x.from&&chapter<=x.to);
  if(!src)throw new Error("Source mapping missing");
  const text=await fetchGutenbergText(src.url);
  const map=src.mode==="chinese"?splitGutenbergChineseChapters(text,novel.finalChapter):splitGutenbergRomanChapters(text);
  const ch=map.get(chapter);
  if(!ch||!ch.paragraphs.length)throw new Error("Chapter "+chapter+" could not be isolated");
  return {ok:true,slug,title:novel.title,chapter,finalChapter:novel.finalChapter,chapterTitle:ch.title,paragraphs:ch.paragraphs,language:novel.language||"en",sourceSite:"Project Gutenberg",sourceUrl:"https://www.gutenberg.org/ebooks/"+src.bookId,attribution:"Public-domain edition sourced from Project Gutenberg."};
}

const XH_SITES = ["https://xperimentalhamid.com", "https://tales.xperimentalhamid.com"];

function decodeHtml(s="") {
  return String(s)
    .replace(/&nbsp;/g," ")
    .replace(/&amp;/g,"&")
    .replace(/&#8211;|&#8212;|&ndash;|&mdash;/g,"-")
    .replace(/&#8217;|&rsquo;/g,"'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g,'"')
    .replace(/&#\d+;/g," ");
}
function stripTags(html="") {
  return decodeHtml(String(html).replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ")).trim();
}
function extractLinks(html="") {
  const out=[]; const re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi; let m;
  while((m=re.exec(html))) out.push({url:decodeHtml(m[1]),text:stripTags(m[2])});
  return out;
}
function chapterRange(s="") {
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
function completionSignals(title,text) {
  const t=(title+" "+text).toLowerCase();
  const negative=[
    /update(?:d)? gradually/,
    /when new chapters are published/,
    /regularly update the latest chapters/,
    /latest chapters written by the author/,
    /latest written chapters/,
    /stay tuned.{0,80}(?:new|more) chapters/,
    /more chapters please/,
    /updates? (?:are )?suspended/,
    /ongoing/
  ];
  const positive=[
    /complete novel/,
    /complete story/,
    /full novel/,
    /completed/,
    /the end of /
  ];
  const neg=negative.filter(r=>r.test(t)).map(r=>r.source);
  const pos=positive.filter(r=>r.test(t)).map(r=>r.source);
  return {positive:pos,negative:neg,likelyComplete:pos.length>0&&neg.length===0};
}
async function fetchJson(url) {
  const r=await fetch(url,{headers:{"user-agent":"XenderSecretsCatalog/1.0 (+https://xendersecrets.com)","accept":"application/json"}});
  if(!r.ok) throw new Error("HTTP "+r.status+" "+url);
  return r.json();
}
async function pool(items,limit,fn) {
  const out=new Array(items.length); let i=0;
  async function worker(){while(true){const j=i++; if(j>=items.length)return; try{out[j]=await fn(items[j],j);}catch(e){out[j]={error:String(e),item:items[j]};}}}
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker)); return out;
}
async function scanXH(minChapter=1000) {
  const terms=["complete chapters","complete links","complete novel","full novel"];
  const searchRows=[];
  for(const site of XH_SITES){
    for(const term of terms){
      for(let page=1;page<=3;page++){
        try{
          const arr=await fetchJson(site+"/wp-json/wp/v2/search?search="+encodeURIComponent(term)+"&per_page=100&page="+page);
          if(!Array.isArray(arr)||!arr.length) break;
          for(const x of arr) searchRows.push({...x,site});
          if(arr.length<100) break;
        }catch(e){break;}
      }
    }
  }
  const unique=[];
  const seen=new Set();
  for(const x of searchRows){
    if(!x?.url||seen.has(x.url))continue;
    seen.add(x.url);
    const ttl=stripTags(x.title||"");
    if(/\bchapter\s*(?:of\s*)?\d+/i.test(ttl)) continue;
    if(!/(novel|chapters?|links?|story)/i.test(ttl+" "+x.url)) continue;
    unique.push(x);
  }
  const rows=await pool(unique,6,async x=>{
    const post=await fetchJson(x.site+"/wp-json/wp/v2/posts/"+x.id);
    const title=stripTags(post?.title?.rendered||x.title||"");
    const html=post?.content?.rendered||"";
    const body=stripTags(html);
    const links=extractLinks(html).filter(a=>/chapter/i.test(a.url+" "+a.text) && !/#comment-|\/comments?\//i.test(a.url));
    const ranges=[];
    for(const a of links){
      const r=chapterRange(a.text+" "+a.url);
      if(r) ranges.push({start:r[0],end:r[1],url:a.url,text:a.text});
    }
    let maxChapter=0,minSeen=Infinity;
    for(const r of ranges){maxChapter=Math.max(maxChapter,r.end);minSeen=Math.min(minSeen,r.start);}
    const sig=completionSignals(title,body);
    const sourceDomain=new URL(x.url).hostname;
    return {title,url:x.url,sourceDomain,maxChapter,minChapterSeen:Number.isFinite(minSeen)?minSeen:null,chapterLinkGroups:ranges.length,signals:sig};
  });
  return rows.filter(x=>!x.error&&x.maxChapter>=minChapter).sort((a,b)=>b.maxChapter-a.maxChapter);
}


const XH_COMPLETED = {
  "billionaire-god-of-war": {
    title: "Billionaire God of War",
    sourceSite: "XperimentalHamid",
    indexUrl: "https://xperimentalhamid.com/news/billionaire-god-of-war-novel-complete-links-new/",
    finalChapter: 2495,
    genres: ["Urban", "War God", "Hidden Power", "Romance"],
    summary: "A long translated urban power fantasy with revenge, hidden strength, family conflict and war-god escalation.",
    verifiedEnding: "Chapter 2495 contains THE END.",
    supplementalRanges: [
      {start:427,end:428,url:"https://xperimentalhamid.com/novels/billionaire-god-of-war-novel-chapter-427-428-new/",postId:9971},
      {start:593,end:594,url:"https://xperimentalhamid.com/novels/billionaire-god-of-war-novel-chapter-593-594-new/",postId:10523},
      {start:621,end:622,url:"https://xperimentalhamid.com/novels/billionaire-god-of-war-novel-chapter-621-622-new/",postId:10568},
      {start:675,end:676,url:"https://xperimentalhamid.com/novels/billionaire-god-of-war-novel-chapter-675-677-new/",postId:10849},
      {start:1001,end:1002,url:"https://xperimentalhamid.com/novels/billionaire-god-of-war-novel-chapter-1002-1003-new/",postId:12461},
      {start:1033,end:1034,url:"https://xperimentalhamid.com/novels/billionaire-god-of-war-novel-chapter-1033-1034-new/",postId:12477},
      {start:1795,end:1796,url:"https://xperimentalhamid.com/novels/billionaire-god-of-war-novel-chapter-1795-1796-new/",postId:16140},
      {start:1997,end:1998,url:"https://xperimentalhamid.com/novels/billionaire-god-of-war-novel-chapter-1998-1999-new/",postId:16884}
    ]
  },
  "my-husband-warm-the-bed": {
    title: "My Husband Warm The Bed",
    sourceSite: "XperimentalHamid",
    indexUrl: "https://xperimentalhamid.com/news/top/my-husband-warm-the-bed-novel-links-new/",
    finalChapter: 1985,
    genres: ["Urban Romance", "Marriage", "CEO", "Family"],
    summary: "A very long translated marriage and family romance built around Kevin/Karen and later generations.",
    verifiedEnding: "XH source states the novel ends at chapter 1985.",
    supplementalRanges: [
      {start:455,end:469,url:"https://xperimentalhamid.com/novels/my-husband-warm-the-bed-chapter-455-469-free-reading-online-new/",postId:3280}
    ]
  },
  "take-my-breath-away": {
    title: "Take My Breath Away",
    sourceSite: "XperimentalHamid",
    indexUrl: "https://xperimentalhamid.com/novels/take-my-breath-away-complete-chapters-new/",
    finalChapter: 1476,
    genres: ["Urban Romance", "Marriage", "CEO", "Drama"],
    summary: "A completed translated romance following a broken marriage, reunion, family growth and long-form relationship drama.",
    verifiedEnding: "Chapter 1476 contains THE END.",
    supplementalRanges: [
      {start:46,end:50,url:"https://xperimentalhamid.com/novels/chapter-50-51-of-take-my-breath-away-novel-free-online-new/",postId:11158},
      {start:1296,end:1300,url:"https://xperimentalhamid.com/novels/chapter-1296-1-300-of-take-my-breath-away-novel-free-online-new/",postId:14906},
      {start:1396,end:1400,url:"https://xperimentalhamid.com/novels/chapter-1396-1400-of-take-my-breath-away-novel-free-online-new/",postId:15214}
    ]
  }
};

const xhIndexCache = new Map();
const xhPageCache = new Map();
let xhCatalogCache = {at:0, rows:null};

function safeUrl(u="") {
  try {
    const x = new URL(u);
    if (!/^(?:www\.)?(?:xperimentalhamid\.com|tales\.xperimentalhamid\.com)$/i.test(x.hostname)) return null;
    return x.toString();
  } catch { return null; }
}
async function fetchHtml(url) {
  const r = await fetch(url, {redirect:"follow", headers:{
    "user-agent":"XenderSecretsReader/2.0 (+https://xendersecrets.com)",
    "accept":"text/html,application/xhtml+xml"
  }});
  if (!r.ok) throw new Error("Upstream "+r.status+" for "+url);
  return {html:await r.text(), finalUrl:r.url};
}
function cleanText(s="") {
  return stripTags(String(s)
    .replace(/<br\s*\/?\s*>/gi,"\n")
    .replace(/<\/p>/gi,"\n")
    .replace(/<\/h[1-6]>/gi,"\n"));
}
function normalizeXhTitle(t="") {
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
function buildCoverage(ranges, finalChapter) {
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
async function getXhIndex(slug) {
  const novel=XH_COMPLETED[slug];
  if(!novel) throw new Error("Unknown completed novel");
  const cached=xhIndexCache.get(slug);
  if(cached && Date.now()-cached.at < 60*60*1000) return cached.data;
  const {html,finalUrl}=await fetchHtml(novel.indexUrl);
  const raw=extractLinks(html)
    .filter(a=>/chapter/i.test((a.text||"")+" "+(a.url||"")))
    .filter(a=>!/#comment-|\/comments?\//i.test(a.url||""));
  const byRange=new Map();
  for(const a of raw){
    const u=safeUrl(a.url); if(!u) continue;
    const cr=chapterRange((a.text||"")+" "+u); if(!cr) continue;
    let [start,end]=cr;
    if(start<1 || start>novel.finalChapter || end<start) continue;
    end=Math.min(end,novel.finalChapter);
    const key=start+"-"+end;
    if(!byRange.has(key)) byRange.set(key,{start,end,url:u,label:a.text||("Chapter "+start+(end>start?"-"+end:""))});
  }
  for(const x of (novel.supplementalRanges||[])){
    const u=safeUrl(x.url); if(!u) continue;
    const start=Math.max(1,Number(x.start)||0), end=Math.min(novel.finalChapter,Number(x.end)||0);
    if(start>0 && end>=start) byRange.set(start+"-"+end,{start,end,url:u,label:"Recovered source range "+start+"-"+end,postId:x.postId||null});
  }
  const ranges=[...byRange.values()].sort((a,b)=>a.start-b.start||a.end-b.end);
  const gaps=buildCoverage(ranges,novel.finalChapter);
  const data={slug,...novel,indexUrl:finalUrl||novel.indexUrl,ranges,gaps,rangeCount:ranges.length};
  xhIndexCache.set(slug,{at:Date.now(),data});
  return data;
}

async function fetchWpPost(postId, site="https://xperimentalhamid.com") {
  const id=Number(postId);
  if(!Number.isInteger(id)||id<1) throw new Error("Invalid WordPress post id");
  const post=await fetchJson(site+"/wp-json/wp/v2/posts/"+id);
  const html=post?.content?.rendered||"";
  if(!html) throw new Error("WordPress post "+id+" has no rendered content");
  return {html,finalUrl:post?.link||site+"/?p="+id,postId:id};
}
function novelSearchTokens(title="") {
  return String(title).toLowerCase().replace(/[^a-z0-9 ]+/g," ").split(/\s+/)
    .filter(x=>x.length>=3 && !["the","and","novel","chapter","online","free"].includes(x));
}
function resultMatchesNovel(resultTitle, novelTitle) {
  const t=String(resultTitle||"").toLowerCase();
  const tokens=novelSearchTokens(novelTitle);
  if(!tokens.length) return false;
  const hit=tokens.filter(x=>t.includes(x)).length;
  return hit>=Math.max(2,Math.ceil(tokens.length*0.65));
}
async function findWpChapterPost(novel, chapter) {
  const site=(new URL(novel.indexUrl)).origin;
  const queries=[
    novel.title+" "+chapter,
    "Chapter "+chapter+" "+novel.title
  ];
  for(const q of queries){
    let rows=[];
    try{
      rows=await fetchJson(site+"/wp-json/wp/v2/search?search="+encodeURIComponent(q)+"&per_page=20&page=1");
    }catch{continue;}
    for(const x of (Array.isArray(rows)?rows:[])){
      const title=stripTags(x.title||"");
      if(!resultMatchesNovel(title,novel.title)) continue;
      const cr=chapterRange(title+" "+(x.url||""));
      if(!cr || chapter<cr[0] || chapter>cr[1]) continue;
      return {postId:Number(x.id),start:cr[0],end:cr[1],url:safeUrl(x.url)||x.url,title};
    }
  }
  return null;
}
async function loadChapterGroupHtml(novel, group, chapter) {
  const site=(new URL(novel.indexUrl)).origin;
  if(group.postId){
    try{return await fetchWpPost(group.postId,site);}catch{}
  }
  try{
    const page=await fetchHtml(group.url);
    const parsed=splitChapterPage(page.html,chapter,group);
    if(parsed.paragraphs.length) return {...page,preParsed:parsed};
  }catch{}
  const found=await findWpChapterPost(novel,chapter);
  if(found){
    const page=await fetchWpPost(found.postId,site);
    return {...page,resolvedGroup:{...found}};
  }
  throw new Error("No usable source post found for chapter "+chapter);
}

function extractArticleBlocks(html) {
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
function splitChapterPage(html, wanted, group) {
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
async function getXhChapter(slug, chapter) {
  const idx=await getXhIndex(slug);
  if(!Number.isInteger(chapter)||chapter<1||chapter>idx.finalChapter) throw new Error("Chapter out of range");
  let group=idx.ranges.find(r=>chapter>=r.start&&chapter<=r.end);
  if(!group){
    const found=await findWpChapterPost(idx,chapter);
    if(!found) throw new Error("Chapter "+chapter+" is missing from source index");
    group={...found,label:found.title};
  }
  const cacheKey=group.postId ? "wp:"+group.postId : group.url;
  let page=xhPageCache.get(cacheKey);
  if(!page || Date.now()-page.at>60*60*1000){
    const loaded=await loadChapterGroupHtml(idx,group,chapter);
    page={at:Date.now(),html:loaded.html,finalUrl:loaded.finalUrl,preParsed:loaded.preParsed||null,resolvedGroup:loaded.resolvedGroup||null};
    xhPageCache.set(cacheKey,page);
    if(xhPageCache.size>160){
      const first=xhPageCache.keys().next().value;
      xhPageCache.delete(first);
    }
  }
  const effectiveGroup=page.resolvedGroup ? {...group,...page.resolvedGroup} : group;
  let parsed=page.preParsed && page.preParsed.paragraphs?.length ? page.preParsed : splitChapterPage(page.html,chapter,effectiveGroup);
  if(!parsed.paragraphs.length){
    const found=await findWpChapterPost(idx,chapter);
    if(found && found.postId!==effectiveGroup.postId){
      const wp=await fetchWpPost(found.postId,(new URL(idx.indexUrl)).origin);
      parsed=splitChapterPage(wp.html,chapter,found);
      if(parsed.paragraphs.length) page={...page,html:wp.html,finalUrl:wp.finalUrl};
    }
  }
  if(!parsed.paragraphs.length) throw new Error("Could not isolate chapter "+chapter+" from source post");
  const paragraphs=parsed.paragraphs
    .map(x=>String(x).replace(/\s+/g," ").trim())
    .filter(x=>x && !/^Read Chapter\b/i.test(x) && !/^Join Our official Youtube Channel$/i.test(x));
  if(!paragraphs.length) throw new Error("Chapter "+chapter+" contained no readable prose");
  return {
    ok:true, slug, title:idx.title, chapter, finalChapter:idx.finalChapter,
    chapterTitle:"Chapter "+chapter,
    paragraphs,
    sourceSite:idx.sourceSite,
    sourceUrl:page.finalUrl||group.url,
    attribution:"Republished on Xender with permission from XperimentalHamid.",
    gaps:idx.gaps
  };
}
async function verifyCandidateEnding(row) {
  try {
    const {html}=await fetchHtml(row.url);
    const links=extractLinks(html)
      .filter(a=>/chapter/i.test((a.text||"")+" "+(a.url||"")))
      .filter(a=>!/#comment-|\/comments?\//i.test(a.url||""));
    const groups=[];
    for(const a of links){
      const u=safeUrl(a.url); if(!u) continue;
      const cr=chapterRange((a.text||"")+" "+u); if(!cr) continue;
      groups.push({start:cr[0],end:cr[1],url:u});
    }
    groups.sort((a,b)=>a.end-b.end);
    if(!groups.length) return null;
    const finalGroup=groups[groups.length-1];
    const finalPage=await fetchHtml(finalGroup.url);
    const finalText=stripTags(finalPage.html);
    const ended=/\bTHE END\b|novel ends here|this is end of the novel|end of the novel/i.test(finalText);
    const max=finalGroup.end;
    const gaps=buildCoverage(groups,max);
    return ended && max>=1000 && gaps.length===0 ? {max,gaps,ended} : null;
  } catch { return null; }
}

function cors(res, status=200, type="application/json; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "cache-control": "public, max-age=3600",
    "x-content-type-options": "nosniff"
  });
}

const server = http.createServer(async (req,res) => {
  if (req.method === "OPTIONS") { cors(res,204); return res.end(); }
  const url = new URL(req.url, "http://localhost");



  if (url.pathname === "/gutenberg/catalog") {
    const items=Object.entries(GUTENBERG_SERIALS).map(([slug,n])=>({slug,title:n.title,author:n.author,translator:n.translator,finalChapter:n.finalChapter,genres:n.genres,summary:n.summary,language:n.language||"en",sourceSite:n.sourceSite,indexStatus:{gaps:[]}}));
    cors(res,200);
    return res.end(JSON.stringify({ok:true,completedOnly:true,items}));
  }

  if (url.pathname === "/gutenberg/novel") {
    try{
      const slug=url.searchParams.get("slug")||"",n=GUTENBERG_SERIALS[slug];
      if(!n)throw new Error("Novel not found");
      cors(res,200);
      return res.end(JSON.stringify({ok:true,slug,title:n.title,author:n.author,translator:n.translator,finalChapter:n.finalChapter,genres:n.genres,summary:n.summary,language:n.language||"en",gaps:[],sourceSite:n.sourceSite}));
    }catch(e){cors(res,404);return res.end(JSON.stringify({ok:false,error:String(e)}));}
  }

  if (url.pathname === "/gutenberg/chapter") {
    try{
      const slug=url.searchParams.get("slug")||"",chapter=Number(url.searchParams.get("n")||"1");
      const data=await getGutenbergSerialChapter(slug,chapter);
      cors(res,200);
      return res.end(JSON.stringify(data));
    }catch(e){cors(res,502);return res.end(JSON.stringify({ok:false,error:String(e)}));}
  }

  if (url.pathname === "/xh/catalog") {
    try {
      const items=[];
      for(const [slug,n] of Object.entries(XH_COMPLETED)){
        let indexStatus=null;
        try{
          const ix=await getXhIndex(slug);
          indexStatus={rangeCount:ix.rangeCount,gaps:ix.gaps};
        }catch(e){
          indexStatus={rangeCount:0,gaps:[[1,n.finalChapter]],error:String(e)};
        }
        items.push({slug,...n,indexStatus});
      }
      cors(res,200);
      return res.end(JSON.stringify({ok:true,permissionBasis:"Republished with permission from XperimentalHamid.",completedOnly:true,items}));
    } catch(e){
      cors(res,500); return res.end(JSON.stringify({ok:false,error:String(e)}));
    }
  }

  if (url.pathname === "/xh/novel") {
    try{
      const slug=url.searchParams.get("slug")||"";
      const ix=await getXhIndex(slug);
      cors(res,200);
      return res.end(JSON.stringify({ok:true,slug:ix.slug,title:ix.title,finalChapter:ix.finalChapter,genres:ix.genres,summary:ix.summary,rangeCount:ix.rangeCount,gaps:ix.gaps,sourceSite:ix.sourceSite}));
    }catch(e){ cors(res,404); return res.end(JSON.stringify({ok:false,error:String(e)})); }
  }

  if (url.pathname === "/xh/chapter") {
    try{
      const slug=url.searchParams.get("slug")||"";
      const chapter=Number(url.searchParams.get("n")||"1");
      const data=await getXhChapter(slug,chapter);
      cors(res,200);
      return res.end(JSON.stringify(data));
    }catch(e){ cors(res,502); return res.end(JSON.stringify({ok:false,error:String(e)})); }
  }

  if (url.pathname === "/xh/catalog-scan") {
    try {
      const min = Math.max(1, Number(url.searchParams.get("min") || 1000));
      const rows = await scanXH(min);
      cors(res,200);
      return res.end(JSON.stringify({
        ok:true,
        generatedAt:new Date().toISOString(),
        minChapter:min,
        total:rows.length,
        verifiedComplete:rows.filter(x=>x.signals.likelyComplete),
        ambiguousOrOngoing:rows.filter(x=>!x.signals.likelyComplete)
      }));
    } catch (e) {
      cors(res,500);
      return res.end(JSON.stringify({ok:false,error:String(e)}));
    }
  }

  if (url.pathname === "/health") {
    cors(res);
    return res.end(JSON.stringify({ok:true,service:"Xender Reader API",books:Object.keys(BOOKS).length}));
  }
  if (url.pathname === "/books") {
    cors(res);
    const books = Object.entries(BOOKS).map(([id,b]) => ({id,title:b.title,author:b.author,translator:b.translator}));
    return res.end(JSON.stringify({ok:true,books}));
  }
  if (url.pathname === "/book") {
    const id = url.searchParams.get("id") || "";
    const book = BOOKS[id];
    if (!book) { cors(res,404); return res.end(JSON.stringify({ok:false,error:"Book not found."})); }
    try {
      const upstream = await fetch(book.source, {
        headers: {"user-agent":"XenderSecretsReader/1.0 (+https://xendersecrets.com)"}
      });
      if (!upstream.ok) throw new Error("Upstream "+upstream.status);
      const text = await upstream.text();
      cors(res,200,"text/plain; charset=utf-8");
      return res.end(text);
    } catch (e) {
      cors(res,502);
      return res.end(JSON.stringify({ok:false,error:"Unable to load the reading text right now."}));
    }
  }
  cors(res,404);
  res.end(JSON.stringify({ok:false,error:"Route not found."}));
});

const port = Number(process.env.PORT || 10000);
server.listen(port, "0.0.0.0", () => console.log("Xender Reader API listening on", port));
