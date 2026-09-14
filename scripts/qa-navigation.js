async (page) => {
  const results = [];
  for (const width of [1280,375]) {
    await page.setViewportSize({width,height:900});
    await page.goto('http://127.0.0.1:5182/?qa#map');
    await page.evaluate(() => window.__KUANGYE__.reset('map-navigation'));
    for (const [name,place] of [['⌂ 小芽的家','home'],['♧ 林间集市','shop'],['☷ 任务岩壁','tasks'],['⌁ 瞭望台 · 成长手记','panel']]) {
      await page.locator('[data-place="'+(place==='panel'?'journal':place)+'"]').click();
      await page.waitForURL('**#'+place);
      await page.getByRole('button',{name:'← 回到地图',exact:true}).waitFor();
      const state = await page.evaluate(() => window.__KUANGYE__.snapshot());
      if(state.viewport.overflow) throw new Error('Overflow: '+place);
      results.push({width,place,pass:true});
      await page.getByRole('button',{name:'← 回到地图',exact:true}).click();
      await page.waitForURL('**#map');
    }
    await page.screenshot({path:'output/playwright/map-navigation-'+width+'.png'});
    results.push(await page.evaluate(() => window.__KUANGYE__.snapshot()));
  }
  return results;
}
