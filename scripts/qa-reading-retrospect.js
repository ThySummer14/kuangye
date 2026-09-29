async (page) => {
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1280,375]) {
  await page.setViewportSize({width,height:900});
  await page.goto('http://127.0.0.1:5192/?qa#library');await page.reload();
  await page.waitForFunction(()=>window.__KUANGYE__);
  await page.evaluate(()=>window.__KUANGYE__.reset('map-navigation','empty'));
  await page.locator('[data-place=library]').click();
  await page.getByRole('region',{name:'阅读回望',exact:true}).waitFor();
  if(!await page.getByText('书架，给读过的日子留了位置。',{exact:true}).isVisible())throw Error('empty state missing');
  await page.evaluate(async()=>{
   const {state}=await import('/src/store.js');
   state.home.reading={books:[
    {id:'a',title:'沿着河岸慢慢走',author:'书屋体验样本',status:'shelved',started:'2026-09-01',finished:'2026-09-20',bookmark:'最后一页',next:'',qid:'',notes:[{text:'河流没有催促我。\n下一次散步，想把手机留在口袋里。',at:'2026-09-18',bookmark:'第 128 页'},{text:'树影落在书页上，想起了那条回家的小路。',at:'2026-09-03',bookmark:'第 16 页'}]},
    {id:'b',title:'给平凡日子的一封长信',author:'书屋体验样本',status:'shelved',started:'2026-09-10',finished:'',bookmark:'第三章',next:'继续看那封没有寄出的信。',qid:'',notes:[]},
    {id:'c',title:'窗边的四季',author:'',status:'shelved',started:'',finished:'2026-08-21',bookmark:'',next:'',qid:'',notes:[]},
    {id:'d',title:'手里的书',author:'',status:'reading',started:'2026-09-29',finished:'',bookmark:'第一页',next:'',qid:'',notes:[]}
   ]};
  });
  const before=await page.evaluate(async()=>JSON.stringify((await import('/src/store.js')).state.home));
  const section=page.getByRole('region',{name:'阅读回望',exact:true});
  await section.scrollIntoViewIfNeeded();await section.screenshot({path:`output/playwright/reading-retrospect-shelf-${width}.png`});
  await page.getByLabel('找一本书或一句话').fill('树影');
  if(await page.locator('.revisit-book').count()!==1)throw Error('note search');
  await page.locator('.revisit-book').click();
  const text=await page.locator('.revisit-timeline').innerText();
  if(text.indexOf('第 16 页')>text.indexOf('第 128 页'))throw Error('chronology');
  await page.locator('.revisit-detail').screenshot({path:`output/playwright/reading-retrospect-detail-${width}.png`});
  await page.getByRole('button',{name:'← 回到阅读回望',exact:true}).click();
  if(await page.evaluate(()=>document.activeElement.id)!=='revisit-a')throw Error('focus restore');
  await page.getByLabel('找一本书或一句话').fill('找不到的内容');
  await page.getByRole('button',{name:'查看全部记录',exact:true}).click();
  await page.getByRole('button',{name:'暂放着',exact:true}).click();
  if(await page.locator('.revisit-book').count()!==1)throw Error('paused filter');
  await page.locator('.revisit-book').click();
  if(!await page.getByText('当时留给下次的线索',{exact:true}).isVisible())throw Error('next clue');
  await page.getByRole('button',{name:'把这本带回阅读桌 ↗',exact:true}).click();
  if(await page.locator('.reading-paper h4').innerText()!=='给平凡日子的一封长信')throw Error('return to desk');
  if(await page.evaluate(()=>document.activeElement.getAttribute('aria-label'))!=='书签与摘记')throw Error('desk focus');
  const after=await page.evaluate(async()=>JSON.stringify((await import('/src/store.js')).state.home));
  if(before!==after)throw Error('read-only changed save');
  await page.getByRole('button',{name:'夜间',exact:true}).click();
  await section.screenshot({path:`output/playwright/reading-retrospect-night-${width}.png`});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('overflow');
  await page.getByRole('button',{name:'← 回到地图',exact:true}).click();await page.locator('[data-place=library]').click();
  results.push({width,status:'PASS',search:'title/author/note fields',chronology:true,save:'unchanged',focus:'restored',map:'reachable'});
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
