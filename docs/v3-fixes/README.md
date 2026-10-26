# V3 reliability / audio 修复索引

2026-10-26。分支 `fix/v3-reliability-audio`，基线 `9e63d05`。
本文档目录只记录本轮修复；最终验收以 [`verification.md`](./verification.md) 为准。

| 文档 | 内容 |
| --- | --- |
| [verification.md](./verification.md) | 真实浏览器验收矩阵、原生离页事件、剩余风险 |
| [deployment.md](./deployment.md) | 线上部署、TLS/GLB 检查、浏览器重试与线上限制 |
| [performance.md](./performance.md) | 1440×900 固定镜头与实际运动性能、方法、与历史 44 FPS 的区别 |
| [content.md](./content.md) | 多窗口 dirty、异步保存、技能顺序、备份/审核保护 |
| [navigation.md](./navigation.md) | 上下楼、接回路线、门扇扫掠、移动端控制 |
| [macbook.md](./macbook.md) | 78 键映射、端口、屏幕四角、源 GLB/Blend |
| [ambience.md](./ambience.md) | 原创室内/室外 Web Audio、默认静音、后台暂停 |
| [licenses.md](./licenses.md) | 新模型源文件与程序音频的许可 |
| [remaining-issues.md](./remaining-issues.md) | 需真人确认项与已知限制 |

## 证据（父项目 `outputs/v3-fixes/`，未入库）

- 连续录屏：`continuous-lake-to-desk.mp4`（湖岸→木屋→书桌，约 45 s）。
- 导航：`upper-to-desk.mp4`、`upper-to-desk-original.webm`。
- 截图：`verified-room.png`、`verified-upper.png`、`verified-mac45.png`、
  `verified-keyboard.png`、`verified-screen.png`、`verified-desktop.png`。
- 性能：`performance-verified.json`、`performance-tour-verified.json`。
- 线上：`verified-live-lake.png`、`verified-live-desktop.png`。
- 既有素材：`performance-room.json`、`performance-upper.json`、
  `performance-mac.json`、`performance-lake.json`、`unsaved-guard-fixed.jpg`、
  `mobile-profile.png`、`mobile-world.png`、`touch-movement.json`、
  `keyboard.png`、`mac45.png`、`screen.png`、`room.png`、`upper.png`、
  `indoor-ambience.*`、`outdoor-ambience.*`。

## 未完成/限制

- 原生 `beforeunload` 对话框只捕获到 CDP 事件，未由真人点击确认。
- 原生后台标签/最小化暂停无法在自动化中触发；只验证了事件接线与引擎
  suspend/resume。
- 移动端为桌面浏览器视口 + 触摸模拟；不是物理手机 GPU。
- 室外视觉仍是 V2 水平；没有声称照片级或 95% macOS 相似度验收通过。
