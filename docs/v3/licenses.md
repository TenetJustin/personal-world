# V3 资产、依赖与许可

2026-10-26。只记录本轮新增或修改的素材；V2 既有资产与依赖的完整清单继续以
[`docs/phase-01/asset-sources.json`](../phase-01/asset-sources.json)、
[`docs/phase-01b/asset-sources.json`](../phase-01b/asset-sources.json)、
[`licenses/dependencies.json`](../../licenses/dependencies.json) 为准。

## 新增运行时资产

| 文件 | 大小 | 来源 / 作者 | 许可 | 修改 | 运行时 |
| --- | ---: | --- | --- | --- | --- |
| `public/assets/cabin-v3-shell.glb` | 13,903,316 B | 本项目原创建筑几何（Codex），派生自 `cabin.glb`（SHA-256 `a23eefcc…`）。墙/木/石 PBR 使用已有的 `rough_wood`、`rock_wall_02` | 原创 + CC0-1.0 | 移除上层结构楼板、增加真实楼梯洞口与 V3 材质；原 `cabin.glb` 未改动 | 是 |
| `public/assets/cabin-interior-v3.glb` | 13,578,412 B | 本项目原创室内几何与原创织纹贴图（Blender 5.2.2），石材/木纹复用 CC0 贴图 | 原创 + CC0-1.0 | 由母版 `cabin-interior-v3.blend` 导出并 meshopt 压缩 | 是 |
| `assets/architecture/cabin-interior-v3.blend` | ≈45 MB | 本项目原创（Codex 母版） | 原创 + CC0 贴图 | 本轮原样恢复，未重做 | 否（母版） |
| `public/desktop-v3/lake-silk.svg` | 3,005 B | 本项目原创壁纸 | 原创，项目所有 | 无 | 是 |
| `public/desktop-v3/notes.svg` | 827 B | 本项目原创图标 | 原创，项目所有 | 无 | 是 |
| `public/desktop-v3/photos.svg` | 977 B | 本项目原创图标 | 原创，项目所有 | 无 | 是 |
| `public/desktop-v3/projects.svg` | 840 B | 本项目原创图标 | 原创，项目所有 | 无 | 是 |
| `public/desktop-v3/resume.svg` | 830 B | 本项目原创图标 | 原创，项目所有 | 无 | 是 |
| `public/desktop-v3/profile.svg` | 868 B | 本项目原创图标 | 原创，项目所有 | 无 | 是 |

### CC0 来源

| id | 来源 | 作者 | 许可 |
| --- | --- | --- | --- |
| `rough_wood` | <https://polyhaven.com/a/rough_wood> | Poly Haven 贡献者（见 phase-01b 记录） | CC0-1.0 |
| `rock_wall_02` | <https://polyhaven.com/a/rock_wall_02> | Rob Tuytel | CC0-1.0 |

CC0 不要求署名；上表为可追溯性保留作者信息。所有 Poly Haven 贴图只作为 PBR 输入，
未把烘焙方向光或电影截图烘进贴图。

## 代码生成的视觉资产（无外部文件）

- `src/scene/MacBook.tsx`：机身、键帽、触控板、屏幕、摄像头缺口、接触阴影全部由
  Three.js 几何与 Canvas 程序化生成。**没有**使用 Apple 产品照片、Apple 壁纸、
  Apple 图标、SF Symbols 或 Apple 字体文件；没有粘贴 Apple 商标。
- `src/scene/screenPreview.ts`：实体屏幕与 DOM 过渡共用的原创湖岸渐变壁纸、
  菜单栏、Widgets 与 Dock 画面。时间与日期来自访客本地 `Date`，天气显示
  “未连接天气服务”，不编造气象数据。
- 参考的 Apple 官方页面仅用于公开尺寸与外形研究：
  <https://support.apple.com/en-us/126320>、<https://www.apple.com/macbook-air/>。
  未下载或再分发其中的图片。

## 开发依赖（不进入运行时产物）

| 包 | 版本 | 许可 | 用途 |
| --- | --- | --- | --- |
| `playwright-core` | 1.56.1 | Apache-2.0 | `scripts/v3-capture.mjs`、`scripts/v3-measure.mjs` 的真实浏览器截图/性能采样；仅 devDependency |

运行时依赖（React 19、Three.js 0.180、R3F、pdfjs-dist 等）没有新增或升级；
完整许可文本仍在 `licenses/`。

## 体积与分发

- 两个新 GLB 共 **27.48 MB**，Blender 母版约 **45 MB**，均使用 Git LFS。
- 截图/录屏位于 `docs/v3/evidence/`，使用 Git LFS，仅作验证证据，不进入 Vite 产物。
- 没有新增 HDR、视频贴图或第三方字体。
- 没有加入任何来源不明的收费资产、电影模型、游戏场景或未授权 GitHub 模型。

## 审核提示

- 公开包仍只有一条原创站点说明，不含真实个人资料。
- 若后续替换为新的 CC0 资产，必须同时更新 `public/assets/manifest.json` 的
  `sha256`/`bytes`/`sourceIds`，否则 `tests/asset-manifest.test.ts` 会失败。
- `scripts/import_public_content.mjs` 的公开导入与 EXIF 清理逻辑未改变。
