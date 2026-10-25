# Cinematic Nordic Retreat · Phase 00

**交付状态：Phase 00 研究与规划已完成；未启动 Phase 01。** 研究日期：2026-10-25（Asia/Shanghai）。核查 18 个仓库、98 份选定源码 / 文档 / 许可快照。这是实施依据，不是已完成网站、画质样片或性能报告。

## 执行摘要

首选 **方案 A：Three.js / WebGL2 实时 PBR 近景 + Blender 制作与间接光烘焙 + 远景简化网格 / 分层背景 + 实时湖水 + React 桌面**。半自由观察限定在经过构图、遮挡与资源预算验证的区域；点击目标后由唯一的 CameraDirector 接管镜头。统一固定午后太阳，先把五个标准镜头做对，再扩展细节和应用。

照片感最可行的来源是正确的尺度、构图、植被轮廓、湖岸接触、材质与光照一致性。不要依靠全程序化几何、浓雾或大量后期特效补救。木屋内外使用同一份 Blender 建筑母版，室内保留 PBR 材质、第二套 UV 和独立间接光图。电脑屏幕通过几何对齐的同一 React DesktopRoot 进入全屏 DOM，退出时恢复相机和窗口状态。

备用 **方案 B：离线重建 / 外观烘焙占主导，静态局部可用 Gaussian Splatting，实时网格负责交互与遮挡**。它不是自动升级方案：只有合法参考、可覆盖镜头的重建数据和实测性能都成立时才采用。先保留可交互近景，必要时把远景改成离线分层画面。两条路线的完整比较见 [07](docs/planning/07_Risks_And_Alternatives.md)。

## 文档索引

| 文档 | 执行时解决的问题 |
| --- | --- |
| [01 · Art Direction](docs/planning/01_Art_Direction.md) | 画面目标、真实尺度、光色与人工审美标准 |
| [02 · Technical Architecture](docs/planning/02_Technical_Architecture.md) | 持久 Canvas、模块、状态机、屏幕 / DOM、内容路由、资源生命周期 |
| [03 · Open Source Research](docs/planning/03_Open_Source_Research.md) | 指定项目与拓展项目的源码证据、许可、可复用边界和 Demo 记录 |
| [04 · Scene and Camera Plan](docs/planning/04_Scene_And_Camera_Plan.md) | 五张标准镜头、空间坐标、摄影机运动、遮挡与可逆过渡 |
| [05 · Asset Plan](docs/planning/05_Asset_Plan.md) | 十类资产的制作路线、授权、烘焙、导出、压缩与校验 |
| [06 · Phase Acceptance](docs/planning/06_Phase_Acceptance.md) | Phase 00–06 的任务、交付、测试、视觉门槛、测量与回退 |
| [07 · Risks and Alternatives](docs/planning/07_Risks_And_Alternatives.md) | A/B 决策、切换条件、前三风险、反方审查、待决事项 |

建议阅读顺序：本页 → 07 → 01 / 04 → 03 → 02 / 05 → 06。跨文档的数值预算统一以 06 为准，源代码快照与许可统一以 03 为准。

## 证据规则与已确认的排除项

- **[F] 已验证事实**：本轮实际读到的固定 commit 源码、LICENSE 或官方文档；注明具体来源。源码有功能不等于已在目标设备验证。
- **[E] 工程推断 / 设计决策**：依据事实提出的项目方案、预算、尺寸和验收线；尚未实现或实测。01、02、04、05、06 中未特别标 [F] 的设计条目均属 [E]。
- **[H] 待验证假设**：必须在获准的后续阶段用明确实验确认。所有 FPS、内存、加载与耗时目标均是 [E]，不是测试成绩。

已确认：procedural-alpine-lake 是 OpenGL 4.3 离线渲染流程，当前仓库树未发现许可，不能当网页引擎或直接复制来源；luminous-lake 可作为波场 / 质量管理参考，实际 Demo 偏低多边形；plugin-interior 当前整体为有商业化限制的 source-available 许可，部分目录另保留 Apache-2.0，不能按主项目的 Apache-2.0 一概处理；nasht12 项目当前树未发现项目许可，只分析设计，不复制代码。证据见 03。

## 下一阶段的边界与决策

Phase 01 **仅验证湖岸和木屋外观的最终质量切片**：一个湖岸 Hero 镜头、一个接近镜头、有限观察区域、实时湖水与树石近景、统一色彩 / 阳光、受控性能记录。不得先做完整桌面或大量文章应用。可安排一个很小的中性烘焙校准件，验证 UV / 色彩 / 光照机制；这不是完整木屋内部。

主要准入：1440×900、记录 DPR 与真实 drawing buffer；目标均值 50–60 FPS、p95 帧时间 <33ms；S01/S02 人工评分达标且无明显水岸、LOD、重复纹理、光照错误。详见 06。未达标则返工或在受限镜头内比较 B，不用继续堆功能掩盖问题。

用户后续应最终确认：视觉参考与五镜头审美、木屋布局、目标硬件和网络、可接受的视角边界、资产制作投入，以及是否允许引入 plugin-interior 的受限代码。当前不需要真实个人资料。

## 审查者结论

最可能失败的因素是**拼接大量风格和尺度不一致的资产，再指望灯光 / 后期把它们变成摄影**。防止方式：先批准一套统一参考；Phase 01 用接近最终品质的近景树、岸石、原木、湖水完成两张真实浏览器镜头；按固定曝光与多视角审查，任一核心视觉项失败即停止扩展。

本轮仅新增规划文档及研究缓存，未安装项目依赖、制作正式模型、开发网站或公开部署。批准下一阶段前停止执行。

---

## Phase 01 · Photoreal Exterior Proof of Concept

当前开发分支：`dev/phase-01-exterior`。仓库保持 **Private**，没有公开部署。

这是仅含湖岸和木屋外立面的浏览器技术样片。照片级视觉验收尚未通过；技术测试通过不能替代人工画质判断，Phase 02 尚未获准开始。

```sh
git lfs pull
npm ci
npm run dev
```

默认地址：`http://127.0.0.1:5173/`。质量档与复现方法见 [实现说明](docs/phase-01/02_Implementation_And_Reproduction.md)。生产本地预览：`npm run build && npm run preview -- --port 5174`。

- [实施前视觉参考与资产候选](docs/phase-01/01_Visual_Reference_And_Asset_List.md)
- [实现、边界与资产复现](docs/phase-01/02_Implementation_And_Reproduction.md)
- [视觉问题与修复记录](docs/phase-01/03_Visual_Issues_And_Fixes.md)
- [资产来源与许可](docs/phase-01/04_Assets_And_Licenses.md)
- [测试协议](docs/phase-01/05_Test_Protocol.md)
- [性能与加载实测](docs/phase-01/06_Performance_And_Loading.md)
- [Phase 02 技术评估](docs/phase-01/07_Phase02_Assessment.md)
- [两张标准镜头、参数和实际录屏](docs/phase-01/evidence/)
- [性能原始数据与技术测试证据](docs/phase-01/tests/)

开发检查：`npm test`、`npm run build`。从源资产重新制作需 Blender 5.2.2，正常浏览器启动只需 Node 与 Git LFS 中的运行资产。制作母版在本机忽略目录中，不声称已经云端备份；详见 [仓库与存储策略](docs/Repository_Policy.md)。

## 当前优先级 · 完整 MVP

2026-10-25 用户已批准贯通全部后续 Phase，暂缓照片级画质门禁。Phase 01B 的建筑和环境候选保存于 [保存点](docs/phase-01b/STATUS.md)，其视觉问题作为后续 backlog，不阻挡资料功能。

MVP 优先支持浏览器本地的真实 Notes、Photos、Projects、Resume，以及导入、编辑、浏览和备份；不开发账户 / 云同步。继续保持 Private，不合并 main，不公开部署。
