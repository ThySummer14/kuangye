// 第三十六切片定向检查：地图短时组合不再留白；准备动作写成自己的事；手里两件按天任务时仍能接第三件。
// 先启动 `npm --prefix app run dev -- --host 127.0.0.1 --port 5190 --strictPort`。
// PLAYWRIGHT_MODULE 指向本机 playwright 的 index.mjs；CHROME 可选。只用 ?qa 独立存档与一次性上下文。
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
  await page.evaluate(async src => { const st = await import(src); st.resetData(); st.state.settings.devDate = "2026-10-04"; },
    await page.evaluate(() => performance.getEntriesByType("resource").map(e => e.name).filter(n => n.includes("/src/store.js")).at(-1)));
  await page.waitForTimeout(400);
  const ticket = page.locator(".little-task");
  const choose = async (trail, minutes) => {
    if (!(await ticket.locator("details[open]").count())) await ticket.locator("details > summary").click();
    await ticket.getByRole("group", { name: "出发方向" }).getByRole("button", { name: trail }).click();
    await ticket.getByRole("group", { name: "出发时间" }).getByRole("button", { name: minutes }).click();
    await page.waitForTimeout(250);
  };
  // 1. 头脑 · 15 分钟：原本留白，现在是每次十分钟的阅读。
  await choose("给头脑留点时间", "15 分钟内");
  let text = await ticket.innerText();
  if (!text.includes("读满 3 天") || !text.includes("每次约 10 分钟")) throw Error("头脑 15 分钟没有给出按天阅读");
  await ticket.screenshot({ path: `${out}/first-step-think15-${width}.png` });
  // 2. 透口气 · 15 分钟：没有合适任务，给出手册里的准备动作。
  await choose("出去透口气", "15 分钟内");
  text = await ticket.innerText();
  if (!text.includes("先做一步准备") || !text.includes("出发手册") || text.includes("先留一点余地")) throw Error("短时空态没有准备动作");
  await ticket.screenshot({ path: `${out}/first-step-prep-${width}.png` });
  const prepText = (await ticket.locator(".prep-move h3").innerText()).trim();
  await ticket.getByRole("button", { name: "换一步看看" }).click();
  await page.waitForTimeout(200);
  if ((await ticket.locator(".prep-move h3").innerText()).trim() === prepText) throw Error("换一步没有变化");
  // 3. 写成自己的事：预填第一步与方向，标题与完成条件仍由用户写。
  await ticket.getByRole("button", { name: "把这一步写成我的事" }).click();
  await page.waitForTimeout(800);
  const dialog = page.locator("dialog[open]");
  if (!(await dialog.innerText()).includes("出发手册")) throw Error("写作表单没有带上准备动作来处");
  if (await dialog.locator("#personal-title").inputValue()) throw Error("标题被代填");
  if (!(await dialog.locator("#personal-step").inputValue())) throw Error("第一步没有预填");
  await dialog.screenshot({ path: `${out}/first-step-form-${width}.png` });
  await dialog.locator("#personal-title").fill("查好周六去哪座山");
  await dialog.locator("#personal-condition").fill("把路线、开放时间和返程车次写在便签上。");
  await dialog.getByRole("button", { name: "写好了，接下这件事" }).click();
  await page.waitForTimeout(800);
  const after = await page.evaluate(async () => {
    const st = await import(performance.getEntriesByType("resource").map(e => e.name).filter(n => n.includes("/src/store.js")).at(-1));
    return { active: st.state.active.map(a => ({ qid: a.qid.slice(0, 9), step: a.plan?.step || "" })), lumens: st.state.home.lumens, done: st.state.done.length };
  });
  if (after.active.length !== 1 || after.active[0].qid !== "personal-" || !after.active[0].step || after.lumens || after.done) throw Error("自建任务结果不对 " + JSON.stringify(after));
  // 4. 手里两件按天任务，再接第三件不会被「赛季级」挡住。
  const third = await page.evaluate(async () => {
    const st = await import(performance.getEntriesByType("resource").map(e => e.name).filter(n => n.includes("/src/store.js")).at(-1));
    st.resetData();
    st.accept(st.taskById["read-s1"]); st.accept(st.taskById["c1-budget7"]);
    return st.canAccept(st.taskById["cook-s1"]);
  });
  if (!third.ok) throw Error("第三件被挡住：" + third.why);
  await page.goto(base + "?qa#tasks");
  await page.waitForTimeout(1000);
  const tierJargon = await page.locator("#task-library").innerText().catch(() => "");
  if (/赛季任务|本章 ·/.test(tierJargon)) throw Error("任务库仍显示层级术语");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (errors.length || overflow) throw Error(JSON.stringify({ errors, overflow }));
  report.push({ width, status: "PASS", personalTask: after.active[0], thirdAccept: third.ok });
  await ctx.close();
}
await browser.close();
writeFileSync("output/first-step-browser.txt", JSON.stringify(report, null, 2) + "\n");
console.log(report);
