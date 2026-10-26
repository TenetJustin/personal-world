# 新增资产与许可（v3-reliability-audio）

2026-10-26。本轮只新增原创模型源文件、原创程序音频和代码；没有引入第三方
图片、录音、字体、Apple 产品素材或收费资产。

## 新增仓库资产

| 文件 | 大小 | 来源 / 作者 | 许可 | 说明 |
| --- | ---: | --- | --- | --- |
| `assets/architecture/macbook-air-m5-v3.glb` | 3,472,488 B<br>SHA-256 `a9031641…` | 本项目原创运行模型的导出；模型代码 `src/scene/MacBook.tsx` / `macbookModel.ts` / `macbookKeyboard.ts` | 项目原创 | 仅作可编辑/审查资产；运行时**不下载**，仍使用参数化 TS 模型 |
| `assets/architecture/macbook-air-m5-v3.blend` | 3,248,542 B<br>SHA-256 `b4ef7bc1…` | 本项目原创；Blender 5.2.2 导入上述 GLB 后保存 | 项目原创 | 122 个对象、27,892 mesh faces；可由 `scripts/import_macbook_master.py` 重做 |

两个文件均由 `.gitattributes` 的 `*.glb` / `*.blend` 规则进入 Git LFS。

GLB 内嵌的 4 张 PNG 是运行时生成的原创桌面预览与键帽字符画布，不含 Apple
壁纸、Apple 图标、SF Symbols、Apple 字体文件或产品照片。尺寸参考仅来自 Apple
公开规格页（<https://support.apple.com/en-us/126320>）与产品页外形观察，未下载
或再分发其中图片。

## 程序音频

`src/audio/ambience.ts` 使用 Web Audio 合成：

- 粉/棕噪声、滤波器、LFO、正弦鸟鸣与不规则壁炉噼啪；
- 没有第三方录音、音乐、样本库、麦克风输入、外部 API 或网络请求；
- 室内/室外混音与音量均由本项目代码生成。

许可见项目原创代码；没有新增音频文件进入运行时。`outputs/v3-fixes/` 中的
6 秒室内/室外样本是对该合成输出的录制证据，不是第三方素材。

## 代码与依赖

- `src/vendor/Water.js` 仍是 Three.js examples 的 MIT 代码，只增加反射缓存逻辑。
- `playwright-core` 已在前一轮作为 devDependency 加入（Apache-2.0），仅用于
  浏览器截图/性能采样，不进入运行时产物。
- 没有新增运行时依赖。

## 不是本轮引入的内容

- V2/V3 既有的 Poly Haven CC0 贴图、原创建筑/室内 GLB、桌面 SVG 等，许可记录
  继续以 `docs/phase-01/asset-sources.json`、`docs/phase-01b/asset-sources.json`、
  `docs/v3/licenses.md`、`licenses/` 为准。
- 公开内容仍只有 1 条原创站点说明，没有真实个人资料或测试备份。
