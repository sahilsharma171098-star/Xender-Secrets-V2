#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args=Object.fromEntries(process.argv.slice(2).map((x,i,a)=>x.startsWith("--")?[x.slice(2),a[i+1]&&!a[i+1].startsWith("--")?a[i+1]:true]:null).filter(Boolean));
const input=path.resolve(String(args.input||"authorized-import"));
const output=path.resolve(String(args.output||"public/novel-data"));
const chunkSize=Math.max(10,Math.min(100,Number(args["chunk-size"]||50)));

const slugify=s=>String(s||"").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,100);
const readJson=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const textFile=p=>fs.readFileSync(p,"utf8").replace(/\r\n/g,"\n").trim();
const mkdir=p=>fs.mkdirSync(p,{recursive:true});

if(!fs.existsSync(input)) throw new Error("Input directory not found: "+input);
mkdir(output);

const books=[];
for(const name of fs.readdirSync(input)){
  const dir=path.join(input,name);
  if(!fs.statSync(dir).isDirectory()) continue;
  const metaPath=path.join(dir,"book.json");
  if(!fs.existsSync(metaPath)) continue;
  const meta=readJson(metaPath);
  if(String(meta.status||"").toLowerCase()!=="completed") throw new Error(name+": status must be Completed");
  const slug=slugify(meta.slug||meta.title||name);
  if(!slug) throw new Error(name+": invalid slug/title");
  const chaptersDir=path.join(dir,"chapters");
  if(!fs.existsSync(chaptersDir)) throw new Error(name+": chapters directory missing");
  const files=fs.readdirSync(chaptersDir).filter(f=>/^(?:chapter[-_ ]*)?\d+\.(?:txt|md|json)$/i.test(f));
  const rows=[];
  for(const f of files){
    const m=f.match(/(\d+)/); if(!m) continue;
    const n=Number(m[1]); const p=path.join(chaptersDir,f);
    let title="Chapter "+n, body="";
    if(/\.json$/i.test(f)){
      const j=readJson(p); title=String(j.title||title); body=String(j.body||j.text||"");
    }else body=textFile(p);
    body=body.replace(/\u0000/g,"").trim();
    if(body.length<20) throw new Error(name+": chapter "+n+" is too short/empty");
    rows.push({n,title,body});
  }
  rows.sort((a,b)=>a.n-b.n);
  if(!rows.length) throw new Error(name+": no chapters found");
  for(let i=0;i<rows.length;i++) if(rows[i].n!==i+1) throw new Error(name+": missing/non-contiguous chapter at "+(i+1));
  const expected=Number(meta.finalChapter||meta.chapterCount||rows.length);
  if(expected!==rows.length) throw new Error(name+": expected "+expected+" chapters but found "+rows.length);

  const bookOut=path.join(output,slug); mkdir(bookOut);
  const chunks=[];
  for(let start=0;start<rows.length;start+=chunkSize){
    const part=rows.slice(start,start+chunkSize);
    const from=part[0].n,to=part[part.length-1].n;
    const file=String(from).padStart(5,"0")+"-"+String(to).padStart(5,"0")+".json";
    fs.writeFileSync(path.join(bookOut,file),JSON.stringify({slug,from,to,chapters:part}));
    chunks.push({from,to,file});
  }
  const book={
    slug,title:String(meta.title||name),author:String(meta.author||""),
    genres:Array.isArray(meta.genres)?meta.genres:[],
    summary:String(meta.summary||""),status:"Completed",
    finalChapter:rows.length,sourceSite:String(meta.sourceSite||"Authorized Import"),
    attribution:String(meta.attribution||"Republished by Xender under authorization."),
    license:String(meta.license||""),chunks
  };
  fs.writeFileSync(path.join(bookOut,"manifest.json"),JSON.stringify(book,null,2)+"\n");
  books.push(book);
}
books.sort((a,b)=>a.title.localeCompare(b.title));
const publicBooks=books.map(({chunks,...b})=>b);
fs.writeFileSync(path.join(output,"catalog.json"),JSON.stringify({generatedAt:new Date().toISOString(),books:publicBooks},null,2)+"\n");
fs.writeFileSync(path.join(output,"catalog.js"),"window.XENDER_IMPORTED_NOVELS="+JSON.stringify(Object.fromEntries(publicBooks.map(b=>[b.slug,b])))+";\n");
console.log("Imported "+books.length+" completed novel(s), "+books.reduce((n,b)=>n+b.finalChapter,0)+" chapters.");
