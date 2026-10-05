# 画室的第一本作品集

2026-10-05，第四十切片。用户确认生态拓展方向并要求开始构建。

## 从哪里开始

目前小小画室只进入小芽表情试验台，真实创作没有保存成果的地方。改为地图上的创作画室：三个主题、每个四次练习；接下练习或写自己的作品，去实际创作，带回文字和本地图片，收好后进入作品集，选择一件陈列在小家，导出单件 PNG 卡片或整本 HTML 作品集。原表情试验台保留为画室里的次级入口。

## 规则与边界

练习是原创 pending-review 文案，正常本地开发预览可用，无需 ?qa；正式构建只加载已确认内容。创作与自建任务一样，不额外发任务光或 XP；接取共用三个名额，完成沿用诚实制、完成仪式和每日微光。没有期限、强制顺序、额外收集货币或等级门槛。

每件作品关联自己写的任务，完成前必须保存文字或图片。作品任务被放下时成果仍保留；再继续会新建一件同条件的自建任务，旧任务历史与关联都保留，遵守已暂放自建任务不能改写的原规则。完成事实来自 done，不在作品里另建完成状态。完成后可修订作品，不能因此再次发奖励。

作品图片由用户主动选择，在浏览器内缩小、重新编码为 JPEG 后嵌入存档，不发送到服务端；每件最多四张，存档中全部图片合计有容量边界。超限时拒绝保存并解释，不自动删除作品或附件。第一版小家陈列为可打开的纸面画框，不占家具网格，不增加价格；不把纸面画框冒充可摆放的 3D 家具。

## 兼容与所有权

home.studio 是可选 v3 扩展，旧档得到空作品集。作品 id、任务关联、正文与压缩图片一起走既有 normalizeHome／parseImport／导出备份路径；全部历史作品保留。图片 URL 格式不被支持、容量超限、重复身份或缺少原始任务关联拒绝整份导入，原备份保留，不静默丢弃。v1/v2 旧键保持，无不可逆迁移。data 声明练习，game/studio 管作品规则，store 负责与任务 API 接合，组件负责编辑与陈列，services 处理本地图片与导出。

## 本轮验收

地图两击内进入画室和作品集，旧表情入口仍可达；三个主题十二个练习能看步骤、明确条件和接取。接取后离开再回来、保存正文和图片、刷新／备份往返、完成并防重复、暂放后继续、陈列到小家／从手记打开、导出 PNG 与 HTML 都走真实界面。核对任务上限、奖励不变、导入失败不改当前数据和图片预算。运行基础测试、构建和实际发布资源检查；桌面／375px 截图自查，补日夜小家陈列。

基线 fd4a578；其他开场在途内容继续保留，不纳入本切片。地图最近暂放接续暂后移，优先按用户最新指令构建作品生态。


## 实际交付与验收

三个主题十二次练习已经实现，分别是观察与摄影、文字、图形与手作。画室另有自己的作品入口；每次先看步骤和完成条件，再明确接下。正文、名字与备注有效修改自动保存；每件最多四张图片，单张编码后最多 240,000 字符，全部图片合计最多 1,800,000 字符（第四十二切片起与院子观察册共用，见 [OBSERVATIONS](OBSERVATIONS.md)）。图片在本地缩放为最长边不超过 1024px 的 JPEG。超限会拒绝新修改并保留原作品，不把完整作品集截成固定条数。完成后允许修订，但必须保留正文或一张图片。

完整链路：地图 → 画室 → 接下创作 → 实际创作 → 带回文字／图片 → 完成仪式 → 作品集。已完成作品可陈列到小家纸面画框，也可以收回，作品与原记录始终保留。从画室去小家直接聚焦陈列作品；从小家、手记作品区与原完成／暂放记录都能打开准确作品。放下时明确承认正文与图片保留，继续时创建同条件的新任务并保留旧关联。表情试验台是画室底部的次级入口。

`npm test` 最终 100/100：旧档、45 件作品无截断、正文空白保留、图片预算拒绝且不改数据、身份／任务关联／陈列合法性、任务上限、空作品完成拦截、0 XP／0 额外任务光、每日微光、修订防重复奖励、暂放接续、备份与默认隐藏私人备注。第一次检查发现重复完成时传入已移除任务会抛异常，已改为返回 false；完整复跑通过。日志 [portfolio-validation](../output/portfolio-validation.txt)。

最终 `npm run build` 和 `npm run check:release` 成功，实际产物通过 24 枚蚀刻图、27 个运行时包与 Privacy Manifest 检查；十二条待审标题在 app/dist 与根 dist 全部不出现。正式构建可正常开始自己的作品。日志 [最终构建](../output/portfolio-ui-final-build.txt)、[发布资源](../output/portfolio-ui-release.txt)，原机械验证含十二条标题扫描 [portfolio-final-build](../output/portfolio-final-build.txt)。

Playwright CLI 的 1280／375px 本地一次性 fixture 均 PASS，无 pageerror／横向溢出：十二次练习／三个主题、空成果不能从岩壁完成、本地图片重新编码、离开／刷新、完成、暂停／继续、三件上限、备份往返与导入失败不改数据、日夜小家、准确定位与手记回望、实际 PNG／HTML 下载。普通 DEV 无需 ?qa 也能看到十二次练习。正式 build 的隔离上下文也通过两个宽度的自建作品、保存、刷新、长文 PNG 和备注主动带入。补验原暂放记录返回画室、全部作品入口、陈列收回及独立 HTML 内嵌图片解码。证据 [主流程](../output/portfolio-browser.txt)、[正式构建流程](../output/portfolio-release-browser.txt)、[接续补验](../output/portfolio-followup-browser.txt)、[导出核对](../output/portfolio-export-verification.txt)。图片 fixture 是 Canvas 绘制的色块，不冒充真实用户摄影作品。

截图首轮元素截图被固定顶栏遮住，改为完整页面并等待渲染帧；这属于采集修正。正式自建创作首次完成后仍停在编辑态，已修复为展示成稿。正式 QA 在两种宽度之间只删除 localStorage 却没有重载 SPA，导致第二轮残留第一轮内存 fixture；已补重载，两个宽度最终通过，没有为测试问题改业务数据。

| 页面 | 桌面 | 375px |
| --- | --- | --- |
| 十二次练习 | [查看](../output/playwright/portfolio-start-1280.png) | [查看](../output/playwright/portfolio-start-375.png) |
| 创作与图片 | [查看](../output/playwright/portfolio-editor-1280.png) | [查看](../output/playwright/portfolio-editor-375.png) |
| 完成与成稿 | [查看](../output/playwright/portfolio-finished-1280.png) | [查看](../output/playwright/portfolio-finished-375.png) |
| 作品集 | [查看](../output/playwright/portfolio-album-1280.png) | [查看](../output/playwright/portfolio-album-375.png) |
| 小家日景 | [查看](../output/playwright/portfolio-home-day-1280.png) | [查看](../output/playwright/portfolio-home-day-375.png) |
| 小家夜景 | [查看](../output/playwright/portfolio-home-night-1280.png) | [查看](../output/playwright/portfolio-home-night-375.png) |
| 暂放作品 | [查看](../output/playwright/portfolio-rest-1280.png) | [查看](../output/playwright/portfolio-rest-375.png) |

实际导出：[PNG 卡片](../output/playwright/portfolio-card-1280.png)、[长文选页](../output/playwright/portfolio-long-card-1280.png)、[主动带入备注](../output/playwright/portfolio-note-card-1280.png)、[独立 HTML 作品集](../output/playwright/portfolio-album-1280.html)、[HTML 渲染](../output/playwright/portfolio-export-album.png)。PNG 1200×1600，长文与多张图片会标作品选页；HTML 保留全部内容，可打印。默认导出不含私密备注，主动勾选才带入。

## 本版本的实际边界

练习文案仍 pending-review；本地试用可用，正式构建不含练习声明。作品页与自建创作、保存和导出功能进入正式构建。小家陈列是纸面画框，不是可摆放的 3D 家具。浏览器文件下载已验证，原生 WebView 的作品卡片下载／分享与真实设备存储性能尚未验收，本轮不将其描述为原生导出已完成。原生整份 JSON 备份仍沿用现有通道，可携带作品。没有新依赖、不可逆迁移、账户、云存储、额外奖励、推送或发布。
