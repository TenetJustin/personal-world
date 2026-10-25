# Phase 01 · 性能与加载实测

真实设备 / 方法 / 限制见 [测试协议](05_Test_Protocol.md)。所有数据来自生产构建的原始 JSON；没有删除慢帧。固定实际缓冲 1440×900、渲染 DPR 1。这里是本轮可用 M5 的测量，不能当作最低硬件或公网 SLA。

## 最终构建

| 测试 / 原始文件 | 帧数 / 秒 | 平均 FPS | p95 / p99 ms | 最慢 ms | >33.3 / >100 ms | 最大 Draw Calls | 最大三角面（全部通道） |
|---|---:|---:|---:|---:|---:|---:|---:|
| [high-A-60s.json](tests/high-A-60s.json) | 3620 / 60.33 | 60.00 | 17.40 / 18.20 | 21.60 | 0 / 0 | 71 | 18,755,960 |
| [high-B-60s.json](tests/high-B-60s.json) | 2814 / 60.03 | 46.87 | 25.20 / 28.80 | 37.60 | 2 / 0 | 71 | 18,755,960 |
| [standard-A-60s.json](tests/standard-A-60s.json) | 3621 / 60.35 | 60.00 | 17.60 / 17.70 | 18.00 | 0 / 0 | 71 | 18,755,960 |
| [standard-B-60s.json](tests/standard-B-60s.json) | 3255 / 60.28 | 54.00 | 21.00 / 23.00 | 26.80 | 0 / 0 | 71 | 18,755,960 |
| [standard-motion-60s.json](tests/standard-motion-60s.json) | 2942 / 60.25 | 48.83 | 25.60 / 29.30 | 35.20 | 5 / 0 | 71 | 18,755,960 |

每次预热 10 秒后采样约 60 秒。静态 A / B 中水和草仍开启轻微动态。运动样本的 path t 范围见 summary。Draw Calls / 三角面计入主画面与实时镜像，阴影缓存初始化在预热期间完成；这些值不是只取主通道。高质量 B 未达到平均 50–60 FPS 目标。18.76M 的多通道三角面总量和过大的传输体积仍是明显欠账，不能因为部分镜头锁 60 FPS 就标记完整性能验收通过。

## 保留画质的优化对照

| 优化前基线 | 平均 FPS | p95 ms | 最大 Draw Calls | 最大三角面 |
|---|---:|---:|---:|---:|
| [high-A-before-shadow-cache.json](tests/high-A-before-shadow-cache.json) | 45.53 | 24.60 | 88 | 21,601,912 |
| [high-B-before-shadow-cache.json](tests/high-B-before-shadow-cache.json) | 43.87 | 30.30 | 88 | 21,601,912 |
| [standard-A-before-shadow-cache.json](tests/standard-A-before-shadow-cache.json) | 60.00 | 16.80 | 88 | 21,601,912 |

唯一影响此组对照的渲染修改为静态太阳阴影缓存。A / B 优化前后实际 PNG 逐像素相同，见 `tests/shadow-cache-pixel-comparison.json`。复用固定阴影后，稳态 Draw Calls 从 88 降至 71。A 高档从约 45.5 提升到 60；B 的提升较小，不能将 A 的结论推广给 B。

## 资源与加载

| 最终样本 | 导航到首帧 ms | Resource Timing encoded MB | transfer MB（含估算响应头） | 缓存 / 解释 |
|---|---:|---:|---:|---|
| high-A-60s.json | 1806.60 | 47.17 | 47.17 | 实际缓存状态以原始逐资源记录为准；localhost 无网络限速 |
| high-B-60s.json | 1722.20 | 47.17 | 0.01 | 实际缓存状态以原始逐资源记录为准；localhost 无网络限速 |
| standard-A-60s.json | 1133.70 | 31.24 | 31.24 | 实际缓存状态以原始逐资源记录为准；localhost 无网络限速 |
| standard-B-60s.json | 1133.70 | 31.24 | 31.24 | 实际缓存状态以原始逐资源记录为准；localhost 无网络限速 |
| standard-motion-60s.json | 1133.70 | 31.24 | 31.24 | 实际缓存状态以原始逐资源记录为准；localhost 无网络限速 |

最终运行资产目录合计 58,740,711 字节（58.74 MB），包含两档互斥背景。每次实际选择的资产原始体积约为标准 32.22 MB、高档 52.21 MB，不含 HTML / JS / CSS。HTTP 压缩后的 encodedBytes 是另一口径，不能与磁盘文件体积混用。MB 使用 1,000,000 字节。

首次访问新生产端口的基线：标准导航到首帧约 1348.9ms，transfer约31.24MB；高档约1795.6ms，transfer约47.17MB。之后 warm reload 的 304 / 缓存体现在逐资源 timing 中。HTML 导航本身不在 resource 条目合计内。上述加载来自本机 SSD 与 loopback，不能据此推断 4G / CDN 加载速度。

| 运行模型 | 压缩前字节 | 最终字节 |
|---|---:|---:|
| fir.glb | 39,500,152 | 11,237,516 |
| cabin.glb | 8,774,556 | 3,758,512 |
| grass.glb | 3,117,020 | 1,039,640 |
| rocks.glb | 1,793,312 | 922,684 |

4K HDR 单文件 26.52MB、树文件约11.24MB，是主要传输负担。Meshopt 和 WebP 已实施；WebP 不等于 GPU 纹理压缩，KTX2 尚未完成。`renderer.info.memory` 的 30 张纹理 / 36 个几何仅是对象计数，未测得真实 GPU 字节，不宣称显存预算通过。

## 判定

- 原始帧时间和技术检查：数据有效，浏览器无已捕获的 WebGL / JS 错误。
- 平均 FPS：标准静态 A / B 与高档 A 的本机表现可用；标准运动约 48.8 FPS、高档 B 约 46.9 FPS，仍低于 50 FPS 下限。
- p95：本机采样见表；没有推广到未测试设备。
- 体积、GPU 存储与多设备覆盖：未达到完整验收目标。
- 照片级视觉：独立待用户验收，当前问题清单明确指出未达门槛；不建议进入 Phase 02。
