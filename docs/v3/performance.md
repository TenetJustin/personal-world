# V3 性能实测

2026-10-26。全部数据来自真实有头 Chrome + Apple Metal GPU；不是离线渲染，也不是估算。

## 环境

| 项 | 值 |
| --- | --- |
| 机器 | MacBook Air Mac17,3 |
| SoC | Apple M5，10 CPU / 10 GPU 核，24 GB RAM |
| GPU 后端 | `ANGLE (Apple, ANGLE Metal Renderer: Apple M5)` |
| 系统 | macOS 27.0.1 |
| 浏览器 | Chrome 149.0.0.0（Playwright Chrome for Testing 1228） |
| 视口 | 1440 × 900（主）/ 1280 × 720（与 V2 对照） |
| DPR | 1 |
| 质量档 | 默认 standard（阴影 2048、水面反射 512、无 `quality=high`） |
| 采样 | 2 s 预热 + 15 s（桌面/湖岸）或整段自动引导；`gl.info` 每帧重置后取 draw calls |
| 构建 | `VITE_BASE_PATH=/ npm run build` + `vite preview`，本机回环 |

原始数据：

- [`performance-desk-1440x900.json`](./performance-desk-1440x900.json)
- [`performance-desk-1280x720.json`](./performance-desk-1280x720.json)
- [`performance-lake-1440x900.json`](./performance-lake-1440x900.json)
- [`performance-tour-1440x900.json`](./performance-tour-1440x900.json)

复现：

```sh
npm start
node scripts/v3-measure.mjs --scene desk  --width 1440 --height 900 --out /tmp/desk.json
node scripts/v3-measure.mjs --scene lake  --width 1440 --height 900 --out /tmp/lake.json
node scripts/v3-measure.mjs --scene tour  --width 1440 --height 900 --out /tmp/tour.json
```

## 结果

| 场景 | 平均 FPS | p50 ms | p95 ms | p99 ms | Draw calls | Triangles | 传输数据 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 桌前静止（1440×900） | **60.0** | 16.7 | **17.6** | 17.7 | 261 | 12.15 M | 49.6 MiB |
| 桌前静止（1280×720） | **60.0** | 16.7 | 17.6 | 17.7 | 266 | 12.45 M | 49.6 MiB |
| 湖岸静止（1440×900） | **44.1** | 23.7 | **27.0** | 28.0 | 452 | 19.71 M | 49.6 MiB |
| 完整自动引导（1440×900） | **47.7** | 19.9 | **29.0** | 30.6 | 452 | 19.71 M | 49.6 MiB |

对照 V2（`docs/sprint-v2/performance.json`，1280×720，桌前静止）：

| | V2 | V3 |
| --- | ---: | ---: |
| 平均 FPS | 60 | 60 |
| p95 | 16.8 ms | 17.6 ms |
| Draw calls | 329 | 261 |
| Triangles | 11.72 M | 12.45 M |
| 传输数据 | 40.6 MiB | 49.6 MiB |

## 结论与取舍

- **桌前视角达到目标**：60 FPS、p95 17.6 ms，明显低于 33 ms；draw calls 反而比 V2 少 68，说明 V3 室内 GLB 的合批优于 V2 独立家具。
- **湖岸与完整路线平均低于 50 FPS**：44–48 FPS，p95 27–29 ms（仍低于 33 ms）。原因是：
  1. 水面反射把同一片森林/草地再绘制一遍（draw calls、三角形大致翻倍）；
  2. 近景草与远景树没有明显减面，标准档已是 DPR 1、反射 512；
  3. 新增室内 GLB 让资源体积从 40.6 → 49.6 MiB（+22%）。
- 把反射分辨率从 512 降到 384 实测无收益（42.8 FPS，噪声范围内），已回退，不改视觉。
- 没有通过隐藏森林、降低 DPR 或缩短草带来“刷”帧率；上表就是默认用户体验。
- 高画质档 `?quality=high` 会更重（DPR 1.5、4096 阴影、1024 反射），本报告未把它当作默认性能。

## 自动引导耗时

| | V2 文档 | V3 实测 |
| --- | ---: | ---: |
| 路线行走段 | 81.75 s | **37.2 s** |
| 含 5 s 湖岸等待 | ≈86.8 s | **≈44 s** |
| 可比路段速度 | 1.28 / 0.65 / 0.76 / 0.46 m/s | 2.60 / 1.35 / 1.60 / 0.72 m/s |

- 路线段约为 V2 的 **2.20×**；含固定 5 秒等待约 **1.97×**。
- 三个电影观察瞬间仍保留：湖岸远山与转向木屋、门廊开门、室内看窗后转向 Mac；停留时间从 3.4/4.8/3.2/6.2/3.2 s 缩短为 1.2/1.7/1.1/1.6/1.1 s。
- 两套无头 Node 测试另外验证了速度函数、接管不瞬移与台阶高度，不依赖帧率。

## 未验证 / 限制

- 未测 Safari、Firefox、Windows、真实手机 GPU、弱网冷缓存。
- 只测本机回环，不代表公网首屏时间。
- `resourceEncodingBytes` 来自 Resource Timing，是应用资源而不是 GPU 显存。
- 湖岸平均 FPS 未达到 50，属于已知性能风险；若必须达标，建议下一轮做“水面反射降频/半分辨率 + 远景林分 LOD”，而不是降低整体 DPR。
- 录屏（`docs/v3/evidence/videos/`）使用 Playwright 视口录制并转码，存在编码开销，不用其帧率替代上述采样。
