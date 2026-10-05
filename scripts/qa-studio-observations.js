async (page) => {
  const browser=page.context().browser(),errors=[],results=[];
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  for(const mode of ['dev','release']) for(const width of [1280,375]) {
    const context=await browser.newContext({viewport:{width,height:900}}),p=await context.newPage();
    p.on('pageerror',error=>errors.push(error.message));
    const origin=mode==='dev'?'http://127.0.0.1:5192/?qa':'http://127.0.0.1:5193/';
    const read=()=>p.evaluate(()=>JSON.parse(localStorage.getItem(location.search.includes('qa')?'kuangye.qa.v3':'kuangye.v3')));
    const start=async()=>{await p.getByRole('button',{name:'开始创作',exact:true}).click();await p.locator('.studio-observations').waitFor();};
    const back=async()=>{await p.getByRole('button',{name:'← 回到地图',exact:true}).click();await p.locator('.world-canvas[data-ready=true]').waitFor();};
    const enter=async()=>{await p.locator('[data-place=atelier]').click();await p.locator('.studio-observations').waitFor();};
    const capture=async(name)=>{
      await p.locator('.toast').waitFor({state:'hidden'});
      check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${mode} ${width} ${name} overflow`);
      const dialog=p.getByRole('dialog');if(await dialog.count())check(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth),'dialog overflow');
      else await p.evaluate(()=>scrollTo(0,0));
      await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await p.screenshot({path:`output/playwright/studio-observations-${mode}-${name}-${width}.png`});
    };
    const row=id=>p.locator(`[data-studio-observation="fixture-observe-${id}"]`);
    const select=async id=>{await start();await p.locator('#studio-observation-query').fill(`观察编号${id}。`);await row(id).waitFor();await row(id).click();};
    const take=async(id,title)=>{
      await select(id);await p.getByRole('dialog',{name:'把发现带到画室'}).waitFor();
      await p.locator('#craft-title').fill(title);await p.locator('#craft-criterion').fill('写出自己的一段新文字。');
      await p.getByRole('button',{name:'接下这件创作，去画室',exact:true}).click();await p.locator('[data-studio-work]').waitFor();
      return p.locator('[data-studio-work]').getAttribute('data-studio-work');
    };
    try {
      await p.goto(origin+'#map');await p.locator('.world-canvas[data-ready=true]').waitFor();await enter();
      check(await p.locator('[data-studio-observation]').count()===0,'empty page has material');await capture('empty');
      await p.getByRole('button',{name:'去观察册，留一页发现 ↗',exact:true}).click();await p.locator('.observation-book').waitFor();
      await p.getByRole('button',{name:'开始自己的观察',exact:true}).click();await p.locator('#observation-place').fill('正在写的窗边');
      await back();await enter();check(await p.locator('[data-studio-observation]').count()===0,'draft listed');
      check((await p.locator('.picker-empty').innerText()).includes('手里那页还在写'),'draft hint missing');await capture('draft');
      await p.evaluate(()=>{
        const key=location.search.includes('qa')?'kuangye.qa.v3':'kuangye.v3',s=JSON.parse(localStorage.getItem(key));
        const c=document.createElement('canvas');c.width=160;c.height=120;const x=c.getContext('2d');x.fillStyle='#efe9d7';x.fillRect(0,0,160,120);x.fillStyle='#88a076';x.beginPath();x.ellipse(80,60,55,25,-.6,0,Math.PI*2);x.fill();const image=c.toDataURL('image/png');
        const entries=Array.from({length:45},(_,i)=>{const date=new Date(Date.UTC(2026,9,5-i)).toISOString().slice(0,10);return {id:`fixture-observe-${i}`,place:i===0?'长地点：'+('窗边细长的光影'.repeat(10)):i===44?'最早的桥边':`近处第${i}次停下`,body:`观察编号${i}。\n`+(i===44?'最早的细节：小石桥。':'叶缘有细齿，光落在背面。这是一次性本地fixture，长正文只在列表节选，预览要保留全部。'.repeat(i===0?10:1)),hint:'',kind:['plant','sky','street','other'][i%4],observedOn:date,images:i===0?[image]:[],status:'kept',createdAt:date,keptAt:date};});
        s.home.observations.entries=[...s.home.observations.entries,...entries];localStorage.setItem(key,JSON.stringify(s));
      });
      await p.reload();await p.locator('.studio-observations').waitFor();
      check((await read()).home.observations.entries.length===46,'history truncated on load');
      check(await p.locator('[data-studio-observation]').count()===3,'not three recent entries');
      check(await row(0).count()===1 && await row(2).count()===1,'wrong date order');
      check(await p.locator('.picker-mark img').evaluate(img=>img.complete&&img.naturalWidth===160),'material thumbnail not decoded');await capture('recent');
      await p.locator('#studio-observation-query').fill('最早的细节');await row(44).waitFor();check(await p.locator('[data-studio-observation]').count()===1,'oldest not searchable');await capture('oldest');
      await p.locator('#studio-observation-kind').selectOption('sky');check(await p.locator('[data-studio-observation]').count()===0,'combined filter wrong');
      await p.getByRole('button',{name:'清除筛选，看看全部',exact:true}).click();check(await p.locator('#studio-observation-query').inputValue()===''&&await p.locator('#studio-observation-kind').inputValue()==='all','clear failed');
      await p.locator('#studio-observation-kind').selectOption('street');check((await p.locator('.picker-count').innerText()).includes('11 页'),'kind count wrong');
      await p.locator('#studio-observation-kind').selectOption('all');
      while(await p.locator('.picker-more').count())await p.locator('.picker-more').click();
      check(await p.locator('[data-studio-observation]').count()===45,'expand truncated history');
      await back();await enter();const before=JSON.stringify(await read()),trigger=row(0);await trigger.click();
      await p.getByRole('dialog',{name:'把发现带到画室'}).waitFor();check(JSON.stringify(await read())===before,'two-click preview wrote data');
      check((await p.locator('.source-finding').textContent()).includes('观察编号0。'),'preview incomplete');await capture('preview');
      await p.getByRole('dialog').press('Escape');await p.getByRole('dialog').waitFor({state:'hidden'});
      check(JSON.stringify(await read())===before,'cancel wrote data');check(await trigger.evaluate(el=>el===document.activeElement),'cancel focus lost');
      const doneId=await take(0,'窗边的一段文字');
      check(await p.locator('.work-title').evaluate(el=>el===document.activeElement),'work title not focused');
      check(await p.locator('#studio-body').inputValue()===''&&await p.locator('.editor-images img').count()===0,'material became artifact');
      check(await p.getByRole('button',{name:'我做好了，收好这件作品',exact:true}).isDisabled(),'blank completed');
      await p.locator('#studio-body').fill('这是看过窗边之后，我自己写出的一段文字。');
      await p.getByRole('button',{name:'我做好了，收好这件作品',exact:true}).click();await p.getByRole('button',{name:'完成，记下这一刻',exact:true}).click();
      await p.getByRole('button',{name:'去画室看看这件作品 ↗',exact:true}).click();
      await start();check((await row(0).innerText()).includes('已收好'),'done label wrong');
      const beforeDone=JSON.stringify(await read());await row(0).click();check(await p.locator('[data-studio-work]').getAttribute('data-studio-work')===doneId,'done wrong work');check(JSON.stringify(await read())===beforeDone,'done opening wrote data');
      await p.getByRole('button',{name:'陈列到小家',exact:true}).click();await p.getByRole('button',{name:'去小家看看 ↗',exact:true}).click();await p.locator('.home-canvas[data-ready=true]').waitFor();
      for(const light of ['day','night']){await p.getByRole('combobox',{name:/光线/}).selectOption(light);await capture('home-'+light);}
      await back();await enter();const restId=await take(1,'天空的一段文字');await p.locator('#studio-body').fill('还在整理的一版。');
      await p.getByRole('button',{name:'先放一放',exact:true}).click();await p.getByRole('button',{name:'暂时放下',exact:true}).click();
      await start();await p.locator('#studio-observation-query').fill('观察编号1。');await row(1).waitFor();check((await row(1).innerText()).includes('先放着'),'rest label wrong');
      const beforeRest=JSON.stringify(await read());await row(1).click();check(await p.locator('[data-studio-work]').getAttribute('data-studio-work')===restId,'rest wrong work');check(JSON.stringify(await read())===beforeRest,'rest auto resumed');
      const workingId=await take(2,'路边的一段文字');await start();check((await row(2).innerText()).includes('正在做'),'working label wrong');
      for(let i=0;i<2;i++){
        await p.getByRole('button',{name:'开始自己的作品 ＋',exact:true}).click();await p.locator('#studio-start-title').fill(`另一件fixture ${i}`);await p.locator('#studio-start-criterion').fill('留下一版。');await p.getByRole('button',{name:'接下这件创作',exact:true}).click();await p.locator('[data-studio-work]').waitFor();await start();
      }
      check((await read()).active.length===3,'three fixture tasks missing');const full=JSON.stringify(await read());
      await p.locator('#studio-observation-query').fill('观察编号3。');await row(3).waitFor();await row(3).click();await p.getByRole('dialog',{name:'把发现带到画室'}).waitFor();
      check(await p.getByRole('button',{name:'接下这件创作，去画室',exact:true}).isDisabled(),'full can take');await capture('full');await p.getByRole('dialog').press('Escape');check(JSON.stringify(await read())===full,'full preview wrote data');
      await select(1);check(await p.locator('[data-studio-work]').getAttribute('data-studio-work')===restId,'full rest unavailable');check(await p.getByRole('button',{name:'接着做这件作品',exact:true}).isDisabled(),'full rest can resume');await capture('rest-full');
      await select(2);check(await p.locator('[data-studio-work]').getAttribute('data-studio-work')===workingId,'full working unavailable');
      await select(0);check(await p.locator('[data-studio-work]').getAttribute('data-studio-work')===doneId,'full done unavailable');check(JSON.stringify(await read())===full,'linked opening wrote data');
      await p.reload();await p.locator('.studio-observations').waitFor();await p.locator('#studio-observation-query').fill('观察编号1。');await row(1).waitFor();await row(1).click();check(await p.locator('[data-studio-work]').getAttribute('data-studio-work')===restId,'refresh wrong work');
      const saved=await read();check(saved.home.observationWorks.length===3&&saved.home.observations.entries.length===46&&saved.home.studio.works.length===5,'repeat/refresh duplicated or lost data');
      results.push({mode,width,status:'PASS',emptyDraftCTA:true,history45:true,searchOldest:true,kindAndClear:true,expandAll:true,localImageDecoded:true,mapTwoClicks:true,cancelReadOnlyFocus:true,explicitTakeBlankArtifact:true,linkedWorkingRestDone:true,fullCapReadOnly:true,restExplicitResumeCap:true,refresh:true,homeDayNight:true});
    }finally{await context.close();}
  }
  check(!errors.length,JSON.stringify(errors));return {results,errors,fixture:'isolated browser contexts; 45 observation pages and one draft, local Canvas image; no production access'};
}
