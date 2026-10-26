# 只读 Mac 与个人自述验收

2026-10-26。基于 DeepSeek 已部署的 ce151fb 及部署文档 3f850b0，独立工作分支 `codex/personal-content-viewer`。不改 main、不改仓库可见性。

## 技术检查

- `npm test`：55/55，含原 53 项回归与生产环境拒绝旧编辑参数、开发环境显式启用编辑的两项检查。
- TypeScript、Vite 生产构建通过。既有 Three.js 共享块大小警告保留；未更改渲染资产或承诺帧率提升。
- 公开内容校验：1 篇自述，0 个附件，无完整备份。
- Pages 子路径校验：5 个静态入口，LFS 资源已展开，PDF 资源存在，无根路径资产引用。
- `git diff --check` 通过。

## 真实浏览器

本机安装的 Chrome 155.0.8059.85，独立临时浏览器上下文，1440×900 桌面与 390×844 模拟手机视口；不是实体手机测试。生产构建从 `/personal-world/` 子路径读取公开清单。

执行 `node scripts/verify_viewer.mjs <base> <output-directory>`，真实 UI 验证：

1. 预置旧 sessionStorage 工作区偏好，使用 `?editor=local&workspace=local&app=profile`，仍显示只读备忘录与自述。
2. 搜索正文、无匹配状态、清除搜索恢复阅读。
3. 文件菜单只有四个展示应用及浏览说明；控制面板与帮助没有作者操作。
4. Dock 逐一打开照片、作品、履历、备忘录；全部没有 file input、填写表单、上传、新建、备份或公开审核入口。
5. 手机视口可从正文返回列表，再打开自述；避免默认首篇预览使“返回列表”失效。
6. 照片独立路由加旧编辑参数仍展示真实空状态。

捕获到的页面异常与失败请求均为 0。原始截图与 JSON 存在本机 outputs/personal-content，未将临时测试输出提交仓库。

## 内容边界

作者要求从“撰写自我介绍”会话填写网站。使用接口实际可读的用户文字与截图整理新版本，未声称拿到了助手回复的完整原文。未发布会话截图、精确居住地区、联系方式、虚构项目或学历；相册尚未收到个人照片。

## 部署与线上复核

- 代码提交 `afc5c1bafaa75a35df8619028f175c5f7ba06106`，PR #2：https://github.com/TenetJustin/personal-world/pull/2 。开发分支正常快进后 GitHub 自动标记 merged；无 merge commit、force push 或 main 合并。
- Actions：https://github.com/TenetJustin/personal-world/actions/runs/40278500715 ，build 与 deploy 均 success。
- 线上：https://tenetjustin.github.io/personal-world/ ，直接阅读：https://tenetjustin.github.io/personal-world/notes/ 。
- 2026-10-26 14:14（Asia/Shanghai），Chrome 155.0.8059.85 对上述线上地址完整执行相同 11 项实际 UI 检查，全部通过，页面异常和失败请求均为 0。未绕过证书；这是本次复核结果，不代表所有网络都无加载延迟。
- main 仍为 `819f15b6a1fdf8c9eb0ad377e357dcd36f825b51`；未改动仓库可见性。截图与 JSON 位于本机 outputs/personal-content/live，未入库。
