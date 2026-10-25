# GitHub Pages 构建与发布

2026-10-25 的 Sprint V2 授权取代此前的 Private / 禁止部署约束。已实际读取 GitHub 元数据，确认 `TenetJustin/personal-world` 为 Public，默认分支仍为 `main`；开发与部署源为 `dev/phase-01-exterior`，不合并 main。

## 发布流程

`.github/workflows/pages.yml` 仅接受该开发分支的 push / workflow_dispatch。流程依次读取 Git LFS 实际资产、安装锁定依赖、验证公开内容、执行测试、以 `/personal-world/` 构建、检查静态入口与 PDF / 3D 路径、上传静态 dist、通过 GitHub Pages OIDC 发布。没有前端 Token、账户数据库或访客写入 API。

GitHub Pages 设置应选择 **GitHub Actions**（`build_type=workflow`）。`github-pages` 环境仅允许 `dev/phase-01-exterior` 部署。部署作业的 `page_url` 与 Pages API 的 `html_url` 是最终地址来源，不能把预期网址当作已经发布成功。

```sh
# 开发者：已审查公开内容包后导入；不能传完整备份。
node scripts/import_public_content.mjs /仓库之外/已审核公开内容包.json
node scripts/validate_public_content.mjs
npm test
VITE_BASE_PATH=/personal-world/ npm run build
node scripts/check_pages_build.mjs /personal-world/

# 严格静态本地预演，不使用 SPA 回退掩盖不存在的文件。
STATIC_ONLY=1 node scripts/serve_local.mjs dist /personal-world/ 5178
# 打开 http://127.0.0.1:5178/personal-world/notes/ 并刷新。
```

提交前检查 `git diff -- public/content`。公开 manifest 与附件进入 Public Git 历史；删除当前文件不会让旧提交消失。只有经明确逐项审查的资料才可提交。默认空清单意味着外部访客看到可用的应用和空内容提示，不会读取制作者浏览器里的本地草稿。

## 子路径与静态路由

`src/site.ts` 统一生成资源和站点链接。`assetURL('assets/cabin.glb')` 在 Pages 为 `/personal-world/assets/cabin.glb`，本地根路径构建为 `/assets/cabin.glb`。图片、PDF 字体 / CMap / wasm 和公开资料必须通过相同 base。切勿把 `'/assets/…'` 或 `'/notes/'` 写死在组件中。

构建生成 `/notes/index.html`、`/photos/index.html`、`/projects/index.html`、`/resume/index.html`，因此直达与刷新得到真正的 HTTP 200。单条资料以 `?id=` 选择；已发布记录也生成历史 `/kind/id/index.html` 入口。`404.html` 仅提供旧书签的可操作降级，不被用来伪造正常路由的成功响应。

入口页面与资源中均无服务端密钥。HTTPS 由 GitHub Pages 证书与设置提供。浏览器本地草稿属于当前 origin，`localhost` 与 Pages、不同浏览器之间不共享；迁移必须使用备份恢复。公开记录从 `content/manifest.json` 读取，全部访客共享。

## 自定义域名（未来）

有域名且用户批准后，在 Pages Settings 配置域名与 DNS，并将构建变量改为 `VITE_BASE_PATH=/`。不要仅添加 CNAME 就认为域名已配置；GitHub 官方文档要求在设置或 API 中配置域名。迁移 origin 之前先备份本地草稿。当前没有注册域名或改变 DNS。

## 故障检查

- 构建失败：先检查公开包验证、测试和 LFS 下载配额；不要把 LFS 文本指针当作模型发布。
- 内容为空：检查是否导入并提交了经过审核的公开包；本地保存不会自动发布。
- 资源 404：检查构建 `VITE_BASE_PATH`、dist 下实际文件、页面 Network 与静态检查结果。
- 部署被环境拒绝：确认 `github-pages` 允许本开发分支，而非要求合并 main。
- 权限问题：Pages 作业需要 `pages: write` 与 `id-token: write`；构建仅需 `contents: read`。

官方依据：[自定义 Pages 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[发布源配置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)、[Pages REST API](https://docs.github.com/en/rest/pages/pages)、[静态 404](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site)。均于 2026-10-25 查阅。
