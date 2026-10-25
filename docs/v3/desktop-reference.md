# Desktop V3：视觉参考、实现与截图校准

2026-10-26。当前为基于官方公开资料制作的原创 macOS 风格 Web 桌面。没有用户真实桌面截图，**不宣称达到 95% 相似度**，也不模拟操作系统底层能力。

## 实际观察的官方参考

已在真实 Chrome 浏览器打开并查看以下 Apple 官方原图：

- [macOS 27 官方页面](https://www.apple.com/os/macos/)
- [Mail 窗口与工具栏原图](https://www.apple.com/v/os/g/images/macos/improvements/search__gca3sckqsxym_large.jpg)：观察紧凑菜单栏、中性浅色边到边侧栏、三色控制点、圆角与窗口细阴影。
- [显示屏与多窗口原图](https://www.apple.com/v/os/g/images/macos/highlights/type__beeb42vb1tpu_large.jpg)：观察顶部状态密度、浮动窗口前后关系和工具栏内边距。
- [壁纸与浮动玻璃原图](https://www.apple.com/v/os/g/images/macos/highlights/siri__mfeve50fboii_large.jpg)：观察大尺度柔和曲面、半透明边界与局部高对比阅读表面。

上述图片仅远程浏览作视觉研究，未下载、打包、描摹为产品贴图或复制 Apple 图标。没有声称页面截图包含用户本人桌面配置。

## 原创资产与组件

`public/desktop-v3/lake-silk.svg` 是原创蓝绿与暖金湖岸曲面壁纸；Notes、Photos、Projects、Resume、Profile 图标均为本项目重新绘制 SVG，未使用 Apple 图标、Apple 壁纸、Apple 商标或 SF Symbols 包。系统字体使用设备现有字体，不分发 Apple 字体文件。

`src/ui/DesktopV3.tsx` 管理窗口、菜单、Dock 和 Widgets；`renderApp(kind)` / `renderProfile()` 接入原有真实 DOM 资料应用，不另建资料模型或数据库。各窗口首次打开后保持挂载；关闭与最小化只隐藏，以保留输入。支持层级、拖动、右下角尺寸调整、最大化、恢复、显示桌面、Dock 邻近放大及运行标记。窄屏窗口铺满可用空间，保留菜单状态与 Dock。

天气组件在未接入真实 API 时只显示“—° / 未连接天气服务 / 不读取定位”，不再展示虚构的 18° / 20° / 12°；地点标签为“湖畔 · 场景演示”。Wi-Fi 与电池同时标记 DEMO，并提供说明面板，未读取真实硬件状态。菜单时钟及月历使用访客本地 Date / 时区；日历可翻月、选择日期、回到今天，不虚构日程。实体 MacBook 屏幕使用同一套“未连接天气服务”占位。

默认访客模式显示公开只读内容。本地编辑工作区有明确入口与标记，仅代表当前浏览器草稿编辑，不冒充管理员登录或远端权限。

## 组件级真实浏览器检查

独立临时 harness `work/desktop-v3/` 没有个人数据或发布动作。Chrome 实际观察确认：窗口关闭/Dock重开、最小化/恢复均保留测试输入；最大化/还原；拖动后位置实际变化；多窗前后层级；显示桌面；月历切换至11月、选日期、今天回到真实10月26日。390×844 临时视口中窗口、Dock、两个 Widgets 均可见，检查后恢复浏览器视口。

这些是 Codex 阶段的组件级验证。DeepSeek 接手后已把 `DesktopV3` 与 `ProfileCenter` 真正挂到 root `App.tsx`，并用集成后的真实 Library 重新验证窗口、资料保存/备份、屏幕四角展开；最新截图见 [`evidence/`](./evidence/)，结论见 [`verification.md`](./verification.md)。

## 用户截图校准指南

后续可提供一张正常分辨率、没有缩放的真实 Mac 桌面截图。建议先隐藏私人文件名、邮箱、日历事件与通知；不需要公开个人资料即可校准。理想对照包含菜单栏、Dock、一个普通应用窗口和 Widgets。另提供屏幕分辨率、浏览器缩放、系统显示缩放及 macOS 版本。

依次人工对照：菜单栏高度与应用菜单密度 → Dock 图标尺寸/排列/底座 → 窗口圆角/阴影/工具栏 → 侧栏宽度和字号 → Widget 尺寸/位置 → 壁纸主色和玻璃透明度。对照双方同一画布尺寸，可采用透明叠加观察位置和轮廓偏差；不要用一个像素相似分数代替交互与主观视觉审查。

仍需校准：真实用户 Dock 排列与壁纸偏好、不同系统版本的玻璃表现、系统原生窗口菜单细节、实体手机手势以及 Safari 渲染。Web 内容窗口并非真正 macOS 系统窗口。
