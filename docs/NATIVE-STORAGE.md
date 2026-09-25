# 离线原生原型与存档边界

2026-09-22；基线 f4298af；分支 codex/native-offline-storage。沿用 Vue/three，不重做游戏。用户长期授权允许增加原生依赖；新增 Capacitor core/ios/cli 8.5.2（MIT），保留原依赖及 lockfile 增量。

问题：store 直接同步读写 localStorage，无法等原生文件恢复完成；确认完成也无法区分异步写入中与已保存。本轮将存档 I/O 抽离，游戏规则和 v3 JSON 不变。

原生启动先读 Application Support 内 current.json，损坏的 JSON 可退回 previous.json 并提示。未知版本/陌生任务不清洗后悄悄继续，阻止启动及覆盖；原生文件都损坏时同样停止，保留文件。只有文件不存在才尝试同 WebView 的 v3/v2/v1 旧键；复制后读回校验才进入应用，绝不删除旧键。不同网站的存档不能跨域自动迁移。

原生写入按请求顺序排队，先将上一份已验证内容原子写入 previous，再原子写入 current，每步读回逐字校验。Swift Data.write(.atomic) 提供单文件替换；双文件不是事务，任一中断必须至少保留上次有效档。只有最新请求成功才清除保存失败提示；写入中不声称已保存。Web 继续使用原键和同步写入，保持现有失败提示及导入导出语义。

本地资源随安装包打包，不配置远程 server.url。原生禁用联网天气和定位，保留本地时间与手动天气；不加账号、服务端、分析和付费API。原生工程暂用开发标识，未定商店 Bundle ID。无签名构建不代表真机或商店验收。

验收：纯逻辑故障注入（迁移、损坏恢复、未来档保护、写入失败/读回不符/队列顺序），真实 Swift 文件读写，npm test/build，无签名 iOS build（环境允许时）；Web 桌面/375px 主路径和日夜截图、离线资源检查。原生设备缺口据实记录，系统分享/原生备份导入导出留下一切片。可回退本分支，不删除任何原用户存档。

参考：[Capacitor iOS](https://capacitorjs.com/docs/ios)、[应用内插件](https://capacitorjs.com/docs/ios/custom-code)。依赖代码保留各包 MIT 声明；本地文件策略为本项目实现，不借用外部美术资产。

## 模拟器端到端验证与三处修复（2026-09-25）

安装 iOS 27.0 Simulator runtime 后，在 iPhone 17 Pro 模拟器上完成了此前缺失的真机级验证，过程中发现并修复三个纯逻辑测试盖不住的缺陷：

1. **插件从未注册**：Capacitor 模板的 `SceneDelegate` 在代码里硬建了朴素 `CAPBridgeViewController()`，把 Storyboard 里配好 `AppViewController`（`capacitorDidLoad` 注册 KuangyeStorage 的唯一入口）整个绕过，App 一启动就报 "plugin is not implemented"。失败保护如预期生效：显示"先保住你的记录"，没有假装成功，没有覆盖任何文件。修复为从 Main.storyboard 实例化初始视图控制器（SceneDelegate.swift）。
2. **状态在驱动挂上前快照**：`store.js` 在模块求值时就执行 `persistence.load()`。若把挂载改回同步（静态 import App.vue），模块图先于 `initializeNativeStorage` 求值，原生驱动尚未就位，状态永远是空档——而且读取本身成功，界面却空着，极易误判为"读取失败"。最终方案：所有平台统一异步启动（先 `await initializeNativeStorage()`，再动态 import App 挂载）；QA 脚本改为在每个 goto/reload 后显式 `waitForFunction(() => window.__KUANGYE__)`，不再依赖同步引导的隐式时序。
3. **xcodebuild test 每次重装都会删除数据容器**：宿主侧预置的种子存档在测试运行前就被删掉。XCUITest 改为在测试进程内部自我播种（runner 通过容器元数据 `MCMMetadataIdentifier` 定位 App 容器写入种子），时机在重装之后、启动之前；`scripts/native/run-sim-tests.sh` 固化了 build→test→宿主侧磁盘核验的可复放顺序（注意每次 test 都要重新解析容器 UUID）。

### 验证链（证据在 `output/native/`）

XCUITest 驱动真实 App（scheme `KuangyeTests`，`scripts/native/run-sim-tests.sh` 可复放）：种子 347 光经插件读取（WebView localStorage 为空）→ 完成慢跑任务 → 362 光 → 终止进程重启后完整恢复；磁盘上 `current.json`=362 且 `previous.json`=347 双代齐备。备份切片：手记页"导出备份"写入 App 容器 Documents（宿主侧核验 `kuangye-2026-09-25.json`，envelope version 3、lumens 362）并弹出系统分享面板（截图 output/native/sim/04-share-sheet.png）；"导入备份"走文件选择器（UTType.json，安全作用域读取），解析仍走共享 `parseImport`。Web 回归 journey/completion-exit/navigation 双宽度 PASS、无 pageerror；`npm test` 45/45（含备份桥 Web 回退语义）。

导入往返同样在模拟器上闭环：选择器直达 Documents 点选备份→共享 parseImport→恢复确认→toast 成功。仍未验证、不得据以上称发布候选：真实 iPhone 性能与签名包；真机 WebView→原生文件的就地迁移演练；分享面板目的地（Copy/保存到"文件"）逐一验证。
