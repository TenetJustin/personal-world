# Personal World · 本地个人资料 MVP

Private 仓库：`TenetJustin/personal-world`。工作分支：`dev/phase-01-exterior`。不合并 main，不公开部署。

用户已批准以功能贯通优先：湖岸 → 简化木屋室内 → 书桌 → React 资料桌面；也可跳过 3D 直接浏览资料。Phase 01B 的照片级精修暂缓，保存点 `d85f349`；未宣称视觉验收通过。

## 本地运行

```sh
git lfs install --local
git lfs pull
npm ci
npm start
```

固定打开 **http://127.0.0.1:5177**。Node.js ≥22.18。内容入口 `/notes/`、`/photos/`、`/projects/`、`/resume/` 无需加载 3D。个人资料保存在当前浏览器的 IndexedDB，仓库不会自动保存这些资料。

## 核心功能

- Notes：创建、编辑、基础 Markdown 阅读，批量导入 Markdown / TXT。
- Photos：照片导入、标题 / 说明、原图与原文件下载。
- Projects：项目介绍、标签、外部网址。
- Resume：文字履历、Markdown / TXT / PDF 导入，本地 PDF 分页阅读。
- 统一搜索、回收站恢复、完整 JSON 备份与合并恢复（含照片 / PDF 原文件）。
- 单资料窗口、最小化与恢复、桌面 Dock、可逆空间切换、浏览器前进 / 后退、直达与刷新。

编辑后点击保存。切换应用会保留未保存草稿，刷新前会提醒；浏览器崩溃不保证草稿恢复。请定期导出备份，清除浏览器数据会删除本地库。备份不应提交 Git。

## 文档与验证

- [MVP 范围与各阶段状态](docs/mvp/01_Scope_And_Phase_Status.md)
- [运行、资料导入与备份指南](docs/mvp/02_Run_And_Data_Guide.md)
- [实际验证报告](docs/mvp/03_Verification_Report.md)
- [Phase 01B 保存点与视觉问题](docs/phase-01b/STATUS.md)
- [仓库、许可证与大型资产政策](docs/Repository_Policy.md)
- [七份原始 Phase 00 规划](docs/planning/)
- [历史 README](docs/README_History_Phase00_01.md)

`npm test` / `npm run build`。热更新：`npm run dev -- --port 5177 --strictPort`（先停止预览）。旧外景检查工具：`/?study=1&shot=A`。运行不要求安装 Blender；可编辑建筑母版在 `assets/architecture/`，源扫描缓存不入 Git。

艺术质量、性能目标与跨设备覆盖都有边界，详见验证报告；MVP 核心完成不等于全部原始规划 / 美术目标已通过。
