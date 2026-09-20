# 旷野项目入口

默认中文。运行时仅 Vue 3 + three.js；保留现有依赖与 `app/package-lock.json`。

## 命令

- `npm --prefix app ci`：安装现有依赖。
- `npm run dev`：启动 Vite。
- `npm test`：运行 `app/test/` 的 node:test。
- `npm run build`：构建 `app/dist` 并复制生成根 `dist` 供 Sites 使用。

## 边界

- `app/src/store.js` 是响应式 API 门面。任务组件沿用 accept/checkIn/logUnits/complete/abandon 的语义。
- `app/src/game/` 管理存档、经济、碰撞、表情参数等规则；渲染不能直接决定奖励、定价或合法位置。
- `app/src/scenes/` 负责 three.js。卸载释放几何、材质、纹理和上下文；静态几何按材质合并，拾取代理独立维护。
- `app/src/data/` 为任务与家具声明；价格和占格不要在组件里另存一份。
- v3 localStorage 保留 v2/v1 旧键。导入与迁移共用清洗路径，不能静默丢失旧任务记录。
- 无断签惩罚、无放弃扣款、同时最多 3 个任务。每个记录日期最多一份微光。
- 改经济、摆放或存档时运行相应测试；改界面时检查 375px 与桌面主路径。
- 根 `.openai/hosting.json` 为 Sites 绑定，根 `dist` 是生成产物，不提交；不可把凭证写进文件。
- 本地测试使用一次性 fixture，无生产访问。改完主动运行 `npm test` 和浏览器截图自查并修复失败项，不必逐步请求批准；涉及不可逆存档迁移时除外。

设计取舍见 `DESIGN.md` §14；结构及使用说明见 `README.md`；本次验收证据见 `docs/QA-v3.md`。

长期导航规则：地图是唯一主入口；所有新面板入口必须对应地图建筑或场所，禁止新增顶部多入口导航。子页保留回到地图，桌面与 375px 从地图两击内可达。

## 维护权限与状态协议

- 长期托管授权、使命与不可变约束、三级行动规则、跨会话状态协议见 `docs/CHARTER.md`（2026-09-20 生效，用户托管声明）；每个会话从 `docs/ROADMAP.md` 的"下一步"接续，收尾保持工作区干净。
