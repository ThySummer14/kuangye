async (page) => {
  const origin = 'http://127.0.0.1:5197';
  const errors = [], results = [];
  page.on('pageerror', error => errors.push(error.message));
  const check = (condition, message) => { if (!condition) throw Error(message); };
  const snapshotState = () => page.evaluate(async () => JSON.stringify((await import('/src/store.js')).state));
  const directions = [
    ['outside', '出去透口气 从熟悉的路，走回身体里。'],
    ['settle', '把生活理顺 照顾一顿饭，也照顾自己。'],
    ['make', '做点自己的东西 先有一个粗糙的开始。'],
    ['connect', '靠近一个人 一句真心话，就能是起点。'],
  ];

  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + '/#tasks');
    // The named Playwright session is disposable; no real browser save is accessed.
    await page.evaluate(async () => {
      const { normalizeState } = await import('/src/game/save.js');
      const fixture = normalizeState({ active: [], done: [], abandoned: [] });
      Object.assign(fixture.home.decor, { atmosphereVersion: 1, weather: 'clear', light: 'day' });
      localStorage.setItem('kuangye.v3', JSON.stringify(fixture));
    });
    await page.goto(origin + '/#map');
    await page.reload();
    await page.locator('[data-place=tasks]').click();
    const before = await snapshotState();
    for (const [id, name] of directions) {
      await page.getByRole('button', { name, exact: true }).click();
      const book = page.locator(`[data-notebook=${id}]`);
      await book.waitFor();
      check(await page.evaluate(() => document.activeElement.classList.contains('notebook-section')), 'entry focus');
      check(!await page.locator('#task-library').isVisible(), 'ordinary task list should be folded');
      const options = book.locator('.notebook-situations button');
      for (let index = 0; index < 3; index++) {
        await options.nth(index).click();
        check(await book.locator('article').count() === 2, 'two choices per situation');
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'horizontal overflow');
      }
      await options.first().click();
      await book.screenshot({ path: `output/playwright/trail-notebook-${id}-${width}.png` });
    }
    check(await snapshotState() === before, 'browsing changed the save');

    const connection = page.locator('[data-notebook=connect]');
    await connection.getByRole('button', { name: '再看看这个方向的任务', exact: true }).click();
    check(await page.locator('#task-library').isVisible(), 'library did not expand');
    check(await page.evaluate(() => document.activeElement === document.querySelector('.quest-section-heading h3')), 'library focus');
    await connection.getByRole('button', { name: '收起这个方向的任务', exact: true }).click();
    check(!await page.locator('#task-library').isVisible(), 'library did not fold');

    await page.getByRole('button', { name: directions[1][1], exact: true }).click();
    const book = page.locator('[data-notebook=settle]');
    await book.locator('[data-notebook-task=live-repair]').getByRole('button', { name: '完成一次小修复：打开行动手册', exact: true }).click();
    await page.locator('dialog').screenshot({ path: `output/playwright/trail-notebook-guide-${width}.png` });
    await page.getByRole('button', { name: '接下这件事', exact: true }).click();
    const active = page.locator('[data-active-task=live-repair]');
    await active.waitFor();
    check(await page.evaluate(() => document.activeElement.dataset.activeTask === 'live-repair'), 'accepted task focus');
    await book.getByRole('button', { name: '继续这件事', exact: true }).click();
    check(await page.evaluate(() => document.activeElement.dataset.activeTask === 'live-repair'), 'resume focus');
    await active.getByRole('button', { name: '打开出发手册 ↗', exact: true }).click();
    await page.getByText('眼前的小故障太多', { exact: true }).click();
    await page.getByRole('button', { name: '把这一步写进便笺 ↗', exact: true }).click();
    await page.getByRole('button', { name: '记住第一步，去试试看', exact: true }).click();
    await page.getByRole('button', { name: '← 回到地图', exact: true }).click();
    await page.locator('.map-plan-note').getByText(/只拿出一件最常用/).waitFor();
    await page.locator('[data-place=tasks]').click();
    await active.getByRole('button', { name: '我完成了', exact: true }).click();
    await page.locator('#quest-review').fill('把笔记本掉下的两页固定好，翻阅时不再掉页了。');
    await page.getByRole('button', { name: '完成，收下这束光', exact: true }).click();
    await page.getByRole('heading', { name: '＋5 光', exact: true }).waitFor();
    await page.getByRole('button', { name: '收好了，回到地图', exact: true }).click();
    await page.reload();
    await page.locator('[data-place=tasks]').click();
    await page.getByRole('button', { name: directions[1][1], exact: true }).click();
    await book.getByRole('button', { name: '完成一次小修复：打开行动手册', exact: true }).click();
    check(await page.getByRole('button', { name: '接下这件事', exact: true }).isDisabled(), 'completed task can be accepted again');
    await page.keyboard.press('Escape');
    await book.screenshot({ path: `output/playwright/trail-notebook-completed-${width}.png` });

    await book.getByRole('button', { name: /照顾日常/ }).click();
    await book.getByRole('button', { name: '按这个情境，自己写一件', exact: true }).click();
    const form = page.locator('dialog');
    check(await form.locator('#personal-title').inputValue() === '', 'reference examples became task values');
    check(await form.locator('#personal-title').getAttribute('placeholder') === '例如：独立洗好一件容易掉色的衣服', 'wrong situation prompt');
    check(await form.getByRole('radio', { name: '生活技能', exact: true }).isChecked(), 'wrong initial domain');
    await form.screenshot({ path: `output/playwright/trail-notebook-writing-${width}.png` });
    await form.locator('#personal-title').fill('收好窗边晾干的衣服');
    await form.locator('#personal-condition').fill('把晾干的衣服折好，按上衣和裤子分别放回衣柜。');
    await form.locator('#personal-cue').fill('今晚洗漱前');
    await form.locator('#personal-step').fill('先拿一个空篮子到窗边');
    await form.getByRole('button', { name: '写好了，接下这件事', exact: true }).click();
    const custom = page.locator('.active-card').filter({ hasText: '收好窗边晾干的衣服' });
    await custom.waitFor();
    await custom.getByRole('button', { name: '修改这件事 ↗', exact: true }).click();
    check(!await page.locator('.personal-situation').count(), 'situation leaked into edit form');
    check(await page.locator('#personal-title').inputValue() === '收好窗边晾干的衣服', 'edit lost own text');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: '＋ 自己写一件', exact: true }).click();
    check(!await page.locator('.personal-situation').count(), 'situation leaked into blank form');
    await page.keyboard.press('Escape');
    await page.reload();
    await custom.waitFor();
    const saved = await page.evaluate(async () => {
      const { state } = await import('/src/store.js');
      return { light: state.home.lumens, done: state.done, custom: state.customTasks, active: state.active, xp: state.done.reduce((sum, item) => sum + item.xp, 0) };
    });
    check(saved.light === 5 && saved.xp === 10 && saved.done.length === 1, 'wrong economy');
    check(saved.custom.length === 1 && saved.active[0].plan.cue === '今晚洗漱前', 'custom task or plan not saved');

    await page.evaluate(async () => { (await import('/src/store.js')).state.home.decor.light = 'night'; });
    await page.getByRole('button', { name: directions[2][1], exact: true }).click();
    await page.locator('[data-notebook=make]').screenshot({ path: `output/playwright/trail-notebook-night-${width}.png` });
    await page.getByRole('button', { name: '← 回到地图', exact: true }).click();
    await page.locator('.map-plan-note').getByText('先拿一个空篮子到窗边', { exact: true }).waitFor();
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'map overflow');
    check(!await page.evaluate(async () => (await import('/src/data/tasks.js')).TASKS.some(task => task.reviewStatus === 'pending-review')), 'draft leaked to ordinary mode');
    results.push({ width, directions: 4, situations: 12, readOnlyBrowsing: true, customTaskAndPlanPersisted: true, completionLight: 5, repeatedAcceptBlocked: true, pageErrors: errors.length });
  }
  check(!errors.length, errors.join('\n'));
  return { mode: 'ordinary local development, disposable fixture', results, errors };
}
