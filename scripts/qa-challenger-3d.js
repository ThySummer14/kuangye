async(page)=>{
 const results=[],browser=page.context().browser();
 const assert=(value,label)=>{if(!value)throw Error(label);};
 const selectContractAlbum=async target=>{
  await target.getByRole('button',{name:/加码行动\s*06/}).click();
  await target.locator('.operation-card').first().waitFor();
 };
 for(const width of [1280,375]){
  const c=await browser.newContext({viewport:{width,height:900},hasTouch:width===375}),p=await c.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  p.on('response',r=>{if(r.status()>=400&&r.url().includes('127.0.0.1:5193'))errors.push(`${r.status()} ${r.url()}`);});
  try{
   await p.goto('http://127.0.0.1:5193/#challenger');await p.locator('.challenger').waitFor();await selectContractAlbum(p);
   const saved=await p.evaluate(()=>localStorage.getItem('kuangye.v3'));
   assert(await p.locator('.medal-canvas canvas').count()===0,'gallery allocates WebGL');
   await p.getByRole('button',{name:'旋转观察临界之上蚀刻章',exact:true}).click();
   const host=p.locator('.medal-canvas[data-ready=true]');await host.waitFor();
   let camera=await host.getAttribute('data-camera');await p.waitForTimeout(200);
   assert(camera!==await host.getAttribute('data-camera'),'auto rotation stopped');
   await p.getByRole('button',{name:'暂停巡回',exact:true}).click();camera=await host.getAttribute('data-camera');await p.waitForTimeout(200);
   assert(camera===await host.getAttribute('data-camera'),'pause still rotates');
   await p.getByRole('button',{name:'正面',exact:true}).click();
   await p.screenshot({path:`output/playwright/challenger-3d-front-${width}.png`});
   const box=await host.boundingBox();camera=await host.getAttribute('data-camera');
   await p.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await p.mouse.down();await p.mouse.move(box.x+box.width*.7,box.y+box.height*.57,{steps:12});await p.mouse.up();
   assert(camera!==await host.getAttribute('data-camera'),'drag does not rotate');
   await p.screenshot({path:`output/playwright/challenger-3d-orbit-${width}.png`});
   camera=await host.getAttribute('data-camera');await host.focus();await p.keyboard.press('ArrowLeft');
   assert(camera!==await host.getAttribute('data-camera'),'keyboard rotation failed');
   const distance=Number(await host.getAttribute('data-zoom'));
   await p.getByRole('button',{name:'放大蚀刻章',exact:true}).click();
   assert(Number(await host.getAttribute('data-zoom'))<distance,'zoom button failed');
   await p.getByRole('button',{name:'背面',exact:true}).click();
   assert(Number((await host.getAttribute('data-camera')).split(',')[2])<0,'back is not real camera reversal');
   await p.screenshot({path:`output/playwright/challenger-3d-back-${width}.png`});
   if(width===375){
    const session=await c.newCDPSession(p),x=box.x+box.width/2,y=box.y+box.height/2;
    const before=Number(await host.getAttribute('data-zoom'));
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-22,y,id:0},{x:x+22,y,id:1}]});
    for(const distance of [30,38,46])await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-distance,y,id:0},{x:x+distance,y,id:1}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert(Number(await host.getAttribute('data-zoom'))<before,'two-finger pinch failed');await session.detach();
   }
   // Retain the old native context to verify it is actually released on close.
   await p.evaluate(()=>{window.__oldMedalGL=document.querySelector('.medal-canvas canvas').getContext('webgl2');});
   await p.keyboard.press('Escape');await p.waitForFunction(()=>window.__oldMedalGL.isContextLost());
   assert(await p.locator('.medal-canvas canvas').count()===0,'closed canvas retained');
   assert(await p.getByRole('button',{name:'旋转观察临界之上蚀刻章',exact:true}).evaluate(el=>el===document.activeElement),'focus not restored');
   await p.locator('.challenge-tabs').getByRole('button',{name:/蚀刻章/}).click();
   for(const motif of ['breach','resolve','versatile','summit']){
    await p.locator(`[data-medal=${motif}]`).click();await host.waitFor();
    assert(await p.locator('.medal-viewer').getAttribute('data-motif')===motif,'wrong 3D motif');
    await p.getByRole('button',{name:'正面',exact:true}).click();
    assert(await p.locator('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),'dialog overflow');
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow');
    await p.screenshot({path:`output/playwright/challenger-3d-${motif}-${width}.png`});
    await p.keyboard.press('Escape');
   }
   // GPU context loss must retain the preview, and retry must build a fresh context.
   await p.locator('[data-medal=resolve]').click();await host.waitFor();
   await p.locator('.medal-canvas canvas').evaluate(canvas=>canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
   await p.locator('.medal-render-fallback').waitFor();
   assert(await p.locator('.medal-render-fallback img').evaluate(img=>img.complete&&img.naturalWidth>0),'fallback image missing');
   await p.screenshot({path:`output/playwright/challenger-3d-fallback-${width}.png`});
   await p.getByRole('button',{name:'重新加载立体预览',exact:true}).click();await host.waitFor();
   await p.keyboard.press('Escape');
   await p.emulateMedia({reducedMotion:'reduce'});await p.locator('[data-medal=breach]').click();await host.waitFor();
   assert(await p.locator('.medal-viewer').getAttribute('data-spinning')==='false','reduced motion autorotates');
   camera=await host.getAttribute('data-camera');await p.waitForTimeout(150);assert(camera===await host.getAttribute('data-camera'),'reduced motion camera moves');
   await p.keyboard.press('Escape');
   assert(await p.evaluate(()=>localStorage.getItem('kuangye.v3'))===saved,'inspection wrote save');
   assert(errors.length===0,errors.join('\n'));
   results.push({width,status:'PASS',models:4,drag:true,keyboard:true,zoom:true,touchPinch:width===375,back:true,pause:true,reducedMotion:true,contextDisposed:true,contextLossRecovery:true,saveUnchanged:true,errors});
  }catch(error){await p.screenshot({path:`output/playwright/challenger-3d-FAILED-${width}.png`});results.push({width,status:'FAIL',error:String(error),errors});}
  await c.close();
 }
 const unavailable=await browser.newContext({viewport:{width:375,height:900}}),up=await unavailable.newPage();
 await up.addInitScript(()=>{
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(kind,...args){return /^webgl/.test(kind)?null:original.call(this,kind,...args);};
  window.__restoreMedalContext=()=>{HTMLCanvasElement.prototype.getContext=original;};
 });
 await up.goto('http://127.0.0.1:5193/#challenger');await up.locator('.challenger').waitFor();await selectContractAlbum(up);await up.getByRole('button',{name:'旋转观察临界之上蚀刻章',exact:true}).click();
 await up.locator('.medal-render-fallback').waitFor();
 assert(await up.locator('.medal-render-fallback img').evaluate(img=>img.complete&&img.naturalWidth>0),'WebGL unavailable fallback missing');
 await up.evaluate(()=>window.__restoreMedalContext());await up.getByRole('button',{name:'重新加载立体预览',exact:true}).click();
 await up.locator('.medal-canvas[data-ready=true]').waitFor();await unavailable.close();
 results.push({width:375,status:'PASS',webglUnavailableFallback:true,retryAfterRecovery:true});
 // Loading can outlive the dialog. Closing it must not allocate a late renderer.
 const loading=await browser.newContext({viewport:{width:375,height:900}}),lp=await loading.newPage();
 await lp.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;window.__medalGLCalls=0;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(/^webgl/.test(kind))window.__medalGLCalls++;return original.call(this,kind,...args);};});
 let release;
 await lp.route('**/challenger/engraving-atlas.png',route=>new Promise(resolve=>{release=async()=>{await route.continue();resolve();};}));
 await lp.goto('http://127.0.0.1:5193/#challenger');await lp.locator('.challenger').waitFor();await selectContractAlbum(lp);
 const before=await lp.evaluate(()=>window.__medalGLCalls);
 await lp.getByRole('button',{name:'旋转观察临界之上蚀刻章',exact:true}).click();await lp.locator('.medal-loading').waitFor();
 assert(await lp.locator('.medal-viewer-controls button:not(:disabled)').count()===0,'loading controls accept misleading actions');
 await lp.waitForTimeout(100);assert(release,'artwork request not intercepted');
 await lp.keyboard.press('Escape');const response=lp.waitForResponse('**/challenger/engraving-atlas.png');await release();await response;await lp.waitForTimeout(150);
 assert(await lp.evaluate(()=>window.__medalGLCalls)===before,'closed loading dialog allocated WebGL');
 assert(await lp.locator('.medal-canvas').count()===0,'closed loading canvas retained');await loading.close();
 results.push({width:375,status:'PASS',closedDuringArtworkLoad:true,noLateWebGLAllocation:true});
 const missing=await browser.newContext({viewport:{width:375,height:900}}),mp=await missing.newPage();let block=true;
 await mp.route('**/challenger/engraving-atlas.png',route=>block?route.abort():route.continue());
 await mp.goto('http://127.0.0.1:5193/#challenger');await mp.locator('.challenger').waitFor();await selectContractAlbum(mp);await mp.getByRole('button',{name:'旋转观察临界之上蚀刻章',exact:true}).click();
 await mp.locator('.medal-render-fallback').waitFor();block=false;
 await mp.getByRole('button',{name:'重新加载立体预览',exact:true}).click();await mp.locator('.medal-canvas[data-ready=true]').waitFor();await missing.close();
 results.push({width:375,status:'PASS',artworkFailureFallback:true,artworkRetry:true});
 return results;
}
