import { readFileSync,writeFileSync,readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const lifetime=process.argv.includes('--lifetime');
const files=lifetime?readdirSync('app/public/challenger/lifetime').filter(file=>/\.(png|webp)$/.test(file)).sort().map(file=>'lifetime/'+file):['engraving-atlas.png','breach.png','resolve.png','versatile.png','summit.png'];
const expected=Object.fromEntries(files.map(file=>[file,createHash('sha256').update(readFileSync(`app/public/challenger/${file}`)).digest('hex')]));
const code=`async(page)=>{
 const context=await page.context().browser().newContext(),p=await context.newPage();
 try{
  await p.goto('https://thysummer14.github.io/kuangye/#challenger');
  return await p.evaluate(async(expected)=>await Promise.all(Object.entries(expected).map(async([file,sha])=>{
   const response=await fetch('./challenger/'+file,{signal:AbortSignal.timeout(90000)}),bytes=await response.arrayBuffer();
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
   return {file,http:response.status,bytes:bytes.byteLength,sha256:hash,matchesLocal:hash===sha};
  })),${JSON.stringify(expected)});
 }finally{await context.close();}
}`;
const r=spawnSync(`${process.env.HOME}/.codex/skills/playwright/scripts/playwright_cli.sh`,['-s=kuangye-challenger','run-code',code],{encoding:'utf8',maxBuffer:1024*1024});
const match=r.stdout.match(/### Result\n([^\n]+)/);
if(r.status||!match)throw Error(r.stdout+r.stderr);
const results=JSON.parse(match[1]);writeFileSync(lifetime?'output/lifetime-live-assets.txt':'output/challenger-refined-live-assets.txt',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
if(results.some(r=>r.http!==200||!r.matchesLocal))process.exit(1);
