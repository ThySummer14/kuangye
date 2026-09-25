# 隐私数据流审计稿 · 2026-09-25

给隐私政策草稿（[PUBLISHING](PUBLISHING.md) §隐私槽位）提供事实底稿。每一条都可从代码库核实；发布前若有代码变动，重跑本审计。这是**内部事实稿**，不是法律文本，也不是隐私政策本身。

## 数据流清单（当前代码事实）

| 数据 | 产生位置 | 去向 | 存活期 |
| --- | --- | --- | --- |
| 任务、回顾、家具、光余额（v3 存档） | 用户操作 | Web：浏览器 localStorage（键 `kuangye.v3`，旧键保留）；原生：App 沙盒 `Application Support/Kuangye/current.json` + `previous.json` | 直到用户卸载/清理；无任何同步 |
| 备份导出 | 用户点"导出备份" | Web：浏览器下载 Blob；原生：App Documents + 系统分享面板（用户自选目的地） | 用户自管 |
| 备份导入 | 用户选文件 | 解析在本地完成（`parseImport`），无网络 | — |
| 天气查询（仅 Web） | `services/weather.js` | `api.open-meteo.com`，发送约公里级坐标（定位失败降级为新乡）；不携带存档或身份字段，响应不落盘 | 客户端仅实时使用；服务方留存未核实 |
| 定位（仅 Web） | 浏览器 geolocation（用户授权） | 只用于拼天气请求参数；不保存坐标轨迹（AtmosphereControl 文案已声明） | 不落盘 |
| 原生版天气 | 已禁用联网天气与定位（`AtmosphereControl.vue` 原生分支） | 无网络请求 | — |
| 账号/分析/广告 SDK | 无 | 无账号系统、无自有后端、无 analytics/beacon（代码内 `report()` 仅指本地导出成长报告文本） | — |

## 第三方依赖与隐私清单

- App target 已加入应用级 `app/ios/App/App/PrivacyInfo.xcprivacy`：关闭跟踪，声明没有收集数据类型，也没有应用自身 required-reason API 使用。原生代码只用 `FileManager`/`Data` 维护 Application Support 双代存档和用户主动导出的 Documents 文件。
- 原生运行时依赖为 `@capacitor/core` / `@capacitor/ios` 8.5.2 与 Swift Package `capacitor-swift-pm` 8.5.2（产品 `Capacitor`、`Cordova`）；许可证、版本和 revision 见 [THIRD-PARTY-LICENSES](THIRD-PARTY-LICENSES.json)。`@capacitor/cli` 仅是开发工具，不进入最终 App。
- `vue`、`three` 与其他锁定的 Web 生产依赖均为本地打包代码，无自行发起的网络行为；完整锁文件闭包与 SPDX-like 标识见许可证索引。
- 运行时唯一出网调用是上表天气一行；原生构建中该行不可达。

## App Store 隐私标签的初步对照（待用户确认后填写正式标签）

- 原生版当前实现没有账号、IDFV/IDFA读取或开发者接收的用户内容上传，初步按“不收集数据”准备材料。用户主动通过系统分享导出后，文件可能离开设备或由其选择的云服务保管，不能绝对宣称所有数据永不离开设备。正式标签仍待最终发行包审计和用户确认。
- Web 版天气请求包含坐标及网络地址；客户端不保存响应不等于第三方不留存，服务方实际处理规则仍待核实。原生版禁用天气和定位请求，须以最终包核验结果填写标签。
- 隐私政策 URL、生效日期、主体名称：待用户提供（PUBLISHING 槽位）。

## 原生版删除入口（原生实现承诺项，写进政策前必须真实存在）

- 设置/手记内提供“清除全部数据”：当前已实现为双平台 `purge`，删除 Application Support 两个 JSON；Documents 中用户主动导出的备份属于用户财产，刻意保留，不伪称应用可以替用户删除外部副本。
- 卸载 App 即删除沙盒全部数据（iOS 系统行为）。
- 2026-09-25 已实现双平台 purge；删除失败处理、系统备份和真机卸载恢复行为须继续验收。这里记录实现范围，不是已经生效的隐私政策法律承诺。
