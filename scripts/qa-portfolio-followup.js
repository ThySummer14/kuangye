async (page) => {
  const check=(ok,m)=>{if(!ok)throw Error(m);},results=[];
  for(const width of [1280,375]){
    await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:5190/?qa#panel');await page.reload();
    await page.getByRole('button',{name:/暂时放下 ·/}).click();
    const record=page.locator('[data-memory-qid]').filter({hasText:'这周先做手里的另一件。'});
    check((await record.innerText()).includes('已经在画室接着做'),'history status still points to generic rock');
    await record.getByRole('button',{name:'去画室看看这件作品 ↗'}).click();await page.locator('.studio-editor').waitFor();
    await page.getByRole('button',{name:'先放一放',exact:true}).click();let dialog=page.getByRole('dialog');
    check((await dialog.innerText()).includes('正文和图片会留在画室'),'rest dialog does not preserve art');
    await dialog.screenshot({path:`output/playwright/portfolio-rest-${width}.png`});await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'← 回到地图',exact:true}).click();await page.locator('[data-place=journal]').click();
    await page.getByRole('button',{name:'到画室翻开全部作品'}).click();await page.locator('.album-grid').waitFor();
    check(await page.locator('.album-grid [data-work]').count()===4,'all works entrance goes to exercises');
    await page.locator('[data-work]').filter({hasText:'一米之内的三种颜色'}).click();await page.getByRole('button',{name:'从小家收回这件作品'}).click();check(await page.getByRole('button',{name:'陈列到小家',exact:true}).isVisible(),'work cannot be taken back');await page.getByRole('button',{name:'陈列到小家',exact:true}).click();
    results.push({width,status:'PASS',historicalWorkLink:true,restCopy:true,allWorksEntrance:true,displayTakeback:true});
  }
  return {mode:'local QA fixture followup',results};
}
