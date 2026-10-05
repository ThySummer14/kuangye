async (page) => {
  const frozenHint=__OBSERVATION_HINT__,results=[],errors=[];
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  const browser=page.context().browser();
  for(const width of [1280,375]){
    const context=await browser.newContext({viewport:{width,height:900}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
    const back=async()=>{await p.getByRole('button',{name:'← 回到地图',exact:true}).click();await p.locator('.world-canvas[data-ready=true]').waitFor();};
    const enter=async()=>{await p.locator('[data-place=yard]').click();await p.getByRole('tab',{name:/观察册/}).click();await p.locator('.observation-book').waitFor();};
    try {
      await p.goto('http://127.0.0.1:5191/#map');await p.locator('.world-canvas[data-ready=true]').waitFor();await enter();
      check(await p.locator('[data-observation-prompt]').count()===0,'release includes pending prompts');
      await p.getByRole('button',{name:'开始自己的观察',exact:true}).click();
      await p.locator('#observation-place').fill('窗边');await p.locator('#observation-date').fill('2026-10-04');await p.locator('#observation-kind').selectOption('sky');
      const body='  下午的光移到了窗框左侧。\n白墙上的影子比昨天窄一点。\n';await p.locator('#observation-body').fill(body);
      const data=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=640;c.height=480;const x=c.getContext('2d');x.fillStyle='#f4ecd5';x.fillRect(0,0,640,480);x.fillStyle='#cfbe92';x.fillRect(80,0,35,480);x.fillRect(360,0,35,480);x.fillRect(0,240,640,25);return c.toDataURL('image/png');});
      await p.getByLabel('选择观察图片').setInputFiles({name:'window-fixture.png',mimeType:'image/png',buffer:Buffer.from(data.split(',')[1],'base64')});await p.locator('.observation-editor-images img').waitFor();
      await p.getByRole('button',{name:'收进观察册',exact:true}).click();await p.locator('.observation-finding').waitFor();await p.locator('.toast').waitFor({state:'hidden'});
      const id=await p.locator('[data-observation-page]').getAttribute('data-observation-page');
      await p.reload();await p.getByRole('tab',{name:/观察册/}).click();await p.locator(`[data-observation="${id}"]`).click();
      check(await p.locator('.observation-finding').textContent()===body,'release body missing');
      check(await p.locator('.observation-photos img').evaluate(img=>img.complete&&img.naturalWidth===640&&img.src.startsWith('data:image/jpeg;base64,')),'local JPEG not decoded');
      await p.getByRole('button',{name:'去成长手记回望 ↗'}).click();await p.locator('.backup-section').waitFor();
      const downloadPromise=p.waitForEvent('download');await p.getByRole('button',{name:'导出备份',exact:true}).click();const download=await downloadPromise;
      await download.saveAs(`output/playwright/observations-backup-${width}.json`);
      const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('kuangye.v3')));check(saved.home.observations.entries[0].body===body,'release whitespace lost');
      check(saved.active.length===0&&saved.done.length===0&&saved.home.lumens===0&&saved.home.glimmerDays.length===0,'release note created reward/task');
      const fixture={version:3,state:saved};fixture.state.home.observations.entries.unshift({id:'release-frozen-observation',place:'',body:'',hint:frozenHint,kind:'plant',observedOn:'2026-10-03',images:[],status:'draft',createdAt:'2026-10-05',keptAt:''});
      await p.locator('.backup-section input[type=file]').setInputFiles({name:'observations-local-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await p.getByRole('button',{name:'恢复这份备份',exact:true}).click();
      await back();await enter();await p.getByRole('button',{name:'接着写手里这一页',exact:true}).click();
      check((await p.locator('.observation-hint').innerText()).includes(frozenHint),'frozen prompt missing after release restore');
      await p.locator('#observation-place').fill('桥边那棵树');await p.locator('#observation-body').fill('枝头留着三片黄叶，靠水的一片还带着绿。');await p.getByRole('button',{name:'收进观察册',exact:true}).click();await p.locator('.toast').waitFor({state:'hidden'});
      await p.getByRole('button',{name:'去成长手记回望 ↗'}).click();check(await p.locator('[data-journal-observation]').count()===2,'restored record missing from journal');
      await p.locator(`[data-journal-observation="${id}"]`).click();check(await p.locator('[data-observation-page]').getAttribute('data-observation-page')===id,'release journal wrong record');
      check(await p.locator('.observation-photos img').evaluate(img=>img.complete&&img.naturalWidth>0),'restored photo not decoded');
      check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'release overflow');await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`output/playwright/observations-release-restored-${width}.png`,fullPage:true});
      results.push({width,status:'PASS',freshPromptHidden:true,mapTwoClicks:true,freeObservation:true,photoDecoded:true,bodyWhitespacePreserved:true,refresh:true,actualBackupDownload:true,restore:true,frozenHint:true,journal:true,noTasksOrRewards:true});
    }finally{await context.close();}
  }
  check(!errors.length,JSON.stringify(errors));return {results,errors,fixture:'isolated local production-preview contexts; Canvas image is a fixture'};
}
