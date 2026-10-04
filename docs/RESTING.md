# 先放一放，再接起来

2026-10-04，第三十九切片。接续上一 agent 留下的 AbandonModal、手记与日志保留实现。

放下保留当时的日志快照，不扣光或经验。再次接取普通任务时复制最近一次暂放的日志，恢复按天／累计进度，不删除手记里的快照；手记可接起最近一次暂放的普通任务，并直接回到对应岩壁卡片。旧记录没有日志时如实说明从零开始。自建任务按原规则冻结，继续时另写一件。

兼容方案：只为 abandoned 增加可选 logs，沿用 active 的清洗路径；done 的日志也保留已有数量与文字。v3 版本号、v2/v1 旧键和备份入口保持。缺少 logs 的旧档不推造历史，没有不可逆迁移。攒下的日子读取暂放快照，同一任务同一天的累计快照取最大值，不能把反复放下／接起的旧数量算多次。

验收：按天与累计进度在放下、刷新、导出导入和多次接起后保留；接起不增发光、XP、微光或完成记录；当天重复记录仍受原规则限制；旧档空日志、任务上限、自建任务冻结保持。桌面和 375px 亲走弹窗、手记、日子细节、接起定位与日夜主路径。

实际结果：`npm test` 92/92；`npm run build` 成功，根 dist 已生成；`npm run check:release` 通过（24 枚蚀刻图、27 个运行时包、Privacy Manifest）。[基础验证](../output/resting-validation.txt)、[最终构建](../output/resting-final-build.txt)、[资源检查](../output/resting-release.txt)。

`scripts/qa-resting.mjs` 的 1280／375 本地一次性 fixture 全部 PASS：取消弹窗不改存档；7 天暂放后刷新、接起、卡片聚焦、再记到 8 天；2 首加 1 首、两次暂放、备份往返后仍是 3 首；没有重复奖励；三件上限、自建冻结和旧档空日志文案准确。无 pageerror 或横向溢出。[浏览器结果](../output/resting-browser.txt)。

亲看截图后缩小放下标题，改为墨色，并修正 QA 对宽于手机容器的 canvas 截图裁切：拍可见的 home-stage 与完整地图，等待 toast 消失。[手机弹窗](../output/playwright/resting-days-dialog-375.png)、[桌面手记](../output/playwright/resting-days-journal-1280.png)、[手机累计手记](../output/playwright/resting-units-journal-375.png)、[手机接起](../output/playwright/resting-days-resumed-375.png)、[日间](../output/playwright/resting-home-day-375.png)、[夜间](../output/playwright/resting-home-night-375.png)。

旧版已经丢失的暂放日志和完成记录数量无法凭空恢复；有保留原始日志的备份在新清洗路径里不会再丢数量。没有新增依赖、奖励通道、正式任务、原生签名或发布；浏览器日夜验看不替代真机性能验证。three 的既有阴影 API 弃用警告仍在。
