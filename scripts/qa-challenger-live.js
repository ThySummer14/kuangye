async(page)=>{
 const results=[];
 for(const width of [1280,375]){
  const c=await page.context().browser().newContext({viewport:{width,height:900}}),p=await c.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  p.on('response',r=>{if(r.url().startsWith('https://thysummer14.github.io/kuangye/')&&r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  const response=await p.goto('https://thysummer14.github.io/kuangye/#challenger');
  await p.locator('.operation-card').first().waitFor();await p.waitForTimeout(1300);
  if(response.status()!==200 || await p.locator('.operation-card').count()!==6)throw Error('live album missing');
  if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('live overflow');
  const before=await p.evaluate(()=>localStorage.getItem('kuangye.v3'));
  await p.getByRole('button',{name:'旋转观察临界之上蚀刻章',exact:true}).click();
  await p.locator('.medal-canvas[data-ready=true]').waitFor();await p.getByRole('button',{name:'背面',exact:true}).click();
  if(!await p.evaluate(()=>performance.getEntriesByType('resource').some(entry=>entry.name.includes('/challenger/engraving-atlas.png'))))throw Error('live viewer is missing refined engraving artwork');
  if(Number((await p.locator('.medal-canvas').getAttribute('data-camera')).split(',')[2])>=0)throw Error('live 3D back view failed');
  await p.getByRole('button',{name:'正面',exact:true}).click();await p.screenshot({path:`output/playwright/challenger-live-3d-${width}.png`});await p.keyboard.press('Escape');
  if(await p.locator('.challenge-hero').evaluate(el=>el.scrollLeft!==0))throw Error('focus return scrolled hero horizontally');
  const inspectBox=await p.locator('.hero-inspect-link').boundingBox(),footBox=await p.locator('.hero-foot').boundingBox();
  if(inspectBox.y+inspectBox.height>footBox.y)throw Error('hero inspect overlaps footer');
  await p.locator('.challenge-hero').screenshot({path:`output/playwright/challenger-live-hero-${width}.png`});
  await p.locator('.challenge-tabs').getByRole('button',{name:/蚀刻章/}).click();
  if(await p.locator('.challenge-medal.earned').count()!==0)throw Error('live preview pretends medals earned');
  await p.locator('.challenge-tabs').getByRole('button',{name:/挑战一览/}).click();
  await p.locator('[data-operation=prototype]').click();for(const i of await p.locator('.challenge-terms input').all())await i.check();
  if(await p.locator('.challenge-rating strong').innerText()!=='12')throw Error('live rating failed');
  await p.keyboard.press('Escape');
  if(await p.evaluate(()=>localStorage.getItem('kuangye.v3'))!==before)throw Error('preview wrote data');
  await p.getByRole('button',{name:'← 回到地图',exact:true}).click();await p.locator('.world-canvas[data-ready=true]').waitFor();
  await p.locator('[data-place=tasks]').click();await p.locator('.challenger-entry').click();await p.locator('.challenger').waitFor();
  if(errors.length)throw Error(errors.join('\n'));
  results.push({width,status:'PASS',http:response.status(),operations:6,unearnedMedals:4,maxSelectedRating:12,mapEntryClicks:2,threeDimensionalMedal:true,errors});await c.close();
 }
 return results;
}
