# 隐私数据流审计稿 · 2026-09-25

给隐私政策草稿（[PUBLISHING](PUBLISHING.md) §隐私槽位）提供事实底稿。每一条都可从代码库核实；发布前若有代码变动，重跑本审计。这是**内部事实稿**，不是法律文本，也不是隐私政策本身。

## 数据流清单（当前代码事实）

| 数据 | 产生位置 | 去向 | 存活期 |
| --- | --- | --- | --- |
| 任务、回顾、家具、光余额（v3 存档） | 用户操作 | Web：浏览器 localStorage（键 `kuangye.v3`，旧键保留）；原生：App 沙盒 `Application Support/Kuangye/current.json` + `previous.json` | 直到用户卸载/清理；无任何同步 |
| 备份导出 | 用户点"导出备份" | Web：浏览器下载 Blob；原生：App Documents + 系统分享面板（用户自选目的地） | 用户自管 |
| 备份导入 | 用户选文件 | 解析在本地完成（`parseImport`），无网络 | — |
| 天气查询（仅 Web） | `services/weather.js` | `api.open-meteo.com`，发送约公里级坐标（`eastEightHour`/定位降级为新乡）；**不携带任何存档或身份字段**，响应不落盘 | 实时请求，无留存 |
| 定位（仅 Web） | 浏览器 geolocation（用户授权） | 只用于拼天气请求参数；不保存坐标轨迹（AtmosphereControl 文案已声明） | 不落盘 |
| 原生版天气 | 已禁用联网天气与定位（`AtmosphereControl.vue` 原生分支） | 无网络请求 | — |
| 账号/分析/广告 SDK | 无 | 无账号系统、无自有后端、无 analytics/beacon（代码内 `report()` 仅指本地导出成长报告文本） | — |

## 第三方依赖（打包进 App 的全部网络能力）

- `@capacitor/core` / `@capacitor/ios` / `@capacitor/cli` 8.5.2（MIT）：WebView 桥，自带 `PrivacyInfo.xcprivacy`（框架内已含，声明 required-reason API）。应用自身未声明额外的 required-reason API 使用。
- `vue` 3.5、`three` 0.185（均 MIT）：纯前端，无网络行为。
- 运行时唯一出网调用是上表天气一行；原生构建中该行不可达。

## App Store 隐私标签的初步对照（待用户确认后填写正式标签）

- **不收集**：无账号、无设备标识读取（未用 IDFV/IDFA）、无用户内容上传。按 Apple 定义，全部任务/手记/家具数据"不离开设备"，可勾选"不收集数据"。
- 唯一灰区：Web 版天气查询发送的公里级坐标属于"离开设备且超出实时请求需要？"——按 Apple 口径，实时请求即用即弃不属于"收集"；但标签以**原生版**为准，原生版不请求天气，因此更干净。
- 隐私政策 URL、生效日期、主体名称：待用户提供（PUBLISHING 槽位）。

## 原生版删除入口（原生实现承诺项，写进政策前必须真实存在）

- 设置/手记内提供"清除全部数据"：删除 Application Support 两个 JSON 与 Documents 备份（`SaveFiles` 目录已知，实现成本低）。
- 卸载 App 即删除沙盒全部数据（iOS 系统行为）。
- 2026-09-25 已实现：成长手记 → 数据 → 重置，双平台 purge（原生删 Application Support 双代文件；Documents 导出备份属用户财产不动）。隐私政策可以如实宣称。
