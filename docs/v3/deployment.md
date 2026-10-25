# V3 线上部署与 Pages 验证

2026-10-26。

## 部署

| 项 | 值 |
| --- | --- |
| 线上地址 | <https://tenetjustin.github.io/personal-world/> |
| 部署提交 | `a533be19edbe4b1efa8a452a2bf0a918c0b99314` |
| 分支 | `dev/phase-01-exterior`（从 `aba5377` 快进，无 force push） |
| 工作流 | [Build and deploy Personal World #4](https://github.com/TenetJustin/personal-world/actions/runs/40228468805) |
| 结果 | build **success**（2026-10-25T19:57:57Z）+ deploy **success**（19:58:12Z） |
| 构建环境 | GitHub Actions Ubuntu，Node 24，`VITE_BASE_PATH=/personal-world/`，LFS checkout |

工作流实际执行的关卡全部通过：

1. `npm ci`
2. `node scripts/validate_public_content.mjs`（1 条原创说明，0 个公开附件，无私人备份）
3. `npm test`（38/38）
4. `configure-pages`
5. `VITE_BASE_PATH=/personal-world/ npm run build`
6. `node scripts/check_pages_build.mjs /personal-world/`
7. `upload-pages-artifact` + `deploy-pages`

## 线上真实浏览器复核

无痕新会话、1440×900、Chrome for Testing（Apple M5 / Metal）：

| 检查 | 结果 |
| --- | --- |
| 首页 HTTP | 200，`last-modified` 已更新 |
| 入口脚本 | `assets/index-JT8JqGBy.js`（新构建） |
| 场景就绪 | 6.6 s（本机网络，非公网冷缓存基准） |
| 资源阶段 | `cabin-interior-v3.glb`、`cabin-v3-shell.glb`、fir/rocks/grass/door 全部 `decoded` |
| 运行时错误 | 0 |
| 进入桌面 | `phase=DESKTOP`，Dock / 菜单栏 / 窗口正常 |
| 天气 | “未连接天气服务 / —°”，无虚构数据 |
| 深链 `/notes/` | 200，标题 `Notes · Personal World` |
| 截图 | [`evidence/live-pages-lake.png`](./evidence/live-pages-lake.png)、[`evidence/live-pages-desktop.png`](./evidence/live-pages-desktop.png) |

## 说明

- V2 的四个内容入口、备份与发布机制仍然可用；没有导入任何真实个人资料。
- 部署只通过既有 Pages 工作流，没有手动上传构建产物，也没有合并 `main`。
- 页面仍保留 `?debug=1` 验证入口；正常访问不暴露调试对象。
- 部署后本地继续新增的 `docs/**` 变更不会触发 Pages（工作流设置了 `paths-ignore`）。

## 回退

若需回退：将 `dev/phase-01-exterior` 指回 `aba5377` 后重新运行工作流（不要 force push 其他开发分支）。V2 的完整历史仍在 `aba5377` 及其父提交。
