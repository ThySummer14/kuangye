# 街角第一位居民

2026-10-05，第四十一切片。基线 `2f3e6af`。

书屋已有阅读与问题桌，街角还没有与真实行动相连的人。这次加入一位本地故事居民和一次创作委托：地图 → 书屋 → 街角来访，两击可达；不靠修复等级、登录次数或日期解锁。人物、故事与委托为原创 `pending-review`，DEV 可试用，正式构建不加载未审声明。旧来往仍以已保存的快照回望。

## 一次完整来往

阿禾整理书屋的窗边，想留一张来自真实生活的明信片。先读短故事与三步要求，再主动接取；在画室创建关联作品与零 XP 自建任务，共用三个名额。去观察一个真实地方，写出三个具体细节与一句给路过者的话，或带回一张自己拍摄／画出的图并写说明。没有期限或自动接取。

保存成果与完成沿用画室的诚实制和原任务仪式。委托不另建任务完成事实。完成后回书屋，明确确认满足条件并交回；只允许关联的已完成作品，重复交回无副作用。交回无额外光、XP、微光或家具，书屋新增一块明信片陈列与回复，地图留下对应纸牌，成长手记可回望并打开原作品。私人备注不进入陈列。

放下作品后，来访与正文仍在；从来访回到同一作品，在画室按既有规则继续（新任务关联、旧历史保留）。重复接取只打开原作品，不产生第二份委托。读故事本身不写完成记录、不给奖励。

## 存档与边界

`home.visits` 是可选 v3 扩展，旧档默认空数组。每次接取冻结人物名、故事、步骤、条件、回复和作品关联，保证待审声明被正式构建隔离后仍可继续自己的已接作品。导入与本地恢复共用清洗及跨作品校验；重复身份、无效字段、缺原作品、提前交回拒绝整份备份，不静默截断历史。保留 v1/v2 旧键，没有不可逆迁移。

交回冻结当时的标题与最多 240 字正文摘记及日期，不复制图片容量；陈列打开当前原作品，修订不会改写交回日期、摘记或再次结算。故事人物是本地虚构角色，不产生对外发送。data 声明内容，game 管记录和交回门槛，store 接现有任务与画室，scenes 只接收是否已有陈列这一事实。沿用现有静态合并与 GPU 释放。

## 验收

测试旧档、快照往返／不丢历史、非法关联拒绝、三件上限、重复接取／交回、暂停接续与零额外奖励。浏览器在 1280／375px 从地图接下、保存、放下／继续、完成、确认交回、刷新、手记与原作品往返；查看书屋日夜与地图变化，检查键盘标签和横向溢出。运行 `npm test`、`npm run build`、`npm run check:release`，扫描正式资源不含待审故事。开场其他在途修改保留。

## 实际交付与验收

来访在地图书屋的第三张桌子，桌面与 375px 都是两击进入。阿禾有原创 SVG 肖像和 three.js 街角人物；故事、三步行动和完成条件在接取前可读。读故事不会写任务记录。接下后创建一件画室作品，原任务名额、诚实制、完成弹窗、每日微光与暂停机制全部复用。完成后由用户确认满足原约定再交回，重复接取和交回不产生副本或奖励。

交回后有故事回复、日期与作品标题／正文短摘记，书屋预览和地图出现通用的 3D 纸牌。纸牌不是上传后的用户照片贴图；完整文字与图片通过作品入口打开，私人备注留在画室。修订作品不会改写来往快照。手记可以回书屋或准确打开本次作品。

`npm test` 105/105、`npm run build`、`npm run check:release` 全部通过；主代理核对实际日志。新增回归覆盖旧档、45 次历史不截断、未知内容库仍保留快照、非法关联／提前交回整份拒绝、必须明确确认、三件上限、暂放同作品接续、重复操作与经济不变。日志：[测试](../output/residents-validation.txt)、[构建](../output/residents-build.txt)、[发布资源](../output/residents-release.txt)。产物仍通过 24 枚蚀刻图、27 个运行时包与 Privacy Manifest 检查。

正式 JS 资源不含阿禾的 name、title、两段完整 story 和 reply，DEV 正常地址可试用；[内容门槛](../output/residents-content-gate.txt)。Playwright CLI 在 1280／375px 的本地一次性 `?qa` 流程通过接取、满三件拒绝无副作用、文字保存、暂停与新任务接续、完成仪式、确认交回、备注排除、修订不改快照、刷新／备份、日夜书屋、地图变化和手记准确跳转，三桌键盘 Home／End 焦点通过。无 pageerror 或横向溢出；[主流程证据](../output/residents-browser.txt)。

正式 preview 的两个隔离浏览器上下文先检查新存档没有待审来访，再从真实导入界面恢复已经接取的 v3 fixture，打开保存的故事与作品，完成、交回、刷新均通过，0 XP／0 额外光、当天一份微光；[正式恢复证据](../output/residents-release-browser.txt)。没有用正式用户数据。关键截图由主代理亲看，来访页头从阅读修复文案调整为本次约定，最后补完整浏览器验证；最终确认 API 严格接收 true，测试拒绝 truthy 字符串。

| 场景 | 桌面 | 375px |
| --- | --- | --- |
| 来访故事与步骤 | [查看](../output/playwright/residents-visit-1280.png) | [查看](../output/playwright/residents-visit-375.png) |
| 交回前确认 | [查看](../output/playwright/residents-handover-1280.png) | [查看](../output/playwright/residents-handover-375.png) |
| 书屋日景 | [查看](../output/playwright/residents-library-day-1280.png) | [查看](../output/playwright/residents-library-day-375.png) |
| 书屋夜景 | [查看](../output/playwright/residents-library-night-1280.png) | [查看](../output/playwright/residents-library-night-375.png) |
| 街角变化 | [查看](../output/playwright/residents-map-after-1280.png) | [查看](../output/playwright/residents-map-after-375.png) |
| 手记回望 | [查看](../output/playwright/residents-journal-1280.png) | [查看](../output/playwright/residents-journal-375.png) |
| 正式恢复后的来往 | [查看](../output/playwright/residents-release-restored-1280.png) | [查看](../output/playwright/residents-release-restored-375.png) |

本轮故事仍 pending-review，没有推送或发布。没有新依赖、账号、后端、定位或收费 API。原生备份继续使用同一 parseImport 路径，居民流程未做模拟器／真机验收；既有 three 阴影 API 弃用警告仍在。下一切片接院子观察册，保留原在途文件。
