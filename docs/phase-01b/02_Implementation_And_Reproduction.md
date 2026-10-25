# Phase 01B · 实施与复现

本阶段为可运行、可回退的视觉候选版本；不是用户已批准的照片级成果。只制作外部住宅、环境与两镜头，不开发室内或桌面应用。

## 本地运行

```sh
git lfs install
git lfs pull
npm ci
npm run dev
```

默认本机地址以 Vite 终端输出为准，监听 `127.0.0.1`。正式构建为 `npm run build`，预览 `npm run preview -- --host 127.0.0.1`。没有公开部署配置或发布动作。

- 标准档：`/?benchmark=1440x900`，固定 1440×900 drawing buffer、DPR 1。
- 高档比较：`/?benchmark=1440x900&quality=high`；仍为 DPR 1，只提高背景、反射和阴影分辨率。普通高档页面不带 benchmark 时 DPR cap 1.5，不能把前一组成绩套用到后一组。
- `shot=B` 为侧前方镜头；`shot=C/D/E` 是建筑检查角度，不属于 A→B 步行路径。
- `blockout=1` 载入保存的早期灰模；该灰模是过程证据，不是最终建筑。
- `unbatched=1` 仅用于同资产、同相机的空间分块回归比较。

验收工具支持：原始 PNG、实际 Canvas MediaRecorder 录屏、固定相机导出、预热 10s + 采样 60s 的原始帧记录。截图直接取真实 WebGL canvas，没有离线渲染替换。视频使用真实捕获帧，导出 data URL 便于本地保存；不重新渲染或补帧冒充实时。

## 母版与导出

`assets/architecture/cabin-phase01b.blend` 是打包纹理、命名集合、独立构件和锚点的权威母版。`public/assets/cabin.glb` 是按材质合并、WebP + Meshopt 的派生物。GLB 的合并不是把母版改成不可编辑的单一网格。门叶、窗框和墙体洞口仍在 Blender 母版中独立保留；Phase 02 开始前应按交互语义拆分新的运行时导出，不直接把已合并的运行时门叶作为可开门节点。

完整源输入位于忽略的 `assets-source/`。从官方源重取新增输入：

```sh
npm run assets:fetch             # 既有 CC0 扫描 / 共享枝叶纹理等
npm run assets:fetch:phase01b     # A 树冠、rock_wall_02、grass_ground
npm run assets:phase01b          # Blender 建模 / 派生 / 验证 / 压缩 / manifest
```

需已安装 Blender 5.2.2 LTS；macOS 默认 `/Applications/Blender.app/Contents/MacOS/Blender`，可用 `BLENDER_BIN` 指定。生产脚本只运行本仓库自编代码，Blender 使用 `--factory-startup --disable-autoexec`。当前 Git LFS 运行时和 `.blend` 母版已足够正常运行，无需重做所有素材生产。若从空运行时目录全量重制基础扫描与 HDR，先执行既有 Phase 01 资产构建，再执行本阶段构建覆盖建筑与植被。

新树冠保留源模型冠层的空间占据分布，以原扫描枝叶图集构造三维交叉叶簇，只对木质枝干做折叠减面。远树图集由真实源模型离线生成；这类资产烘制不是本项目浏览器验收图。最近草采用完整源模型，中景采用源图集草簇；这仍有可辨认重复，见问题清单。

## 光照与资源

固定 HDR 太阳方向、一盏实时方向光（`0xffe5c6`, intensity 3.2），sun-peak 有界 lighting probe，环境强度 0.95；背景强度 0.9、AgX 曝光 1.0、sRGB 输出。无 Bloom、景深或附加遮掩雾。轻大气雾密度 0.00045。玻璃 metalness 0、IOR 1.48、transmission 1；没有开发内部陈设。

树、扫描草、石块使用空间分组的 Instancing；源树近 / 中 / 远表达在批准路径内固定，不在路途中交换另一套轮廓。静态投影缓存，水面 planar reflection 仍实时更新。镜头只有 Stage 写入，位置按 centripetal Catmull-Rom 弧长采样，12 秒平滑运动，Escape 保留当前实际姿态。

压缩为 WebP + Meshopt；**未实施 KTX2 GPU 压缩**，WebP 下载大小不能当 GPU 纹理占用。性能报告明确列出预算偏差及未测平台。

## 回退与边界

基线 `5c2437d0660e87bbe4188c7399994a1ef02819e2`，标签 `phase-01-baseline-5c2437d`。同机位旧版对照仅修改旧版相机 / 路径定义与基线标识，场景及资产仍为基线。新旧建筑位置、尺寸与环境确实发生改变，未将两张画面单独移动或修图对齐。

用户尚未人工视觉批准；停止在 Phase 01B，禁止自动进入 Phase 02、合并 main 或公开部署。
