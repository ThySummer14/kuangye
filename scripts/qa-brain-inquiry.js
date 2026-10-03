async (page) => {
  const origin = 'http://127.0.0.1:5197', results = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const check = (condition, message) => { if (!condition) throw Error(message); };
  const button = name => page.getByRole('button', { name, exact: true });
  const economy = () => page.evaluate(async () => {
    const { state } = await import('/src/store.js');
    return JSON.stringify({ active: state.active, done: state.done, light: state.home.lumens, glimmer: state.home.glimmerDays });
  });
  const noOverflow = async () => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'horizontal overflow');
  const question = '为什么同一扇窗，下午的影子会变长？';
  const guess = '我以为是窗户本身改变了影子的长度。';
  const nextStep = '明天下午在同一个位置，画下两次影子的边缘。';
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + '/#map');
    // Only the named disposable Playwright browser receives this synthetic save.
    await page.evaluate(async () => {
      const { normalizeState } = await import('/src/game/save.js');
      const fixture = normalizeState({ active: [], done: [], abandoned: [] });
      Object.assign(fixture.home.decor, { atmosphereVersion: 1, weather: 'clear', light: 'day' });
      localStorage.setItem('kuangye.v3', JSON.stringify(fixture));
    });
    await page.reload();
    await page.locator('[data-place=library]').click();
    await page.getByRole('tab', { name: '问号夹页 一个问题，一段来路', exact: true }).click();
    const desk = page.locator('.inquiry-desk');
    await desk.waitFor();
    await desk.screenshot({ path: `output/playwright/brain-inquiry-empty-${width}.png` });
    const before = await economy();
    await button('写下第一个问题').click();
    check(await page.evaluate(() => document.activeElement.id === 'inquiry-question'), 'question form focus');
    await page.locator('#inquiry-question').fill(question);
    await page.locator('#inquiry-guess').fill(guess);
    await page.locator('#inquiry-start').fill('去窗边观察下午的影子。');
    await desk.screenshot({ path: `output/playwright/brain-inquiry-writing-${width}.png` });
    await button('收好问题，去找线索').click();
    for (const [text, source] of [
      ['同一个窗边，较晚的时候影子更长，窗户的位置没有变。', '自己的窗边观察 · 15:00 与 16:00'],
      ['在同一个位置改变手电筒照射角度，物体的影子长度也会改变。', '自己的台灯实验 · 同一张桌面'],
    ]) {
      await page.locator('#inquiry-clue').fill(text);
      await page.locator('#inquiry-source').fill(source);
      await button('夹入这条线索').click();
    }
    await button('写下我的解释与下一步').click();
    check(await page.evaluate(() => document.activeElement.id === 'inquiry-answer'), 'explanation form focus');
    await page.locator('#inquiry-answer').fill('根据这两次观察，我现在认为照射角度变化会影响影子的长度。还需要在相同位置再观察一次。');
    await page.locator('#inquiry-next').fill(nextStep);
    await button('保存解释和下一步').click();
    check(await desk.locator('.inquiry-understanding section').first().textContent().then(text => text.includes(guess)), 'original guess lost');
    check(await desk.locator('.inquiry-clues li').count() === 2, 'source clues lost');
    await desk.screenshot({ path: `output/playwright/brain-inquiry-sourced-${width}.png` });
    await noOverflow();
    await button('先把这一页夹好').click();
    await button('打开一张新夹页 ＋').click();
    await page.locator('#inquiry-question').fill('这首诗里我最想记住哪一句？');
    await button('收好问题，去找线索').click();
    await button('先把这一页夹好').click();
    await desk.locator('.inquiry-index-page').filter({ hasText: question }).click();
    await button('继续弄懂这个问题').click();
    check(await desk.locator('.inquiry-index-page').count() === 2, 'kept question lost');
    check(await economy() === before, 'private inquiry changed task progress or economy');

    const inquiryTab = page.getByRole('tab', { name: '问号夹页 一个问题，一段来路', exact: true });
    await inquiryTab.focus();
    await page.keyboard.press('Home');
    check(await page.evaluate(() => document.activeElement.id === 'reading-desk-tab'), 'reading tab keyboard focus');
    await button('记下第一本书').click();
    const reading = page.locator('.reading-desk');
    await reading.getByLabel('书名', { exact: true }).fill('观察笔记');
    await reading.getByLabel('读到哪里了', { exact: true }).fill('第一节 · 第 12 页');
    await reading.getByLabel('下次从这里开始', { exact: true }).fill('带着窗边的观察，读下一节。');
    await reading.getByLabel('关联阅读旅程').selectOption('read-s1');
    await button('保存书签').click();
    await reading.locator('.reading-task').click();
    await button('接下这件事').click();
    await page.locator('[data-active-task=read-s1]').waitFor();
    check(await page.evaluate(() => document.activeElement.dataset.activeTask === 'read-s1'), 'library accepted-task return focus');
    const book = page.locator('[data-notebook=think]');
    await book.waitFor();
    await page.locator('.toast').waitFor({ state: 'hidden' });
    check(await book.locator('.notebook-place').textContent().then(text => text.includes('观察笔记') && text.includes('第 12 页')), 'reading continuation absent from booklet');
    const browsingBefore = await economy();
    const situations = book.locator('.notebook-situations button');
    for (let index = 0; index < 3; index++) {
      await situations.nth(index).click();
      check(await book.locator('article').count() === 2, 'two choices per mind situation');
      await noOverflow();
      await book.screenshot({ path: `output/playwright/brain-notebook-${['read', 'question', 'keep'][index]}-${width}.png` });
    }
    await situations.nth(1).click();
    check(await book.locator('.notebook-place').textContent().then(text => text.includes(question) && text.includes(nextStep)), 'inquiry continuation absent from booklet');
    await book.locator('[data-notebook-task=research] button').click();
    check(await page.locator('dialog').textContent().then(text => text.includes('3000') && text.includes('外行')), 'research requirement weakened');
    await page.keyboard.press('Escape');
    check(await economy() === browsingBefore, 'browsing changed progress or economy');
    await book.locator('.notebook-place button').click();
    await desk.waitFor();
    await desk.locator('.inquiry-next button').click();
    const form = page.locator('dialog');
    check(await form.locator('#personal-title').inputValue() === '', 'question auto-filled a task title');
    check(await form.locator('#personal-condition').inputValue() === '', 'question auto-filled a completion condition');
    check(await form.locator('#personal-step').inputValue() === nextStep, 'next step did not transfer');
    check(await form.getByRole('radio', { name: '头脑', exact: true }).isChecked(), 'wrong task domain');
    await form.screenshot({ path: `output/playwright/brain-inquiry-action-${width}.png` });
    await form.locator('#personal-title').fill('记录窗边影子的变化');
    await form.locator('#personal-condition').fill('在同一位置记录两个下午时刻的影子边缘，并写一句自己的发现。');
    await form.locator('#personal-cue').fill('明天下午在家时');
    await button('写好了，接下这件事').click();
    await button('← 回到地图').click();
    await page.goBack();
    await page.locator('[data-notebook=think]').waitFor();
    check(!await page.locator('dialog').count(), 'browser back reopened the consumed transfer form');
    await button('← 回到地图').click();
    await page.locator('.map-plan-note').getByText(nextStep, { exact: true }).waitFor();
    await page.locator('[data-place=library]').click();
    await reading.locator('.reading-task').click();
    check(await page.evaluate(() => document.activeElement.dataset.activeTask === 'read-s1'), 'existing reading task return focus');
    await page.locator('[data-notebook=think] .notebook-place button').click();
    await page.getByRole('tab', { name: '问号夹页 一个问题，一段来路', exact: true }).click();
    await page.reload();
    await page.getByRole('tab', { name: '问号夹页 一个问题，一段来路', exact: true }).click();
    await desk.waitFor();
    const saved = await page.evaluate(async () => {
      const { state, exportData, importData } = await import('/src/store.js');
      const before = JSON.stringify({ inquiry: state.home.inquiry, reading: state.home.reading, active: state.active, light: state.home.lumens, days: state.home.glimmerDays });
      importData(exportData());
      const after = JSON.stringify({ inquiry: state.home.inquiry, reading: state.home.reading, active: state.active, light: state.home.lumens, days: state.home.glimmerDays });
      return { backupOK: before === after, pages: state.home.inquiry.pages.length, notes: state.home.inquiry.pages.find(page => page.status === 'exploring').notes.length, books: state.home.reading.books.length, custom: state.customTasks.length, light: state.home.lumens, glimmer: state.home.glimmerDays.length, done: state.done.length };
    });
    check(saved.backupOK && saved.pages === 2 && saved.notes === 2 && saved.books === 1 && saved.custom === 1, 'backup or refresh lost real records');
    check(saved.light === 0 && saved.glimmer === 0 && saved.done === 0, 'inquiry or task creation granted rewards');
    await page.evaluate(async () => { (await import('/src/store.js')).state.home.decor.light = 'night'; });
    await desk.screenshot({ path: `output/playwright/brain-inquiry-night-${width}.png` });
    await noOverflow();
    results.push({ width, mapToInquiryClicks: 2, scenarios: 3, choicesPerScenario: 2, originalGuessPreserved: true, sourceClues: 2, questionHistory: 2, readingReturnFocus: true, nextStepTransfer: true, ...saved });
  }
  check(!errors.length, errors.join('\n'));
  return { mode: 'ordinary local development, disposable fixture', results, errors };
}
