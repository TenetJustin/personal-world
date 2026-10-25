# V3 接管与交付说明（DeepSeek）

2026-10-26。本文记录 Codex 本地 V3 成果的恢复、DeepSeek 继续实现的内容、验证证据、已知问题，以及交给 Codex 的低成本集成路径。

- 开发分支：`feat/v3-deepseek-integration`
- 基线：`aba5377`（远端 `dev/phase-01-exterior`）
- 恢复快照提交：`070ebec`
- 最终提交：见本文末尾“提交记录”（以 `git log` 为准）
- 线上 V2：<https://tenetjustin.github.io/personal-world/>（交付时仍可用）

## 1. 接手时的真实状态

Codex 的本地工作区位于 `/Users/wheeler/Documents/Codex/2026-10-25/files-pasted-by-the-user-cinematic`，分支 `feat/immersive-v3`，HEAD 为 `aba5377`，**全部 V3 改动均未提交**：

- 13 个已跟踪文件修改。
- 25 个未跟踪文件（含 V3 室内 Blender 母版、两个 GLB、DesktopV3、ProfileCenter、profile 数据模型、locomotion、两份测试等）。
- 没有 stash、没有额外 worktree、没有 V3 提交。
- 远端当时只有 `aba5377`；没有可直接拉取的 V3 分支。

已完整恢复而不触碰原工作区：

1. 在独立目录重新克隆远端 `aba5377`。
2. 用 `git diff` 导出 13 个跟踪改动并应用。
3. 用文件清单原样复制 25 个未跟踪文件。
4. `git status` 与 Codex 工作区逐项一致后，提交 `070ebec` 作为可审计恢复点。

恢复时确认的**真实缺口**（不是文件名问题）：

- `src/scene/Interior.tsx` 引用 `./MacBook`，但 `src/scene/MacBook.tsx` 从未创建，`tsc` 直接失败。
- `DesktopV3.tsx` 与 `ProfileCenter.tsx` **没有任何入口**，`App.tsx` 仍是 V2 资料桌面。
- `journey.ts` 已有 `Walker` / `setMoveInput`，但没有任何键盘监听调用它；第一人称 WASD 实际不可用。
- 两处测试失败：自动引导在门廊台阶被碰撞判定卡住；安全路径规划返回“上层直接落到一层”的假路径。
- 远端 `dev/phase-01-exterior` 在审计时曾短暂显示为 `0d283ff`，随后恢复为 `aba5377`；本次以 `aba5377` 为基线，未改写远端历史。

## 2. 本次实际完成的内容

### 2.1 修复构建与恢复 Codex 设计

- 新建 `src/scene/macbookModel.ts`：MacBook Air 13.6" 的纯尺寸/屏幕四角唯一真源（无 React/Three 依赖，可被 Node 测试和渲染共用）。
- 新建 `src/scene/MacBook.tsx`：按官方 30.41 × 21.50 × 1.13 cm、2560 × 1664 制作的可交互机型，含圆角铝合金机身、独立键帽实例、键帽字符图集、功能行、Touch ID 位置、大触控板、USB-C/MagSafe 开口、转轴、摄像头缺口、玻璃反光、接触阴影。
- `architecture.ts` 的 `LAPTOP_SCREEN_LOCAL` 不再手写坐标，改由模型尺寸推导；屏幕四角、屏幕中心、DOM 单应矩阵和实体模型永远一致。
- 修复 Codex 遗留的两处物理/规划问题：
  - 门廊五级台阶：手动行走改为与电影路线相同的连续坡面，消除 `floorAt` 与 `walkFloor` 的 24 cm 高度冲突。
  - 安全路径：高度变化超过 30 cm 时禁止跳点简写，必须保留真实踏步航点。
- 自动引导接管增加 `resumeOffset`：从当前位置平滑采纳引导路线，第一帧位移小于 1 cm（单测约束）。

### 2.2 真正接入桌面与资料中心

`src/App.tsx`：

- 删除 V2 自绘桌面外壳，改为 `<DesktopV3>`，保留原有 `Library` 作为四个应用的窗口内容。
- `renderProfile` 接入 `ProfileCenter`；`?app=profile` 可直接进入本地工作区，刷新后仍保持。
- 保留原有 IndexedDB、导入/导出、发布审核、`ScreenBridge` 单应过渡与路由。
- 窗口拖动、最大化、最小化、关闭、Dock 打开、层级、帮助面板均由 `DesktopV3` 管理；退出电脑仍回到进入前的精确桌前位姿。

### 2.3 第一人称移动与碰撞

`journey.ts` + `App.tsx`：

- WASD 行走、Shift 加速、对角归一化；基于时间积分，不随帧率变化。
- 鼠标拖动环视（已验证）；点击画布请求 Pointer Lock，成功后用 `movementX/Y` 环视。
- 失焦、切后台、打开桌面、帮助面板、输入框聚焦都会清空移动输入。
- `E` 开关房门；靠近门口时门会自动打开（与 V2 引导一致）。
- 手动行走、自动引导、接回路线、上楼全部共用 `Walker` + `floorAt` + `clearance` + `WALK_COLLIDERS`。
- 五秒自动引导被 WASD 打断时保留位置、朝向、门状态与路线进度；可从当前位置安全接回，不瞬移。
- 到书桌自动停止，必须主动点击/请求才进入电脑。

### 2.4 视觉一致性修补

- 实体 MacBook 屏幕与 `ScreenBridge` 过渡预览改为调用同一个 `drawScreenPreview()`，进入电脑时不会从一种画面跳成另一种。
- 天气组件改为明确的“未连接天气服务 / —°”占位，不再展示虚构的 18°/20°/12°。
- 新增站点 favicon，消除浏览器 404 噪声。
- 备份文件名改用访客本地日期（此前用 UTC 日期，夜间会差一天）。

## 3. 关键文件

| 文件 | 作用 |
| --- | --- |
| `src/scene/MacBook.tsx` | 程序化 MacBook 模型、屏幕材质、键盘、触控板、点击区 |
| `src/scene/macbookModel.ts` | 尺寸常数、显示四角、13.6" 推导，测试与渲染共用 |
| `src/scene/screenPreview.ts` | 实体屏幕与 DOM 过渡共用的原创桌面画面 |
| `src/scene/locomotion.ts` | Walker、胶囊碰撞、门廊坡面、双层安全路径规划 |
| `src/scene/journey.ts` | 唯一运动状态机；WASD、接管、接回、上下楼、电脑过渡 |
| `src/scene/architecture.ts` | 双层楼板、楼梯、家具碰撞、屏幕四角真源 |
| `src/scene/Interior.tsx` | 加载 `cabin-interior-v3.glb`，挂载 MacBook 与室内灯光 |
| `src/scene/World.ts` | V3 外壳、树木/岩石碰撞体、环境 |
| `src/ui/DesktopV3.tsx` | 菜单栏、Dock、窗口、Widgets、壁纸 |
| `src/ui/ProfileCenter.tsx` | 结构化个人资料编辑、预览、审核、备份 |
| `src/library/profile.ts` | 结构化资料类型、校验、进度、发布状态 |
| `src/ui/ScreenBridge.tsx` | 屏幕四角 → 全屏 DOM 的单应过渡 |
| `scripts/v3-capture.mjs` | 真实浏览器证据截图脚本 |
| `scripts/v3-measure.mjs` | 真实浏览器性能采样脚本 |
| `docs/v3/evidence/` | 截图与录屏证据 |
| `docs/v3/performance-*.json` | 原始性能数据 |

## 4. 运行与构建

```sh
git lfs install --local
git lfs pull
npm ci
npm start                      # 生产构建 + http://127.0.0.1:5177
# 或开发
npm run dev -- --port 5177 --strictPort
```

验证：

```sh
npm test
node scripts/validate_public_content.mjs
VITE_BASE_PATH=/personal-world/ npm run build
node scripts/check_pages_build.mjs /personal-world/
```

调试入口：`?debug=1` 会暴露 `window.__pw`（`journey` / `runtime` / `screenProjection`），只用于自动化验证；正常访问不暴露。性能采样与截图脚本依赖同机 Chrome for Testing（Playwright 缓存）或 `--browser` 指定路径。

## 5. 验证摘要

完整清单与证据链接见 [`verification.md`](./verification.md)，性能方法见 [`performance.md`](./performance.md)。

- `npm test`：38 项全部通过（含新增 MacBook 尺寸/单应 3 项）。
- 真实 Chrome（Apple M5，Metal，1440×900）：WASD 位移、拖动环视、上楼到 y=5.90 m、墙体/壁炉阻挡、桌面期间 WASD 位移 0.0000 m。
- 自动引导：5 秒启动，路线 37.2 s，加等待约 44 s；V2 文档记录路线 81.75 s（同路线约 2.2×，含 5 秒等待约 1.97×）。
- 屏幕投影四角最大误差 0.081 px（1440×900，进入桌面过程中采样）。
- 退出电脑回到桌前的位姿误差 0.000000 m / 0.000000 rad。
- 资料保存、刷新后读取、完整备份导出均在真实浏览器通过；备份内含 `structuredProfile`。

## 6. 已知问题与限制

1. **Pointer Lock 在自动化窗口被浏览器拒绝**（“root document is not valid for pointer lock”）。真实用户点击通常可用；拖动环视已实测。代码已捕获拒绝，不会产生未处理异常。
2. **湖岸视角平均 44 FPS**（1440×900，p95 27 ms），低于 50 FPS 的平均目标；桌面视角 60 FPS。主要成本是水面反射二次绘制与森林/草地几何（452 draw calls / 19.7M triangles）。没有通过隐藏景物或降低分辨率伪造数据。
3. **HUD 叠层仍在室内遮挡左下画面**（V2 设计）。未改版视觉语言，避免与 Codex 的 UI 冲突。
4. 实体屏幕画面是原创近似桌面，不是真实 macOS 截图；未声称 95% 相似度。
5. 室内 GLB 的部分织物/石材仍偏平滑，Fireplace 石纹有可见重复；这是后续贴图/法线精修项。
6. 天气为明确占位；未接入 API，不读取定位。日历只使用本地真实日期，不虚构日程。
7. 移动端仅保留原有响应式布局与拖动环视，没有专门的虚拟摇杆。
8. 公开内容仍只有原创站点说明，没有导入任何真实个人资料。

## 7. 交给 Codex 的集成建议

优先顺序：

1. **不要重新合并文件**：本分支已包含 Codex 原工作树的全部内容。若要继续，直接在本分支或从本分支开新分支，避免把 `070ebec` 之前的改动再写一遍。
2. 先 `npm ci && npm test && npm run build`，确认 38 项测试与构建通过。
3. 若 Codex 在 V2 上又有新改动，重点冲突文件：
   - `src/App.tsx`（桌面外壳替换、WASD 监听、`?app=profile`）
   - `src/scene/journey.ts`（`resumeOffset`、`setPose`、速度）
   - `src/scene/architecture.ts`（屏幕四角改为模型推导）
   - `src/scene/locomotion.ts`（门廊坡面、规划简写）
   - `src/ui/Library.tsx` / `src/library/model.ts`（结构化资料与项目详情）
   - `public/assets/manifest.json`（两个新 GLB 的哈希）
4. 新增运行时资源：`public/assets/cabin-v3-shell.glb`、`public/assets/cabin-interior-v3.glb`、`public/desktop-v3/*.svg`。均为 LFS 或小 SVG。
5. 新增母版：`assets/architecture/cabin-interior-v3.blend`（45 MB，LFS），可用 `scripts/build_interior_v3.py`（Blender 5.2.2）重建；`scripts/prepare_interior_v3.mjs` 负责压缩/校验。
6. 合并后务必在真实浏览器重测：`?debug=1` + `scripts/v3-measure.mjs --scene desk`，确认没有因其他改动引入额外 draw call。
7. 发布前再次确认 `.github/workflows/pages.yml` 仍只从 `dev/phase-01-exterior` 构建，且 `VITE_BASE_PATH=/personal-world/`。

## 8. 提交记录

- `070ebec` recover(v3): preserve Codex feat/immersive-v3 working tree
- 后续提交（集成、MacBook、碰撞修复、证据与文档）见 `git log --oneline`。

## 9. 下一步优先级

1. 用真实用户桌面截图校准菜单栏/Dock/窗口（不涉隐私）。
2. 优化湖岸视角：减少水面反射 Draw Call、按距离分级的林分 LOD；目标平均 ≥50 FPS。
3. 室内材质：壁炉石纹、织物法线、接触阴影。
4. 移动端虚拟摇杆与触控视角。
5. 真实天气 API（明确同意与定位开关）与可选日程。
