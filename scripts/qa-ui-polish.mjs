// 界面质感改版的对照截图：一次性 fixture，手机 390×844 与桌面 1440×900。
// 先启动 dev server；PLAYWRIGHT_MODULE / CHROME 同其他 qa 脚本。
// 用法：node scripts/qa-ui-polish.mjs <输出目录>
import { mkdirSync, writeFileSync } from "node:fs";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.KUANGYE_URL || "http://127.0.0.1:5190/";
const out = process.argv[2] || "output/playwright/ui-polish";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const screens = (process.env.SCREENS || "map,tasks,home,shop,panel,library,yard,atelier,challenger").split(",");
const report = [];
const seed = `
  st.resetData();
  st.state.settings.devDate = "2026-10-01";
  st.accept(st.taskById.selfrec);
  st.complete(st.state.active.find(a => a.qid === "selfrec"), "写完那天，比我想的要轻松。");
  for (const d of ["2026-10-02", "2026-10-04", "2026-10-06"]) { st.state.settings.devDate = d; }
  st.state.settings.devDate = "2026-10-03";
  st.accept(st.taskById.cold30);
  st.checkIn(st.state.active.find(a => a.qid === "cold30"));
  st.state.settings.devDate = "2026-10-07";
  st.accept(st.taskById.climb);
`;
for (const [name, vp] of [["phone", { width: 390, height: 844 }], ["desktop", { width: 1440, height: 900 }]]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: name === "phone" ? 2 : 1, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(base + "?qa#map");
  await page.waitForTimeout(1500);
  const url = await page.evaluate(() => performance.getEntriesByType("resource").map(e => e.name).filter(n => n.includes("/src/store.js")).at(-1));
  await page.evaluate(async ([u, f]) => { const st = await import(u); new Function("st", f)(st); }, [url, seed]);
  for (const s of screens) {
    await page.evaluate(t => { location.hash = t; }, s);
    await page.waitForTimeout(s === "map" || s === "home" || s === "yard" || s === "library" || s === "challenger" ? 3200 : 1200);
    await page.evaluate(() => window.scrollTo(0, 0));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    await page.screenshot({ path: `${out}/${s}-${name}.png`, fullPage: !!process.env.FULL });
    report.push({ screen: s, viewport: name, overflow });
  }
  if (errors.length) report.push({ viewport: name, errors });
  await ctx.close();
}
await browser.close();
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.filter(r => r.overflow || r.errors)));
