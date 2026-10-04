// 第三十五切片定向检查：按天任务空档不清零 → 地图一键记一笔 → 补记昨天 → 完成回望。
// 先启动 `npm --prefix app run dev -- --host 127.0.0.1 --port 5190 --strictPort`。
// PLAYWRIGHT_MODULE 指向本机 playwright 的 index.mjs；CHROME 可选，指向已安装的 Chromium。
// 只用 ?qa 独立存档与一次性浏览器上下文，不触碰正式存档。
import { mkdirSync, writeFileSync } from "node:fs";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.KUANGYE_URL || "http://127.0.0.1:5190/";
const out = "output/playwright";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const report = [];
for (const width of [1280, 375]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: width < 500 ? 2 : 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(base + "?qa#map");
  await page.waitForTimeout(1500);
  // 一次性 fixture：读书阶段一已完成，阶段二记了 7 个分散的日子，最近一周没来。
  await page.evaluate(async src => {
    const st = await import(src);
    st.resetData();
    const at = d => (st.state.settings.devDate = d);
    at("2026-09-12");
    st.accept(st.taskById["read-s1"]);
    for (const d of ["2026-09-12", "2026-09-13", "2026-09-14"]) { at(d); st.checkIn(st.activeOf("read-s1")); }
    st.complete(st.activeOf("read-s1"), "原来每天十分钟真的读得下去。");
    at("2026-09-15");
    st.accept(st.taskById["read-s2"]);
    for (const d of ["2026-09-15", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-22", "2026-09-23", "2026-09-27"]) { at(d); st.checkIn(st.activeOf("read-s2")); }
    at("2026-10-04");
  }, await page.evaluate(() => performance.getEntriesByType("resource").map(e => e.name).filter(n => n.includes("/src/store.js")).at(-1)));
  await page.waitForTimeout(500);
  const ticket = page.locator(".little-task");
  if (!(await ticket.innerText()).includes("7 / 14 天")) throw Error("地图没有显示攒下的天数");
  await ticket.screenshot({ path: `${out}/rhythm-map-${width}.png` });
  await page.goto(base + "?qa#tasks");
  await page.waitForTimeout(1200);
  const card = page.locator('[data-active-task="read-s2"]');
  const gapText = await card.innerText();
  if (!/7\s*\/ 14 天/.test(gapText) || !gapText.includes("攒下的 7 天都还在")) throw Error("空档后进度被清零或文案缺失");
  await card.screenshot({ path: `${out}/rhythm-gap-${width}.png` });
  await card.getByRole("button", { name: "记录今天" }).click();
  await page.waitForTimeout(500);
  if (!/8\s*\/ 14 天/.test(await card.innerText())) throw Error("记录今天没有加一天");
  await card.screenshot({ path: `${out}/rhythm-today-${width}.png` });
  await page.evaluate(async () => {
    const st = await import(performance.getEntriesByType("resource").map(e => e.name).filter(n => n.includes("/src/store.js")).at(-1));
    const a = st.activeOf("read-s2");
    for (const d of ["2026-10-06", "2026-10-07", "2026-10-11", "2026-10-12", "2026-10-15"]) { st.state.settings.devDate = d; st.checkIn(a); }
    st.state.settings.devDate = "2026-10-17";
  });
  await page.waitForTimeout(400);
  await card.screenshot({ path: `${out}/rhythm-almost-${width}.png` });
  if (await card.getByRole("button", { name: "我完成了" }).count()) throw Error("未记满就能完成");
  await card.getByRole("button", { name: "补记昨天" }).click();
  await page.waitForTimeout(300);
  await card.getByRole("button", { name: "我完成了" }).click();
  await page.waitForTimeout(400);
  await page.locator("dialog[open] textarea").fill("断断续续，但读完了这十四天。");
  await page.locator("dialog[open]").getByRole("button", { name: /完成，收下这束光/ }).click();
  await page.waitForTimeout(900);
  const dialog = page.locator("dialog[open]");
  if (!(await dialog.innerText()).includes("14 天，散落在 33 天里")) throw Error("完成回望缺失");
  await dialog.screenshot({ path: `${out}/rhythm-done-${width}.png` });
  const s = await page.evaluate(async () => {
    const st = await import(performance.getEntriesByType("resource").map(e => e.name).filter(n => n.includes("/src/store.js")).at(-1));
    const d = st.state.done.at(-1);
    return { qid: d.qid, days: d.logs.length, best: d.streak, lumens: st.state.home.lumens, glimmerDays: st.state.home.glimmerDays.length };
  });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (errors.length || overflow) throw Error(JSON.stringify({ errors, overflow }));
  report.push({ width, status: "PASS", ...s });
  await ctx.close();
}
await browser.close();
writeFileSync("output/rhythm-browser.txt", JSON.stringify(report, null, 2) + "\n");
console.log(report);
