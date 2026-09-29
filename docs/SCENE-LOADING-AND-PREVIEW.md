# 场景按需加载与家具近看

2026-09-29，第二十三切片。

## 加载边界

原 App 静态引用各场所与家具缩略图，three 的 core 和 renderer 又被强制合并，因此从任务入口打开也会加载完整 3D 依赖。本轮把地图、小家、院落、书屋、集市与木器铺改为异步场所组件，加载期间显示状态，失败提供重新载入；家具缩略图通过轻量 service 延迟加载，并保留应用卸载时的 GPU 清理。不要重新在 App 壳层静态导入 scenes/furniture.js 或其他 three 场景。

Vite 依据当前已安装 three 自带的 build/three.core.js、build/three.module.js 保留两个缓存边界，不修改警告阈值。屋顶的三棱柱改为八个显式三角形，去掉仅为这一形状引入的 Shape/ExtrudeGeometry 与三角剖分代码。没有换版本、加依赖或改 lockfile。

本轮构建实测：原 three 单包 552,400 bytes，现 core 188,700 + renderer 349,800 bytes，总计 538,500 bytes，净减 13,900 bytes；最大 JS 文件降至 349,800 bytes，无超过 500 kB 的提示。新增家具详情后全部 JS 由 889,672 到 889,880 bytes，基本持平，不能把分包当成同等幅度的总体下载缩减。

正式构建浏览器验证：直接打开 #tasks，仅请求 234,480 bytes 解码后的 JS，three 请求为 0；进入地图后才请求两个 three 文件，回访地图没有重复请求。此为浏览器资源记录，不是网络测速或真机性能基准；首次打开地图仍需要完整的 WebGL 核心和渲染器。

## 家具近看

入口位于已有集市商品卡「近看与尺寸」，不增加地图主入口。弹窗复用原 furnitureModel，支持拖动、缩放、90° 旋转、复位、日夜与占地格开关。尺寸取原家具声明与 footprint，按每格 0.5 米呈现；说明这是游戏摆放占地。地面铺物与实体家具使用既有 layer 区分说明。

详情可按原 purchase 门面购买，余额不足禁用，已拥有的物件显示数量或原家具铭牌。购买后可以直接回家布置。关闭或 Escape 返回触发按钮焦点，卸载释放场景资源。未改变价格、库存、碰撞、奖励或存档结构；不会为预览摆放或扣费。

## 验证

npm test 66/66、npm run build 成功。桌面 1280 和手机 375 验证长工作台的 3×1 / 1×3 占地、日夜、拖动、购买扣 130 光、反复开关与焦点恢复、返回小家，无页面错误或横向溢出。截图后拉近默认镜头，并补拍最终日夜视图和重建。

证据：output/bundle-before.json、bundle-comparison.json、bundle-preview-validation.txt、bundle-preview-final-build.txt；output/playwright/bundle-loading-verification.txt、bundle-production-map.png、furniture-detail-*。复放脚本 scripts/qa-furniture-detail.js 使用 5191 独立 ?qa 存档；scripts/qa-bundle-loading.js 从 5192 正式构建的 #tasks 启动，仅导航与读取资源记录。
