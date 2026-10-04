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
    const links=extractLinks(html).filter(a=>/chapter|novel/i.test(a.url+" "+a.text));
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
