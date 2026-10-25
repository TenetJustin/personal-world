# 03 · 开源项目与技术证据

研究日期：2026-10-25。通过 GitHub 连接器读取仓库元数据、完整文件树与固定 commit 的选定源码 / README / 许可；未安装这些项目的依赖，未执行第三方脚本。下表固定链接可复核本轮证据，不代表推荐把开发分支用于生产。

## 1. 证据等级与快照

**[F]** 是源码或官方文档可直接核查的能力 / 限制；**[E]** 是针对本项目的取舍；**[H]** 是尚未运行或在目标硬件验证的假设。README 的“cinematic”“smooth”“bulletproof”只算作者表述，不能当本项目结论。LICENSE 审查是对本轮文本的记录；发布时仍需对实际引入版本和独立资产保留许可。

| 仓库 | 核查 commit（点击完整树） | 项目代码许可 / 边界 | 选定读取文件数 |
| --- | --- | --- | --- |
| [Leonxlnx/procedural-alpine-lake](https://github.com/Leonxlnx/procedural-alpine-lake) | [b84c254b3fa5](https://github.com/Leonxlnx/procedural-alpine-lake/tree/b84c254b3fa533b8c992eb685e1127a92702da21) | 未发现项目许可；不复制 | 12 |
| [stas4000/luminous-lake](https://github.com/stas4000/luminous-lake) | [726c6bdc8005](https://github.com/stas4000/luminous-lake/tree/726c6bdc800569f5b50018bf9d1fdab0d50645cd) | MIT | 10 |
| [img2threejs/img2threejs](https://github.com/img2threejs/img2threejs) | [954cd5845e90](https://github.com/img2threejs/img2threejs/tree/954cd5845e90efd045694bab725d68a9863c20e0) | Apache-2.0 | 5 |
| [img2threejs/plugin-interior](https://github.com/img2threejs/plugin-interior) | [f2c3667bb6d3](https://github.com/img2threejs/plugin-interior/tree/f2c3667bb6d3bacfc9e38898a7516d47bc2e90b1) | 自定义受限许可；部分目录 Apache-2.0 | 6 |
| [sparkjsdev/spark](https://github.com/sparkjsdev/spark) | [ffe210dc0a45](https://github.com/sparkjsdev/spark/tree/ffe210dc0a45d0515a06c9235878108112827d61) | MIT | 6 |
| [playcanvas/supersplat](https://github.com/playcanvas/supersplat) | [f272ec238b03](https://github.com/playcanvas/supersplat/tree/f272ec238b032a8ac5568f1cbec303edc5eb4bd0) | MIT | 4 |
| [brunosimon/folio-2025](https://github.com/brunosimon/folio-2025) | [41046b57eeed](https://github.com/brunosimon/folio-2025/tree/41046b57eeed8d156d9c3fd7fa259900baef7816) | MIT | 6 |
| [pmndrs/examples](https://github.com/pmndrs/examples) | [541599ac5ad9](https://github.com/pmndrs/examples/tree/541599ac5ad913de85796403c1c6927ada3b303c) | MIT | 7 |
| [nasht12/threejs-portfolio](https://github.com/nasht12/threejs-portfolio) | [49de6d6b9119](https://github.com/nasht12/threejs-portfolio/tree/49de6d6b9119d1a6d680d34e70830767bd3dc816) | 未发现项目许可；不复制 | 5 |
| [codrops/CinemaSeatPreview](https://github.com/codrops/CinemaSeatPreview) | [3d9c6ae4dece](https://github.com/codrops/CinemaSeatPreview/tree/3d9c6ae4decea570852ded9993014dec0ee200fc) | MIT | 5 |
| [Thanas-R/thanas-os](https://github.com/Thanas-R/thanas-os) | [5a430db1abf4](https://github.com/Thanas-R/thanas-os/tree/5a430db1abf4c4545c88c717b9eaebb1d789a0ae) | MIT | 9 |
| [yomotsu/camera-controls](https://github.com/yomotsu/camera-controls) | [c51601107e26](https://github.com/yomotsu/camera-controls/tree/c51601107e266097edf6a9caa57bfa9eaa77427c) | MIT | 2 |
| [donmccurdy/glTF-Transform](https://github.com/donmccurdy/glTF-Transform) | [8e2a94a2616d](https://github.com/donmccurdy/glTF-Transform/tree/8e2a94a2616d293c4b503d0fb6a4b42e6ec7c62f) | MIT | 3 |
| [gkjohnson/three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) | [16d6ae6383e9](https://github.com/gkjohnson/three-mesh-bvh/tree/16d6ae6383e9a20600152be2955851b20914b1ca) | MIT | 3 |
| [dgreenheck/ez-tree](https://github.com/dgreenheck/ez-tree) | [dcf309bd86bd](https://github.com/dgreenheck/ez-tree/tree/dcf309bd86bd521083d9c70f01f2de45fdc7c457) | MIT | 4 |
| [gkjohnson/three-gpu-pathtracer](https://github.com/gkjohnson/three-gpu-pathtracer) | [288363980a20](https://github.com/gkjohnson/three-gpu-pathtracer/tree/288363980a20e53f0627d350fd1bdacb1608643d) | MIT | 3 |
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | [fae873455dff](https://github.com/mrdoob/three.js/tree/fae873455dff9602a916b4d2e8a985921448b62a) | MIT | 4 |
| [nerfstudio-project/gsplat](https://github.com/nerfstudio-project/gsplat) | [512d366b6707](https://github.com/nerfstudio-project/gsplat/tree/512d366b67073d77ca099ede742683c165dfc23b) | Apache-2.0；训练依赖另核查 | 4 |

源文件快照保存在当前工作区的研究缓存 `work/research/`，只用于核查，不作为最终站点依赖或资产发布。本文的固定链接才是可携带文档的证据入口。树查询均未报告 truncated。

## 2. 自然环境：可学习算法，不能混淆运行方式

### 2.1 procedural-alpine-lake

[F] [README][alp-readme] 描述代码生成电影；[engine/gl.py][alp-gl] 以 require=430 创建 ModernGL 独立上下文，shader header 为 GLSL 430；[film.py][alp-film] 逐帧渲染、保存并编码。它是 Python / OpenGL 离线工作流，不是 Three.js 应用。

| 元素 | 真实机制 / 源码 | 移植到网页的边界 [E] |
| --- | --- | --- |
| 地形 / 山脉 | [heightfn.glsl][alp-height] 解析山谷与细节；[bake.py][alp-bake] 输出缓存高度与辅助图 | 在离线阶段生成较小高度 / normal / mask，再制成分块网格；不在访问者设备重跑整套世界生成 |
| 侵蚀 | [erosion.py][alp-erosion] 调用 compute shader，进行多分辨率流路、侵蚀与坡面过程 | 只借鉴地貌生成思想；需要重写且当前未获代码复制许可。WebGPU compute 需要 WGSL / TSL 和新数据管线，不能自动运行 GLSL 430 |
| 森林 | [bake_forest.frag][alp-forest] 生成林分分布；渲染流程使用树 cell 信息 | 借鉴分群、空隙、年龄层；网页用真实树网格 / impostor 与分块实例，不移植全套 ray marching |
| 水 | [water.glsl][alp-water] 深水 / 毛细波色散与阵风；[water_shade.glsl][alp-water-shade] trace、反射、折射、湖底、散射、高光与多采样 | 提炼波尺度、Fresnel、吸收和岸边层次，按独立公式重写；多次追踪、随机子像素斜率不能原样用于实时单采样帧 |
| 天空 / 云 | [sky.glsl][alp-sky] Rayleigh / Mie / 臭氧、积分透射和云密度步进 | 离线天空 / 少层云为主，实时薄雾；体积云不是初始必要项 |
| 画面生成 | [render.py][alp-render] 分 pass、float render targets、分块多采样 | 离线 frame 的质量不能推导浏览器帧率；不把电影播放 FPS 当渲染 FPS |

[F] 作者在 README 报告特定 AMD iGPU 的电影渲染耗时与内存峰值，**本轮没有复测**。README 明确 macOS 原生 OpenGL 4.1 不满足要求，gl.py 的 4.3 请求与之相符。WebGL2 不提供其桌面 OpenGL compute 路径；Metal / WebGPU 不会自动补齐 ModernGL 后端。[H] 若以后需生成同类地形，先在受支持离线环境验证，或直接使用 Blender 自建，不要求当前 Mac 跑此仓库。

许可：[F] 本轮完整树与 README 未发现项目 LICENSE / 复用授权；可研究公开实现和视觉链接，**不复制代码、截图、音轨和成片到项目**。这是首选方案不依赖它的原因。

### 2.2 luminous-lake

[F] [main.js][lum-main] 先尝试 WebGPURenderer，初始化 / smoke test 失败后使用 WebGLRenderer；[water.js][lum-water] 使用 MeshPhysicalMaterial、ior=1.333、透明 opacity、depthWrite=false、CPU 顶点波和动态法线，CubeCamera 周期更新反射。透明度和 clearcoat 不等于完整水体吸收 / 深度折射模型。

[F] [forest.js][lum-forest] 是树干 + 三层 ConeGeometry 冠层的 InstancedMesh，最多 720 个 placement，每帧轮流更新 60 棵风动矩阵；[cameras.js][lum-camera] 有 orbit / cinematic / shore / aerial、1.8 秒姿态混合与竖屏重构；[quality.js][lum-quality] 有阈值保持、滞后和 cooldown；[weather.js][lum-weather] 提供天气状态与风参数；[world.js][lum-world] 把档位映射到反射、DPR、阴影与粒子。

[E] 最值得复用的是 [waves.js][lum-waves] 的确定性统一波场接口、quality.js 的纯状态设计、天气参数与视图分离。要替换森林几何、材质、岸线与水体；CPU 网格更新 / canvas normal 上传需改为 GPU 波场或降频，不能默认其开销可忽略。Cubemap 是六个方向的视图，湖面首选 planar reflection；异常时反射隐藏对象的恢复应改为 try/finally，并补资源释放。

[F] [MIT 许可][lum-license] 可复用代码但须保留声明。本轮 IAB 实际打开 Demo、等待画面出现并切换 Cinematic；截图显示明显圆锥林与程序化地形。[H] README 的手机流畅、WebGPU / WebGL “全面兼容”未经目标设备复测；renderer 初始化 fallback 也不保证后续每个效果都跨后端。

## 3. 图像到模型与室内生产

### 3.1 img2threejs

[F] [README][img-readme] 和 [ARCHITECTURE.md][img-arch] 描述 agent 分析参考、编写结构 spec、生成 Three.js factory、几何 gate 与浏览器视觉反馈；它不是摄影测量或一次调用恢复完整场景的模型。[emit_target.py][img-emit] 提供 emission-target 协调；[mesh_reference_compare.py][img-compare] 提供参考比较的机制，不能由存在比较脚本推断重建已准确。

[E] 适合比例明确的小道具、原型、可参数化结构和可读的层级；不把“一张室内图”当作完整木屋、正确背面、UV、照明和摄影真实感的保证。代码建模便于调参数和交互 pivot，传统网格更便于艺术家修形、UV、拓扑、烘焙与跨工具检查。本项目使用 Blender 母版作为交付权威，生成代码只能是部分资产的输入；GLB 导出要另验灯光、材质、切线和扩展，不以可导出为视觉合格。

[F] [主项目 LICENSE][img-license] 为 Apache-2.0；复用保留适用许可和 NOTICE，并单独核查输入图像、生成依赖与资产。主项目许可证不能覆盖插件所有路径。

### 3.2 plugin-interior

[F] [README][int-readme] 明确是 agent-operated reconstruction，包含 editable Blender master、runtime GLB + sidecars + Three.js viewer、另一份 static portable GLB；展示对照中的重建是 Blender 原生渲染，设计参考为 AI 图，且不是一次全新运行的普适准确率基准。

[F] [authoring/pipeline.py][int-pipeline] 有 UV0 / Lightmap UV、atlas、PBR、bake、probe、export 与 Manifest；[bake-export.md][int-bake] 区分 full-light 静态便携结果与 SUN-free ambient EXR 运行时图；[interior-lightmaps.js][int-lightmap] 处理该固定版本的 EXR 行顺序、UV 通道及数据格式检查。**静态 portable GLB 不保留完整 PBR 重照明和所有浏览器动态行为**。

[E] 木屋内部最佳路线仍是：人工确定尺寸和隐藏结构 → 场景专用 Blender 建模 / Python 辅助 → CC0 PBR → 分离烘焙 → GLB + Manifest → 浏览器校准。插件可作为可选 authoring 加速器，不能代替建模师和人工多角度审美验收；不直接拿它的客厅 recipe 改几种材质充当原木小屋。

[F] [LICENSE][int-license] 是 Free Use, Restricted Commercialization License 1.0，明确不是 OSI 开源许可。允许个人、研究、商业项目工作与输出交付；销售 / 分发该工具或提供付费生成服务受限制；第 4 节对随输出交付的 viewer/runtime 有例外及声明要求。[THIRD_PARTY_NOTICES][int-notices] 单列 authoring/、recipes/、examples/、指定工具等 Apache-2.0 部分，早期权利另有边界。**不能把整个插件标为 Apache-2.0 或笼统“免费商用无约束”**。

[E] 默认不引入受限 runtime；采用自建运行时和明确许可的工具部分。若用户选择整个工作流，先锁 commit 和复制路径清单，再按该版本条款处理。Blender API 脚本与二进制分发也要核查，不把作品许可与工具分发混在一起。本轮未安装 bpy，Mac 具体 wheel / Blender 版本兼容性 [H] 留后续预检。

## 4. 写实资产与渲染表达

[F] [Poly Haven 资产许可](https://polyhaven.com/license) 覆盖其 HDRI、纹理和模型的 CC0；[ambientCG 许可](https://docs.ambientcg.com/license/) 也为 CC0。单个项目仍记录资产页、作者、版本与 hash。Poly Haven 的 [实时 API ToS](https://github.com/Poly-Haven/Public-API/blob/master/ToS.md) 对 API 用户代理和来源标注有独立要求；“资产 CC0”不意味着可忽略 API 服务条款。首版下载后自托管，不让访问者运行时依赖素材 API。

### 4.1 Spark

[F] [README][spark-readme] 为 Three.js 的 WebGL2 Gaussian Splatting renderer；[SparkRenderer.ts][spark-renderer] 组织 splat 渲染、排序与预算；[LoD 文档][spark-lod] 有预构建 / streaming 和平台预算参数；[performance][spark-perf] 明确大量透明覆盖与分辨率会影响开销。其预算和速度是作者指导，不是本项目基准。

[F] [dynamic-lighting 示例][spark-light] 使用 SplatEditSdf、ADD_RGBA / DARKEN 等编辑层改变颜色；它不能证明普通 splat 拥有表面法线、PBR 材质或物理正确重光照。[E] 可以对合法采集、静态、受限视域区域形成强摄影感；不适合默认承担水面、可开门窗的动态房间和高精度电脑交互。代理网格可解决点击 / 部分遮挡，不能补回缺失的视角、反射、碰撞表面或完整阴影。

[F] [MIT 许可][spark-license] 适用于代码，扫描数据另查。当前 Demo 页面可访问，但本轮截图返回不足以确认 splat 画面，因此不记为视觉通过；更没有在 1440×900 下做混合透明与排序压力测试。是否引入看 07 的 B 路线门槛。

### 4.2 SuperSplat

[F] [README][super-readme] 是基于 PlayCanvas 的浏览器 Splat 编辑 / 优化工具；[splat-serialize.ts][super-serialize] 有 PLY / SOG / SPZ 等输出；[anim/spline.ts][super-spline] 提供相机动画的样条支持。[MIT LICENSE][super-license] 已读。

[E] 可用于裁切浮点、清理场景、设定相机与压缩输出，**不是从一张参考图训练 Splat 的工具，也不是 Three.js renderer**。本项目如采用 B，使用其编辑输出后交给 Spark，并用共同格式做互操作实验；不把 PlayCanvas 导出的 HTML viewer 嵌入另一个 Canvas 假装统一世界。格式列表相容不保证坐标、SH、色彩、深度和压缩质量完全一致。

### 4.3 Three.js 官方 examples

[F] [Water.js][three-water] 使用镜像相机、投影矩阵裁剪和 RenderTarget 的额外渲染；[webgl_shaders_ocean.html][three-ocean] 展示天空、水与太阳。它是平面反射机制示例，不包含本项目所有湖岸深度、真实森林和室内生产流程。代码 [MIT][three-license]；examples 引用的模型、纹理、音频需另查。

[E] 首版以此机制建立可测水面，再补深度吸收与岸线；不把海洋默认波幅、蓝色或失真的镜面参数直接移植到安静北欧湖泊。官方 WebGPU 水示例是另一条实现，首版不同时维护两份。

### 4.4 六种表达的工程比较

| 表达 | 画质潜力与镜头 | 动态 / 光照 | 浏览器与生产成本 | 项目结论 [E] |
| --- | --- | --- | --- | --- |
| PBR 网格 | 正确资产可支持近景、多视角 | 实时直接光、反射、交互明确 | 美术投入高；叶片、材质与 draw calls 需控制 | 近景、木屋、电脑的主干 |
| 程序化地形 / 水 | 地貌可离线生成，波场可连续 | 水与风可统一 | 大型侵蚀 / 光线步进昂贵 | 地形离线、湖水实时，避免全程序化外观 |
| Gaussian Splatting | 静态采集视域内细节强 | 普通 splat 非完整可重光照材质 | 数据采集、排序、透明填充与内存压力 | 有条件局部 B，不能替代所有网格 |
| Blender 烘焙 | 间接光稳定、室内接触真实 | 变光 / 移家具受限 | 离线时间和光图显存，生产可控 | A 的重要组成部分 |
| 预渲染背景 / 视频 | 固定视角最易保留离线品质 | 交互、视差、重光照有限 | 视频解码、网络、循环与镜头同步成本 | 超远景 / 简化体验；不承担全路径 |
| 混合架构 | 可把预算集中到交互近景 | 需要统一坐标、深度、太阳和色彩 | 集成 / 接缝成本最高 | 明确每层责任，不能无限叠技术 |

## 5. 空间交互案例

| 项目 | 已验证源码机制 [F] | 适合借鉴 [E] | 本项目必须另做 |
| --- | --- | --- | --- |
| folio-2025 | [View.js][bruno-view] 有 cinematic 与 GSAP overwrite 混合；[ResourcesLoader][bruno-loader] 缓存、GLTF / Draco / KTX2；[Rendering][bruno-render] 组织渲染；[Quality][bruno-quality] 为移动识别与高低档事件 | 集中相机、确定更新顺序、统一资源入口和质量事件 | 未在所读 Quality 看到滚动帧预算自适应；不声称已有本项目门洞导航 / 可取消事务。其风格化车辆世界不作为写实基准 |
| pmndrs/examples | [enter-portals][pm-portal] 使用 MeshPortalMaterial blend、路由参数和 CameraControls；[motionpathcontrols][pm-path] 展示路径 focus / damping；[Html][pm-html] 演示 DOM 透视与遮挡 | R3F 的相机 / 内容解耦、投影机制、受控过渡 | 示例不等于完整取消恢复、预载、SEO、单一桌面根。floating-laptop 当前源码本身不包含完整 DOM 桌面 |
| nasht12/threejs-portfolio | [transition.ts][nash-transition] 用非 React 每帧进度；[route.ts][nash-route] 解析 hash；[budget.ts][nash-budget] 用活跃帧中位数降档；[SceneViewer][nash-viewer] 通过 iframe + postMessage 桥接，注释说明卸载画廊 Canvas | 活跃帧与 idle 分开、语义路由和显式 scene protocol | 并非同一持久 Canvas 穿越场景；本项目不照搬 iframe 架构。hash 路由不能替代可搜索正文；未发现项目许可，代码不复制 |
| CinemaSeatPreview | [rig.js][cin-rig] 用 CubicBezierCurve3、按排高障碍抬升、busy gate、Reduced Motion 淡入；[app.js][cin-app] 管理输入与资源；[preview][cin-preview] 做座位预览 | 有动机的 flyTo、遮挡检查、稳定概览与目标点 | busy 时直接拒绝新 flyTo，未提供本项目要求的任意取消 / 回滚。排高函数只适用影院，木屋须独立碰撞代理 |

前三个已许可项目的代码分别见 [Bruno MIT][bruno-license]、[pmndrs MIT][pm-license]、[Cinema MIT][cin-license]。Cinema 的 Charge 影片单列 CC BY 4.0，GSAP 与内置第三方库需按各自条款；本项目不复制影片或整个 vendor 目录。Bruno 仓库里个人作品、第三方音频也不因根 MIT 自动变为可用素材。

## 6. ThanasOS：桌面机制与差距

[F] [MacOSContext.tsx][os-context] 有 openApp / close / minimize / maximize / focus、zIndex、窗口 rect 和 preMaximizeRect；[Window.tsx][os-window] 处理鼠标移动 / 缩放并按 app 显示内容；[Dock.tsx][os-dock] 提供 Dock 交互；[types/macos.ts][os-types] 的 AppConfig 包含组件、尺寸和窗口样式；[NotesApp][os-notes] 是 Notes 内容示例。

[F] [App.tsx][os-app] 主要路由为 `/` 与 catch-all；[installedApps.ts][os-installed] 的 openUrl / pendingUrl 属于虚拟浏览器交接，**不是公开 Notes / Project permalink 和浏览器 History 系统**。Context 持久化设置不代表自动持久化所有窗口和应用滚动状态。

[E] 复用窗口 / Dock 的 UI 机制后应重构为独立 DesktopManager，补四个内容应用、版本化 session snapshot、应用错误边界、URL 与键盘操作；不用其联系人、音乐、天气、分析和外部网站代理等外围功能。鼠标事件需审查 pointer / 触屏 / 键盘替代，不认为桌面拖拽就是移动端适配。

[F] [MIT][os-license] 为代码许可；不推断 Apple 品牌图形、第三方壁纸、SF 字体或图标随之授权。最终采用原创 icon / wallpaper，系统字体 fallback；保留代码声明。Notes、Photos、Projects、Resume 仅为空内容结构，不能复制作者个人资料。

## 7. 主动拓展：直接服务画质和实施风险

| 项目 | 源码与许可证据 [F] | 项目用途与限制 [E] |
| --- | --- | --- |
| camera-controls | [CameraControls.ts][cam-src]、[MIT][cam-license]；setLookAt / 边界 / 平滑更新 / stop / rest Promise | 稳定观察与路径交接，避免控件争抢相机；stop 的实际语义见 02。不等于自动路径避障或完整中断状态机 |
| glTF Transform | [meshopt.ts][gltf-meshopt] 组织 reorder / quantize / 扩展；[texture-compress.ts][gltf-texture]；[MIT][gltf-license]；[官方 CLI](https://gltf-transform.dev/cli) | 可重复导出压缩与检查；几何压缩不等于减少三角形，纹理 GPU 格式需另选 KTX2；每次验证 UV1、法线、材质与语义命名 |
| three-mesh-bvh | [ExtensionUtilities.js][bvh-src] 的加速 raycast；[README][bvh-readme]；[MIT][bvh-license] | 静态碰撞代理 / 热点射线；首次构建可移到离线 / worker。BVH 不是完整导航网格或实例森林 LOD 管理器 |
| EZ-Tree | [tree.js][ez-src]、[README][ez-readme] 有树生成、同骨架 LOD 与原始几何；[MIT][ez-license] 和 [纹理声明][ez-textures] 区分 ambientCG 树皮与叶片 | 比圆锥树更合适的免费起点；离线生成少量物种后艺术家修形、实例化。不证明针叶树近景已达到摄影品质，GLB 不自动携带所有运行时风 shader |
| three-gpu-pathtracer | [WebGLPathTracer.js][pt-src] 的 updateCamera / reset 清空样本；[README][pt-readme] 列 WebGL2 / 材质等限制；[MIT][pt-license] | 可作静态对照或可选静止欣赏模式；运动 / 风 / 水变化不断影响累计，不作为 50–60FPS 主体验首选；静止收敛截图不能代表运动表现 |

这些方案的增量在于稳定镜头、准确压缩、碰撞约束和树的轮廓，而非增加后期特效。首版不引入未经预算的 SSGI / SSR 叠加链：屏幕外缺失和时域拖影会直接暴露镜头运动。

### 7.1 为 B 补齐训练环节：gsplat

[F] [README](https://github.com/nerfstudio-project/gsplat/blob/512d366b67073d77ca099ede742683c165dfc23b/README.md) 为 CUDA / Python Gaussian rasterization；[setup.py](https://github.com/nerfstudio-project/gsplat/blob/512d366b67073d77ca099ede742683c165dfc23b/setup.py) 处理 CUDA 工具链 / 扩展；[simple_trainer.py](https://github.com/nerfstudio-project/gsplat/blob/512d366b67073d77ca099ede742683c165dfc23b/examples/simple_trainer.py) 读取 COLMAP 类数据、默认 cuda 后端、可导出 PLY；[LICENSE](https://github.com/nerfstudio-project/gsplat/blob/512d366b67073d77ca099ede742683c165dfc23b/LICENSE) 为 Apache-2.0。

[E] 作为合法多视图 → 离线训练 → PLY → SuperSplat 清理 / 转码 → Spark 的候选生产链。训练端与网页渲染端完全分离；不在浏览器训练，也不把当前 Mac 的 WebGPU 支持当成 CUDA 训练可用。本轮未验证 macOS 原生训练路径或具体显存 / 时间；若没有获准的兼容离线设备，B 的训练步骤未就绪。不能假定训练代码许可自动覆盖数据集、依赖或其他原始 3DGS 实现。

## 8. 在线 Demo 实际验证记录

环境：本轮 Codex IAB 页面访问 / 视觉检查，截图视口为 1280×720；未控制 DPR、GPU、温度和浏览器版本，不是性能基准。未修改 Demo 内容或提交数据。在线部署未与本轮固定 commit 逐字节核对，部署观感和源码机制是两种独立证据。

| Demo | 本轮实际结果 | 不能由此推出 |
| --- | --- | --- |
| [Luminous Lake](https://forest-lake.bles-software.com/) | 页面初始加载后出现湖面 / 森林，点击 Cinematic，截图显示选中状态与圆锥树 | 桌面 / 手机 FPS、写实达标、WebGPU 实际后端 |
| [CinemaSeatPreview](https://tympanus.net/Demos/CinemaSeatPreview/) | 看见影院画面；键盘 Right 后截图为 Row G Seat 11 的近座视角，控件变为 Stand up | 木屋任意路径避障、任意打断安全性、目标硬件性能 |
| [ThanasOS](https://thanas-os.vercel.app/) → thanasos.thanas.dev | 进入桌面，Dock 打开 Notes，AX 出现关闭 / 最小化 / 最大化和正文 | 完整应用生命周期、窗口恢复、手机适配、图片授权 |
| [img2 Interior](https://img2threejs.io/living-room/) | 浏览器 ERR_SSL_PROTOCOL_ERROR，网页工具也未成功访问 | 不以 README 的原生渲染 / 归档截图代替实时体验 |
| [Spark Hello World](https://sparkjs.dev/examples/hello-world/) | 页面标题可访问；本轮没有取得可判定的 splat 画面 | 不记为渲染 / 画质通过 |
| [SuperSplat Editor](https://superspl.at/editor) | 浏览器 ERR_SSL_PROTOCOL_ERROR | 不宣称已交互清理或导出 Splat |
| [EZ-Tree](https://eztree.dev) | 网页工具未能读取；源码机制已核查 | 不宣称本轮体验在线树编辑 |
| [Bruno Simon](https://bruno-simon.com/) | 浏览器 ERR_SSL_PROTOCOL_ERROR | 不宣称体验了当前线上导航；机制结论来自源码 |
| [pmndrs HTML / WebGL Occlusion](https://pmndrs.github.io/examples/mixing-html-and-webgl-w-occlusion/) | 页面标题可访问，但本轮截图为均匀暗背景，没有可判定的内容画面 | 不能记为 HTML 遮挡 / 模型加载通过；机制依据源码 |
| [nasht12 gallery](https://nasht12.github.io/threejs-portfolio/) | 作品列表可读；进入 Merced River 的 scene hash / iframe 后，实际截图出现山谷 / 湖水 / 林木；切换 POINT 的控件状态，再返回 work hash / 画廊 | 确认该场景可渲染和基本进入 / 返回；没有目标硬件性能或中断恢复结果 |

本轮没有完成上述项目的浏览器端完整交互回归。网站可能依赖后端或网络条件；未绕过 TLS 安全检查。后续若选用对应模块，只需对真实使用场景作有目标的验证，不为收集更多 Demo 重复研究。

## 9. 实际复用清单与下一步验证

优先五项（均需锁版本、保留代码许可）：**luminous-lake waves / quality 的小模块、pmndrs Html / CameraControls 集成思路、camera-controls 控件、glTF Transform 压缩流程、ThanasOS Dock / Window / AppConfig**。需要重写适配而非直接 fork 整站。Three.js 是基础依赖；BVH / EZ-Tree 是按需要引入的工具；Spark / SuperSplat 只在 B 达到准入后进入运行链。

关键未决实验：水面与湖岸的共同光学；烘焙与实时太阳能量；近景针叶树的运动稳定性；ScreenBridge 的角点 / 色彩 / reflow；Splat 与网格 / 水透明排序。每项的复现步骤、失败线和转阶段门槛见 06 / 07。没有任何一个源码仓库替本项目证明照片感或 60FPS。

## 固定源码链接

[alp-readme]: https://github.com/Leonxlnx/procedural-alpine-lake/blob/b84c254b3fa533b8c992eb685e1127a92702da21/README.md
[alp-gl]: https://github.com/Leonxlnx/procedural-alpine-lake/blob/b84c254b3fa533b8c992eb685e1127a92702da21/engine/gl.py
[alp-film]: https://github.com/Leonxlnx/procedural-alpine-lake/blob/b84c254b3fa533b8c992eb685e1127a92702da21/film.py
[alp-height]: https://github.com/Leonxlnx/procedural-alpine-lake/blob/b84c254b3fa533b8c992eb685e1127a92702da21/engine/shaders/heightfn.glsl
[alp-bake]: https://github.com/Leonxlnx/procedural-alpine-lake/blob/b84c254b3fa533b8c992eb685e1127a92702da21/engine/bake.py
[alp-erosion]: https://github.com/Leonxlnx/procedural-alpine-lake/blob/b84c254b3fa533b8c992eb685e1127a92702da21/engine/erosion.py
[alp-forest]: https://github.com/Leonxlnx/procedural-alpine-lake/blob/b84c254b3fa533b8c992eb685e1127a92702da21/engine/shaders/bake_forest.frag
[alp-water]: https://github.com/Leonxlnx/procedural-alpine-lake/blob/b84c254b3fa533b8c992eb685e1127a92702da21/engine/shaders/water.glsl
[alp-water-shade]: https://github.com/Leonxlnx/procedural-alpine-lake/blob/b84c254b3fa533b8c992eb685e1127a92702da21/engine/shaders/water_shade.glsl
[alp-sky]: https://github.com/Leonxlnx/procedural-alpine-lake/blob/b84c254b3fa533b8c992eb685e1127a92702da21/engine/shaders/sky.glsl
[alp-render]: https://github.com/Leonxlnx/procedural-alpine-lake/blob/b84c254b3fa533b8c992eb685e1127a92702da21/engine/render.py
[lum-main]: https://github.com/stas4000/luminous-lake/blob/726c6bdc800569f5b50018bf9d1fdab0d50645cd/src/main.js
[lum-water]: https://github.com/stas4000/luminous-lake/blob/726c6bdc800569f5b50018bf9d1fdab0d50645cd/src/world/water.js
[lum-forest]: https://github.com/stas4000/luminous-lake/blob/726c6bdc800569f5b50018bf9d1fdab0d50645cd/src/world/forest.js
[lum-camera]: https://github.com/stas4000/luminous-lake/blob/726c6bdc800569f5b50018bf9d1fdab0d50645cd/src/world/cameras.js
[lum-quality]: https://github.com/stas4000/luminous-lake/blob/726c6bdc800569f5b50018bf9d1fdab0d50645cd/src/sim/quality.js
[lum-weather]: https://github.com/stas4000/luminous-lake/blob/726c6bdc800569f5b50018bf9d1fdab0d50645cd/src/sim/weather.js
[lum-world]: https://github.com/stas4000/luminous-lake/blob/726c6bdc800569f5b50018bf9d1fdab0d50645cd/src/world/world.js
[lum-waves]: https://github.com/stas4000/luminous-lake/blob/726c6bdc800569f5b50018bf9d1fdab0d50645cd/src/sim/waves.js
[lum-license]: https://github.com/stas4000/luminous-lake/blob/726c6bdc800569f5b50018bf9d1fdab0d50645cd/LICENSE
[img-readme]: https://github.com/img2threejs/img2threejs/blob/954cd5845e90efd045694bab725d68a9863c20e0/README.md
[img-arch]: https://github.com/img2threejs/img2threejs/blob/954cd5845e90efd045694bab725d68a9863c20e0/docs/ARCHITECTURE.md
[img-emit]: https://github.com/img2threejs/img2threejs/blob/954cd5845e90efd045694bab725d68a9863c20e0/forge/stage3_build/emit_target.py
[img-compare]: https://github.com/img2threejs/img2threejs/blob/954cd5845e90efd045694bab725d68a9863c20e0/forge/stage4_review/mesh_reference_compare.py
[img-license]: https://github.com/img2threejs/img2threejs/blob/954cd5845e90efd045694bab725d68a9863c20e0/LICENSE
[int-readme]: https://github.com/img2threejs/plugin-interior/blob/f2c3667bb6d3bacfc9e38898a7516d47bc2e90b1/README.md
[int-pipeline]: https://github.com/img2threejs/plugin-interior/blob/f2c3667bb6d3bacfc9e38898a7516d47bc2e90b1/authoring/pipeline.py
[int-bake]: https://github.com/img2threejs/plugin-interior/blob/f2c3667bb6d3bacfc9e38898a7516d47bc2e90b1/reference/bake-export.md
[int-lightmap]: https://github.com/img2threejs/plugin-interior/blob/f2c3667bb6d3bacfc9e38898a7516d47bc2e90b1/runtime/viewer/src/interior-lightmaps.js
[int-license]: https://github.com/img2threejs/plugin-interior/blob/f2c3667bb6d3bacfc9e38898a7516d47bc2e90b1/LICENSE
[int-notices]: https://github.com/img2threejs/plugin-interior/blob/f2c3667bb6d3bacfc9e38898a7516d47bc2e90b1/THIRD_PARTY_NOTICES.md
[spark-readme]: https://github.com/sparkjsdev/spark/blob/ffe210dc0a45d0515a06c9235878108112827d61/README.md
[spark-renderer]: https://github.com/sparkjsdev/spark/blob/ffe210dc0a45d0515a06c9235878108112827d61/src/SparkRenderer.ts
[spark-lod]: https://github.com/sparkjsdev/spark/blob/ffe210dc0a45d0515a06c9235878108112827d61/docs/docs/lod-getting-started.md
[spark-perf]: https://github.com/sparkjsdev/spark/blob/ffe210dc0a45d0515a06c9235878108112827d61/docs/docs/performance.md
[spark-light]: https://github.com/sparkjsdev/spark/blob/ffe210dc0a45d0515a06c9235878108112827d61/examples/dynamic-lighting/index.html
[spark-license]: https://github.com/sparkjsdev/spark/blob/ffe210dc0a45d0515a06c9235878108112827d61/LICENSE
[super-readme]: https://github.com/playcanvas/supersplat/blob/f272ec238b032a8ac5568f1cbec303edc5eb4bd0/README.md
[super-serialize]: https://github.com/playcanvas/supersplat/blob/f272ec238b032a8ac5568f1cbec303edc5eb4bd0/src/splat-serialize.ts
[super-spline]: https://github.com/playcanvas/supersplat/blob/f272ec238b032a8ac5568f1cbec303edc5eb4bd0/src/anim/spline.ts
[super-license]: https://github.com/playcanvas/supersplat/blob/f272ec238b032a8ac5568f1cbec303edc5eb4bd0/LICENSE
[bruno-view]: https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/View.js
[bruno-loader]: https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/ResourcesLoader.js
[bruno-render]: https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/Rendering.js
[bruno-quality]: https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/Quality.js
[bruno-license]: https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/license.md
[pm-portal]: https://github.com/pmndrs/examples/blob/541599ac5ad913de85796403c1c6927ada3b303c/examples/enter-portals/src/App.tsx
[pm-path]: https://github.com/pmndrs/examples/blob/541599ac5ad913de85796403c1c6927ada3b303c/examples/motionpathcontrols/src/App.tsx
[pm-html]: https://github.com/pmndrs/examples/blob/541599ac5ad913de85796403c1c6927ada3b303c/examples/mixing-html-and-webgl/src/App.tsx
[pm-license]: https://github.com/pmndrs/examples/blob/541599ac5ad913de85796403c1c6927ada3b303c/LICENSE
[nash-transition]: https://github.com/nasht12/threejs-portfolio/blob/49de6d6b9119d1a6d680d34e70830767bd3dc816/src/carousel/transition.ts
[nash-route]: https://github.com/nasht12/threejs-portfolio/blob/49de6d6b9119d1a6d680d34e70830767bd3dc816/src/state/route.ts
[nash-budget]: https://github.com/nasht12/threejs-portfolio/blob/49de6d6b9119d1a6d680d34e70830767bd3dc816/src/perf/budget.ts
[nash-viewer]: https://github.com/nasht12/threejs-portfolio/blob/49de6d6b9119d1a6d680d34e70830767bd3dc816/src/ui/SceneViewer.tsx
[cin-rig]: https://github.com/codrops/CinemaSeatPreview/blob/3d9c6ae4decea570852ded9993014dec0ee200fc/js/rig.js
[cin-app]: https://github.com/codrops/CinemaSeatPreview/blob/3d9c6ae4decea570852ded9993014dec0ee200fc/js/app.js
[cin-preview]: https://github.com/codrops/CinemaSeatPreview/blob/3d9c6ae4decea570852ded9993014dec0ee200fc/js/preview.js
[cin-license]: https://github.com/codrops/CinemaSeatPreview/blob/3d9c6ae4decea570852ded9993014dec0ee200fc/LICENSE
[os-context]: https://github.com/Thanas-R/thanas-os/blob/5a430db1abf4c4545c88c717b9eaebb1d789a0ae/src/contexts/MacOSContext.tsx
[os-window]: https://github.com/Thanas-R/thanas-os/blob/5a430db1abf4c4545c88c717b9eaebb1d789a0ae/src/components/macos/Window.tsx
[os-dock]: https://github.com/Thanas-R/thanas-os/blob/5a430db1abf4c4545c88c717b9eaebb1d789a0ae/src/components/macos/Dock.tsx
[os-types]: https://github.com/Thanas-R/thanas-os/blob/5a430db1abf4c4545c88c717b9eaebb1d789a0ae/src/types/macos.ts
[os-notes]: https://github.com/Thanas-R/thanas-os/blob/5a430db1abf4c4545c88c717b9eaebb1d789a0ae/src/components/apps/NotesApp.tsx
[os-app]: https://github.com/Thanas-R/thanas-os/blob/5a430db1abf4c4545c88c717b9eaebb1d789a0ae/src/App.tsx
[os-installed]: https://github.com/Thanas-R/thanas-os/blob/5a430db1abf4c4545c88c717b9eaebb1d789a0ae/src/lib/installedApps.ts
[os-license]: https://github.com/Thanas-R/thanas-os/blob/5a430db1abf4c4545c88c717b9eaebb1d789a0ae/LICENSE
[cam-src]: https://github.com/yomotsu/camera-controls/blob/c51601107e266097edf6a9caa57bfa9eaa77427c/src/CameraControls.ts
[cam-license]: https://github.com/yomotsu/camera-controls/blob/c51601107e266097edf6a9caa57bfa9eaa77427c/LICENSE
[gltf-meshopt]: https://github.com/donmccurdy/glTF-Transform/blob/8e2a94a2616d293c4b503d0fb6a4b42e6ec7c62f/packages/functions/src/meshopt.ts
[gltf-texture]: https://github.com/donmccurdy/glTF-Transform/blob/8e2a94a2616d293c4b503d0fb6a4b42e6ec7c62f/packages/functions/src/texture-compress.ts
[gltf-license]: https://github.com/donmccurdy/glTF-Transform/blob/8e2a94a2616d293c4b503d0fb6a4b42e6ec7c62f/LICENSE.md
[bvh-src]: https://github.com/gkjohnson/three-mesh-bvh/blob/16d6ae6383e9a20600152be2955851b20914b1ca/src/utils/ExtensionUtilities.js
[bvh-readme]: https://github.com/gkjohnson/three-mesh-bvh/blob/16d6ae6383e9a20600152be2955851b20914b1ca/README.md
[bvh-license]: https://github.com/gkjohnson/three-mesh-bvh/blob/16d6ae6383e9a20600152be2955851b20914b1ca/LICENSE
[ez-src]: https://github.com/dgreenheck/ez-tree/blob/dcf309bd86bd521083d9c70f01f2de45fdc7c457/src/lib/tree.js
[ez-readme]: https://github.com/dgreenheck/ez-tree/blob/dcf309bd86bd521083d9c70f01f2de45fdc7c457/README.md
[ez-license]: https://github.com/dgreenheck/ez-tree/blob/dcf309bd86bd521083d9c70f01f2de45fdc7c457/LICENSE
[ez-textures]: https://github.com/dgreenheck/ez-tree/blob/dcf309bd86bd521083d9c70f01f2de45fdc7c457/src/app/public/textures/LICENSE.md
[pt-src]: https://github.com/gkjohnson/three-gpu-pathtracer/blob/288363980a20e53f0627d350fd1bdacb1608643d/src/core/WebGLPathTracer.js
[pt-readme]: https://github.com/gkjohnson/three-gpu-pathtracer/blob/288363980a20e53f0627d350fd1bdacb1608643d/README.md
[pt-license]: https://github.com/gkjohnson/three-gpu-pathtracer/blob/288363980a20e53f0627d350fd1bdacb1608643d/LICENSE
[three-water]: https://github.com/mrdoob/three.js/blob/fae873455dff9602a916b4d2e8a985921448b62a/examples/jsm/objects/Water.js
[three-ocean]: https://github.com/mrdoob/three.js/blob/fae873455dff9602a916b4d2e8a985921448b62a/examples/webgl_shaders_ocean.html
[three-license]: https://github.com/mrdoob/three.js/blob/fae873455dff9602a916b4d2e8a985921448b62a/LICENSE
