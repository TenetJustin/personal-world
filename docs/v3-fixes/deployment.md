# 部署与线上复核

2026-10-26。

## 部署

| 项 | 值 |
| --- | --- |
| 线上地址 | <https://tenetjustin.github.io/personal-world/> |
| 部署提交 | `ce151fb94d285cb80d5cb55750e9aeffea889219` |
| 分支 | `dev/phase-01-exterior`（从 `9e63d05` 正常快进，无 force push） |
| 工作流 | Build and deploy Personal World #40271672188 |
| 结果 | build **success**（04:57:38Z）+ deploy **success**（04:57:52Z） |
| PR | [#1](https://github.com/TenetJustin/personal-world/pull/1)（GitHub 因快进而标记 merged；未执行 merge commit） |
| main | 未合并、未修改 |

## 线上静态检查

| 检查 | 结果 |
| --- | --- |
| TLS 证书校验 | `ssl_verify_result=0`，HTTP/2 200（curl 默认校验，未跳过证书） |
| 入口 bundle | `assets/index-D3DSSCwy.js` |
| `/notes/` 深链 | 200 |
| `cabin-v3-shell.glb` | 200，`content-type: model/gltf-binary`，13,903,316 B |
| 公开内容 | 1 条原创站点说明，无私人资料 |

## 线上真实浏览器

网络环境对 GitHub Pages 的 HTTP/2/TLS 存在间歇性异常，和前一轮记录的 TLS
加载问题一致。没有关闭证书校验、没有使用 `ignoreHTTPSErrors`。

- Chrome 155 多次加载在资源阶段停滞，并出现 `net::ERR_SSL_PROTOCOL_ERROR`；
  同一 URL 的 curl HTTP/1.1 可正常完成，说明不是 Pages 404 或证书被绕过。
- Microsoft Edge 156（Chromium，正常 h2/TLS）重试第 3 次成功：**21.4 s** 场景就绪。
- 成功加载后：
  - `cabin-interior-v3.glb`、`cabin-v3-shell.glb`、`fir/rocks/grass/door` 全部 `decoded`；
  - `runtime.errors` 为空；
  - “开启环境音”后 AudioContext running，室外 RMS ≈ 0.051；
  - 进入 Mac 桌面成功，`screenProjection.valid=true`；
  - `/notes/` 标题 `Notes · Personal World`，公开正文可读；
  - 截图：`outputs/v3-fixes/verified-live-lake.png`、`verified-live-desktop.png`。

## 结论与限制

- 部署本身成功，线上资源与代码均为 `ce151fb`。
- “能完整加载”已在正常 Edge 浏览器中验证；但不能声称“每次都能立即加载”。
  在本机网络下需要重试，异常发生在 TLS/HTTP 协议层，与证书校验无关。
- 未在 Safari/Firefox/真实手机网络复核。
- 不声称照片级或 95% macOS 相似度已通过人工验收。
