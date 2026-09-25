async (page) => {
 const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1280,375]){
  await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:5182/?qa#map');
  await page.waitForFunction(() => window.__KUANGYE__);
  await page.evaluate(()=>window.__KUANGYE__.reset('map-navigation'));
  await page.locator('[data-place="journal"]').click();await page.waitForURL('**#panel');
  await page.getByRole('button',{name:'营地印记柜',exact:true}).click();
  await page.addStyleTag({content:'html,body,*{scroll-behavior:auto!important}'});
  if(await page.locator('[data-etching]').count()!==8)throw Error('Eight art identities required');
  const before=await page.evaluate(()=>window.__KUANGYE__.snapshot());
  for(const tier of ['素刻','嵌纹','镀彩']){
   await page.getByRole('button',{name:tier,exact:true}).click();
   await page.locator('.etching-cabinet').scrollIntoViewIfNeeded();
   await page.locator('.etching-cabinet').screenshot({path:`output/playwright/etchings-${tier}-${width}.png`});
   await page.waitForFunction(()=>[...document.querySelectorAll('.etching-piece img')].every(i=>i.complete&&i.naturalWidth>0));
  }
  // Batches 01–02, 03–05 and 06–08: open every three-stage detail and restore focus.
  for(const batch of [[0,1],[2,3,4],[5,6,7]]){
   for(const i of batch){
    const button=page.locator('[data-etching]').nth(i);await button.click();
    await page.getByRole('dialog').waitFor();
    await page.waitForFunction(()=>[...document.querySelectorAll('dialog img')].every(i=>i.complete&&i.naturalWidth>0));
    await page.getByRole('dialog').screenshot({path:`output/playwright/etching-${i+1}-${width}.png`});
    await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});
    if(!await button.evaluate(e=>e===document.activeElement))throw Error('Dialog focus not restored');
   }
   results.push({width,batch:batch.map(i=>i+1),pass:true});
  }
  const after=await page.evaluate(()=>window.__KUANGYE__.snapshot());
  if(after.viewport.overflow||JSON.stringify(before.home)!==JSON.stringify(after.home)||before.completedTasks!==after.completedTasks)throw Error('Art previews changed state or overflowed');
  await page.getByRole('button',{name:'← 回到地图',exact:true}).click();await page.waitForURL('**#map');
 }
 if(errors.length)throw Error(errors.join('\n'));return {batches:results,pageErrors:errors};
}
