// Dedicated emulator only. Requires an installed debug APK and --reset-fixture.
import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const serial=process.env.ANDROID_SERIAL || 'emulator-5580';
if (!serial.startsWith('emulator-') || !process.argv.includes('--reset-fixture')) throw Error('Use a disposable emulator and --reset-fixture');
const sdk=process.env.ANDROID_HOME;
if(!sdk)throw Error('Set ANDROID_HOME');
const adb=path.join(sdk,'platform-tools/adb'),pkg='dev.kuangye.prototype';
const quote=value=>"'"+String(value).replaceAll("'","'\\''")+"'";
const sh=(...args)=>execFileSync(adb,['-s',serial,...(args[0]==='shell'?['shell',args.slice(1).map(quote).join(' ')]:args)],{maxBuffer:20*1024*1024});
const cache=path.join(process.env.HOME,'.npm/_npx');
const module=process.env.PLAYWRIGHT_MODULE || readdirSync(cache).map(x=>path.join(cache,x,'node_modules/playwright/index.mjs')).find(p=>{try{return !!readdirSync(path.dirname(p));}catch{return false;}});
const {_android}=await import(pathToFileURL(module));
mkdirSync('output/android',{recursive:true});
function nativeTap(text){
 for(let attempt=0;attempt<6;attempt++){
  sh('shell','uiautomator','dump','/sdcard/kuangye-qa.xml');
  const xml=sh('shell','cat','/sdcard/kuangye-qa.xml').toString();
  const node=[...xml.matchAll(/<node\b[^>]+>/g)].map(m=>m[0]).find(n=>n.includes(`text="${text}"`));
  if(!node)continue;
  const m=node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  sh('shell','input','tap',String((+m[1]+ +m[3])/2),String((+m[2]+ +m[4])/2));return;
 }
 throw Error('Missing native control: '+text);
}
const read=()=>JSON.parse(sh('shell','run-as',pkg,'cat','files/saves/current.json').toString()).state;
const nativeShot=async name=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await new Promise(resolve=>setTimeout(resolve,150));writeFileSync(`output/android/${name}-native.png`,sh('exec-out','screencap','-p'));};
let device,page;const errors=[];
async function connect(){device=(await _android.devices()).find(d=>d.serial()===serial);assert(device);page=await(await device.webView({pkg})).page();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));}
const result={status:'FAIL',serial,api:sh('shell','getprop','ro.build.version.sdk').toString().trim()};
try {
 sh('shell','pm','clear',pkg);sh('shell','am','start','-n',pkg+'/.MainActivity');await connect();
 await page.locator('.world-canvas[data-ready=true]').waitFor();await nativeShot('map');
 assert(await page.evaluate(()=>document.documentElement.classList.contains('android-app')));
 await page.locator('[data-place=tasks]').click();await page.locator('.challenger-entry').click();await page.locator('.life-grid').waitFor();assert.equal(await page.locator('.life-card').count(),14);
 await page.screenshot({path:'output/android/challenges.png',fullPage:true});
 await page.locator('[data-life-operation="life-math"]').click();await page.locator('.medal-canvas[data-ready=true]').waitFor();
 const fullHeight=await page.evaluate(()=>innerHeight);
 await page.locator('#life-definition').fill('Android QA: derivatives and rate of change.');await page.locator('#life-definition').click();await page.waitForFunction(h=>innerHeight<h-100,fullHeight);await nativeShot('keyboard');
 assert(await page.locator('#life-definition').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight));
 sh('shell','input','keyevent','4');await page.getByRole('button',{name:'开始这一项挑战 ↗',exact:true}).click();await page.getByRole('button',{name:'我完成了，留下刻印 ↗',exact:true}).waitFor();
 await page.locator('.medal-canvas').scrollIntoViewIfNeeded();await page.getByRole('button',{name:'背面',exact:true}).click();
 assert(Number((await page.locator('.medal-canvas').getAttribute('data-camera')).split(',')[2])<0);await nativeShot('medal-back');
 sh('shell','input','keyevent','4');await page.locator('dialog').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>location.hash),'#challenger');
 sh('shell','input','keyevent','4');await page.waitForFunction(()=>location.hash==='#tasks');sh('shell','input','keyevent','4');await page.waitForFunction(()=>location.hash==='#map');
 await page.locator('[data-place=journal]').click();
 const oldFiles=sh('shell','ls','/sdcard/Download').toString().trim().split('\n');
 await page.getByRole('button',{name:'导出备份',exact:true}).click();nativeTap('SAVE');await page.getByText('备份已保存到所选位置',{exact:true}).waitFor();
 const files=sh('shell','ls','/sdcard/Download').toString().trim().split('\n');const exported=files.find(f=>f.endsWith('.json')&&!oldFiles.includes(f));assert(exported);
 const backup=sh('shell','cat','/sdcard/Download/'+exported).toString();assert.equal(JSON.parse(backup).state.active.length,1);writeFileSync('output/android/exported-backup.json',backup);
 await page.evaluate(()=>location.hash='challenger');await page.locator('[data-life-operation="life-math"]').click();await page.getByRole('button',{name:'我完成了，留下刻印 ↗',exact:true}).click();
 for(const c of await page.locator('.challenge-confirm input').all())await c.check();await page.locator('#quest-review').fill('Android QA completed: derivatives.');await page.getByRole('button',{name:'确认完成，留下刻印',exact:true}).click();await page.getByRole('heading',{name:'突破，已刻印。'}).waitFor();await nativeShot('completed');
 sh('shell','input','keyevent','4');await page.locator('dialog').waitFor({state:'detached'});await page.evaluate(()=>location.hash='panel');
 const before=read();assert.equal(before.done.length,1);
 await page.getByRole('button',{name:'导入备份',exact:true}).click();nativeTap(exported);await page.getByRole('button',{name:'恢复这份备份',exact:true}).waitFor();
 // Fail one native write. The next write is the original-state rollback.
 await page.evaluate(()=>{const original=window.Capacitor.nativePromise;window.Capacitor.nativePromise=function(plugin,method,args){if(plugin==='KuangyeStorage'&&method==='write'){window.Capacitor.nativePromise=original;return Promise.reject(Error('QA disk full'));}return original.call(this,plugin,method,args);};});
 await page.getByRole('button',{name:'恢复这份备份',exact:true}).click();await page.getByText('导入失败：QA disk full',{exact:true}).waitFor();assert.deepEqual(read(),before);
 await page.getByRole('button',{name:'恢复这份备份',exact:true}).click();await page.getByText('备份已恢复，原进度也已自动导出',{exact:true}).waitFor();assert.equal(read().active.length,1);assert.equal(read().done.length,0);
 const snapshots=sh('shell','ls','/sdcard/Download/Kuangye').toString().trim().split('\n');const safety=JSON.parse(sh('shell','cat','/sdcard/Download/Kuangye/'+snapshots.at(-1)).toString());assert.equal(safety.state.done.length,1);assert.equal(safety.state.active.length,0);await nativeShot('restored');
 // The TXT export also traverses the real system document picker.
 await page.evaluate(()=>{const original=window.Capacitor.nativePromise;window.Capacitor.nativePromise=function(plugin,method,args){const result=original.call(this,plugin,method,args);if(plugin==='KuangyeBackup'&&method==='exportFile'){window.Capacitor.nativePromise=original;return result.then(value=>{window.qaReportExported=true;return value;});}return result;};});
 await page.getByRole('button',{name:'导出成长报告 ↗',exact:true}).click();nativeTap('SAVE');await page.waitForFunction(()=>window.qaReportExported===true);
 await page.evaluate(async()=>{const response=await fetch('./challenger/breach.png');const blob=await response.blob();const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});window.Capacitor.Plugins.KuangyeBackup.exportFile({name:'kuangye-qa-card-'+Date.now()+'.png',mime:'image/png',base64}).then(()=>window.qaImageExported=true).catch(error=>window.qaImageError=String(error));});
 nativeTap('SAVE');await page.waitForFunction(()=>window.qaImageExported===true);
 const pngFile=sh('shell','ls','/sdcard/Download').toString().trim().split('\n').filter(f=>f.startsWith('kuangye-qa-card-')).at(-1);assert(pngFile);assert.deepEqual([...sh('shell','cat','/sdcard/Download/'+pngFile).subarray(0,8)],[137,80,78,71,13,10,26,10]);
 await device.close();sh('shell','svc','wifi','disable');sh('shell','svc','data','disable');sh('shell','am','force-stop',pkg);sh('shell','am','start','-n',pkg+'/.MainActivity');await connect();
 await page.locator('.world-canvas[data-ready=true]').waitFor();await page.locator('[data-place=tasks]').click();await page.locator('.challenger-entry').click();await page.locator('.life-active').waitFor();assert.equal(await page.locator('.life-card.earned').count(),0);
 await page.locator('[data-life-operation="life-cet6"]').click();await page.locator('.medal-canvas[data-ready=true]').waitFor();await page.getByRole('button',{name:'正面',exact:true}).click();await nativeShot('offline-medal');
 const host=page.locator('.medal-canvas'),box=await host.boundingBox(),camera=await host.getAttribute('data-camera');
 const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.4,y:box.y+box.height*.5}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*.7,y:box.y+box.height*.5}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.notEqual(await host.getAttribute('data-camera'),camera);
 await page.evaluate(()=>window.__oldGL=document.querySelector('.medal-canvas canvas').getContext('webgl2'));sh('shell','input','keyevent','4');await page.waitForFunction(()=>window.__oldGL.isContextLost());
 sh('shell','settings','put','system','accelerometer_rotation','0');sh('shell','settings','put','system','user_rotation','1');await page.waitForFunction(()=>innerWidth>innerHeight);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await nativeShot('landscape');await page.locator('[data-life-operation="life-cet6"]').click();await page.locator('.medal-canvas[data-ready=true]').waitFor();assert(await page.locator('.life-detail').evaluate(el=>el.querySelector('.life-detail-copy').getBoundingClientRect().top>=el.querySelector('.medal-viewer').getBoundingClientRect().bottom-1));await nativeShot('landscape-medal');sh('shell','input','keyevent','4');await page.locator('dialog').waitFor({state:'detached'});
 sh('shell','settings','put','system','user_rotation','0');await page.waitForFunction(()=>innerHeight>innerWidth);await nativeShot('offline-restarted');assert.equal(errors.length,0);
 Object.assign(result,{status:'PASS',viewport:await page.evaluate(()=>[innerWidth,innerHeight]),cards:14,nativeSave:true,systemBack:true,keyboardResizes:true,backupRoundTrip:true,failedRestoreRolledBack:true,preRestoreSnapshotRetained:true,offlineRestart:true,offline3d:true,touchRotation:true,webglReleased:true,landscape:true,landscapeMedal:true,pngExport:true,errors});
} catch(error){result.error=String(error);try{await nativeShot('FAILED');}catch{}throw error;}
finally{writeFileSync('output/android/verification.json',JSON.stringify(result,null,2)+'\n');await device?.close();}
console.log(JSON.stringify(result,null,2));
