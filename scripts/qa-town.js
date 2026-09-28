async (page) => {
  const errors=[],results=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1280,375]) {
    await page.setViewportSize({width,height:width===375?812:900});
    await page.goto('http://127.0.0.1:5187/?qa#map');
    await page.waitForFunction(()=>window.__KUANGYE__);
    await page.evaluate(()=>window.__KUANGYE__.reset('map-navigation','empty'));
    await page.locator('.world-canvas[data-ready=true]').waitFor();
    await page.locator('[data-place="yard"]').click();
    await page.locator('.town-canvas[data-ready=true]').waitFor();
    const grid=page.getByRole('group',{name:'院落平面布局'});
    await grid.locator('[data-cell="0-0"]').click();
    await page.getByRole('button',{name:'放在这里',exact:true}).click();
    await page.getByRole('button',{name:'小枫树 窗外多一点树影',exact:true}).click();
    await grid.locator('[data-cell="1-0"]').click();
    if(!await page.getByRole('button',{name:'放在这里',exact:true}).isDisabled())throw Error('Collision accepted');
    await grid.locator('[data-cell="4-0"]').click();await page.getByRole('button',{name:'放在这里',exact:true}).click();
    await page.getByRole('button',{name:'木长椅 已摆放 · 可移动',exact:true}).click();
    await page.getByRole('button',{name:'旋转 90° ↻',exact:true}).click();
    await grid.locator('[data-cell="0-2"]').click();await page.getByRole('button',{name:'移到这里',exact:true}).click();
    await page.getByRole('button',{name:'收回材料栏',exact:true}).click();
    await grid.locator('[data-cell="0-0"]').click();await page.getByRole('button',{name:'放在这里',exact:true}).click();
    for(const [name,cell] of [['花箱 把颜色摆在门口','1-2'],['庭院路灯 晚上也有一盏暖光','5-3'],['晾衣架 像一个有人住的家','4-1'],['浅水鸟盆 给路过的小鸟留点水','1-3']]) {
      await page.getByRole('button',{name,exact:true}).click();await grid.locator(`[data-cell="${cell}"]`).click();await page.getByRole('button',{name:'放在这里',exact:true}).click();
    }
    await grid.locator('[data-cell="2-2"]').click();
    if(!await page.getByRole('button',{name:'移到这里',exact:true}).isDisabled())throw Error('Path blocked');
    await page.getByRole('button',{name:'搭配房屋',exact:true}).click();
    for(const name of ['雨蓝瓦','陶土粉','深绿门','有顶门廊','木板小径'])await page.getByRole('button',{name,exact:true}).click();
    await page.locator('.town-scene').screenshot({path:`output/playwright/town-yard-day-${width}.png`});
    await page.getByRole('group',{name:'预览光线'}).getByRole('button',{name:'夜间',exact:true}).click();
    await page.locator('.town-scene.night').screenshot({path:`output/playwright/town-yard-night-${width}.png`});
    await page.getByRole('group',{name:'预览光线'}).getByRole('button',{name:'日间',exact:true}).click();
    await page.locator('.yard-editor').scrollIntoViewIfNeeded();await page.screenshot({path:`output/playwright/town-editor-${width}.png`});
    await page.getByRole('button',{name:'← 回到地图',exact:true}).click();await page.reload();
    await page.locator('.world-canvas[data-ready=true]').waitFor();
    const loaded=await page.evaluate(()=>window.__KUANGYE__.snapshot().home);
    if(loaded.town.yard.length!==6||loaded.town.exterior.roof!=='blue'||loaded.lumens!==0)throw Error('Yard save/economy failed');
    await page.locator('.world-map').screenshot({path:`output/playwright/town-map-${width}.png`});
    await page.locator('[data-place="library"]').click();await page.locator('.town-canvas[data-ready=true]').waitFor();
    if(await page.getByRole('button',{name:'打开一扇窗',exact:true}).count())throw Error('Locked repair offered');
    await page.locator('.town-scene').screenshot({path:`output/playwright/town-library-before-${width}.png`});
    await page.getByRole('button',{name:'看看这段阅读怎么开始',exact:true}).click();
    await page.getByRole('button',{name:'接下这件事',exact:true}).click();
    await page.waitForURL('**#tasks');
    await page.evaluate(async()=>{
      const s=await import('/src/store.js'); const a=s.activeOf('read-s1');
      for(const day of ['2026-09-26','2026-09-27','2026-09-28']){s.state.settings.devDate=day;s.checkIn(a);}
    });
    await page.locator('[data-active-task="read-s1"]').getByRole('button',{name:'我完成了',exact:true}).click();
    await page.locator('#quest-review').fill('第一次把读书留给了睡前的十分钟。');
    await page.getByRole('button',{name:'完成，收下这束光',exact:true}).click();
    await page.getByRole('button',{name:'去街角书屋，留下一点变化 ↗',exact:true}).click();
    const before=(await page.evaluate(()=>window.__KUANGYE__.snapshot())).home.lumens;
    await page.getByRole('button',{name:'打开一扇窗',exact:true}).click();
    await page.evaluate(async()=>{
      const s=await import('/src/store.js');
      for(const qid of ['read-s2','read-s3'])s.state.done.push({qid,xp:0,at:'2026-09-28',review:'读完以后，想把这页留在街角。',units:[],logs:[]});
    });
    await page.getByRole('button',{name:'安好街角书架',exact:true}).click();
    await page.getByRole('button',{name:'为书屋亮一盏灯',exact:true}).click();
    await page.locator('.library-light').getByRole('button',{name:'夜间',exact:true}).click();
    await page.locator('.town-scene.night').screenshot({path:`output/playwright/town-library-after-${width}.png`});
    await page.locator('.library-current').scrollIntoViewIfNeeded();await page.screenshot({path:`output/playwright/town-library-story-${width}.png`});
    const roundTrip=await page.evaluate(async()=>{
      const s=await import('/src/store.js');const before=s.exportData();s.importData(before);
      return {town:JSON.parse(JSON.stringify(s.state.home.town)),lumens:s.state.home.lumens,done:s.state.done.length,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    if(roundTrip.lumens!==before||roundTrip.town.library!==3||roundTrip.overflow)throw Error('Repair restore/economy failed');
    await page.getByRole('button',{name:'← 回到地图',exact:true}).click();await page.reload();await page.locator('.world-canvas[data-ready=true]').waitFor();
    if(!await page.getByText('街角书屋 · 灯已亮起',{exact:true}).count())throw Error('Map library status missing');
    results.push({width,status:'PASS',library:roundTrip.town.library,objects:roundTrip.town.yard.length,lumens:before});
  }
  if(errors.length)throw Error(errors.join('\n'));
  return {results,errors};
}
