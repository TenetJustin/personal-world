# Personal World · 湖畔个人世界

开发分支：`dev/phase-01-exterior`。仓库 `TenetJustin/personal-world` 已由用户设为 Public，Sprint V2 已授权 GitHub Pages 发布；不合并 main。当前以第一人称湖岸 → 门廊 → 木屋 → Mac → React 资料桌面为主线，同时保留无需 3D 的内容入口。

Phase 01B 照片级精修保存点 `d85f349`，视觉问题仍保留，功能贯通和上线不代表照片级验收通过。

网站：**https://tenetjustin.github.io/personal-world/**。直接资料入口：**https://tenetjustin.github.io/personal-world/notes/**。部署与线上验证见 [发布回执](docs/sprint-v2/deployment-success.json)。

## V3（进行中，独立分支）

V3 接管、MacBook 模型、WASD/碰撞、双层木屋、桌面与资料中心的实现和验证记录见
[`docs/v3/DEEPSEEK_HANDOFF.md`](docs/v3/DEEPSEEK_HANDOFF.md)；
性能见 [`docs/v3/performance.md`](docs/v3/performance.md)，
验证与截图见 [`docs/v3/verification.md`](docs/v3/verification.md)。
V3 开发分支为 `feat/v3-deepseek-integration`，未合并 `main`。

## 本地运行

```sh
git lfs install --local
git lfs pull
npm ci
npm start
```

打开 **http://127.0.0.1:5177**。Node.js ≥22.18。`/notes/`、`/photos/`、`/projects/`、`/resume/` 可以直接访问。热更新：`npm run dev -- --port 5177 --strictPort`（先停止预览）。

## 个人资料展示与更新

网站内的 Mac 只提供备忘录、照片、作品、履历的浏览、搜索和阅读，不提供上传、资料填写、备份或发布入口。公开版忽略旧编辑 URL 与浏览器工作区偏好，也不读取访客的本地草稿。

备忘录已加入 Freddie 椰子的自述；作品应用已加入 CityOS、CourtCast、MindCare AI、MOIRAI 和 Seacoconut IP Skills；照片和履历等待作者提供内容。后续通过协作会话提交文字与照片，整理、校验后更新 `public/content` 并部署。内容来源及操作见 [个人资料展示说明](docs/personal-content/README.md)。

旧本地编辑与完整备份工具保留，仅开发服务器明确打开 `/?editor=local&app=profile` 时可用；生产构建不会启用。原 IndexedDB 没有删除或改写。**保存不等于发布**，完整备份不可提交到公开目录。

## Projects 作品展示

五个项目系列使用真实素材封面与详情画廊，MOIRAI 使用十二张公开分发版原创牌面构成 36 秒连续艺术牌廊。悬停、焦点和手动暂停、Reduced Motion、触摸横滑与大图查看均保留。CourtCast 采用作者本轮提供的三张图片；Seacoconut 的两张工作流图明确为仓库文档截图。

- [作者编辑、备份和发布说明](docs/projects/USAGE.md)
- [逐张素材来源与授权记录](docs/projects/asset-sources.json)
- [素材版权边界](licenses/projects/SHOWCASE-NOTICE.md)

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
