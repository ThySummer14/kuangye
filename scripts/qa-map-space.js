async (page) => {
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1280,375]) {
  await page.setViewportSize({width,height:width===375?812:1000});
  await page.goto('http://127.0.0.1:5190/?qa#map');await page.locator('.world-canvas[data-ready=true]').waitFor();
  const nav=page.getByRole('navigation',{name:'地图上的场所'});
  const boxes=()=>nav.locator('button').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
  const before=await boxes();
  const stage=await page.locator('.world-stage').boundingBox();
  for(const direction of [1,-1,1]) {
   await page.mouse.move(stage.x+stage.width*.5,stage.y+stage.height*.6);await page.mouse.down();
   await page.mouse.move(stage.x+stage.width*(.5+.25*direction),stage.y+stage.height*.6,{steps:25});await page.mouse.up();
   const after=await boxes();if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Place buttons moved while rotating');
  }
  for(let i=0;i<before.length;i++)for(let j=i+1;j<before.length;j++){const a=before[i],b=before[j];if(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)throw Error('Place buttons overlap');}
  await page.getByRole('button',{name:'恢复地图视角',exact:true}).click();await page.mouse.move(0,0);
  await page.screenshot({path:`output/playwright/map-space-${width}.png`,fullPage:true,timeout:10000});
  await page.locator('[data-place=library]').focus();await page.locator('.place-marker').waitFor();
  if(await page.locator('.place-marker').count()!==1)throw Error('Marker count');
  await page.locator('[data-place=library]').click();await page.waitForURL('**#library');
  await page.getByRole('button',{name:'← 回到地图',exact:true}).click();await page.locator('.world-canvas[data-ready=true]').waitFor();
  await page.evaluate(()=>document.querySelector('.world-canvas canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  await page.locator('.world-map.map-offline').waitFor();await page.locator('[data-place=yard]').click();await page.waitForURL('**#yard');
  results.push({width,rotation:'stable',overlap:false,library:'reachable',fallback:'reachable',overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
