import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const code=`async(page)=>{
 await page.goto('http://127.0.0.1:5192/#challenger');
 return await page.evaluate(async()=>{
  const {createMedalViewer}=await import('/src/scenes/challenge-medal-viewer.js');
  const out=[];
  for(const motif of ['breach','resolve','versatile','summit']){
   const host=document.createElement('div');host.style.cssText='width:600px;height:660px;position:fixed;left:0;top:0;z-index:10000;';document.body.appendChild(host);
   const viewer=createMedalViewer(host,{motif,capture:true});viewer.pose('front');viewer.orbit(.24,-.04);
   out.push({motif,data:viewer.capture()});viewer.dispose();host.remove();
  }
  return out;
 });
}`;
const result=spawnSync(`${process.env.HOME}/.codex/skills/playwright/scripts/playwright_cli.sh`,['-s=kuangye-challenger','run-code',code],{encoding:'utf8',maxBuffer:20*1024*1024});
const match=result.stdout.match(/### Result\n([^\n]+)/);
if(result.status||!match)throw Error(result.stdout+result.stderr);
for(const {motif,data} of JSON.parse(match[1])){
 const path=`app/public/challenger/${motif}.png`;
 writeFileSync(path,Buffer.from(data.split(',')[1],'base64'));console.log(path);
}
