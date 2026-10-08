# 旷野功能迁移清单

核对时间：2026-10-08。来源为公开 main `764e83d95a48dbbe1cd4eff2b35cefc713acaf82` 的实际源码。本工程为独立 `godot-prototype/`，以原始 v6 为基线。此表描述能力，不代表已经全量迁移。

| 功能 / 原入口 | main 实际状态与源码 | Godot 当前对应 | 后续 / 待验 |
|---|---|---|---|
| 八个地图场所 | `data/places.js`：岩壁、小家、集市、瞭望台、书屋、院子、木器铺、画室 | v6 镇中心、家、木匠铺、画室；角色移动、门口进屋 | 场所全量扩充和两击内入口 |
| 日常任务、筛选、自建任务 | `QuestView.vue`、`TaskBoard.vue`、`game/task-selection.js`、`personal-tasks.js` | 本轮仅作品关联的自建创作任务 | 完整任务库、情境筛选、准备动作 |
| 接取/打卡/累计/完成/暂放/继续 | `store.js`，最多3个 active；保留 logs、action plan、暂放历史 | 本轮文字作品支持开始、暂放、继续、完成，最多3项 | 普通任务/连续和累计进度、昨日补记 |
| 成长线与出发手册 | `ChainsView.vue`、`TaskGuide.vue`、`chain-guides.js` | 未迁移 | 前置解锁、手册、场景内容 |
| 成长手记、称号、分类进度 | `JournalView.vue`、`game/journal.js`、`GatheredDays.vue` | v6 生活小记和历史分页 | XP、称号、实际行动历史与回望 |
| 随手记与每日微光 | main 的完成奖励/每日微光位于 `store.js`、`game/home.js` | v6 随手记；本轮作品完成共用每日一次5微光账本 | 经济完整对齐；当前120初始光仍是隔离试作额度 |
| 家具购买、布置、旋转、回收 | `ShopView.vue`、`HomeView.vue`、`game/placement.js`、`home.js` | v6 六家具、库存、购买/放置/移动/取消/收回 | 全家具目录、卖回退款、来源记忆、解锁赠礼 |
| 扩建、墙地、房屋外观 | `WoodshopView.vue`、`game/room.js`、`game/town.js` | 固定室内与原创建筑美术 | 扩建价格/格数、墙地样本、外观 |
| 院落材料、布局方案 | `YardView.vue`、`game/town.js` | 未迁移 | 预览/取消/应用布局、留出入户路径 |
| 书屋修缮 | `LibraryView.vue`、`repairLibrary`：阅读里程碑推动三阶段 | 未迁移 | 阅读推进后的真实场景变化 |
| 阅读桌、书籍与摘记 | `ReadingDesk.vue`、`game/reading.js`、`ReadingRetrospect.vue` | 未迁移 | 新书、笔记、收起/读完/重开、回望 |
| 问题夹页 | `InquiryDesk.vue`、`game/inquiry.js` | 未迁移 | 问题、线索、结论、接续任务 |
| 小小画室（用户所说画师相关） | `StudioView.vue`、`game/studio.js`；自建作品、四类 theme、文字/最多4图、私语、任务关联、作品集、暂放/继续、陈列 | 本轮文字观察衍生作品、正文/私语、完成/暂放/继续、作品集、家中实体陈列 | 直接自建作品、全部主题、图片；当前不是绘画软件或画笔画布 |
| 观察册 | `ObservationBook.vue`、`game/observations.js`；四类观察、日期/地点/正文/线索、最多2图、单一草稿、收好、筛选 | 本轮四类文字观察、单草稿、日期/地点/正文/线索、编辑与收好 | 图片、检索与分类筛选 |
| 观察→创作 | `game/observation-craft.js`；immutable source 快照、双向关联、同一观察只接一作品、共享图片预算 | 本轮文字快照与一对一关联；修改原页不改变当时素材；重复进入不占新任务 | 图片快照容量与双向跳转细化 |
| 作品卡片/作品集导出 | `services/studio-media.js`：PNG取首图/一页正文，HTML保留全部，私语默认不导出 | 未迁移 | 移动下载/分享、导出确认与隐私默认 |
| 居民来访和委托 | `ResidentDesk.vue`、`game/residents.js`、`store.js` 有接取、交付与快照实现；`data/residents.js`区分待审内容 | v6 家具 NPC 交易；来访规则未迁移 | 内容发布门槛、委托接取/交付、不重复发奖 |
| 人生挑战与蚀刻章 | `lifetime-challenges.js`、`LifetimeChallenges.vue`、`game/challenges.js`：14挑战对应14章；完成条件和成果自述；数学项需自己的约定 | 未迁移 | 14章资格、历史、3D查看；不凭购买/光兑换 |
| 越界行动与蚀刻章 | `challenges.js`：6项目，每个3加码条件；`ContractChallenges.vue`；4荣誉章按次数/等级/种类取得 | 未迁移 | 条件冻结、逐项确认、档案/4章、转动/缩放 |
| 旧系列蚀刻柜 | `EtchingCabinet.vue`、`etching-art.js`：8原创图样×3预览阶段；`etchings.js` ETCHINGS为空、模板disabled，明确无铸章/评估/存档集成 | 未迁移 | 属预览与内容设计，不能误称已实装可获得荣誉 |
| 小芽陪伴、表情、氛围 | `mascot-model.js`、`emotions.js`、`RoamingBuddy.vue`、`AtmosphereControl.vue` | v6 既有标准形象、行走、固定暖光 | 全表情/互动、昼夜/天气与操作偏好 |
| 本地存档与导入导出 | `game/save.js`、`services/persistence.js`、`backup.js`；main v3保留旧键，Web/Android/iOS不同存储桥接 | v6 原子保存/失败重试；本轮Godot v1→v2兼容旧原型、坏档保护 | main v3完整导入/导出未做；不会自动读取或重写原Web/APK数据 |

## 本轮最小完整流程

文字观察 → 收好 → 保留当时素材并创建作品 → 写正文/私语 → 确认完成约定 → 陈列到已有小家书桌 → 重开保留。随手记面板可直接打开观察册/作品集，避免高频功能强制步行。镇上长椅与画室画架提供实体入口。

保留 main 字段名：observations.entries 的 id/place/body/hint/kind/observedOn/images/status/createdAt/keptAt；studio.works 的 id/title/body/note/images/theme/exerciseId/taskIds/created/updated；displayId；observationWorks 的 observationId/workId/startedAt/source；customTasks、active、done、abandoned。它们放在隔离原型的 creative 子数据中。本轮 images 必须为空；不支持字段会触发原存档保护，不静默剔除。

个人创作在 main 为零 XP；这里同样不引入 XP 奖励。作品完成与旧随手记共用当天一次 5 微光，重复点完成或同日记录不能重复发放。最多3件进行中作品是未来全局任务上限的子集，后续接普通任务时应共享同一账本。

验证区分：离线状态/视口/软键盘高度代理检查可以证明规则与矩形边界；实际输入法、触屏手势、图片选择、设备性能必须真实手机验证。原生图形与 Web 图形分别留证，不能彼此代替。
