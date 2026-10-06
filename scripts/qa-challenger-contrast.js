async(page)=>{
 const results=[];
 for(const width of [1280,375]){
  const c=await page.context().browser().newContext({viewport:{width,height:900}}),p=await c.newPage();
  await p.goto('http://127.0.0.1:5193/#panel');
  await p.locator('.backup-section input').setInputFiles(`output/playwright/challenger-release-backup-${width}.json`);
  await p.getByRole('button',{name:'恢复这份备份',exact:true}).click();
  await p.getByText('备份已恢复，原进度也已自动导出',{exact:true}).waitFor();
  await p.goto('http://127.0.0.1:5193/#tasks');
  await p.locator('[data-active-task]').getByRole('button',{name:'我完成了',exact:true}).click();
  const color=await p.locator('.review-prompt').first().evaluate(el=>getComputedStyle(el).color);
  if(color!=='rgb(191, 205, 170)')throw Error('prompt has wrong contrast: '+color);
  await p.screenshot({path:`output/playwright/challenger-release-contrast-${width}.png`});
  await p.keyboard.press('Escape');
  await p.goto('http://127.0.0.1:5193/#challenger');
  await p.locator('.challenger').waitFor();
  await p.locator('.challenge-tabs').getByRole('button',{name:/蚀刻章/}).click();
  await p.locator('.toast').waitFor({state:'detached'});await p.waitForTimeout(500);
  await p.locator('.challenge-medals').screenshot({path:`output/playwright/challenger-medals-detail-${width}.png`});
  results.push({width,status:'PASS',color});await c.close();
 }
 return results;
}
