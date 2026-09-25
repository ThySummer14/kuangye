async (page) => {
  const results = [],
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const settle = (id) =>
    page.waitForFunction((id) => {
      const state = window.__KUANGYE__.snapshot(),
        s = state.emotion;
      return (
        s.mood === id &&
        Object.entries(state.target).every(
          ([k, v]) =>
            k.startsWith("gaze") || Math.abs(s.parameters[k] - v) < 0.005,
        ) &&
        Object.values(s.velocity).every((v) => Math.abs(v) < 0.025)
      );
    }, id);
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("http://127.0.0.1:5182/emotion-lab.html?qa");
    await page.waitForFunction(() => window.__KUANGYE__);
    await page.evaluate(() => window.__KUANGYE__.reset());
    await page.getByLabel("眨眼", { exact: true }).uncheck();
    await page.getByLabel("呼吸", { exact: true }).uncheck();
    const ids = await page
      .locator("[data-mood]")
      .evaluateAll((es) => es.map((e) => e.dataset.mood));
    if (ids.length !== 14) throw Error("14 moods required");
    for (const dimension of ["2d", "3d"]) {
      await page
        .getByRole("button", {
          name: dimension === "2d" ? "平面表情" : "立体形象",
          exact: true,
        })
        .click();
      if (dimension === "3d")
        await page.locator(".mascot-study[data-ready=true]").waitFor();
      for (const id of ids) {
        await page.locator(`[data-mood="${id}"]`).click();
        await settle(id);
        if (
          width === 1280 ||
          ["idle", "shocked", "sleepy", "excited"].includes(id)
        ) {
          await page.locator(".lab-stage").screenshot({
            path: `output/playwright/mascot-v1/${dimension}-${id}-${width}.png`,
          });
          if (dimension === "2d")
            await page.locator(".avatar-study canvas").screenshot({
              path: `output/playwright/mascot-v1/avatar64-${id}-${width}.png`,
            });
        }
        const s = await page.evaluate(() => window.__KUANGYE__.snapshot());
        if (s.viewport.overflow) throw Error("Overflow");
        if (
          dimension === "3d" &&
          (s.features.leaves !== 2 ||
            s.features.hands !== 2 ||
            s.features.horns[0].top <= s.features.horns[1].top ||
            s.features.coreTriangles >= 2000)
        )
          throw Error("Visual identity/budget");
        results.push({
          width,
          dimension,
          id,
          pose: s.emotion.parameters,
          features: s.features,
        });
      }
      // Exercise interruption, pause and retained spring velocity in the rendered consumer.
      await page.locator('[data-mood="happy"]').click();
      await page.getByRole("button", { name: "暂停观察", exact: true }).click();
      const frozen = await page.evaluate(
        () => window.__KUANGYE__.snapshot().emotion.parameters,
      );
      await page.getByLabel("弹簧速度", { exact: true }).fill("10");
      const paused = await page.evaluate(
        () => window.__KUANGYE__.snapshot().emotion.parameters,
      );
      if (JSON.stringify(frozen) !== JSON.stringify(paused))
        throw Error("Pause drift");
      await page.getByRole("button", { name: "继续播放", exact: true }).click();
      await page.locator('[data-mood="idle"]').click();
      await settle("idle");
      await page.getByLabel("试验光照").selectOption("night");
      await page.locator(".lab-stage").screenshot({
        path: `output/playwright/mascot-v1/${dimension}-night-${width}.png`,
      });
      await page.getByLabel("试验光照").selectOption("day");
    }
    for (const view of ["front", "quarter", "side", "back", "top"]) {
      await page.getByLabel("模型视角").selectOption(view);
      await page.locator(".lab-stage").screenshot({
        path: `output/playwright/mascot-v1/turnaround-${view}-${width}.png`,
      });
    }
    await page.getByLabel("眨眼", { exact: true }).check();
    await page.getByLabel("呼吸", { exact: true }).check();
    const avatar = await page.locator(".avatar-study canvas").boundingBox();
    if (avatar.width !== 64 || avatar.height !== 64)
      throw Error("Avatar must be 64 CSS px");
    await page.goto("http://127.0.0.1:5182/?qa#map");
    await page.waitForFunction(() => window.__KUANGYE__);
    await page.evaluate(() =>
      window.__KUANGYE__.reset("woodshop", "furnished"),
    );
    await page.locator('[data-place="home"]').click();
    await page.waitForURL("**#home");
    await page.locator("[data-buddy]").waitFor();
    await page.addStyleTag({
      content: "html,body,* {scroll-behavior:auto!important}",
    });
    for (const light of ["day", "night"]) {
      await page.getByLabel(/^光线/).selectOption(light);
      await page.waitForFunction(
        (light) => window.__KUANGYE__.snapshot().home.decor.light === light,
        light,
      );
      await page.locator(".home-stage").scrollIntoViewIfNeeded();
      await page.locator(".home-stage").screenshot({
        path: `output/playwright/mascot-v1/home-${light}-${width}.png`,
      });
      const s = await page.evaluate(() => window.__KUANGYE__.snapshot());
      if (
        s.home.lumens !== 500 ||
        s.viewport.overflow ||
        s.scene.features.leaves !== 2
      )
        throw Error("Home state/identity");
      results.push({ width, light, scene: s.scene, lumens: s.home.lumens });
    }
  }
  if (errors.length) throw Error(errors.join("\n"));
  return results;
};
