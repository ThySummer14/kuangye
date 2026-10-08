# 旷野 Godot 小镇

横屏 2.5D 原型。网页版仍在 `app/`，这里不参与它的构建。

## 本机运行

安装与工程相同版本的 Godot（当前是 4.7.2），然后打开 `godot/` 目录，或：

```
godot --path godot
```

桌面可用 WASD 移动，E 向木匠买，B 布置，R 旋转，Q 收回。手机用左下摇杆；第二根手指不会抢走摇杆。走进门口即进入，小家里点「布置」后点地面摆放。

## 网页导出

必须用**单线程**导出（`variant/thread_support=false`），这样手机浏览器不需要 `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`。不要把 `.wasm` 或 `.pck` 预先 gzip：静态托管如果没带 `Content-Encoding: gzip`，游戏会加载失败。导出文件应以 `\0asm` 开头，而不是 `1f 8b`。

预设已经写在 `export_presets.cfg`，外壳在 `export/shell.html`（禁选中、禁长按高亮、竖屏时只显示「横过来」）。

```
godot --headless --path godot --export-release "Web" godot/web/index.html
```

本地查看时用 `godot/tools/serve.py`，它把 `.wasm` 标成 `application/wasm`，并且不附加压缩编码：

```
python3 godot/tools/serve.py godot/web 8765
```

线上不要部署到仓库的 GitHub Pages 根目录，那是 main 上的网页版。本分支的导出放在 `godot/web/`，用提交哈希从静态 CDN 打开，避免覆盖 https://thysummer14.github.io/kuangye/ 。

当前可玩地址（提交 `de439a5`，单线程，`.wasm` 为 `application/wasm` 且未预压缩）：

https://raw.githack.com/ThySummer14/kuangye/de439a55adf18de4df3900267ed3f6028497ae93/godot/web/index.html

上一版 `746ace9` 与最初的 `d1cc2c9` 仍然可开，没有被这次提交覆盖：

https://raw.githack.com/ThySummer14/kuangye/746ace946dbfe8ac59f4538d0c92bf692c78e7ca/godot/web/index.html

https://raw.githack.com/ThySummer14/kuangye/d1cc2c9e4ce417e66d94e2ed2973537abfdc4808/godot/web/index.html

手机浏览器第一次打开会先看到该站的确认页，点 Open the page 后进入游戏，再把屏幕转成横向。jsDelivr 不托管超过 20MB 的文件，所以不能用它发这颗 `.wasm`。
