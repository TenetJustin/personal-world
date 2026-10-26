# 多窗口资料保护与排序修复

2026-10-26。此文件只说明本轮资料组件改动；App 的全局状态与真实浏览器验收由集成阶段记录。

## 接口

- `src/library/draftState.ts`：`DraftWindow`（四应用加 `profile`）、`DraftState`、`DRAFT_WINDOWS`。
- `updateDraftState(state, id, dirty)` 只更新指定窗口；重复相同值保留引用，避免 effect 循环。
- `anyDraftDirty(state)` 用于页面刷新警告及全局菜单。
- `otherDraftDirty(state, id)` 用于各窗口的 `otherDirty`。
- `createDirtyCallbacks(report)` 应在 App 中只创建一次；返回每个窗口独立且稳定的上报函数。
- `Library`、`ProfileCenter` 新增可选 `otherDirty`，默认 false；只控制备份/恢复/审核，不阻止本窗口保存。

`ProfileCenter` 应在本地 IndexedDB 初次读取完毕后挂载。组件已有 `!dirty` 的外部资料同步保护：用户开始输入后，不会因为迟到的外部读取自动覆盖表单。

## 保护行为

- 任意窗口存在未保存内容时，其他窗口的完整备份、恢复和公开审核入口禁用，并显示“先保存其他应用”提示。
- 已打开的发布面板接收所有窗口合并后的 dirty 值，不能导出新公开包。
- 文件选择后、备份编解码前后、确认合并恢复时再次读取最新 dirty 引用，避免异步处理期间状态变化后继续执行。
- 已生成的完整备份再次下载入口在 dirty 期间隐藏。
- 保存期间继续输入的新修改不会被清除：Library 只确认实际写入的那个草稿引用，ProfileCenter 以编辑版本号判断是否有后续输入；后续修改保持未保存，并提示再次保存。
- 完整备份仍使用既有 v2 格式，旧数据兼容、附件原字节往返、公开图片 EXIF 清理均保留。

## 技能顺序

`moveProfileRow` 在移动行时同步重写技能 `sortOrder`；非技能条目不增加额外字段。表单、公开预览和备份恢复采用一致顺序。原有手填 sortOrder 仍有效。

## 已执行验证

- TypeScript `tsc --noEmit` 通过。
- `node --test tests/draft-state.test.ts tests/library.test.ts tests/profile.test.ts tests/publishing.test.ts`：19/19 通过。
- 新增回归覆盖：干净窗口上报不能清除其他窗口 dirty；重复状态引用稳定；技能移动/预览排序/备份恢复一致；其他栏目移动保留字段；异步保存确认保留保存期间的新输入。

真实浏览器还应覆盖：Profile 未保存→Photos→返回→刷新保护；跨窗口备份禁用；两个窗口逐个保存后恢复备份入口；技能上移后预览；首次慢存储读取。以上需由统一集成验收执行，不以单元测试替代。
