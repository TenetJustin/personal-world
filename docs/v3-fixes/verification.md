# V3 reliability / audio 最终验收

2026-10-26。代码与验证均在本子仓库 `work/deepseek-audit`（分支
`fix/v3-reliability-audio`，基线 `9e63d05`）完成。证据位于父项目
`outputs/v3-fixes/`，不提交到仓库。

## 环境

| 项 | 值 |
| --- | --- |
| 机器 | MacBook Air，Apple M5（10 核 GPU），24 GB 内存 |
| 系统 | macOS 27.0.1 |
| 浏览器 | Google Chrome 155（Playwright Chrome for Testing） |
| 视口 | 1440 × 900，DPR 1（移动验收 390 × 844，DPR 2） |
| 服务器 | `node scripts/serve_local.mjs dist /personal-world/ 5198` |
| 构建 | `VITE_BASE_PATH=/personal-world/ npm run build` |

未记录机器序列号、硬件 UUID 或其他设备标识。

## 自动化

- `npm test`：**53 / 53 通过**。
- `tsc --noEmit`：通过。
- 生产构建：通过。
- `VITE_BASE_PATH=/personal-world/` 构建：通过。
- `check_pages_build.mjs /personal-world/`：5 个静态入口、LFS、PDF 资源通过。
- `validate_public_content.mjs`：1 条原创说明、0 个公开附件、无私人备份。

## 真实浏览器验收

### 多窗口资料保护

| 检查 | 结果 | 说明 |
| --- | --- | --- |
| Notes 未保存 → 打开 Profile | PASS | 两个窗口同时 dirty |
| Profile 存在 dirty 时 Notes 的备份/恢复/审核 | PASS | 三个按钮均 disabled，并显示“其他应用有未保存修改” |
| 保存 Notes 后 Profile 仍 dirty | PASS | 备份仍 disabled |
| 保存 Profile 后 | PASS | 备份/恢复/审核恢复可用 |
| 切换应用后草稿内容 | PASS | 重新打开列表项，标题仍为“跨窗口测试笔记” |
| 干净 Photos 窗口继承其他窗口 dirty | PASS | Photos 自身无修改，但备份按钮保持 disabled |
| 本地工作区跟随应用切换 | PASS | Notes→Photos 仍显示“本地草稿”，`sessionStorage` 为 local |
| 保存后 Photos 备份可用 | PASS | 恢复入口重新可用 |
| 原生离页保护 | PASS（事件层） | CDP `Page.javascriptDialogOpening` 捕获 `type: "beforeunload"`、`hasBrowserHandler: true`；未点击原生按钮，建议真人再目视确认一次 |
| 合成 `beforeunload` | PASS | listener 调用 `preventDefault`，事件被阻止 |

### 导航与门

| 检查 | 结果 | 说明 |
| --- | --- | --- |
| WASD 从楼梯底上二层 | PASS | y 3.02 → 5.90（脚高 4.25），碰撞 `upper-balcony-rail` |
| 二层 → 书桌实际导航 | PASS | 7.1 s 到达 `DESK_READY` |
| 到书桌不自动开电脑 | PASS | 保持 `DESK_READY` |
| 门廊手动关门 | PASS | 1.8 s 后 `door=0`、`doorTarget=0`，未被接近自动重开 |
| 进入 Mac | PASS | `phase=DESKTOP` |
| 屏幕四角投影 | PASS | 最大误差 **0.124 px** |
| 退出 Mac | PASS | 位置误差 0.00000000 m，朝向误差 0.00000000 rad |

WASD 上楼是实际键盘输入；`room/upper/mac/lakeFixed` 性能镜头是 SceneQA
**固定检查镜头**，只用于画质与性能定位，不当作实际行走。

### 环境音

| 检查 | 结果 | 说明 |
| --- | --- | --- |
| 默认静音 | PASS | `enabled=false`、`state=not-started` |
| 点击“开启环境音” | PASS | AudioContext running，室外 RMS ≈ 0.076 |
| 音量滑块 | PASS | 0.42 → 0.20（步长 0.05） |
| 室内混音 | PASS | indoor 1.00 / outdoor 0.12 / fire 0.34 |
| 楼上壁炉衰减 | PASS | fire 0.34 → 0.20 |
| 桌面共用引擎 | PASS | 进入桌面后仍 running，indoor 1.00，无重复音频源 |
| 桌面环境音控件 | PASS | 菜单栏显示“关闭环境音” |
| `visibilitychange` 接线 | PASS（合成） | 模拟 hidden → suspended；恢复 → running |
| 原生切后台暂停 | **未验证** | 自动化中多标签/最小化窗口仍报告 `visible`，无法触发真实原生隐藏；需真人切标签确认 |
| 6 秒音频样本 | 已有 | `outputs/v3-fixes/indoor-ambience.webm/.wav`、`outdoor-ambience.*` |

### 移动端

| 检查 | 结果 | 说明 |
| --- | --- | --- |
| 390×844 无横向滚动 | PASS | scrollWidth = 390 |
| 虚拟摇杆实际位移 | PASS | 按住 1.8 s 位移 2.49 m；松开立即停止 |
| 右侧拖动观察 | 代码存在 | 本轮未单独量化偏航角 |

这是桌面浏览器移动视口 + 触摸事件模拟，不是物理手机 GPU 测试。

### 连续录屏

`outputs/v3-fixes/continuous-lake-to-desk.mp4`：真实有头 Chrome 视口录制，
从湖岸 5 秒等待开始，经小径、门廊、室内到书桌停下；H.264 30 fps，
约 45 s，未加速。另有旧证据 `upper-to-desk.mp4` 为二楼返回书桌。

## 性能

详见 [`performance.md`](./performance.md)。当前 1440×900 固定镜头均约 60 FPS、
p95 17.4–18.3 ms；完整自动引导（实际运动）平均 50.1 FPS、p95 26.3 ms。

## 未验证 / 剩余风险

1. 原生 `beforeunload` 对话框未由真人点击确认；只捕获到浏览器事件。
2. 原生后台标签/最小化暂停未能在自动化中触发；只验证了事件接线与引擎 suspend/resume。
3. Pointer Lock 在自动化窗口可能被浏览器拒绝；拖动观察可用。
4. 移动端是视口模拟，不是真实手机。
5. 室外森林/地表仍是 V2 视觉水平；本轮不声称照片级。
6. macOS 桌面相似度未与真实用户桌面逐像素对照，不声称 95%。
7. 湖岸固定镜头 60 FPS 是当前构建的固定镜头数据，不能与历史 44 FPS 当作同条件提速。
