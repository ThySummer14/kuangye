# 从观察页到一件作品

2026-10-05，第四十三切片；基线 `be43d3f`。按 ROADMAP 与用户「继续吧」接续。

观察册与画室目前各自存档，带着发现开始创作需要自己搬运，原发现与新作品没有往返关系。新增观察页内的创作入口：预览文字与图片，写自己的作品名和完成条件，明确接下后进入画室；作品保留原观察入口，观察页可回已有作品。沿用地图院子／画室，原记录保留，没有新顶层导航或内容声明。

## 业务与兼容边界

只允许已收好的观察作为起点，查看／取消不写存档。接取复用 openStudioWork 和三件名额、零 XP 自建任务及原完成／暂放／继续语义；素材不会填进成果区，也不会让作品提前满足完成条件。一天的微光仍只来自已有任务记录通道。

同一观察仅关联一件作品，重复进入直接返回它，包括暂放和已完成作品，不再占名额、复制素材或发奖励。观察与作品修改各自独立：接取时冻结地点、观察日期、类别、完整发现与选择带入的图片；原观察后续修订不改快照，作品成果不回写观察。私人创作备注不回写。PNG／HTML 仍只导出成果；完整 JSON 包含素材快照。

`home.observationWorks` 为可选 v3 关联列表，记录 observationId／workId／接取日期与 source 快照。旧档为空；normalizeHome／parseImport 清洗并检查来源观察已收录、作品存在、双侧唯一身份、合法日期／内容／图片；损坏备份整体拒绝，全部历史保留。v1/v2 旧键保留，无不可逆迁移。

素材图片复制一次，计入画室／观察册原有 1,800,000 字符总预算，成果图片另计。不另存一份素材到成果区。接取前检查总量，容量不足可以取消带图，只带文字；失败不创建任务、作品或关联。已有画室与观察页的新增／修改、整份导入也计入快照图片占用。先保证原数据完整，再接取。

## 验收

测试素材快照隔离、成果门槛、草稿拒绝、重复回同一作品、三件上限及容量拒绝无副作用、共享容量所有写入路径、旧档与备份全历史、非法关联整体拒绝、暂放／接续／完成奖励沿原规则。运行 npm test／build／check:release。浏览器 1280／375px 从地图进入观察、预览／取消／明确接取、实际本地图、空成果拦截、原观察修订与快照不变、刷新／备份、双向准确定位、暂放接续、完成与日夜小家；正式 preview 自建观察到创作。开场在途文件保留，不推送或发布。

## 实现与验收记录

已接通院子观察页 → 素材预览与带图选择 → 自己写作品名／条件 → 画室空白成果 → 原观察双向返回。查看与 Escape 取消不写数据，取消恢复触发按钮焦点；进入作品与返回原页聚焦准确标题。素材默认折叠，随时可以打开；修改原观察只改原页。作品暂放后仍回同一件，接续保留原任务记录；完成、陈列、导出仍沿用画室。

`game/observation-craft.js` 管唯一关联、快照清洗、来源合法性和接取前容量检查，store 复用 `openStudioWork`。存档加载／导入统一由 `normalizeHome` 验证，两侧必须存在且原观察已收录；v1／v2／v3 旧档为空关联，没有改版本或删旧键。图片预算包含作品、原观察和素材副本，所有现有新增／修改入口都计入；失败发生在写入前，可取消带图重试。

118/118 项测试通过（新增六项），覆盖草稿与名额拒绝、空条件、复制超限且无副作用、只带文字、四个写入路径的共享预算、45 份历史、坏关联整份拒绝、快照隔离、零额外奖励、原暂放历史与导出边界。build 与 check:release 通过，24 枚蚀刻图、27 个运行时包与 Privacy Manifest 完整。没有新依赖。

Playwright CLI DEV／正式 preview × 1280／375px 四组主流程通过：地图两击、实际 Canvas fixture 文件选择与 JPEG 解码、素材预览／取消／带图选择、空成果拦截、双向焦点、原页修订、暂放再接续、刷新、完成、HTML 实际下载、JSON 实际下载与备份恢复、小家日夜。无 pageerror／横向溢出。四份实际 JSON 经 `parseImport` 核对，完整素材、正文空白、两个原任务关联和陈列保留；HTML 包含完整成果，排除素材与默认私人备注。

截图亲看后调整手机标题断行，避免单独的「版」占一行；长页截图先回顶、弹窗改拍可见视口，避免固定顶栏出现在长图中间。日夜截图中的纸面作品陈列保持原画室规则。原生 WebView 的图片选择、文件下载／分享与真机容量性能仍未验收；既有 three 阴影 API 警告保留。

证据：

- [测试](../output/observation-craft-tests.txt)、[构建](../output/observation-craft-build.txt)、[发布资源](../output/observation-craft-release.txt)、[四组浏览器流程](../output/observation-craft-browser.txt)、[实际下载核对](../output/observation-craft-downloads.txt)。
- [375px 素材预览](../output/playwright/observation-craft-release-preview-375.png)、[手机明确接取](../output/playwright/observation-craft-release-confirm-375.png)、[桌面空成果](../output/playwright/observation-craft-release-blank-1280.png)、[恢复后的原作品](../output/playwright/observation-craft-release-restored-375.png)。
- [桌面日间小家](../output/playwright/observation-craft-release-home-day-1280.png)、[手机夜间小家](../output/playwright/observation-craft-release-home-night-375.png)；其余截图、下载 HTML／JSON 为 `output/playwright/observation-craft-*` 的一次性本地 fixture。
- 重跑：分别启动 app Vite 在 5192 与 app preview 在 5193，Playwright CLI 打开 `-s=kuangye-craft` 会话，再运行 `node scripts/qa-observation-craft.mjs`。脚本只用隔离浏览器上下文，DEV 用独立 `?qa` 键，不访问用户正式站点。
