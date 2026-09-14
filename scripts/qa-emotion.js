async (page) => {
  const results = [],
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://127.0.0.1:5182/emotion-lab.html?qa");
    await page.getByRole("button", { name: "重置试验台", exact: true }).click();
    const ids = await page
      .locator("[data-mood]")
      .evaluateAll((es) => es.map((e) => e.dataset.mood));
    if (ids.length !== 14) throw Error("Missing moods");
    for (const id of ids) {
      await page.locator('[data-mood="' + id + '"]').click();
      await page.waitForFunction(
        (id) => window.__KUANGYE__.snapshot().emotion.mood === id,
        id,
      );
    }
    await page.getByLabel("起点", { exact: true }).selectOption("sad");
    await page.getByLabel("终点", { exact: true }).selectOption("happy");
    await page
      .getByRole("heading", { name: "小芽的表情试验台" })
      .scrollIntoViewIfNeeded();
    await page
      .getByRole("button", { name: "播放这段过渡", exact: true })
      .click();
    for (const n of [1, 2, 3]) {
      await page.screenshot({
        path:
          "output/playwright/emotion-transition-" + width + "-" + n + ".png",
      });
      results.push(await page.evaluate(() => window.__KUANGYE__.snapshot()));
    }
    await page.getByRole("button", { name: "暂停观察", exact: true }).click();
    const before = await page.evaluate(
      () => window.__KUANGYE__.snapshot().emotion.parameters,
    );
    await page.getByLabel("弹簧速度", { exact: true }).fill("8");
    await page.getByLabel("阻尼", { exact: true }).fill("0.75");
    const after = await page.evaluate(
      () => window.__KUANGYE__.snapshot().emotion.parameters,
    );
    if (JSON.stringify(before) !== JSON.stringify(after))
      throw Error("Pause failed");
    await page.getByRole("button", { name: "继续播放", exact: true }).click();
    await page.getByRole("button", { name: "循环往返", exact: true }).click();
    await page.getByLabel("眨眼", { exact: true }).uncheck();
    await page.getByLabel("呼吸与叶片", { exact: true }).uncheck();
    const state = await page.evaluate(() => window.__KUANGYE__.snapshot());
    if (
      state.viewport.overflow ||
      state.settings.frequency !== 8 ||
      state.settings.damping !== 0.75
    )
      throw Error("Lab controls/overflow");
    results.push(state);
    await page.getByRole("button", { name: "重置试验台", exact: true }).click();
    await page.locator('[data-mood="loved"]').click();
    await page.waitForFunction(
      () => window.__KUANGYE__.snapshot().emotion.parameters.smile > 0.94,
    );
    await page
      .getByRole("heading", { name: "小芽的表情试验台" })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "output/playwright/emotion-lab-" + width + ".png",
      fullPage: true,
    });
  }
  if (errors.length) throw Error(errors.join("\n"));
  return results;
};
