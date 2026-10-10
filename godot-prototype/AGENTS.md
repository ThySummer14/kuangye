# 旷野 · 原始 Godot 小镇试作（`godot-prototype/`）

2.5D 小镇探索原型：走动、三处室内、布置小家、随手记与 v7 创作/章柜/图片候选。目标平台以 **Web 导出（手机浏览器）** 为主，也支持编辑器与原生窗口调试。工程配置 **Godot 4.6**（`project.godot` 的 `config/features` 含 `4.6`）；离线 QA 脚本写明 **4.6.3**。与线上 Vue 版 `app/` **完全独立**，不读写 `kuangye.v3` 等 Web/APK 存档。

## 硬规则

- **基线分支**：`filisi/kuangye-original-godot-recovery-20261008`。从此开 `cursor/<简述>-d7c8` 一类功能分支，开**草稿 PR**，**不合并**、不推他人分支。
- **禁止动 `main`**（含 `app/`、Pages 工作流、稳定站）。
- **禁止动已否决的探索线**：仓库根目录 **`godot/`**（见 PR #2）、`godot-town-exploration` 等平行实现。不往那边搬代码、不合并、不替它们改导出。
- **存档与迁移**（见 `scripts/state.gd`）：
  - 当前主档：`user://town-prototype-v4.json`（`TownState.VERSION == 4`）。
  - 只读迁移来源：`user://town-prototype-v3.json`、`user://town-prototype-v1.json`；**已有 v4 时优先 v4**，旧文件**不改字节**；回退旧版后的新进度**不并入**已有 v4；坏档/未知字段**不静默回退**。
  - 改 `version`、键名、迁移顺序或校验规则 → 必须写迁移与测试（`tests/test_state.gd`、`tests/test_studio_media_model.gd` 等）。
  - 走位侧车（v7.5.2 候选，PR #3）：`user://town-prototype-v4-walk.json`，**不进主 v4**；合入前不要假定存在。
- **打包**：`tools/package_delivery.py` 白名单；**不得**把 `town-prototype-*.json`、测试 fixture、`.env`、密钥打进交付物（见 `tests/test_package_delivery.py`）。
- **导航**：无多页站点式顶栏；玩法入口保持在地图/建筑交互内（与 Vue 版长期规则一致，本原型是独立工程）。

## 环境与命令

| 用途 | 命令 |
|------|------|
| 安装/打开 | 官方 [Godot 4.6.3](https://godotengine.org/)，打开 `godot-prototype/project.godot` |
| 一键离线 QA | 自仓库根：`python3 godot-prototype/tests/run_all.py`（需 `godot` 或 `godot4` 在 `PATH`） |
| 单脚本 headless | `godot --headless --path godot-prototype --script res://tests/test_state.gd` |
| 玩法集成 QA | `godot --headless --path godot-prototype -- --qa`（`main.gd` 内 `qa_check`） |
| 打包边界测试 | `python3 godot-prototype/tests/test_package_delivery.py` |
| 浏览器选图单测 | `node godot-prototype/tests/test_browser_picker.mjs` |
| 短写失败夹具（仅 Linux） | `python3 godot-prototype/tests/test_short_write.py` |
| Web 导出 | `godot --headless --path godot-prototype --export-release Web godot-prototype/exports/index.html` |
| 交付 zip | `python3 godot-prototype/tools/package_delivery.py --web-dir /path/to/dist --output /path/to/delivery.zip` |

`run_all.py` 会设 `KUANGYE_DISPOSABLE_TEST_DATA=1` 与临时 `XDG_*`，日志与摘要写在 `godot-prototype/artifacts/qa-*.log`、`qa-summary.json`（目录在 `.gitignore`，本地生成）。

**Web 导出预设**（`export_presets.cfg`）：预设名 **`Web`**，`variant/thread_support=false`（单线程），`export_path=exports/index.html`，排除 `tests/`、`docs/`、`artifacts/`、`exports/`。导出产物目录 **`exports/`** 不提交。

本地预览导出结果：用任意静态服务器托管 `godot-prototype/exports/`（需与线上一致的 gzip/外壳时，在仓库外按既有候选站方式处理；见 `docs/IMAGE_MEDIA_QA.md`）。

## 目录（仓库内真实路径）

| 路径 | 内容 |
|------|------|
| `project.godot`、`main.tscn` | 工程入口与主场景 |
| `scripts/` | 玩法与 UI：`main.gd`、`state.gd`（存档）、`world.gd`、`creative.gd`、`badges.gd`、`studio_*.gd` 等 |
| `assets/` | 字体、章图、着色器 |
| `tests/` | Headless 脚本、`run_all.py`、浏览器组件夹具 `tests/browser_component/` |
| `tools/` | `package_delivery.py`、`build_media_component_fixture.py` |
| `docs/` | QA 与规则：`BADGE_RULES.md`、`TOUCH_FURNISHING_QA.md`、`IMAGE_MEDIA_QA.md`、`FEATURE_PARITY.md` 等 |
| `export_presets.cfg` | Web 导出配置 |

无 Autoload；`TownState` 为 `class_name`，由 `main.gd` 持有。

## 代码约定（改 UI/输入时先看）

- **存档唯一来源**：`scripts/state.gd` 的 `serialize` / `load_data` / `save_data`；组件不要另存价格、占格或奖励规则（家具价格在 `scripts/catalog.gd`）。
- **触屏**：`main.gd` 中摇杆单指所有权、HUD `ui_density`、布置模式与 `tests/test_touch_furnishing.gd` 语义一致；第二指、旋转、切后台等行为以 `docs/TOUCH_FURNISHING_QA.md` 与（合入后）`docs/applied-lessons-dusk-post-valley.md` 为准。
- **测试模式**：`fixture_mode` / `--qa` / `--qa-size=WxH` 禁止污染真实 `user://`；沿用 `KUANGYE_DISPOSABLE_TEST_DATA`。

## 改完必跑（机器可验）

1. `python3 godot-prototype/tests/run_all.py` — 当前基线 **21 组**（`import`、`state`、`touch-furnishing`、`integration`/`portrait`/`desktop`/`hidpi` 等，见脚本内 `checks` 列表）。PR #3 合入后为 **22 组**（多 `interrupts`）。
2. `python3 godot-prototype/tests/test_package_delivery.py`
3. 动到浏览器选图/下载：`node godot-prototype/tests/test_browser_picker.mjs`
4. 动到存档原子写：Linux 上 `python3 godot-prototype/tests/test_short_write.py`
5. 改经济/章柜/创作/图片：对应 `tests/test_*.gd` 已在 `run_all.py` 中登记，勿删项。

**不等于验收**：headless / 合成视口 / 云端 Chrome 模拟 **不能** 替代真机。下列标 **「待 Hal 真机」**：

- iOS Safari、Android Chrome：竖屏与横屏（清单见下节及 `docs/TOUCH_FURNISHING_QA.md`、`docs/IMAGE_MEDIA_QA.md`）
- 输入法、软键盘挡输入、`visualViewport`
- 杀后台 / 划掉标签后的 IndexedDB 与走位恢复
- 发热、帧时间、多指在面板内的手感

## 已知坑（维护时默认成立）

**基线（recovery 分支，PR #3 未合入时仍可能遇到）**

- 走位默认**不**写入侧车；重开多在镇口默认点。
- Web：**画布按设备像素**，若 UI 密度仍为 1，手机浏览器上控件偏小、摇杆可能不可见（PR #3 目标修复）。
- 切后台 / 失焦：可能丢 `keyup`，出现「松手还在走」；旋转屏幕时摇杆指可能不释放。
- 摇杆按住时，引擎只模拟第一指，**第二指可能点不到 HUD 按钮**（PR #3 对「互动 / 随手记 / 重试保存」有补丁）。
- 杀后台 / 隐藏页：最后一次进度未必进 IndexedDB（引擎下一帧同步）；**停步再关**比边跑边杀可靠。
- 云端 Agent 环境常 **无 WebGL2**，完整 WASM 游戏集成要在可 WebGL2 的环境或真机测（`docs/IMAGE_MEDIA_QA.md`）。

**v7.5.2 候选（PR #3 + `docs/applied-lessons-dusk-post-valley.md`，合入后以此为准）**

- 走位：`town-prototype-v4-walk.json`，停步 0.6s、进出房间、统一中断时写入；主档锁定时不写侧车。
- Web：`devicePixelRatio` 算 `ui_density`；`env(safe-area-inset-*)`；短横屏定高镜头。
- 仍未包真机：安全区在 Chrome 模拟器为 0、iOS 软键盘、面板内多指、部署到 owner-only 候选址等见文档 **P1** 列表。

详细表格与手机勾选清单：**`docs/applied-lessons-dusk-post-valley.md`**（随 PR #3 进分支；未合入前可看 PR #3 描述）。

## 功能域文档（按需打开）

| 主题 | 文档 |
|------|------|
| 触控布置 v7.5.1 | `docs/TOUCH_FURNISHING_QA.md` |
| 图片/导出/IndexedDB | `docs/IMAGE_MEDIA_QA.md`、`docs/IMAGE_EXPORT_PLAN.md` |
| 章柜 | `docs/BADGE_RULES.md` |
| 响应式 UI | `docs/RESPONSIVE_UI_QA.md` |
| 与 Vue 版差异 | `docs/FEATURE_PARITY.md` |
| 出口热修 | `docs/ROOM_EXIT_HOTFIX.md` |

## 汇报格式（PR / 会话收尾）

短句中文，分四块，带链接：

1. **做了**：分支名、改动摘要、草稿 PR 链接。
2. **测了**：`run_all` 通过组数、`qa-summary.json` 或关键 log；若跑了导出，说明是否仅 `/tmp` 未部署。
3. **已发布**：若无，写「未部署稳定站 / 未改 main」。
4. **待 Hal 真机**：列机型与未测项，不要写成已通过。

## 可选：godot-mcp-runtime 校验/截图

未在真机验证过；仅作编辑器/headless 辅助：

```bash
export GODOT_PATH=/path/to/Godot_v4.6.3-stable_linux.x86_64  # 或本机 Godot 可执行文件
npx godot-mcp-runtime
```

按该工具文档对 `godot-prototype/` 做打开工程、跑场景或截图。**不能**替代 `run_all.py` 与 **「待 Hal 真机」** 项。
