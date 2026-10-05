# 院子里的观察册

2026-10-05，第四十二切片。基线 `4f2f0e5`；用户确认继续生态构建。

院子能布置，户外小册能选任务，但真实走过的近处与具体发现没有保存位置。地图 → 院子 → 观察册两击可达；写下地点、看见的日期与具体发现，可带两张本地图片，收进册子后从成长手记打开准确条目。日常观察不要求远行、定位、物种识别或天气服务。

## 与已有功能的关系

观察册围绕一次真实发现，画室围绕做出的作品，岩壁负责接取与完成任务。记录不自动接任务、完成户外任务或发放光／XP／微光。入口提供回岩壁户外方向的接续，原三个任务名额与经济不变。只有一张正在写的观察页；再次开始回到原草稿，收好后才开始下一页，历史全部保留，没有图鉴集齐目标、期限或空档惩罚。

地点与具体发现写全才可收进册子，图片可选；只读卡片展示日期、地点、文字与全部图片，收好后仍可修订但不能变为空记录。草稿修改自动保存，离开／刷新可继续；收好动作保留收录日期，重复无副作用。三个原创观察起点是 pending-review 提示，仅 DEV 可用；正式构建可以自由写自己的观察，不依赖提示声明。

## 存档与图片

`home.observations` 为可选 v3 扩展，旧档为空册子。所有条目通过 normalizeHome／parseImport 共用清洗，非法日期、重复身份、多个草稿、超长文字、非法图片与空收录拒绝整份备份，不截断历史。保留 v1/v2 旧键，无不可逆迁移。

每页最多两张图片，复用已有浏览器缩小与 JPEG 重编码。画室与观察册共用既有 1,800,000 字符图片预算，单图仍最多 240,000 字符；两处新增／修改都在写入前检查另一处占用，容量拒绝保留原内容，不挤掉其他图片。导入也检查两处总量。原图由用户另留，整份 JSON 备份带压缩图片；本轮不新增单页文件导出。

## 验收

测试旧档与全历史往返、字段／日期／图像与草稿身份规则、收录门槛／重复／修订、共用图片预算双向拒绝不改数据、任务与经济不变、手记日子投影。浏览器桌面／375px 从地图两击进入、写字／选本地图、离开／刷新、收录、搜索／分类、修订与手记准确返回；正式构建自建记录、备份往返与待审提示隔离。检查原院落布置主路及日夜截图，运行 npm test／build／check:release。开场在途文件继续保留。

## 本轮交付与证据

上述流程已实现。院子内两个键盘可切换的去处保留原布置功能；观察册桌面左侧索引、右侧纸页，375px 打开记录后先展示当前页，再展示索引。收好的页按实际观察日期排序，可按地点、正文或日期搜索，并按花草／天空／路边／其他分类。地图路牌显示收录页数，成长手记列最近三页及全部入口；「攒下的日子」按观察日期增加只读记录，不将观察画成任务完成的金格。

`npm test` 112/112（新增七条）：旧档为空、45 条全历史及空白／图片保留、草稿唯一与收录／修订门槛、损坏备份整体拒绝、画室与观察册双向容量拒绝不写入、任务／经济不变、检索与日子只读。日志 [测试](../output/observations-validation.txt)。最终构建 179 modules，发布资源检查包含 24 枚蚀刻图、27 个运行时包与 Privacy Manifest；三条待审 title／note 的完整字符串不在两份构建的 JavaScript 中。证据 [最终构建](../output/observations-final-build.txt)、[资源检查](../output/observations-final-release.txt)、[内容隔离](../output/observations-final-content-gate.txt)。

主代理 Playwright CLI DEV 1280／375px 全 PASS：地图两击、键盘去处、真实文件选择与 JPEG 重编码、单图片不能代替发现、离开／刷新接同一草稿、收录与修订、搜索分类、手记准确页与焦点、备份往返、非法日期不改原状态、三个任务与奖励不变、户外入口及原院落日夜布置。普通 DEV 无需 ?qa 也有三个起点，浏览本身不创建记录。[主流程](../output/observations-browser.txt)。

正式 preview 两个隔离上下文也 PASS：新存档无待审提示、自由记录、图片实际解码、刷新、真实备份下载、恢复含冻结提示的草稿并继续收录、手记回原页，任务／光／微光均为零。[正式流程](../output/observations-release-browser.txt)、[实际下载核对](../output/observations-backup-verification.txt)。下载的 [1280px JSON](../output/playwright/observations-backup-1280.json) 与 [375px JSON](../output/playwright/observations-backup-375.json) 经现有 parseImport 读取，正文开头空格／换行和 JPEG 都保留。没有 pageerror 或横向溢出。

关键截图经主代理亲看，手机标题断行已调整，编辑／成稿在索引前显示；原院落日夜主路径完整。

| 场景 | 1280px | 375px |
| --- | --- | --- |
| 从近处开始 | [查看](../output/playwright/observations-start-1280.png) | [查看](../output/playwright/observations-start-375.png) |
| 草稿与本地图 | [查看](../output/playwright/observations-draft-1280.png) | [查看](../output/playwright/observations-draft-375.png) |
| 收好的记录 | [查看](../output/playwright/observations-collected-1280.png) | [查看](../output/playwright/observations-collected-375.png) |
| 检索与分类 | [查看](../output/playwright/observations-book-1280.png) | [查看](../output/playwright/observations-book-375.png) |
| 手记回望 | [查看](../output/playwright/observations-journal-1280.png) | [查看](../output/playwright/observations-journal-375.png) |
| 原院落日间 | [查看](../output/playwright/observations-yard-day-1280.png) | [查看](../output/playwright/observations-yard-day-375.png) |
| 原院落夜间 | [查看](../output/playwright/observations-yard-night-1280.png) | [查看](../output/playwright/observations-yard-night-375.png) |
| 正式恢复 | [查看](../output/playwright/observations-release-restored-1280.png) | [查看](../output/playwright/observations-release-restored-375.png) |

照片证据为本地 Canvas 绘制的叶子／窗框 fixture，不冒充用户实拍。浏览器文件选择与 JSON 下载恢复已验证，原生相册选取、真机容量与性能本轮未验收；整份原生备份仍沿既有通道。没有新依赖、不可逆迁移、定位或外部 API、额外奖励、推送或发布。
