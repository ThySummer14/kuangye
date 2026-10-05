async (page) => {
  const fixture=__RESIDENT_FIXTURE__,results=[],errors=[];
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  const browser=page.context().browser();
  for(const width of [1280,375]){
    const context=await browser.newContext({viewport:{width,height:900}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
    try {
      await p.goto('http://127.0.0.1:5191/#library');await p.getByRole('tab',{name:/阅读桌/}).waitFor();
      check(await p.getByRole('tab',{name:/街角来访/}).count()===0,'release includes unaccepted draft');
      await p.getByRole('button',{name:'← 回到地图',exact:true}).click();await p.locator('.world-canvas[data-ready=true]').waitFor();
      await p.locator('[data-place=journal]').click();await p.locator('.backup-section').waitFor();
      await p.locator('.backup-section input[type=file]').setInputFiles({name:'resident-local-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
      await p.getByRole('button',{name:'恢复这份备份',exact:true}).click();
      await p.getByRole('button',{name:'← 回到地图',exact:true}).click();await p.locator('.world-canvas[data-ready=true]').waitFor();
      await p.locator('[data-place=library]').click();await p.getByRole('tab',{name:/街角来访/}).click();
      check((await p.locator('.resident-desk').innerText()).includes(fixture.state.home.visits[0].brief.story[0]),'accepted snapshot missing in release');
      await p.getByRole('button',{name:'回画室，继续这件作品'}).click();
      check(await p.locator('[data-studio-work]').getAttribute('data-studio-work')==='release-postcard','release links wrong work');
      await p.getByRole('button',{name:'我做好了，收好这件作品'}).click();await p.getByRole('button',{name:'完成，记下这一刻'}).click();
      await p.getByRole('dialog',{name:'这一件事，收好了'}).waitFor();await p.getByRole('button',{name:'去画室看看这件作品 ↗'}).click();
      await p.getByRole('button',{name:'回书屋，交回这件作品 ↗'}).click();
      await p.getByRole('checkbox',{name:'我确认这一版按约定留下了真实观察与成果。'}).check();await p.getByRole('button',{name:'把这一版交回书屋'}).click();await p.locator('.resident-return').waitFor();
      await p.locator('.toast').waitFor({state:'hidden'});
      await p.reload();await p.getByRole('tab',{name:/街角来访/}).click();await p.locator('.resident-return').waitFor();
      check((await p.locator('.resident-keepsake').innerText()).includes('正式恢复的一张明信片'),'handover snapshot missing');
      const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('kuangye.v3')));
      check(saved.home.visits.length===1&&saved.done.length===1&&saved.done[0].xp===0&&saved.home.lumens===0&&saved.home.glimmerDays.length===1,'release reward/save drift');
      check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'release overflow');
      await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`output/playwright/residents-release-restored-${width}.png`,fullPage:true});
      results.push({width,status:'PASS',freshDraftHidden:true,backupRestored:true,acceptedStoryPreserved:true,workCompleted:true,handover:true,refresh:true,xp:0,lumens:0});
    } finally { await context.close(); }
  }
  check(!errors.length,JSON.stringify(errors));return {results,errors,fixture:'isolated local production-preview contexts'};
}
