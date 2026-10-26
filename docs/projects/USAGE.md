# 添加、编辑和发布项目

公开网站的 Mac 仍是纯展示界面。作者的上传、备份和审核工具保留在本地开发模式，不出现在访客的 Dock、菜单或帮助中。

## 修改已有作品

1. 在仓库执行 `npm ci`，然后 `npm run dev`。打开终端给出的本机地址，进入 `/projects/?editor=local&workspace=local`。部署子路径为 `/personal-world/` 时在此前缀后添加 `projects/`。
2. 选择“复制公开项目为本地草稿”。先保存所有应用的修改；复制操作会提示相同 ID 被替换，其他本地资料保留。图片将在这一步实际下载到 IndexedDB，离线备份不会依赖临时链接。
3. 在项目列表选择作品，点击“编辑”。原有标题、正文、项目详情、技术和链接继续使用；“作品展示与画廊”增加副标题、团队署名、上游、封面、图片说明、来源、版本和许可。
4. 普通项目选“项目截图”。需要连续牌廊时选“连续艺术牌廊”，上传真实牌面，并依次勾选 8–12 张精选。可选 25–60 秒周期；默认 36 秒。全项目最多 32 张图，可同时包含牌面与界面截图。
5. 保存后“预览作品展示”。预览沿用真实草稿数据；“返回本地编辑”继续修改。
6. “导出全部备份”仍使用 v2，包含所有正文、图片字节和新元数据。v1/v2 旧记录没有展示元数据时按普通截图项目展示。请保护可能含私人资料的完整备份，不提交 Git。

## 新增项目

在本地 Projects 新建项目，填写真实介绍、参与／二次开发角色与技术。使用项目图片控件上传图片；在展示设置中选择封面并写明图片类型：项目界面、前端原型／演示数据、原创牌面／角色、工作流文档。没有真实素材时保持待补图状态。移除图片会同步清理封面与牌廊引用。

## 发布

保存所有窗口后，按原流程“审核公开内容”逐项选择可公开记录、明确确认，再导出公开内容包。该选择会替换网站当前整套公开资料，请同时保留要继续展示的自述、项目等记录。执行：

```sh
node scripts/import_public_content.mjs /path/to/reviewed-public-package.json
node scripts/validate_public_content.mjs
npm test
VITE_BASE_PATH=/personal-world/ npm run build
node scripts/check_pages_build.mjs /personal-world/
```

检查 `public/content` 差异与许可证，提交独立工作分支，再按正常快进流程更新 `dev/phase-01-exterior`。不要合并 main。静态清单与哈希资产让全新访客无需 IndexedDB 即可查看作品；完整备份不是公开内容包。

## 初始素材重建

本轮种子文字在 `scripts/showcase_catalog.mjs`。素材处理脚本为 `scripts/build_showcase_content.mjs <raw-directory> --reviewed`，通过相同公开导入校验器写入内容，而不是绕过审核的第二套发布系统。`--reviewed` 只在实际确认资料与授权后传入。原始素材及测试备份保存在忽略的 work 目录；CourtCast 原图由作者提供，不能凭文件名假造或替换成历史页面。
