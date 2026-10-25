# V3 验证记录

2026-10-26。除特别注明外，均为本机真实有头 Chrome（Apple M5 / Metal / 1440×900 / DPR 1）的实测结果。截图与录屏位于 [`evidence/`](./evidence/)。

## 自动化测试

`npm test`：**38 / 38 通过**（Node 26，`node --test`）。

- 自动引导：5 秒计时、隐藏页面不计时、接管保留位姿、终点等待主动点击、取消返回原位。
- 碰撞：关闭门阻挡 / 打开门通过；墙体与高度感知家具；上层家具不阻挡一层。
- 楼梯：15 级真实踏步上下行，无瞬移、无穿透楼板。
- 安全规划：室外 → 门廊 → 门洞 → 一层；二层 → 楼梯 → 一层，必须经过真实踏步。
- 环境碰撞体：薄物体不能穿透。
- 桌面/应用：v1/v2 备份兼容、结构化资料校验、公开导出与隐私字段、图片处理。
- MacBook：30.41×21.50×1.13 cm、2560×1664、13.6" 推导、屏幕四角与模型同源、DOM 单应无漂移。
- 站点：资源哈希、公开包校验、PDF 资源、Pages 子路径。

## 真实浏览器功能

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| 第一人称 WASD 位移 | PASS：1.4 s 移动 2.26–2.40 m（≈1.6–1.7 m/s） | `videos/wasd-look-1440x900.mp4` |
| 鼠标环视 | PASS：拖动 100 px 产生 18.6° 偏航 | 同上 |
| Pointer Lock | **PARTIAL**：自动化窗口被 Web 拒绝（“root document is not valid for pointer lock”）；拖动环视可用，代码已捕获拒绝 | 控制台记录 |
| 上二楼 | PASS：从楼梯底连续 W 到 `position.y = 5.90`（脚高 4.25） | 浏览器采样 |
| 墙体/家具阻挡 | PASS：向壁炉行走停在 cabin-local x≈4.18（壁炉前沿） | 浏览器采样 |
| 真实门洞 | PASS：靠近门廊自动开门，可穿过 | 自动引导录屏 |
| 自动引导 | PASS：5 s 后启动；路线 37.2 s，含等待约 44 s | `videos/auto-guide-1440x900.mp4` |
| 自动引导加速 | PASS：路线段 2.20× V2；含等待 1.97× | `performance.md` |
| WASD 接管 | PASS：位置连续（50 ms 内 2.6 cm，为自动步行本身），路线进度 0.90→0.94 m 继续 | 浏览器采样 |
| 到电脑自动停止 | PASS：`DESK_READY`，不自动打开桌面 | 录屏 |
| 使用电脑时 WASD 不移动世界 | PASS：位移 0.0000 m | 浏览器采样 |
| 退出电脑回到原位 | PASS：位置误差 0.000000 m、朝向误差 0.000000 rad | 浏览器采样 |
| 屏幕四角投影 | PASS：最大角误差 0.081 px（进入过程中） | `screenProjection` |
| 屏幕 → DOM 过渡 | PASS：过渡中点实体屏幕画面与 DOM 预览使用同一绘制函数 | `v3-dock` 过程截图 |
| 桌面 Dock / 多窗口 | PASS：Notes/Photos/Projects/Resume 均可打开，层级正常 | `v3-desktop.png` |
| 窗口拖动/最小化/关闭 | PASS：拖动后位置改变；最小化后 Dock 恢复；关闭保留资料 | 浏览器采样 |
| 天气 Widget | PASS（占位）：显示 “—° / 未连接天气服务”，不编造天气 | `v3-desktop.png` |
| 日历 Widget | PASS：使用本地真实日期，可翻月，无虚构日程 | `v3-desktop.png` |
| 个人资料保存 | PASS：保存后刷新仍读取“林岸 / 环境视觉与交互开发者” | 浏览器采样 |
| 完整备份导出 | PASS：下载 JSON 含 `structuredProfile.about`，格式 `records` | 浏览器采样 |
| 公开内容安全 | PASS：`validate_public_content.mjs` 只含 1 条原创说明，无私人备份 | 命令输出 |
| Pages 子路径构建 | PASS：`check_pages_build.mjs /personal-world/` 5 个静态入口、LFS 与 PDF 资源齐全 | 命令输出 |
| 旧数据兼容 | PASS：v1/v2 备份恢复测试 | `tests/library.test.ts`、`tests/profile.test.ts` |

## 截图

| 文件 | 内容 |
| --- | --- |
| `evidence/v3-lake.png` | 湖岸初始视角（真实浏览器） |
| `evidence/v3-approach.png` | 自动引导接近木屋 |
| `evidence/v3-porch.png` | 门廊与真实门洞 |
| `evidence/v3-room.png` | 一层厨房、餐桌、壁炉 |
| `evidence/v3-upper.png` | 二层卧室、书柜、栏杆与坡屋顶 |
| `evidence/v3-deskview.png` | 书桌与 MacBook 全景 |
| `evidence/v3-mac45.png` | MacBook 45° |
| `evidence/v3-keyboard.png` | 键帽、功能行、触控板近景 |
| `evidence/v3-screen.png` | 显示屏正面 |
| `evidence/v3-desktop.png` | macOS 风格桌面、菜单栏、Dock、Widgets |
| `evidence/v3-profile.png` | 个人资料填写中心 |

## 录屏（真实浏览器视口，非离线渲染）

| 文件 | 时长 | 内容 |
| --- | ---: | --- |
| `evidence/videos/auto-guide-1440x900.mp4` | 44.3 s | 5 秒等待 → 湖岸 → 木屋 → 门廊 → 室内 → 书桌停止 |
| `evidence/videos/wasd-look-1440x900.mp4` | 7.0 s | WASD、拖动环视、E 门 |
| `evidence/videos/mac-to-desktop-1440x900.mp4` | 8.4 s | 桌前 → 屏幕展开 → 桌面 |

录制方式：Playwright 有头 Chrome 视口录制 → H.264 转码（30 fps）。录制本身有编码开销，**不用录屏帧率替代性能采样**。

## 未验证

- Safari / Firefox / Windows / 真实手机 GPU。
- 公网冷缓存首屏；只测本机回环。
- Pointer Lock 的成功路径（自动化环境拒绝）。
- 真实用户 macOS 桌面截图对照，因此不宣称 95% 相似度。
- 完整路线平均 FPS 未达 50（见性能报告），只保证 p95 < 33 ms。
