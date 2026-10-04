// 第三十八切片定向检查：完成之后给同方向的一件，不自动接取；回到地图沿用方向。
// 先启动 dev server（端口 5190）；PLAYWRIGHT_MODULE / CHROME 同 qa-rhythm.mjs。
import { mkdirSync, writeFileSync } from "node:fs";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.KUANGYE_URL || "http://127.0.0.1:5190/";
mkdirSync("output/playwright", { recursive: true });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const src = () => performance.getEntriesByType("resource").map(e => e.name).filter(n => n.includes("/src/store.js")).at(-1);
const report = [];
for (const width of [1280, 375]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: width < 500 ? 2 : 1 });
  const page = await ctx.newPage(); const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(base + "?qa#tasks"); await page.waitForTimeout(1500);
  const url = await page.evaluate(src);
  const run = (fn, arg) => page.evaluate(async ([u, f, a]) => { const st = await import(u); return new Function("st", "a", f)(st, a); }, [url, fn, arg]);
  await run('st.resetData(); st.state.settings.devDate = "2026-10-04"; st.accept(st.taskById.selfrec);');
  await page.waitForTimeout(400);
  const card = page.locator('[data-active-task="selfrec"]');
  await card.getByRole("button", { name: "我完成了" }).click(); await page.waitForTimeout(400);
  const dialog = page.locator("dialog[open]");
  await dialog.getByRole("button", { name: /完成，收下这束光/ }).click(); await page.waitForTimeout(800);
  const onward = dialog.locator(".onward");
  const text = await onward.innerText();
  if (!text.includes("同一个方向，下次可以是") || !text.includes("今天到这里，也已经很好")) throw Error("缺少同方向的下一件：" + text);
  const activeBefore = await run("return st.state.active.length;");
  if (activeBefore !== 0) throw Error("完成后被自动接取");
  await dialog.screenshot({ path: `output/playwright/onward-same-${width}.png` });
  // 回到地图：方向沿用「做点自己的东西」。
  await dialog.getByRole("button", { name: /回到地图/ }).click(); await page.waitForTimeout(800);
  const summary = await page.locator(".little-task details > summary").innerText();
  if (!summary.includes("做点自己的东西")) throw Error("地图没有沿用方向：" + summary);
  await page.locator(".little-task").screenshot({ path: `output/playwright/onward-map-${width}.png` });
  // 成长线：完成读书阶段一后，给出阶段二，点「接下它」才接取。
  await run('st.resetData(); const at=d=>st.state.settings.devDate=d; at("2026-10-01"); st.accept(st.taskById["read-s1"]); for (const d of ["2026-10-01","2026-10-02","2026-10-04"]) { at(d); st.checkIn(st.activeOf("read-s1")); }');
  await page.goto(base + "?qa#tasks"); await page.waitForTimeout(1200);
  await page.locator('[data-active-task="read-s1"]').getByRole("button", { name: "我完成了" }).click(); await page.waitForTimeout(400);
  await page.locator("dialog[open]").getByRole("button", { name: /完成，收下这束光/ }).click(); await page.waitForTimeout(800);
  const chainText = await page.locator("dialog[open] .onward").innerText();
  if (!chainText.includes("成长线的下一步") || !chainText.includes("读满 14 天")) throw Error("成长线接续缺失");
  await page.locator("dialog[open] .onward").getByRole("button", { name: "接下它" }).click(); await page.waitForTimeout(500);
  const active = await run("return st.state.active.map(a => a.qid);");
  if (active.join() !== "read-s2") throw Error("接下它没有接取阶段二：" + active);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (errors.length || overflow) throw Error(JSON.stringify({ errors, overflow }));
  report.push({ width, status: "PASS", chainAccepted: active[0] });
  await ctx.close();
}
await browser.close();
writeFileSync("output/onward-browser.txt", JSON.stringify(report, null, 2) + "\n");
console.log(report);
