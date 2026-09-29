async (page) => {
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1280,375]) {
  await page.setViewportSize({width,height:width===375?812:1000});await page.goto('http://127.0.0.1:5191/?qa#map');await page.waitForFunction(()=>window.__KUANGYE__);
  await page.evaluate(()=>window.__KUANGYE__.reset('map-navigation','funded'));
  await page.locator('[data-place=shop]').click();await page.getByRole('tab',{name:'木匠铺',exact:true}).click();
  const entry=page.getByRole('button',{name:'近看长工作台与尺寸',exact:true});await entry.click();
  const dialog=page.getByRole('dialog',{name:'长工作台 · 近看与尺寸'});await dialog.locator('.detail-canvas[data-ready=true]').waitFor();
  if(!await dialog.getByText('1.5 × 0.5 米',{exact:true}).count())throw Error('Footprint mismatch');
  await dialog.getByRole('button',{name:'旋转 90°',exact:true}).click();
  if(!await dialog.getByText('0.5 × 1.5 米',{exact:true}).count())throw Error('Rotated footprint mismatch');
  await dialog.getByRole('button',{name:'显示占地',exact:true}).click();await dialog.getByRole('button',{name:'显示占地',exact:true}).click();
  await dialog.screenshot({path:`output/playwright/furniture-detail-day-${width}.png`,timeout:10000});
  await dialog.getByRole('button',{name:'看看夜间',exact:true}).click();await dialog.screenshot({path:`output/playwright/furniture-detail-night-${width}.png`,timeout:10000});
  const canvas=await dialog.locator('canvas').boundingBox();await page.mouse.move(canvas.x+canvas.width*.5,canvas.y+canvas.height*.5);await page.mouse.down();await page.mouse.move(canvas.x+canvas.width*.7,canvas.y+canvas.height*.52,{steps:12});await page.mouse.up();
  const before=await page.evaluate(()=>window.__KUANGYE__.snapshot().home.lumens);
  await dialog.getByRole('button',{name:'带回家 ＋',exact:true}).click();
  const after=await page.evaluate(()=>window.__KUANGYE__.snapshot().home);
  if(before-after.lumens!==130||after.inventory.filter(i=>i.fid==='desk').length!==1)throw Error('Purchase mismatch');
  await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
  if(!await entry.evaluate(e=>e===document.activeElement))throw Error('Focus not restored');
  await entry.click();await dialog.locator('.detail-canvas[data-ready=true]').waitFor();
  await dialog.getByRole('button',{name:'回家布置 ↗',exact:true}).click();await page.waitForURL('**#home');await page.locator('.home-canvas[data-ready=true]').waitFor();
  results.push({width,purchase:130,rotation:'PASS',reopen:'PASS',focus:'PASS',overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
