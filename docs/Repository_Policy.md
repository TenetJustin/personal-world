# 仓库与大型资产策略

仓库：`TenetJustin/personal-world`，仅允许 **Private**。未经用户另行批准，不得修改为 Public，不得启用 GitHub Pages 或公开部署。

`main` 保留 Phase 00 基线；Phase 01 开发在 `dev/phase-01-exterior`。首次提交只包含 README、七份规划、本策略及 Git 忽略 / LFS 配置。不要执行 `git add .` 纳入研究目录。

## Git LFS

运行时 GLB、HDR / EXR、KTX2、图像、录屏等二进制按 `.gitattributes` 使用 Git LFS。克隆后运行 `git lfs install --local` 和 `git lfs pull`。使用 GitHub 当前账号已有的 LFS 配额，不自动购买额外存储或带宽；配额错误须明确报告。

大体积 Blender 母版、原始扫描、下载源文件默认放在被忽略的 `assets-source/` 或 `assets-src/`。这只是本地生产缓存，不声称已被远程备份。可重复的建模 / 处理脚本、资产来源清单、导出参数、SHA-256 和必要运行时产物应纳入版本管理。需要外部私有对象存储时，先确定账号、成本与访问边界；当前不创建云存储、不上传私人资料。

没有合法授权的模型、贴图、代码、参考照片或音频不得进入运行时资产清单。Phase 00 `work/research/` 中的公开源码只用于研究，整体排除在 Git 外。

## 提交检查

提交前检查实际暂存列表、文件大小、密钥模式、LFS 指针和资产许可。`.env`、令牌、私钥、用户设备唯一标识、缓存、依赖、研究快照和临时输出不提交。只记录验收必要的设备型号 / GPU / OS / 浏览器版本，避免保存序列号和硬件 UUID。

每次推送后比较本地 HEAD 与远端 branch ref；首次推送同时确认 `visibility=PRIVATE`、`main` 为默认分支、两个 branch 均存在。不得把认证或网络错误描述为推送成功。

## MVP / Phase 01B 补充

当前原创建筑母版 `assets/architecture/*.blend` 是明确纳入 LFS 的例外，已在 Phase 01B 检查点保存；下载的完整原始扫描仍在忽略缓存中。新增 PDF.js 6.4.299 为 Apache-2.0，包内标准字体 / CMap / wasm 许可随本地运行资源保留。简化家具和桌面图标为本项目原创。

浏览器 IndexedDB 中的个人资料、导入原文件及用户备份不属于应用源码，不应提交或推送。备份建议放在仓库之外；`personal-data/` 与根目录 `personal-world-*.json` 已忽略。无账户或云存储，不公开个人内容路由。
