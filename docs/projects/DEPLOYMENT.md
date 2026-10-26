# Projects 部署回执

- 工作分支：`codex/projects-showcase`。
- 已部署代码：`df0a38e6331a29c642466d6295c52ff3965a0cbf`。
- PR：[Projects：五组真实作品与 MOIRAI 连续艺术牌廊 #3](https://github.com/TenetJustin/personal-world/pull/3)。开发分支正常快进后 GitHub 自动标记 merged，无 merge commit 或 force push。
- 开发部署分支：`dev/phase-01-exterior`，由 `bd337bf` 正常快进。
- Actions：[40306947025](https://github.com/TenetJustin/personal-world/actions/runs/40306947025)，build 与 deploy 均 success；58 项测试通过。
- 网站：[Personal World](https://tenetjustin.github.io/personal-world/)，[直接打开作品](https://tenetjustin.github.io/personal-world/projects/)，[MOIRAI 详情](https://tenetjustin.github.io/personal-world/projects/?id=project-moirai)。
- main 保持 `819f15b6a1fdf8c9eb0ad377e357dcd36f825b51`。未修改仓库可见性。

## 线上实测

2026-10-26 18:40（Asia/Shanghai），Microsoft Edge 156.0.4314.42 使用默认传输设置和正常 HTTPS 证书校验，成功完成线上功能复核。五个项目、逐张普通画廊图片、十二张牌预载、大图与键盘、深链接刷新、Reduced Motion、模拟手机横滑均通过；这次成功运行捕获的页面错误和失败请求均为 0。原始报告见 [live-verification.json](live-verification.json)。

此前 Chrome 155 的入口 JS/CSS 请求出现 `ERR_SSL_PROTOCOL_ERROR`；Edge 第一次进入也未显示预期页面，正常重试后成功。保留 [首次 TLS 诊断](initial-tls-diagnostic.json)，不把传输故障包装成应用通过，也不声称所有浏览器／网络都可立即加载。没有忽略证书或修改用户浏览器设置。

线上补录的自动滚动取景在回看中离开了牌廊，未作为正式连续循环交付；正式视频使用同一最终生产构建在本地 Chrome 单独拍摄，并显式检查完整牌面位于视口内。功能验收与录屏视觉验收分别记录。

后续文档回执提交不改变已部署的运行时代码；`docs/**` 在现有工作流中不触发重复部署。
