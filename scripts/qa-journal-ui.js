async (page) => {
  const origin='http://127.0.0.1:5197', errors=[], results=[];
  page.on('pageerror',e=>errors.push(e.message));
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  const button=name=>page.getByRole('button',{name,exact:true});
  const frame=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  let storeURL;
  const snapshot=()=>page.evaluate(async url=>JSON.stringify((await import(url)).state),storeURL);
  const back=async()=>{
    await button('← 回到地图').click();
    await page.locator('.world-canvas[data-ready=true]').waitFor();
  };
  const capture=async(name,width)=>{
    await frame();
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}/${name}: overflow`);
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:`output/playwright/journal-ui-${name}-${width}.png`,fullPage:true});
  };
  for(const width of [1280,375]) {
    await page.setViewportSize({width,height:900});
    await page.goto(origin+'/?qa#map');await page.reload();
    await page.locator('.world-canvas[data-ready=true]').waitFor();
    storeURL=await page.evaluate(()=>performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/store.js').name);
    // This browser uses only the dedicated disposable QA save.
    await page.evaluate(async url=>{
      const {state}=await import(url),{emptyHome}=await import('/src/game/home.js');
      Object.assign(state,{home:emptyHome(),active:[],done:[],abandoned:[],customTasks:[],settings:{devDate:'2026-10-03'}});
    },storeURL);
    await frame();await page.locator('.world-canvas[data-ready=true]').waitFor();
    const before=await snapshot();
    const choices=page.locator('.starting-choices');
    await choices.locator('summary').click();
    await page.getByRole('group',{name:'出发方向'}).getByRole('button',{name:'做点自己的东西',exact:true}).click();
    await page.getByRole('group',{name:'出发时间'}).getByRole('button',{name:'15 分钟内',exact:true}).click();
    check(await page.locator('.map-action-title').textContent()==='录下自己说话，然后听回放','short creation suggestion');
    await page.locator('.little-task').screenshot({path:`output/playwright/journal-ui-choices-${width}.png`});
    await page.getByRole('group',{name:'出发方向'}).getByRole('button',{name:'靠近一个人',exact:true}).click();
    const first=await page.locator('.map-action-title').textContent();
    await button('换一件看看').click();
    check(await page.locator('.map-action-title').textContent()!==first,'manual suggestion change');
    await page.getByRole('group',{name:'出发方向'}).getByRole('button',{name:'给头脑留点时间',exact:true}).click();
    check(!await page.locator('.map-action-title').count(),'empty time combination invented a task');
    await page.locator('.little-task').screenshot({path:`output/playwright/journal-ui-empty-${width}.png`});
    check(await snapshot()===before,'browsing choices wrote the save');
    await button('去岩壁找起点 ↗').click();
    check(await page.locator('[data-trail=think]').getAttribute('aria-pressed')==='true','empty state did not open notebook');
    await back();await choices.locator('summary').click();
    await page.getByRole('group',{name:'出发方向'}).getByRole('button',{name:'做点自己的东西',exact:true}).click();
    await choices.locator('summary').click();
    await capture('map',width);
    const order=await page.evaluate(()=>{
      const card=document.querySelector('.little-task').getBoundingClientRect(),places=document.querySelector('.map-places').getBoundingClientRect();
      return {actionBeforePlaces:card.top<places.top,topbar:document.querySelector('.topbar').getBoundingClientRect().height};
    });
    check(width!==375||order.actionBeforePlaces,'mobile action after places');
    await button('接下这一步').click();
    await page.locator('[data-active-task=selfrec]').waitFor();
    check(await page.evaluate(()=>document.activeElement?.dataset.activeTask)==='selfrec','accepted task was not focused');
    const active=page.locator('[data-active-task=selfrec]');
    await active.getByRole('button',{name:'写下我的安排 ↗',exact:true}).click();
    await active.getByLabel('什么时候开始').fill('晚饭后');
    await active.getByLabel('我的第一步').fill('打开录音，先说一段今天发生的小事。');
    await active.getByRole('button',{name:'收好便笺',exact:true}).click();
    const cardWidth=await active.evaluate(e=>e.getBoundingClientRect().width);
    check(cardWidth>=(width===375?260:600),`${width}: single active card too narrow`);
    await capture('task',width);await back();
    check(!await choices.count(),'suggestions displaced active work');
    check(await page.locator('.map-plan-note').textContent().then(t=>t.includes('晚饭后')),'active plan missing on map');
    await capture('continuation',width);
    await page.reload();await page.locator('.world-canvas[data-ready=true]').waitFor();
    storeURL=await page.evaluate(()=>performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/store.js').name);
    check(await page.locator('.map-plan-note').textContent().then(t=>t.includes('打开录音')),'plan was not persisted');
    await button('打开进行中').click();
    check(await page.evaluate(()=>document.activeElement?.dataset.activeTask)==='selfrec','continuation was not focused');
    await back();
    const pages=[['home','小芽的家'],['shop','林间集市'],['journal','成长手记'],['library','街角书屋'],['yard','家门前的院子'],['woodshop','木器铺'],['tasks','任务岩壁']];
    for(const [id,title] of pages) {
      await page.locator(`[data-place=${id}]`).click();
      await page.getByRole('heading',{name:title,exact:true,level:1}).waitFor();
      if(['home','library','yard'].includes(id))await page.locator((id==='home'?'.home-canvas':'.town-canvas')+'[data-ready=true]').waitFor();
      await capture(id,width);
      if(id==='home') {await page.getByRole('combobox',{name:/光线/}).selectOption('night');await capture('home-night',width);await page.getByRole('combobox',{name:/光线/}).selectOption('day');}
      if(id==='yard') {await button('搭配房屋').click();await button('夜间').click();await page.locator('.town-scene').screenshot({path:`output/playwright/journal-ui-yard-night-${width}.png`});}
      if(id==='library') {await page.getByRole('group',{name:'书屋预览光线'}).getByRole('button',{name:'夜间',exact:true}).click();await page.locator('.town-scene').screenshot({path:`output/playwright/journal-ui-library-night-${width}.png`});}
      if(id==='tasks') {await button('去看五条成长线 ↗').click();await page.getByRole('heading',{name:'成长线',exact:true,level:1}).waitFor();await capture('chains',width);}
      await back();
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    check(await page.locator('.primary-button').evaluate(e=>parseFloat(getComputedStyle(e).transitionDuration)<=.001),'reduced motion transition');
    await page.emulateMedia({reducedMotion:'no-preference'});
    const state=JSON.parse(await snapshot());
    check(state.active.length===1 && state.home.lumens===0 && !state.done.length,'UI changed task rewards or count');
    results.push({width,...order,placePages:9,readonlyChoices:true,shortTask:true,emptyState:true,manualChange:true,acceptedFocus:true,planPersistence:true,continuationFocus:true,dayNight:true,reducedMotion:true});
  }
  check(!errors.length,errors.join('\n'));
  return {mode:'local QA, disposable fixture',results,errors};
}
