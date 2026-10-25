# 本地运行与资料使用

## 启动

要求 Node.js ≥22.18（本机 26.5），Git LFS。固定使用端口 5177，避免浏览器资料散落在不同地址。

```sh
git switch dev/phase-01-exterior
git lfs install
git lfs pull
npm ci
npm start
```

打开 `http://127.0.0.1:5177`。如端口已有本项目服务，直接打开；`--strictPort` 不会悄悄改用其他端口。开发热更新可用 `npm run dev -- --port 5177 --strictPort`（请先停止预览服务）。

无需 Blender 重建即可运行已有 GLB。建筑母版、资产管线和许可证保留在 Phase 01B 文档。旧外景证据工具可通过 `/?study=1&shot=A` 访问，保留截图、相机、性能和 A→B 录屏功能。

## 放入自己的资料

- **Notes**：新建笔记或导入 `.md` / `.markdown` / `.txt`，编辑标题、标签、正文，点击保存。
- **Photos**：导入照片，可一次选择多张（每批最多 100 个）；编辑标题、标签与说明，支持原图和原文件下载。暂不支持 HEIC、RAW 和 EXIF 管理。
- **Projects**：新建项目，填写介绍和 HTTP(S) 网址。使用浏览器新标签打开项目。
- **Resume**：新建文字履历，或导入 Markdown / TXT / PDF。PDF 本地分页阅读，提供辅助文字与原文件下载。加密 PDF 本轮不支持密码输入。
- 各应用支持搜索、阅读、编辑、回收站。窗口关闭 / 最小化不会清除已保存资料。

## 备份与恢复

1. 保存所有未保存修改。
2. 任一应用点击「导出全部备份」，下载包含四个应用、回收站与原附件的 JSON。
3. 把文件放在浏览器之外的安全位置。个人备份不应提交 Git；仓库已忽略 `/personal-data/` 与根目录 `personal-world-*.json`。
4. 新浏览器或新地址打开应用，点击「恢复备份」，选择文件，核对记录数，点击「确认合并恢复」。相同 ID 会被备份替换，其余资料保留。
5. 大容量资料建议先缩小照片，再导入。磁盘或浏览器配额不足时保存失败会明确提示，不会把未提交的修改当成已保存。

清除浏览器网站数据会移除本地库。Private GitHub 仓库保存的是应用与合法场景资产，不会自动备份浏览器中的个人资料。

## 实际验证

`npm test` 检查数据验证、备份字节往返、安全 URL、路由与既有场景资产 / 相机合同；`npm run build` 检查 TypeScript 与生产构建。真实浏览器测试和性能报告见 `03_Verification_Report.md`。

本地诊断：使用说明→生成本地诊断→下载 JSON。户外可显式采样 3D 实际帧时间。诊断不含个人正文和附件；桌面暂停 WebGL，不把暂停状态称为 60 FPS。

## 第三方软件

新增 PDF.js `pdfjs-dist@6.4.299`，Apache-2.0；使用 npm 包的本地 worker / 标准字体 / CMaps / wasm，首次打开 PDF 才加载。API 路线参考 Mozilla 官方例子：<https://mozilla.github.io/pdf.js/examples/>。字体 / CMap 附带许可随包复制到运行资源，保留原有 LICENSE。
