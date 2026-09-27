async (page) => {
  const results = [], errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.goto('http://127.0.0.1:5184/?qa#tasks');
    await page.waitForFunction(() => window.__KUANGYE__);
    await page.evaluate(async () => {
      window.__KUANGYE__.reset('map-navigation', 'empty');
      const s = await import('/src/store.js');
      s.accept(s.taskById['cook-s1']);
      s.saveActionPlan(s.state.active[0], { cue: '周末回家时', step: '看看食谱' });
      location.hash = 'tasks';
    });
    await page.locator('[data-active-task="cook-s1"]').getByRole('button', { name: '打开出发手册' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('summary').filter({ hasText: '宿舍没有' }).click();
    const support = dialog.locator('details[open]');
    await dialog.locator('.guide-starting-points').evaluate(el => el.scrollIntoView({ block: 'center' }));
    await page.screenshot({ path: `output/playwright/starting-points-guide-${width}.png` });
    await support.getByRole('button', { name: '用这一步替换便笺第一步' }).click();
    await dialog.getByRole('status').filter({ hasText: '已写进出发便笺' }).waitFor();
    await dialog.getByRole('button', { name: '记住第一步，去试试看', exact: true }).click();
    const card = page.locator('[data-active-task="cook-s1"]');
    if (!(await card.innerText()).includes('问问家里或朋友')) throw Error('Hint not copied');
    await page.getByRole('button', { name: '← 回到地图', exact: true }).click();
    await page.reload();
    await page.locator('.map-plan-note').waitFor();
    if (!(await page.locator('.map-plan-note').innerText()).includes('周末回家时')) throw Error('Cue lost');
    await page.locator('.little-task').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/playwright/starting-points-map-${width}.png` });
    const result = await page.evaluate(async () => {
      const s = await import('/src/store.js');
      return { cue: s.state.active[0].plan.cue, step: s.state.active[0].plan.step, lumens: s.state.home.lumens, done: s.state.done.length, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    if (result.lumens || result.done || result.overflow) throw Error(JSON.stringify(result));
    results.push({ width, status: 'PASS', ...result });
  }
  if (errors.length) throw Error(errors.join('\n'));
  return { results, errors };
}
