async (page) => {
  const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  const run=(body,arg)=>page.evaluate(async([body,arg])=>{
    const url=performance.getEntriesByType('resource').map(e=>e.name).filter(n=>new URL(n).pathname==='/src/store.js').at(-1);
    return new Function('st','arg',body)(await import(url),arg);
  },[body,arg]);
  const capture=async(name,width)=>{
    await page.locator('.toast').waitFor({state:'hidden'});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' overflow');
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`output/playwright/observations-${name}-${width}.png`,fullPage:true});
  };
  const back=async()=>{await page.getByRole('button',{name:'← 回到地图',exact:true}).click();await page.locator('.world-canvas[data-ready=true]').waitFor();};
  const enter=async()=>{await page.locator('[data-place=yard]').click();await page.getByRole('tab',{name:/观察册/}).click();await page.locator('.observation-book').waitFor();};
  for(const width of [1280,375]){
    await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:5190/?qa#map');await page.locator('.world-canvas[data-ready=true]').waitFor();
    await run("st.resetData();st.state.settings.devDate='2026-10-05';");
    await page.locator('[data-place=yard]').click();await page.locator('.town-canvas[data-ready=true]').waitFor();
    await page.getByRole('button',{name:'放在这里',exact:true}).click();check(await run('return st.state.home.town.yard.length===1;'),'yard placement broken');
    await page.getByRole('button',{name:'日间',exact:true}).click();await capture('yard-day',width);
    await page.getByRole('button',{name:'夜间',exact:true}).click();await capture('yard-night',width);
    const town=await run('return JSON.stringify(st.state.home.town);');
    await page.getByRole('tab',{name:/院落布置/}).press('End');check(await page.getByRole('tab',{name:/观察册/}).evaluate(el=>el===document.activeElement),'tab focus missing');
    check(await page.locator('[data-observation-prompt]').count()===3,'not three prompts');
    check(await run('return st.state.home.observations.entries.length===0;'),'viewing created record');await capture('start',width);
    // Three active tasks stay intact: the notebook records an observation, not another task.
    await run("for(let i=0;i<3;i++)st.createPersonalTask({title:'手里的事',desc:'一版',cat:'create'});");
    const tasks=await run('return JSON.stringify([st.state.active,st.state.done,st.state.customTasks,st.state.home.lumens,st.state.home.glimmerDays]);');
    await page.getByRole('button',{name:'停在一片叶子旁',exact:true}).click();await page.locator('.observation-editor').waitFor();
    const id=await page.locator('[data-observation-page]').getAttribute('data-observation-page');
    check(await page.getByRole('button',{name:'收进观察册',exact:true}).isDisabled(),'empty collected');
    await page.locator('#observation-place').fill('楼下长椅旁');await page.locator('#observation-date').fill('2026-10-03');
    const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=640;c.height=480;const x=c.getContext('2d');x.fillStyle='#f0ecd8';x.fillRect(0,0,640,480);x.fillStyle='#9caf82';x.beginPath();x.ellipse(330,240,160,90,-.6,0,Math.PI*2);x.fill();x.strokeStyle='#5f7854';x.lineWidth=5;x.beginPath();x.moveTo(190,340);x.lineTo(460,160);x.stroke();return c.toDataURL('image/png');});
    await page.getByLabel('选择观察图片').setInputFiles({name:'leaf-fixture.png',mimeType:'image/png',buffer:Buffer.from(data.split(',')[1],'base64')});await page.locator('.observation-editor-images img').waitFor();
    check(await page.getByRole('button',{name:'收进观察册',exact:true}).isDisabled(),'photo alone collected');
    const text='  叶缘是一排细小的齿。\n靠近椅背的一侧，叶子更浅。\n一阵风过来，它的背面翻了一下。\n';
    await page.locator('#observation-body').fill(text);await page.getByRole('button',{name:'保存这一页',exact:true}).click();await capture('draft',width);
    check(await run('const e=st.state.home.observations.entries[0];return e.body===arg && e.images[0].startsWith("data:image/jpeg;base64,") && !!e.hint;',text),'text or image not saved');
    await back();await enter();await page.getByRole('button',{name:'接着写手里这一页',exact:true}).click();check(await page.locator('[data-observation-page]').getAttribute('data-observation-page')===id,'draft duplicated');
    await page.reload();await page.getByRole('tab',{name:/观察册/}).click();await page.getByRole('button',{name:'接着写手里这一页',exact:true}).click();check(await page.locator('#observation-body').inputValue()===text,'refresh lost draft');
    await page.getByRole('button',{name:'收进观察册',exact:true}).click();await page.locator('.observation-finding').waitFor();await capture('collected',width);
    check(await run('return JSON.stringify([st.state.active,st.state.done,st.state.customTasks,st.state.home.lumens,st.state.home.glimmerDays]);')===tasks,'notebook changed tasks/rewards');
    check(await run('return JSON.stringify(st.state.home.town);')===town,'notebook changed yard');
    const keptAt=await run('return st.state.home.observations.entries[0].keptAt;');
    await page.getByRole('button',{name:'再补一点发现'}).click();await page.locator('#observation-body').fill(text+'第二次停下来，发现叶柄有一点红。');await page.getByRole('button',{name:'保存这一页',exact:true}).click();await page.getByRole('button',{name:'看收好的记录'}).click();
    check(await run('return st.state.home.observations.entries[0].keptAt;')===keptAt,'revision changed collection date');
    await page.getByRole('button',{name:'去成长手记回望 ↗'}).click();await page.locator('[data-journal-observation]').waitFor();
    check((await page.locator('.gathered').innerText()).includes('在「楼下长椅旁」留下一个具体发现'),'day projection missing');await capture('journal',width);
    await page.locator(`[data-journal-observation="${id}"]`).click();check(await page.locator('[data-observation-page]').getAttribute('data-observation-page')===id,'journal opens wrong page');
    check(await page.locator('.observation-page h4').evaluate(el=>el===document.activeElement),'journal did not focus record');
    await page.getByRole('button',{name:'打开一张观察页 ＋',exact:true}).click();await page.locator('#observation-place').fill('校园路口');await page.locator('#observation-kind').selectOption('street');await page.locator('#observation-date').fill('2026-10-04');await page.locator('#observation-body').fill('两串脚步声从右侧走近，又向桥那边远去。');await page.getByRole('button',{name:'收进观察册',exact:true}).click();
    await page.getByRole('button',{name:'← 回到观察册',exact:true}).click();
    await page.locator('#observation-query').fill('叶缘');check(await page.locator('.observation-records button').count()===1,'search wrong');await page.locator('#observation-filter').selectOption('street');check(await page.locator('.observation-records button').count()===0,'category wrong');await page.locator('#observation-query').fill('');check(await page.locator('.observation-records button').count()===1,'street filter wrong');await page.locator('#observation-filter').selectOption('all');check(await page.locator('.observation-records button').count()===2,'all missing');await capture('book',width);
    const backup=await run('return st.exportData();');check(await run("const bad=JSON.parse(st.exportData());bad.state.home.observations.entries[0].observedOn='2026-02-30';const before=JSON.stringify(st.state);let refused=false;try{st.importData(JSON.stringify(bad));}catch{refused=true;}return refused&&before===JSON.stringify(st.state);"),'invalid backup changed state');
    await run('st.importData(arg);',backup);check(await run('return st.state.home.observations.entries.length===2 && st.state.home.observations.entries.some(e=>e.images.length===1);'),'backup lost records/image');
    await page.getByRole('button',{name:'去岩壁，找一件出门的事 ↗'}).click();await page.locator('.quests').waitFor();check((await page.locator('.quests').innerText()).includes('户外'),'outside link missing');
    await back();check(await page.locator('[data-place=yard] .place-count').innerText()==='2','map count missing');await capture('map',width);
    results.push({width,status:'PASS',mapTwoClicks:true,draftRefresh:true,realLocalImage:true,bodyWhitespacePreserved:true,requiresSpecificFinding:true,keptAndRevision:true,searchAndKind:true,journalAndDay:true,backup:true,threeTasksUnchanged:true,noPayout:true,yardDayNight:true});
  }
  const context=await page.context().browser().newContext(),plain=await context.newPage();try{await plain.goto('http://127.0.0.1:5190/#yard');await plain.getByRole('tab',{name:/观察册/}).click();check(await plain.locator('[data-observation-prompt]').count()===3,'plain DEV needs QA');}finally{await context.close();}
  check(!errors.length,JSON.stringify(errors));return {results,errors,normalDevPrompts:3,fixture:'local disposable ?qa only; Canvas image is a fixture'};
}
