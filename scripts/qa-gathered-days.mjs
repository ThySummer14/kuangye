// 第三十七切片定向检查：瞭望台「攒下的日子」只读展示、点日子看细节、新账号不出现。
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
  await page.goto(base + "?qa#panel"); await page.waitForTimeout(1500);
  const url = await page.evaluate(src);
  await page.evaluate(async u => { (await import(u)).resetData(); }, url);
  await page.waitForTimeout(300);
  if (await page.locator(".gathered").count()) throw Error("新账号不该出现攒下的日子");
  const before = await page.evaluate(async u => {
    const st = await import(u); const at = d => (st.state.settings.devDate = d);
    at("2026-09-12"); st.accept(st.taskById["read-s1"]); st.checkIn(st.activeOf("read-s1"));
    at("2026-09-14"); st.checkIn(st.activeOf("read-s1"));
    at("2026-09-20"); st.checkIn(st.activeOf("read-s1")); st.complete(st.activeOf("read-s1"), "第三天读到停不下来。");
    at("2026-10-03"); st.accept(st.taskById["body-walk3"]); st.logUnits(st.activeOf("body-walk3"), 1);
    at("2026-10-04");
    return JSON.stringify(st.state);
  }, url);
  await page.waitForTimeout(400);
  const section = page.locator(".gathered");
  const text = await section.innerText();
  if (!text.includes("攒下 4 个日子") || !text.includes("2026 年 10 月") || !text.includes("2026 年 9 月")) throw Error("日子统计不对：" + text);
  await section.getByRole("button", { name: /9月20日/ }).click(); await page.waitForTimeout(200);
  const detail = await page.locator(".day-detail").innerText();
  if (!detail.includes("完成了「读满 3 天") || !detail.includes("第三天读到停不下来")) throw Error("完成日细节缺失");
  await section.screenshot({ path: `output/playwright/gathered-days-${width}.png` });
  const after = await page.evaluate(async u => JSON.stringify((await import(u)).state), url);
  if (after !== before) throw Error("浏览日子改变了存档");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (errors.length || overflow) throw Error(JSON.stringify({ errors, overflow }));
  report.push({ width, status: "PASS" });
  await ctx.close();
}
await browser.close();
writeFileSync("output/gathered-days-browser.txt", JSON.stringify(report, null, 2) + "\n");
console.log(report);
