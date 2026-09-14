async (page) => {
  const results=[];
  for(const width of [1280,375]) {
    await page.setViewportSize({width,height:900});
    await page.goto('http://127.0.0.1:5182/?qa#map');
    await page.evaluate(()=>window.__KUANGYE__.reset('woodshop'));
    await page.locator('[data-place="woodshop"]').click();
    await page.waitForURL('**#woodshop');
    await page.getByRole('button',{name:'雨后蓝 选这块墙色',exact:true}).click();
    await page.getByRole('button',{name:'暖胡桃木 铺上这款木地板',exact:true}).click();
    await page.getByRole('button',{name:'请师傅开工 · 30 光',exact:true}).click();
    await page.getByRole('button',{name:'再想想',exact:true}).click();
    let s=await page.evaluate(()=>window.__KUANGYE__.snapshot());
    if(s.home.lumens!==500 || s.home.decor.wall!=='blue' || s.home.decor.floor!=='walnut') throw Error('Cancel/decor');
    await page.getByRole('button',{name:'请师傅开工 · 30 光',exact:true}).click();
    await page.getByRole('button',{name:'确认扩建',exact:true}).click();
    await page.reload();
    s=await page.evaluate(()=>window.__KUANGYE__.snapshot());
    if(s.home.lumens!==470 || s.home.room.w!==8 || s.home.decor.wall!=='blue') throw Error('Persistence');
    await page.screenshot({path:'output/playwright/woodshop-'+width+'.png',fullPage:true});
    results.push(s);
    for(const axis of ['向右扩建 →','向前扩建 ↓']) {
      await page.getByRole('button',{name:axis,exact:true}).click();
      while(await page.getByRole('button',{name:/请师傅开工/}).count()) {
        await page.getByRole('button',{name:/请师傅开工/}).click();
        await page.getByRole('button',{name:'确认扩建',exact:true}).click();
      }
    }
    s=await page.evaluate(()=>window.__KUANGYE__.snapshot());
    if(s.home.lumens!==20 || s.home.room.w!==12 || s.home.room.d!==12) throw Error('Cap/economy');
    results.push(s);
    await page.evaluate(()=>window.__KUANGYE__.reset('woodshop','empty'));
    await page.locator('[data-place="woodshop"]').click();
    await page.waitForURL('**#woodshop');
    if(!await page.getByRole('button',{name:'请师傅开工 · 30 光',exact:true}).isDisabled()) throw Error('Insufficient funds');
    if((await page.evaluate(()=>window.__KUANGYE__.snapshot())).viewport.overflow) throw Error('Overflow');
    await page.getByRole('button',{name:'← 回到地图',exact:true}).click();
    await page.locator('[data-place="home"]').click();
    await page.waitForURL('**#home');
    if(await page.getByRole('button',{name:'找师傅聊聊装修'}).count()) throw Error('Craftsman still at home');
  }
  return results;
}
