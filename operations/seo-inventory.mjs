import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
const urls=[...fs.readFileSync(path.join(root,'sitemap.xml'),'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const seenTitle=new Map(),seenDesc=new Map(),problems=[];
for(const url of urls){
  const pathname=new URL(url).pathname;
  const html=fs.readFileSync(path.join(root,pathname==='/'?'index.html':pathname.slice(1)+'.html'),'utf8');
  const title=html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const desc=html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1]?.trim();
  for(const [kind,value,seen] of [['title',title,seenTitle],['description',desc,seenDesc]]){
    if(!value) problems.push(`${url}: missing ${kind}`);
    else if(seen.has(value)) problems.push(`${url}: duplicate ${kind} with ${seen.get(value)}`);
    else seen.set(value,url);
  }
}
console.log(JSON.stringify({pages:urls.length,problems},null,2));
if(problems.length) process.exitCode=1;
