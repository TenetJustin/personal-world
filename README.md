# Personal World · 湖畔个人世界

开发分支：`dev/phase-01-exterior`。仓库 `TenetJustin/personal-world` 已由用户设为 Public，Sprint V2 已授权 GitHub Pages 发布；不合并 main。当前以第一人称湖岸 → 门廊 → 木屋 → Mac → React 资料桌面为主线，同时保留无需 3D 的内容入口。

Phase 01B 照片级精修保存点 `d85f349`，视觉问题仍保留，功能贯通和上线不代表照片级验收通过。

## 本地运行

```sh
git lfs install --local
git lfs pull
npm ci
npm start
```

打开 **http://127.0.0.1:5177**。Node.js ≥22.18。`/notes/`、`/photos/`、`/projects/`、`/resume/` 可以直接访问。热更新：`npm run dev -- --port 5177 --strictPort`（先停止预览）。

## 本地草稿与公开内容

Notes、Photos、Projects、Resume 保留导入、编辑、浏览、搜索、回收站及完整备份恢复。本地资料在当前浏览器的 IndexedDB，切换设备或清除浏览器数据前请备份。

**保存不等于发布。** 只有明确选择、逐项审核并导出的公开内容包，才通过 `scripts/import_public_content.mjs` 写入 `public/content/`，由提交与 Actions 构建同步到网站。完整备份不可用于公开导入；当前仅发布原创站点使用说明，不含真实私人资料。浏览器草稿与已发布资料在界面中分开。

## 构建和 GitHub Pages

```sh
npm test
node scripts/validate_public_content.mjs
VITE_BASE_PATH=/personal-world/ npm run build
node scripts/check_pages_build.mjs /personal-world/
```

`.github/workflows/pages.yml` 只从开发分支构建与部署，处理仓库子路径、LFS 模型、PDF.js 资源和四个内容入口的直接刷新。最终发布地址以 Pages 部署返回值为准。详见 [发布指南](docs/sprint-v2/deploy-guide.md)。

## 文档

- [个人资料导入、审核发布与迁移备份](docs/sprint-v2/content-system.md)
- [第一人称镜头与录制说明](docs/sprint-v2/cinematic-journey.md)
- [集成验证记录](docs/sprint-v2/verification.md)
- [性能实测](docs/sprint-v2/performance.json)
- [已知问题与 Phase 05](docs/sprint-v2/known-issues.md)
- [仓库、公开资料与资产政策](docs/Repository_Policy.md)
- [全历史安全审查](docs/sprint-v2/public-history-audit.json)
- [MVP 资料与备份指南（历史基线）](docs/mvp/02_Run_And_Data_Guide.md)
- [MVP 验证报告（历史基线）](docs/mvp/03_Verification_Report.md)
- [Phase 01B 保存点与视觉问题](docs/phase-01b/STATUS.md)
- [原始 Phase 00 规划](docs/planning/)

运行网站不要求安装 Blender。建筑母版在 `assets/architecture/`；完整下载源扫描和私人备份不入库。旧外景检查工具 `/?study=1&shot=A` 保留用于美术对照。
