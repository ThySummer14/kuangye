# Android 可安装预览

2026-10-07。接续用户「尝试制作安卓版本的手机软件，注意适配好」要求。复用 Vue 3 / three.js 与现有 Capacitor 8.5.2，只新增版本匹配的 `@capacitor/android`；原有依赖版本不变，原 lockfile 增量更新十行。平台来源：[Capacitor Android](https://capacitorjs.com/docs/android)，MIT；许可原文进入现有索引与构建产物。AndroidX 与 Gradle 使用平台模板的版本，未引入业务 UI 框架或第三方存储插件。

## 安装与迁移

当前交付 `output/android/kuangye-android-preview.apk`，为本地 debug 签名的可安装预览，尚未作为商店版发布。把 APK 传到 Android 手机后打开安装。应用 ID `dev.kuangye.prototype`，Android 7（API 24）以上，需保持系统 Android System WebView 更新。实际验收为 Android 15 / API 35 arm64 模拟器；旧 Android、实体手机 GPU 和触摸手感尚未验证。

网页与 App 的存档相互独立。先在原网页的「瞭望台 → 成长手记」导出 JSON，再到 Android 同一位置导入。内容先经过原 `parseImport`，确认后保存旧进度再替换；异常会保留待导入文件并回滚内存，不能以失败状态假报恢复成功。Android 10 及以上自动安全副本在「下载 / Kuangye」，命名 `before-restore-*`；更早版本会弹出系统文件窗口，让使用者选择保存位置。主动导出可自行指定目录。JSON、成长 TXT、作品 PNG 与作品集 HTML 均走系统文件选择器。大内容先暂存为应用缓存文件，Activity 状态只传短文件名，避免系统 Bundle 大小限制；导出或取消后清理缓存。

本地存档由两个私有文件 `files/saves/current.json` 与 `previous.json` 保存，Java AtomicFile 原子替换，JS 层排队与写后回读校验。旧 WebView localStorage 数据只复制与校验，不删除旧键；新安装不尝试读取浏览器数据。关掉系统自动云备份/设备搬迁，记录只通过明确导出带走；原生自动天气仍关闭。关闭 Capacitor 的桥接日志，避免在 logcat 输出完整记录。

## 手机交互

全部页面与 3D 图样随 APK 打包，断网能使用。原生返回先关闭当前弹窗，再从挑战者回任务岩壁、从场所回地图，在地图退到后台。沿 Capacitor SystemBars 修正后的安全区处理状态栏、导航区与横屏切口；键盘弹起时视口缩小，详情可滚动，短横屏模型缩小而不压住文字。3D 只按需创建，关闭确实释放 WebGL 上下文。

## 重建

需要 Node 22、JDK 21、Android SDK Platform 36 / Build Tools 36。设置 `JAVA_HOME` 和 `ANDROID_HOME` 指向已有安装（如另有 `ANDROID_SDK_ROOT`，应指向同一 SDK），然后：

```sh
npm --prefix app ci
npm test
npm run android:build
```

此命令构建网页、检查发布资源、`cap sync android`、`assembleDebug` / `lintDebug`，然后复制 APK 和 SHA-256 到 `output/android/`。APK、密钥、设备存档与本地 SDK 路径不提交。继续使用原本地 debug key 可覆盖更新保留记录；其他机器签出的包可能不能直接覆盖，请先导出备份。

## 验收

`npm test` 138/138；Web build/release 通过，Android assembleDebug/lintDebug 通过。原生验收脚本 `scripts/native/qa-android.mjs --reset-fixture` 只允许运行在明确指定的模拟器，清理的是一次性测试 App 数据；需要 `ANDROID_HOME`、`ANDROID_SERIAL` 和既有 Playwright 缓存（也可设置 `PLAYWRIGHT_MODULE`）。

验证覆盖地图两击到十四挑战、数学目标接取、键盘视口缩小且输入框可见、系统返回层级、真实 JSON 导出/恢复、恢复前副本内容、模拟一次原生写入失败后的回滚与重试、TXT 与约 570 KiB PNG 真实导出、离线杀进程重开保留进度、离线 3D、触摸旋转、关闭释放、横屏及横屏章详情无重叠/溢出。证据 `output/android/verification.json` 与具名 `*-native.png`。测试仅用 QA 文字，没有读取或修改真实用户存档。

已修复检查发现的 API 24 样式兼容问题、备份早于保存完成的问题和短横屏观察器高度；Gradle lint 仍有模板未使用资源与可升级版本的 warning，没有 error。实体手机、Android 7–14 / 16、不同厂商系统文件管理器未验收；不把模拟器结果作为真机性能结论。

交付 APK SHA-256：`5ae830e544ea93f91116c4db7151e92e7c73c9b885a96be62708d5b2690767fd`（约 46 MiB）。Web 源码与已发布应用提交 `c60dff9` 一致，安装包及校验文本保存在 `output/android/`。
