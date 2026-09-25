# 旷野 · 唯一进度入口

更新：2026-09-25（第四切片）。维护契约见 [CHARTER](CHARTER.md)。

最新交付：原生备份切片在真实模拟器上闭环（分支 codex/native-offline-storage）。手记页"导出备份"原生写入 Documents 并弹系统分享面板，"导入备份"走 JSON 文件选择器；格式与 Web 共用同一条 parseImport 管线。可复放验收 `scripts/native/run-sim-tests.sh`：完成持久化（347→362→重启恢复，双代文件核验）+ 备份落盘核验全部通过。修复三处缺陷：SceneDelegate 绕过插件注册、store.js 先于原生驱动快照空状态、xcodebuild 重装删除容器导致宿主播种失效（XCUITest 改为自我播种）。证据见 [NATIVE-STORAGE](NATIVE-STORAGE.md) 与 RUNLOG 最后两节。Web 回归 journey/completion-exit/navigation 双宽度 PASS，45/45 测试与 build 绿。尚未推送或更新 Sites；未做真机签名包与性能。

## 当前到哪了

第五轮小芽形象冻结；第六轮8枚三阶蚀刻章与营地印记柜已完成（图样预览，正式系列任务未启用）。任务完成、结算光、购物绑定回忆、摆入小家、JSON 导出恢复闭环；v3 字段与经济不变。原生存档层 + 原生备份导出/导入往返已实装并通过模拟器端到端验证；真机迁移与签名包未做。

## 下一步：一个具体动作

原生存档/备份链路已全部闭环并合入 main；首季系列内容提案已交付（[SERIES-SEASON1-REVIEW](SERIES-SEASON1-REVIEW-2026-09.md)，八族写作卡 + 19 条任务，含四个待用户裁决点）。下一步二选一：
1. 用户对提案给出反馈后：按裁决修订，进入实现切片（tasks.js + series.js 正式目录 + 结构校验测试）；
2. 用户未反馈期间：推进 [PUBLISHING](PUBLISHING.md) 待做项中不依赖用户的条目（真机迁移演练、隐私数据流审计稿）。
不要先斩后奏把提案内容写进运行时。

每次继续先读本页、RUNLOG 最后一节、git log，并查看工作区差异。机械工作 Luna/max，主代理亲自核验。

## 后续里程碑

1. 内容确认后接系列求值与永久荣誉索引，复用SERIES预算与兼容策略；不从图样点击发奖励。
2. [PUBLISHING](PUBLISHING.md)记录iOS本地封装、可靠存档、真机性能、隐私与商用天气门槛。原生存档适配器、模拟器验证、原生备份导出/导入已完成；剩真机迁移演练、签名构建（需账号）、性能基准。账号、钱、法律承诺与上架提审由用户完成。

## 尚未覆盖

浏览器与模拟器验收不是实体手机性能基准；three分包体积及阴影API弃用警告未解决；真机 WebView→原生文件的就地迁移只在逻辑层验证；未生成签名包或提交App Store。
