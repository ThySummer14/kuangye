# 本机参考光照实验复现

- Godot：4.6.3 stable official (`7d41c59c4`)
- 渲染器：Compatibility / `gl_compatibility`
- 实际适配器：Apple M5；显示系统：macOS
- 取证目录：`run_1791619251/`，包含 `probe.json`、960×640 窗口截图及 480×272 viewport 截图。
- `probe.log` 显示 `PIXEL_LIGHTING_PROBE_COMPLETE`；退出码 0。日志开始处有一条 macOS sandbox extension 提示，但随后实际 native OpenGL/Metal Compatibility 渲染完成并写出全部截图与 JSON。
- probe.json 的 `claims` 字段含有关于云端 llvmpipe 的通用说明；本次运行不是云端，本机数据以 `adapter=Apple M5`、`display=macOS` 为准。帧时间是本机此轮测量值，不外推到其他设备。
- `lab.gd` 未发现 `user://`、网络请求或外部命令调用；实验写入限于项目 `generated/` 与 `qa/run_<timestamp>/`。

性能测量摘要（四轮，每轮约 2.5 秒）：

| normal_mode | frames | median_ms | p95_ms | draw_calls |
|---:|---:|---:|---:|---:|
| 0 | 844 | 2.03 | 9.863 | 12 |
| 1 | 597 | 4.038 | 8.834 | 12 |
| 0 | 923 | 1.034 | 8.217 | 12 |
| 1 | 2029 | 0.47 | 5.435 | 12 |
