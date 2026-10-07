async(page)=>{
 const results=[],origin='https://thysummer14.github.io/kuangye/',browser=page.context().browser();
 for(const width of [1280,375]){
  const context=await browser.newContext({viewport:{width,height:900}}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto(origin+'#map');await p.locator('.world-canvas[data-ready=true]').waitFor();await p.locator('[data-place=tasks]').click();await p.locator('.challenger-entry').click();await p.locator('.life-grid').waitFor();
   if(await p.locator('.life-card').count()!==14)throw Error('Missing lifetime cards');
   if(await p.locator('.life-card.earned').count()!==0)throw Error('New save earned medals');
   await p.locator('.life-card').last().scrollIntoViewIfNeeded();await p.locator('.life-hero').scrollIntoViewIfNeeded();
   await p.waitForFunction(()=>[...document.querySelectorAll('.lifetime img')].every(i=>i.complete&&i.naturalWidth>0));
   await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`output/playwright/lifetime-live-${width}.png`,fullPage:true});
   if(!await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Overflow');
   await p.locator('[data-life-operation=life-cet6]').click();await p.locator('.medal-canvas[data-ready=true]').waitFor();await p.getByRole('button',{name:'背面',exact:true}).click();
   if(Number((await p.locator('.medal-canvas').getAttribute('data-camera')).split(',')[2])>=0)throw Error('Back camera failed');
   await p.screenshot({path:`output/playwright/lifetime-live-model-${width}.png`});await p.keyboard.press('Escape');
   await p.getByRole('button',{name:'加码行动 06',exact:true}).click();if(await p.locator('[data-operation]').count()!==6)throw Error('Legacy actions');
   if(errors.length)throw Error(errors.join('\n'));
   results.push({width,status:'PASS',cards:14,mapTwoClicks:true,live3d:true,legacyActions:6,errors});
  }catch(error){results.push({width,status:'FAIL',error:String(error),errors});}
  await context.close();
 }
 return results;
}
