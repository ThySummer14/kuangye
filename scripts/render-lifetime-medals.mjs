import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const code=`async(page)=>{
 const context=await page.context().browser().newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});
 const capturePage=await context.newPage();
 try {
 await capturePage.goto('http://127.0.0.1:5192/#challenger');
 return await capturePage.evaluate(async()=>{
  const {createMedalViewer}=await import('/src/scenes/challenge-medal-viewer.js');
  const out=[];
  for(const motif of (await import('/src/data/lifetime-challenges.js')).LIFETIME_MEDALS.map(m=>m.id)){
   const host=document.createElement('div');host.style.cssText='width:480px;height:528px;position:fixed;left:0;top:0;z-index:10000;';document.body.appendChild(host);
   const viewer=await createMedalViewer(host,{motif,capture:true});viewer.pose('front');viewer.orbit(.24,-.04);
   out.push({motif,data:viewer.capture('image/webp',.92)});viewer.dispose();host.remove();
  }
  return out;
 });
 } finally {await context.close();}
}`;
const result=spawnSync(`${process.env.HOME}/.codex/skills/playwright/scripts/playwright_cli.sh`,['-s=kuangye-challenger','run-code',code],{encoding:'utf8',maxBuffer:20*1024*1024});
const match=result.stdout.match(/### Result\n([^\n]+)/);
if(result.status||!match)throw Error(result.stdout+result.stderr);
for(const {motif,data} of JSON.parse(match[1])){
 const path=`app/public/challenger/lifetime/${motif}.webp`;
 writeFileSync(path,Buffer.from(data.split(',')[1],'base64'));console.log(path);
}
