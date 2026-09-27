async (page) => {
  const results=[], errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1280,375]) {
    await page.setViewportSize({width,height:width===375?812:900});
    await page.goto('http://127.0.0.1:5184/?qa#map');
    await page.waitForFunction(()=>window.__KUANGYE__);
    await page.evaluate(()=>window.__KUANGYE__.reset('map-navigation','empty'));
    await page.locator('[data-place="tasks"]').click();
    await page.waitForURL('**#tasks');
    await page.getByRole('group',{name:'参考用时'}).getByRole('button',{name:'约 10 分钟内',exact:true}).click();
    await page.getByRole('group',{name:'行动场景'}).getByRole('button',{name:'在室内',exact:true}).click();
    await page.getByRole('button',{name:'生活技能',exact:true}).click();
    if(await page.locator('.quest-card').count() !== 2) throw Error('十分钟室内生活任务数量不符');
    await page.locator('.task-context-picker').scrollIntoViewIfNeeded();
    await page.screenshot({path:`output/playwright/small-tasks-discovery-${width}.png`,fullPage:true});
    await page.getByRole('textbox',{name:'搜索任务'}).fill('桌面');
    if(await page.locator('.quest-card').count() !== 1) throw Error('组合搜索失效');
    await page.getByRole('button',{name:'给桌面留出一块能用的地方：看看怎么开始',exact:true}).click();
    await page.getByRole('dialog').waitFor();
    await page.screenshot({path:`output/playwright/small-tasks-guide-${width}.png`});
    await page.getByRole('button',{name:'接下这件事',exact:true}).click();
    await page.waitForFunction(()=>document.activeElement?.dataset.activeTask==='small-desk');
    await page.getByRole('button',{name:'我完成了',exact:true}).click();
    await page.locator('#quest-review').fill('终于有一块地方，可以放下今晚想读的书。');
    await page.getByRole('button',{name:'完成，收下这束光',exact:true}).click();
    await page.getByRole('button',{name:'收好了，回到地图',exact:true}).click();
    await page.reload();
    await page.waitForFunction(()=>window.__KUANGYE__?.snapshot().completedTasks===1);
    const s=await page.evaluate(()=>window.__KUANGYE__.snapshot());
    if(s.home.lumens!==5||s.viewport.overflow) throw Error('结算或布局异常');
    const roundTrip=await page.evaluate(async()=>{
      const {exportData}=await import('/src/store.js');
      const {parseImport}=await import('/src/game/save.js');
      return parseImport(exportData()).done[0]?.qid;
    });
    if(roundTrip!=='small-desk') throw Error('试用存档往返丢记录');
    await page.locator('[data-place="tasks"]').click();
    await page.waitForURL('**#tasks');
    await page.getByRole('textbox',{name:'搜索任务'}).fill('桌面');
    if(await page.locator('.quest-card').count()) throw Error('已完成小事再次推荐');
    await page.getByRole('button',{name:'清空筛选，看看适合今天的事',exact:true}).click();
    await page.getByRole('group',{name:'参考用时'}).getByRole('button',{name:'约 10 分钟内',exact:true}).click();
    await page.getByRole('textbox',{name:'搜索任务'}).fill('连续 3 天');
    if(await page.locator('.quest-card').count()) throw Error('把每日十分钟误当一次十分钟');
    await page.getByRole('button',{name:'清空筛选，看看适合今天的事',exact:true}).click();
    await page.getByText('还没想好？从一个生活方向找起',{exact:true}).click();
    await page.getByRole('button',{name:'把生活理顺 照顾一顿饭，也照顾自己。'}).click();
    if(await page.locator('.quest-card').count()!==4) throw Error('原方向发现失效');
    results.push({width,status:'PASS',completed:s.completedTasks,lumens:s.home.lumens,roundTrip});
  }
  if(errors.length) throw Error(errors.join('\n'));
  return {results,errors};
}
