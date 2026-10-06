# 从地图回到暂放作品

2026-10-06，第四十五切片；基线 `174afec`。按 ROADMAP 与用户「继续构建这个项目」接续。

暂放的作品已经完整保存在画室，但地图只显示手里的任务和最近完成，回来后还需进画室翻作品集。地图增加最近一件暂放作品的直接入口：先看原成果，再决定是否继续。原有进行中任务优先；没有进行中任务时，自己的暂放作品排在新推荐前。入口对应地图画室，不新增顶栏导航。

## 契约

状态沿用 `studioStatus`，只候选 `rest` 作品，匹配最后一个 taskId 的暂放记录；按记录 `at` 倒序、同日按历史数组后写先出。作品创建／修改／排列顺序不能改变最近暂放的选择。没有候选时隐藏整个卡片，不混入普通任务、进行中或已收好作品。

卡片显示作品名、暂放日和成果节选／第一张成果图，不带私人备注或暂放原因。直接调用既有 `openStudio(id)`，打开准确原件并聚焦标题。暂放状态默认显示成果预览，空成果仍保留作品名与完成条件；打开／返回不写存档、不自动接取，满三件也可以看。

只有画室「接着做这件作品」沿原 `continueStudioWork` 创建新的任务关联；保留旧任务和成果，三件上限、完成条件、光与 XP／微光规则不变。接续后该件从地图暂放候选退出；再次暂放按新的真实记录排序，完成后不再候选。成果预览不复制素材或图片。

不改存档字段、迁移、奖励、依赖、场景几何或完成后 onward 规则。手机地图仍先有地图与行动，卡片随有无进行中任务排在相应位置；旧导航与其他建筑保留。

## 验收

针对最近排序、同日先后、旧任务排除、状态变化和只读投影做小型规则测试；运行全量 `npm test`、build、check:release。Playwright CLI DEV／正式 × 1280／375px 隔离fixture验证无候选隐藏、多件不同日／同日、修改不改排序、活跃行动优先、直接定位／焦点、预览只读与满三件、明确接续保留历史、刷新／备份、小家日夜。亲看截图并修正问题。本地提交本轮，开场在途文件保留，不推送或发布。

## 实现

`game/studio.js` 的 `latestRestingStudioWork` 只读原状态，返回原作品与真实暂放记录，不复制成果。`MapRestingWork.vue` 使用原成果正文的三行节选与第一张图片；标题两行节选，完整内容在画室。`App.vue` 按有无活跃任务安排卡片的 DOM 顺序，375px 的视觉和键盘顺序一致，点击复用 `openStudio(id)`。

`StudioView.vue` 的暂放页默认预览，放下正在编辑的作品时也立即切回预览。只有原接续动作成功才进入编辑器；原完成与备注规则沿用。`StudioWorkPreview.vue` 与地图共用 `studioReady` 判断有无成果，只有空白字符的正文如实显示「这一版还在路上」，作品名和完成条件仍然可见。

## 实际结果

`npm test` 122/122 通过，新增四项覆盖不同日期／同日顺序、最新 taskId、继续／再放／完成的候选变化、只读投影及 45 件完整备份与旧空存档。最终 `npm run build` 188 modules 成功，`npm run check:release` 确认 24 etchings、27 runtime packages 与 Privacy Manifest 完整。

Playwright CLI 隔离 DEV／正式 × 1280／375px 四组均 PASS，无 pageerror 或横向溢出。任务身份先由真实 UI 创建，历史与 Canvas 图片为一次性本地 fixture；没有访问生产数据。无候选隐藏；旧任务与普通任务、working／done 不混入；修改不改变选择；有／无活跃任务的 DOM 与实际位置顺序一致。60 字标题、正文三行节选与原图片解码，私人备注／放下原因排除；一击回准确作品并聚焦，查看零写入，满三件禁接续但可看，空白正文如实提示。明确接续增加一个任务而不发奖励；再次放下重选，完成退出候选，刷新保持。

四份真实下载 JSON 均在浏览器恢复，并独立用 `parseImport` 核对：六件作品完整，目标作品四段任务关联、原日志、正文与图片、旧放下和最终完成记录保留，恢复后最近候选一致。小家纸面陈列与日夜截图正常。主代理亲看桌面／375px 卡片、预览与日夜；修正截图采集的平滑滚动回顶，未为了验收改动业务规则。

证据：

- [规则测试](../app/test/map-work-return.test.js)、[浏览器流程](../scripts/qa-map-work-return.js)与[运行入口](../scripts/qa-map-work-return.mjs)。
- [测试](../output/map-work-return-tests.txt)、[构建](../output/map-work-return-build.txt)、[发布资源](../output/map-work-return-release.txt)、[浏览器](../output/map-work-return-browser.txt)、[实际下载核对](../output/map-work-return-downloads.txt)。
- [手机空闲地图](../output/playwright/map-work-return-release-map-zero-active-375.png)、[手机满额地图](../output/playwright/map-work-return-release-map-full-375.png)、[桌面预览](../output/playwright/map-work-return-release-preview-full-1280.png)、[手机空白预览](../output/playwright/map-work-return-release-preview-empty-375.png)。
- [小家白天](../output/playwright/map-work-return-release-home-day-375.png)、[小家夜晚](../output/playwright/map-work-return-release-home-night-375.png)，其他截图与备份在 `output/playwright/map-work-return-*`。

本轮未验收实体手机、原生 WebView 文件流程或真实用户长期使用，既有 three 阴影 API 弃用警告仍在。无新依赖、存档字段或不可逆迁移；仅本地提交，开场在途改动保留，不推送或发布。
