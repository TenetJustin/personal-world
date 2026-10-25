# Phase 01 · 资产来源与许可

核验日期：2026-10-25。仅使用下列选定资产、项目原创模型 / 纹理，以及带许可证的软件。素材下载后在本地处理，运行时无外链纹理或未知来源模型。

| 实际采用 | 作者 / 来源 | 权利依据 | 处理与用途 |
|---|---|---|---|
| [Fir Tree 01](https://polyhaven.com/a/fir_tree_01)，变体 C | Rob Tuytel（摄影）、Rico Cilliers（建模） | CC0-1.0 | 从官方 buffer 指定字节区间抽取；Blender 近 / 中源网格、远景四向代理；补单独 Alpha |
| [Rock Moss Set 01](https://polyhaven.com/a/rock_moss_set_01) | Kless Gyzen | CC0-1.0 | 六块源石、规范化、实例散布、Meshopt / WebP |
| [Grass Medium 01](https://polyhaven.com/a/grass_medium_01) | Rob Tuytel、Rico Cilliers | CC0-1.0 | 选择较完整草丛、补 Alpha、MASK 与实例化；轻微风动 |
| [Rough Wood](https://polyhaven.com/a/rough_wood) | Rob Tuytel | CC0-1.0 | 木屋 PBR，保留米制 UV；未使用有油漆的候选纹理 |
| [Forest Floor](https://polyhaven.com/a/forest_floor) | eye-candy.xyz | CC0-1.0 | 林地落针混合层 |
| [Aerial Grass Rock](https://polyhaven.com/a/aerial_grass_rock) | Rob Tuytel | CC0-1.0 | 地面苔藓 / 草岩主层与法线粗糙度 |
| [Alps Field](https://polyhaven.com/a/alps_field) | Andreas Mischok | CC0-1.0 | 天空 / 超远山摄影背景；2K / 4K 两档，独立 512×256 照明探针 |
| 木屋外立面、原木端面图、AO、地形、水体着色、相机曲线 | 本项目原创 | 项目私有内容；未授予公开开源许可 | 可重复 Blender / TypeScript 源脚本在仓库中；源 `.blend` 本机保留 |

[Poly Haven 官方许可页](https://polyhaven.com/license) 明确说明其资产使用 CC0，并允许修改和再分发。此结论只适用于资产本身；网站 Logo、作者头像、示例渲染与用户作品并不因此自动成为 CC0。本项目没有把这些网站内容当成场景资产。

官方元数据、来源 URL、作者、下载输入 SHA-256 / 官方 MD5 和树变体字节区间记录在 `asset-sources.json`。最终运行文件逐项对应来源 ID，大小与 SHA-256 位于 `../../public/assets/manifest.json`。最终文件必须以 manifest 为准，而不是早期构建输出。原始制作缓存仅在忽略的 `assets-source/` 中，不混入交付源码包。

候选 Rock Moss Set 02、Moss 01、Pine Tree 01、Forest Slope 只用于研究 / 参考或筛选；没有把它们列为已采用的运行资产。未采用的候选及临时文件不进入 Git。

## 软件与复用

Three.js r180 / Water 平面反射技术为 MIT。`src/vendor/Water.js` 来自已安装的 r180 实际源码，修改 HDR 反射目标、MSAA 与释放；水体着色另在 `src/scene/water.ts`。完整 MIT 原文保存在 `licenses/three-MIT.txt`。

React、React DOM、R3F 与实际安装的传递运行依赖的许可证保存在 `licenses/dependencies/`，版本和许可索引为 `licenses/dependencies.json`。R3F 9.4.0 的 npm 包没有附带 LICENSE，因此另从该版本 GitHub tag 保存原文及精确来源 URL。压缩 decoder 使用 Three.js 附带的 meshoptimizer decoder，保留原文件与许可证声明。

Luminous Lake 的 MIT 许可和实际代码在 Phase 00 / 本轮调研中检查过；本轮没有直接拷贝该项目的场景代码、贴图或模型。无许可明确声明的 procedural-alpine-lake、nasht12 等仓库没有进入运行时或交付包。没有购买付费资产，也没有将研究缓存误认作授权资源。

## 资产存储

必要运行二进制和浏览器证据使用 Git LFS，仓库保持 Private。制作级源资产保存在本机 `assets-source/`，当前没有新增云存储桶、公共 CDN 或公开 URL。其作者原始下载地址、校验和、派生步骤已记录，因此不需要在 Git 中重复提交数百 MB 的源 buffer。

这项策略明确区分了“可复现的源处理步骤”和“完整制作母版远程备份”：后者尚未建立，不声称已完成。扩展 LFS 配额、购买资产或配置外部存储需要另外的明确授权，当前未触发这些操作。
