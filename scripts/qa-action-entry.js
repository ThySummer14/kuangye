async (page) => {
  const widths = [1280, 375];
  const results = [];
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const snapshot = () => page.evaluate(() => window.__KUANGYE__.snapshot());
  const assertNoOverflow = async (step) => {
    const state = await snapshot();
    if (state.viewport.overflow) {
      throw new Error(
        `${step} 横向溢出：${JSON.stringify({
          width: state.viewport.width,
          overflow: state.viewport.overflow,
        })}`,
      );
    }
    return state;
  };
  const enterTasks = async () => {
    await page.locator('[data-place="tasks"]').click();
    await page.waitForURL("**#tasks");
    await page.locator('[aria-label="搜索任务"]').waitFor();
  };
  const taskCard = (title) =>
    page.locator(".quest-card").filter({ hasText: title });

  for (const width of widths) {
    let step = "start";
    try {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("http://127.0.0.1:5182/?qa#map");
      await page.evaluate(() =>
        window.__KUANGYE__.reset("map-navigation", "empty"),
      );
      await page.waitForFunction(
        () => window.__KUANGYE__.snapshot().place === "map",
      );
      await assertNoOverflow("地图");

      step = "search-locked-follow-up";
      await enterTasks();
      const search = page.getByRole("textbox", { name: "搜索任务" });
      await search.fill("连续跑完 5 公里不停歇");
      const lockedCard = taskCard("连续跑完 5 公里不停歇");
      await lockedCard.waitFor();
      const lockedButton = lockedCard.getByRole("button");
      if (!(await lockedButton.isDisabled())) {
        throw new Error("前序未完成时 5 公里任务仍可接取");
      }
      const lockedState = await assertNoOverflow("搜索前序未完成的 5 公里任务");
      if (lockedState.activeTasks !== 0 || lockedState.home.lumens !== 0) {
        throw new Error(
          `资格检查前状态不符：${JSON.stringify({
            activeTasks: lockedState.activeTasks,
            lumens: lockedState.home.lumens,
          })}`,
        );
      }
      await page.locator('.toast').waitFor({ state: 'detached' });
      await page.screenshot({
        path: `output/playwright/action-search-${width}.png`,
        fullPage: true,
      });

      step = "empty-search-and-clear";
      await search.fill("这个词在任务库里不存在");
      await page
        .locator(".quest-grid .quest-card")
        .waitFor({ state: "detached" });
      const empty = page.locator(".active-empty").filter({
        hasText: "这里暂时没有匹配的任务",
      });
      await empty.waitFor();
      const clearButton = empty.getByRole("button", {
        name: "清空筛选，看看适合今天的事",
        exact: true,
      });
      await clearButton.click();
      await page.waitForFunction(() => {
        const input = document.querySelector('[aria-label="搜索任务"]');
        return input?.value === "" &&
          document.querySelectorAll(".quest-grid .quest-card").length > 0 &&
          document.activeElement === input;
      });
      const clearedState = await assertNoOverflow("清空不存在搜索");
      if (clearedState.activeTasks !== 0 || clearedState.home.lumens !== 0) {
        throw new Error("清空筛选后状态发生意外变化");
      }

      step = "accept-run-s1";
      await search.fill("完成第一次 2 公里慢跑");
      const runCard = taskCard("完成第一次 2 公里慢跑");
      await runCard.waitFor();
      await runCard
        .getByRole("button", { name: "接下这件事 ＋", exact: true })
        .click();
      await page.waitForFunction(
        () => window.__KUANGYE__.snapshot().activeTasks === 1,
      );
      await page.waitForFunction(
        () => document.activeElement?.dataset?.activeTask === "run-s1",
      );
      const activeRun = page.locator('[data-active-task="run-s1"]');
      await activeRun.waitFor();
      if (!(await activeRun.isVisible())) throw new Error("run-s1 已接取卡片不可见");
      const bounds = await activeRun.boundingBox();
      if (!bounds || bounds.y < 0 || bounds.y + bounds.height > 900)
        throw Error('接取后任务卡没有完整进入视口');
      if (!(await activeRun.getByText("先去生活里做，回来再记录。还没做完，也可以下次继续。", { exact: true }).isVisible())) {
        throw new Error("已接取任务缺少行动提示");
      }
      const runState = await assertNoOverflow("接取 2 公里任务");
      if (
        runState.activeTasks !== 1 ||
        runState.home.lumens !== 0 ||
        !(await page.evaluate(
          () => document.activeElement?.dataset?.activeTask === "run-s1",
        ))
      ) {
        throw new Error(
          `接取后状态或焦点不符：${JSON.stringify({
            activeTasks: runState.activeTasks,
            lumens: runState.home.lumens,
            activeTask: await page.evaluate(
              () => document.activeElement?.dataset?.activeTask || null,
            ),
          })}`,
        );
      }
      await page.locator('.toast').waitFor({ state: 'detached' });
      await page.screenshot({
        path: `output/playwright/action-accepted-${width}.png`,
        fullPage: true,
      });

      step = "accept-poems10-cumulative";
      await page.evaluate(() =>
        window.__KUANGYE__.reset("map-navigation", "empty"),
      );
      await page.waitForFunction(
        () => window.__KUANGYE__.snapshot().place === "map",
      );
      await enterTasks();
      const poemsSearch = page.getByRole("textbox", { name: "搜索任务" });
      await poemsSearch.fill("背诵 10 首触动你的诗");
      const poemsCard = taskCard("背诵 10 首触动你的诗");
      await poemsCard.waitFor();
      await poemsCard
        .getByRole("button", { name: "接下这件事 ＋", exact: true })
        .click();
      await page.waitForFunction(
        () => window.__KUANGYE__.snapshot().activeTasks === 1,
      );
      const poemsActive = page.locator('[data-active-task="poems10"]');
      await poemsActive.waitFor();
      const progressText = await poemsActive.textContent();
      if (!progressText?.includes("0 / 10 首")) {
        throw new Error(`累计任务进度不符：${progressText}`);
      }
      const amountInput = poemsActive.locator('input[type="number"]');
      const placeholder = await amountInput.getAttribute("placeholder");
      if (!placeholder?.includes("首")) {
        throw new Error(`累计任务输入框单位不符：${placeholder}`);
      }
      const poemsState = await assertNoOverflow("接取诗歌累计任务");
      if (poemsState.activeTasks !== 1 || poemsState.home.lumens !== 0) {
        throw new Error(
          `累计任务接取后状态不符：${JSON.stringify({
            activeTasks: poemsState.activeTasks,
            lumens: poemsState.home.lumens,
          })}`,
        );
      }
      await page.locator('.toast').waitFor({ state: 'detached' });
      await page.screenshot({
        path: `output/playwright/action-accumulated-${width}.png`,
        fullPage: true,
      });

      results.push({
        width,
        status: "PASS",
        locked: { title: "连续跑完 5 公里不停歇", disabled: true },
        cleared: { recommendationsRestored: true, searchFocused: true },
        accepted: { qid: "run-s1", focused: true, lumens: runState.home.lumens },
        accumulated: {
          qid: "poems10",
          progress: "0 / 10 首",
          placeholder,
          lumens: poemsState.home.lumens,
        },
      });
    } catch (error) {
      await page.locator('.toast').waitFor({ state: 'detached' });
      await page.screenshot({
        path: `output/playwright/action-fail-${width}.png`,
        fullPage: true,
      }).catch(() => {});
      results.push({ width, status: "FAIL", step, error: error.message });
    }
  }

  const report = {
    status: results.every((result) => result.status === "PASS") && !pageErrors.length
      ? "PASS"
      : "FAIL",
    results,
    pageErrors,
    screenshots: "output/playwright/action-{search,accepted,accumulated}-{1280,375}.png",
  };
  if (report.status !== "PASS") throw Error(JSON.stringify(report));
  return report;
}
