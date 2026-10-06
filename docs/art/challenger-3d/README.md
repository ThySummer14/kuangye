# 挑战者立体章 · 美术来源与重建

用户在 2026-10-06 明确要求「大胆一点，可以生成图片，照着图片，建 3d 的可来回旋绕观察的章」。本目录的 [concepts.png](concepts.png) 是使用内置 `imagegen` 生成的一张原创四章工业设计参考板；完整生成提示词在 [prompt.txt](prompt.txt)。没有输入明日方舟或其他作品的美术资产，没有使用 CLI/API 付费回退。

参考板到实时模型的对应关系：破门与闪电对应「越界者」，菱形炉心与多层焰刃对应「淬火意志」，三向锋刃和镂空框架对应「多面锋芒」，双翼与山峰、中央晶体对应「临界之上」。模型保留参考图轮廓、层叠和材料组合，采用适合网页的低面数几何重新构造；并非自动照片重建，也不声称复刻参考图的所有磨损细节。

`app/src/scenes/challenge-medals.js` 是不依赖 DOM 的模型工厂；挤出板、倒角、切面、通孔、螺钉、背板与扣针均为真实几何，按材质合并为 6–7 个 mesh，约 2,200–3,100 三角形。`challenge-medal-viewer.js` 管理 PBR 材质、程序拉丝纹理、原创背面铭牌纹理、摄影棚环境、灯光、相机与 OrbitControls。无远端模型加载，也无新依赖。

`app/public/challenger/{breach,resolve,versatile,summit}.png` 为同一套模型在本地 three.js 中渲染得到的透明缩略图，首屏、列表及完成页共用。生成参考图只留设计档案，不计入页面首屏下载。若更新模型、材质或灯光，应先启动 5192 开发服务器，再运行 `node scripts/render-challenger-medals.mjs` 重渲染这四张图，最后执行构建。渲染脚本使用现有 Playwright CLI 会话 `kuangye-challenger`。

详情支持拖动、双指／滚轮缩放、键盘方向键与 ＋／−、正反面、自动巡回与暂停；手动旋转即暂停巡回。reduced-motion 默认静止，页面隐藏或模型离开可见区域停止动画。仅打开详情时创建一个渲染器，关闭释放事件、观察器、几何、材质、纹理、环境图、阴影图与 WebGL 上下文。设备不支持 WebGL 或上下文丢失时保留图样和条件，可主动重试。

验收入口：`app/test/challenge-medals.test.js`、`scripts/qa-challenger-3d.js`、`scripts/qa-challenger.js`，汇总见 [挑战者说明](../../CHALLENGER.md)。
