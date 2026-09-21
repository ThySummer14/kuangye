# 蚀刻章美术交付 gallery

2026-09-21：两张编号总览已获用户整体批准，按该方向完成 8 枚 × 3 阶共 24 张独立 PNG，并完成瞭望台「营地印记柜」陈列场景。下表每张缩略图都链接到原始 PNG。

| 编号与主题 | 素刻 | 嵌纹 | 镀彩 |
| --- | --- | --- | --- |
| 01 · 四时归灯 | [![01 素刻](01-plain.png)](01-plain.png) | [![01 嵌纹](01-inlaid.png)](01-inlaid.png) | [![01 镀彩](01-gilded.png)](01-gilded.png) |
| 02 · 山径成桥 | [![02 素刻](02-plain.png)](02-plain.png) | [![02 嵌纹](02-inlaid.png)](02-inlaid.png) | [![02 镀彩](02-gilded.png)](02-gilded.png) |
| 03 · 门外初光 | [![03 素刻](03-plain.png)](03-plain.png) | [![03 嵌纹](03-inlaid.png)](03-inlaid.png) | [![03 镀彩](03-gilded.png)](03-gilded.png) |
| 04 · 滴水成湾 | [![04 素刻](04-plain.png)](04-plain.png) | [![04 嵌纹](04-inlaid.png)](04-inlaid.png) | [![04 镀彩](04-gilded.png)](04-gilded.png) |
| 05 · 经纬相合 | [![05 素刻](05-plain.png)](05-plain.png) | [![05 嵌纹](05-inlaid.png)](05-inlaid.png) | [![05 镀彩](05-gilded.png)](05-gilded.png) |
| 06 · 林间远路 | [![06 素刻](06-plain.png)](06-plain.png) | [![06 嵌纹](06-inlaid.png)](06-inlaid.png) | [![06 镀彩](06-gilded.png)](06-gilded.png) |
| 07 · 木屑成器 | [![07 素刻](07-plain.png)](07-plain.png) | [![07 嵌纹](07-inlaid.png)](07-inlaid.png) | [![07 镀彩](07-gilded.png)](07-gilded.png) |
| 08 · 湖心回声 | [![08 素刻](08-plain.png)](08-plain.png) | [![08 嵌纹](08-inlaid.png)](08-inlaid.png) | [![08 镀彩](08-gilded.png)](08-gilded.png) |

## 陈列场景

[![瞭望台营地印记柜场景](cabinet-scene.png)](cabinet-scene.png)

## 交付对应关系

- 源素材：本目录 24 张 PNG 与 `cabinet-scene.png`。
- 运行时：`app/public/etchings/` 的 24 张 WebP，共 1,032,014 bytes。
- 小图：`output/etchings/` 的 24 张程序化 SVG。
- 入口：地图 → 瞭望台 → 营地印记柜，两击到达只读预览；章未获得、不发光。
- 正式 `series/etchings` 仍为空，当前不接入发放、任务求值或存档迁移。
- `07-plain` 与 `07-gilded` 的旧版本见 `iterations/`；最终版本在 [generation.json](generation.json) 标为 revision 2。
