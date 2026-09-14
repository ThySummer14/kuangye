async (page) => {
  const results = [];
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://127.0.0.1:5182/?qa#map");
    await page.evaluate(() =>
      window.__KUANGYE__.reset("map-navigation", "furnished"),
    );
    await page.locator('[data-place="home"]').click();
    await page.waitForURL("**#home");
    await page.getByRole("button", { name: "全部家具", exact: true }).click();
    const names = await page.locator(".inventory-item").allTextContents();
    for (let i = 0; i < names.length; i++) {
      await page.locator(".inventory-item").nth(i).click();
      const actions = [
        "一起浇浇花",
        "在这里歇歇脚",
        "让小芽打个盹",
        "翻翻旧故事",
        "一起听一首歌",
      ];
      await page.getByRole("button", { name: actions[i], exact: true }).click();
      await page.waitForFunction(
        (i) => window.__KUANGYE__.snapshot().home.moments.length >= i + 1,
        i,
        { timeout: 15000 },
      );
    }
    const state = await page.evaluate(() => window.__KUANGYE__.snapshot());
    if (state.home.lumens !== 500 || state.viewport.overflow)
      throw Error("Interaction changes currency or overflows");
    results.push(state);
    await page
      .getByRole("heading", { name: "小芽的家", exact: true })
      .first()
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "output/playwright/home-interactions-" + width + ".png",
    });
  }
  return results;
};
