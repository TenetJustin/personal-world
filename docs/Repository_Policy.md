# 仓库、公开内容与大型资产政策

2026-10-25 Sprint V2 中，用户明确说明已将 `TenetJustin/personal-world` 改为 **Public**，并授权通过当前仓库部署 GitHub Pages。这替代 Phase 00 / MVP 时仅限 Private、禁止公开部署的历史约束。远程已实际确认为 Public；没有由代理修改仓库可见性。

`main` 继续保留 Phase 00 基线。开发与 GitHub Actions 发布均来自 `dev/phase-01-exterior`；不合并 main，不为了部署修改默认分支。

## 资料边界

源码和 `public/` 中的文件属于公开发布范围。浏览器 IndexedDB 中的草稿、照片、PDF、完整备份默认私密，不随保存自动提交或上传。公开流程为：本地草稿 → 逐项选择并审查 → 导出公开内容包 → 命令行导入 `public/content/` → 检查 diff → 提交 → Actions 构建发布。

完整备份与公开包采用不同格式。导入脚本拒绝完整备份、非白名单字段、非本地附件路径或不匹配的文件头。CI 再次校验公开清单、哈希及未引用附件。当前仅发布原创站点使用说明；不能把“仓库已 Public”解释成“真实私人资料已获公开批准”。不在前端存放 GitHub Token。

备份放在仓库外。`personal-data/`、根目录 `personal-world-*.json`、`.env*`、缓存、依赖、研究输出均已忽略。提交使用明确列表；不要执行 `git add .` 把未知文件纳入。

## Git LFS 与许可

运行时 GLB、HDR / EXR、KTX2、图像、录屏、以及明确保留的 `assets/architecture/*.blend` 母版，按 `.gitattributes` 使用 Git LFS。克隆后执行 `git lfs install --local`、`git lfs pull`。Actions checkout 开启 LFS。不得自动购买额外存储或带宽；配额错误须如实报告。

完整原始扫描与生产缓存保存在忽略的 `assets-source/` / `assets-src/`。可复现处理脚本、来源 / 许可证、哈希及必要运行时产物入库。当前环境资产为 Poly Haven CC0，建筑与简化家具为原创；电影照片只作为外部参考链接，不复制为运行时资产。PDF.js 为 Apache-2.0，相关运行资源保留许可。

## 提交与部署检查

当前文件与所有可达 Git 历史都需检查密钥、私钥、设备唯一标识、私人备份及未经授权资产。`scripts/audit_public_history.py` 扫描每个可达 blob 与本地 LFS 实体，报告不输出匹配值；它是模式审查而非绝对安全证明。发现真实凭据时应报告并轮换、清理历史，不能仅删除当前文件。

只记录测试必要的设备型号 / GPU / OS / 浏览器版本，不提交序列号或硬件 UUID。提交后比较本地与远端 branch ref，确认 main 未改；部署成功以 GitHub 返回的 Pages 地址与真实浏览器验证为准。历史 Private 策略、Phase 00 七份规划与既有验收报告保留其原始时间语境，不反写为新授权。
