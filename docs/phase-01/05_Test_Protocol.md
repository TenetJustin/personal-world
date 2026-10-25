# Phase 01 · 测试协议与范围

## 真实设备与浏览器

本轮实际机器为 Apple M5 MacBook Air，10 核 GPU、24GB 统一内存，arm64，macOS 27.0.1。浏览器为 Codex 内嵌 Chromium，页面报告 Chrome 155.0.0.0 / AppleWebKit 537.36。UA 使用兼容字符串 `Intel Mac OS X 10_15_7`，不是实际 CPU / OS 检测值；设备信息以本机系统查询为准。未保存设备序列号、硬件 UUID 或登录凭证。

物理桌面逻辑尺寸 1470×956，设备 DPR 2。IAB 网页视口随宿主窗口变化，本轮包含 1280×720 和 1126×827（每次原始 JSON 记录实际值）；测试模式的 CSS 画布及实际绘图缓冲均固定 1440×900、有效渲染 DPR 1。所有 FPS 数据均指该实际绘图缓冲。不能将表中的性能推广到默认 high 的 DPR 1.5、4K 显示器、Windows 集显、手机或其他浏览器。

## 证据采集

标准 PNG 由生产构建中的 `WebGLRenderer.render` 完成后在同一帧读取实际 canvas。A / B 均使用 high、固定参数、环境动画时间 0。保存后没有调色、补景、锐化、AI 重画或离线 Blender beauty render 替换。Blender 仅用于源网格、AO 和远景代理资产制作。完整相机位置、四元数、fov、near / far 与 target 在 `evidence/camera-shots.json`。

运动证据来自同一 canvas 的 `captureStream(30)` 和 MediaRecorder VP9 / WebM，目标 10 Mbps。录制从 A 开始，在同一条弧长参数化路径移动至 B。原始 WebM 保留；便于查看的 MP4 若提供，仅为该 WebM 的转码，并非离线重新渲染。录屏压缩 / 30fps 上限不等于场景真实 rAF 帧率，真实帧时间另采样。

## 帧时间与加载

每项采样预热 10 秒，随后记录约 60 秒；UI 400ms 检查停止时间，所以实际记录可略超过 60 秒。使用相邻真实 rAF 回调间 `performance.now()` 之差，**不裁剪 >100ms 慢帧、不以瞬时 FPS 平均代替总帧数 / 总时长**。相机动画只为稳定积分而限制模拟 delta，该限制不作用于测量数据。页面 visibilitychange 重置前帧时钟并记录次数，隐藏期间不计入样本。

p95 使用排序后 nearest rank。FPS = N / Σ(frame interval)。Draw Calls 和三角面数在外层渲染前 reset，Water 反射的嵌套渲染 / 阴影也计入总数；不把只统计主通道的数字冒充总量。`renderer.info.memory` 只提供纹理 / 几何数量，不能当作显存字节数。

原始 JSON 包含每帧 ms、calls、triangles、path t，以及 Resource Timing 的 duration、transfer、encoded、decoded 字节。`assetPreparationMs` 从 JS 模块开始计时到资源与编译就绪；`navigationToFirstFrameMs` 是本页导航开始到首帧渲染完成。缓存命中由 timing 的 transferSize 区分，不能把 warm reload 叫冷启动。

网络为本机 `127.0.0.1`，未施加带宽或延迟限制。首次使用生产端口与后续 warm reload 分开记录。不能据此声称 4G 加载时间、全球 CDN 首屏、GPU 时间或 CPU / GPU 分摊已经达标。源资产在本地 SSD，非远程第三方服务。

采样期间不运行 Blender、资产压缩、构建、录屏编码或 ffmpeg 转码；验收面板关闭。轻量文本记录和工具读取不等同于严格无后台任务的实验室环境，因此结果是单机 POC 实测，非正式产品认证。

## 自动技术测试与人工视觉验收

自动检查覆盖压缩坐标回归、1001 个路径点的地面 / 建筑 / 树干净空、最终资产 hash / 来源完整性、glTF 无外部图片 URI、TypeScript 与生产构建。浏览器另检查 WebGL 错误、资源加载、固定镜头、实际运动、取消 / 返回及证据导出。

自动技术测试的通过不等于材质 / 构图 / 光照合格；PNG 与实际录屏须由用户独立进行人工视觉验收。视觉未通过时，不进入 Phase 02。降低 asset 质量来换取 FPS 不属于当前验收通过方式。
