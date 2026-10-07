async(page)=>{
 const results=[],browser=page.context().browser();
 const check=(ok,message)=>{if(!ok)throw Error(message);};
 const origin='http://127.0.0.1:5193/';
 for(const width of [1280,375]){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width===375}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  p.on('response',r=>{if(r.status()>=400&&r.url().startsWith(origin))errors.push(`${r.status()} ${r.url()}`);});
  const read=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('kuangye.v3')));
  const inspect=async id=>{await p.locator(`[data-life-operation="${id}"]`).click();await p.locator('dialog').waitFor();};
  const shot=async(name,modal=false)=>{
   check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow '+name);
   if(modal)check(await p.locator('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),'modal overflow '+name);
   await p.screenshot({path:`output/playwright/lifetime-${name}-${width}.png`,fullPage:!modal});
  };
  const take=async(id,definition='')=>{await inspect(id);if(definition)await p.locator('#life-definition').fill(definition);await p.getByRole('button',{name:'开始这一项挑战 ↗',exact:true}).click();await p.getByRole('button',{name:'我完成了，留下刻印 ↗',exact:true}).waitFor();const qid=(await read()).active.at(-1).qid;await p.keyboard.press('Escape');return qid;};
  try{
   await p.goto(origin+'#map');await p.locator('.world-canvas[data-ready=true]').waitFor();await p.locator('[data-place=tasks]').click();await p.locator('.challenger-entry').click();await p.locator('.life-grid').waitFor();
   check(await p.locator('.life-card').count()===14,'14 cards');check(await p.locator('.life-card.earned').count()===0,'unearned cards');
   const before=JSON.stringify(await read());
   await p.locator('.life-card').last().scrollIntoViewIfNeeded();await p.locator('.life-hero').scrollIntoViewIfNeeded();
   await p.waitForFunction(()=>[...document.querySelectorAll('.lifetime img')].every(i=>i.complete&&i.naturalWidth>0));
   check(await p.locator('.medal-canvas canvas').count()===0,'gallery creates WebGL');
   await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>scrollTo(0,0));await shot('overview');
   check(await p.locator('.lifetime').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length)===0,'motion preference');
   const ids=await p.locator('.life-card').evaluateAll(cards=>cards.map(c=>c.dataset.lifeOperation));
   for(const id of ids){
    await inspect(id);const host=p.locator('.medal-canvas[data-ready=true]');await host.waitFor();
    check(await p.locator('.medal-viewer').getAttribute('data-motif')===id,'model mismatch '+id);
    check(await p.locator('.medal-viewer').getAttribute('data-spinning')==='false','reduced motion spins');
    await p.getByRole('button',{name:'正面',exact:true}).click();
    if(width===1280||id==='life-cet6')await shot('model-'+id,true);
    if(id==='life-cet6'){
     const cam=await host.getAttribute('data-camera');await host.focus();await p.keyboard.press('ArrowRight');check(cam!==await host.getAttribute('data-camera'),'keyboard orbit');
     await p.getByRole('button',{name:'背面',exact:true}).click();check(Number((await host.getAttribute('data-camera')).split(',')[2])<0,'back');await shot('back',true);
     await p.evaluate(()=>window.__oldGL=document.querySelector('.medal-canvas canvas').getContext('webgl2'));
    }
    await p.keyboard.press('Escape');
    if(id==='life-cet6')await p.waitForFunction(()=>window.__oldGL.isContextLost());
    check(await p.locator(`[data-life-operation="${id}"]`).evaluate(el=>el===document.activeElement),'restore focus');
   }
   check(JSON.stringify(await read())===before,'browsing writes save');
   await inspect('life-math');await p.getByRole('button',{name:'开始这一项挑战 ↗',exact:true}).click();await p.locator('#life-error').waitFor();check(JSON.stringify(await read())===before,'empty math changes save');
   await p.locator('#life-definition').fill('学会导数的定义，能独立解释变化率并解出教材练习。');await p.getByRole('button',{name:'开始这一项挑战 ↗',exact:true}).click();await p.getByRole('button',{name:'我完成了，留下刻印 ↗',exact:true}).waitFor();await shot('active-math',true);await p.keyboard.press('Escape');
   const math=(await read()).active[0].qid;
   await p.getByRole('button',{name:'← 回到地图',exact:true}).click();await p.locator('.world-canvas[data-ready=true]').waitFor();await p.getByRole('button',{name:'打开进行中',exact:true}).click();await p.locator('.life-grid').waitFor();
   await p.getByRole('button',{name:'← 任务岩壁',exact:true}).click();const card=p.locator(`[data-active-task="${math}"]`);await card.getByRole('button',{name:'我完成了',exact:true}).click();
   const confirm=p.getByRole('button',{name:'确认完成，留下刻印',exact:true});check(await confirm.isDisabled(),'unconfirmed enabled');const boxes=await p.locator('.challenge-confirm input').all();check(boxes.length===2,'math objective and definition');for(const box of boxes)await box.check();check(await confirm.isDisabled(),'empty review enabled');await p.locator('#quest-review').fill('测试：完成导数学习，独立解释了变化率。');await shot('confirmation',true);await confirm.click();await p.getByRole('heading',{name:'突破，已刻印。'}).waitFor();
   check((await p.locator('.challenge-earned-result').innerText())==='新蚀刻章：万象有解','wrong medal earned');await shot('complete',true);await p.getByRole('button',{name:'回挑战者，查看蚀刻章与档案 ↗',exact:true}).click();await p.locator('.life-grid').waitFor();check(await p.locator('.life-card.earned').count()===1,'single medal');
   await p.reload();await p.locator('.life-card.earned').waitFor();const saved=await read();check(saved.done.length===1&&saved.done[0].xp===0&&saved.home.lumens===0&&saved.home.glimmerDays.length===1,'reward or reload');
   await p.getByRole('group',{name:'筛选人生挑战'}).getByRole('button',{name:/已刻印/}).click();check(await p.locator('.life-card').count()===1,'earned filter');await shot('earned');await p.getByRole('group',{name:'筛选人生挑战'}).getByRole('button',{name:/全部挑战/}).click();
   const novel=await take('life-novel','写完我一直想写的故事。');await take('life-vocal');await take('life-compose');
   await inspect('life-novel');check(await p.getByRole('button',{name:'我完成了，留下刻印 ↗',exact:true}).isVisible(),'existing active unavailable');await p.keyboard.press('Escape');
   await inspect('life-painting');check(await p.getByRole('button',{name:'手里已有 3 件事',exact:true}).isDisabled(),'fourth allowed');await p.keyboard.press('Escape');
   await inspect('life-novel');await p.getByRole('button',{name:'先放一放',exact:true}).click();await p.locator('#rest-reason').fill('测试：以后回来继续。');await p.getByRole('button',{name:'暂时放下',exact:true}).click();await p.locator('dialog').waitFor({state:'detached'});
   const retry=await take('life-novel','写到我认可的结尾。');check(retry!==novel,'retry overwrote original');let s=await read();check(s.abandoned.length===1&&s.customTasks.find(t=>t.id===novel).challenge.definition==='写完我一直想写的故事。','frozen original');
   await p.getByRole('button',{name:'加码行动 06',exact:true}).click();await p.locator('.challenge-tabs').getByRole('button',{name:/蚀刻章/}).click();check(await p.locator('.challenge-medal.earned').count()===0,'life earned old honors');
   await p.getByRole('button',{name:'← 回到地图',exact:true}).click();await p.locator('[data-place=journal]').click();const downloadPromise=p.waitForEvent('download');await p.getByRole('button',{name:'导出备份',exact:true}).click();const download=await downloadPromise;const backupPath=`output/playwright/lifetime-backup-${width}.json`;await download.saveAs(backupPath);const exported=await read();
   const rc=await browser.newContext({viewport:{width,height:900}}),rp=await rc.newPage();await rp.goto(origin+'#panel');await rp.locator('.backup-section input').setInputFiles(backupPath);await rp.getByRole('button',{name:'恢复这份备份',exact:true}).click();await rp.getByText('备份已恢复，原进度也已自动导出',{exact:true}).waitFor();const recovered=await rp.evaluate(()=>JSON.parse(localStorage.getItem('kuangye.v3')));check(JSON.stringify(recovered.customTasks)===JSON.stringify(exported.customTasks)&&JSON.stringify(recovered.done)===JSON.stringify(exported.done),'backup differs');await rp.goto(origin+'#challenger');await rp.locator('.life-card.earned').waitFor();check(await rp.locator('.life-card.earned').count()===1,'restored honors');await rc.close();
   check(errors.length===0,errors.join('\n'));results.push({width,status:'PASS',models:14,saveUnchangedDuringInspection:true,onlyCorrespondingMedal:true,backupRoundTrip:true,legacyHonorsUnaffected:true,errors});
  }catch(e){await p.screenshot({path:`output/playwright/lifetime-FAILED-${width}.png`});results.push({width,status:'FAIL',error:String(e),errors});}
  await context.close();
 }
 return results;
}
