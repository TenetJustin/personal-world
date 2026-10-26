# MacBook 细节与屏幕标定修复

参考：[Apple M5 13 英寸规格](https://support.apple.com/en-us/126320)与[官方产品页](https://www.apple.com/macbook-air/)。实际查看银色正面/机身及侧面端口产品图，只用于观察，不下载或再分发图片。

- 独立键帽仍为 ANSI 78 键；12 个全高 F 键保留。新增 `macbookKeyboard.ts` 提供键帽中心和贴图共同使用的米制范围，解决前 3 排字符超出画布与文字落点偏移；字母行按访客左到右排列。
- 四个方向键改成半高倒 T，Touch ID 有圆形金属边缘和内凹黑色传感器；键帽高度降至 0.9 mm，避免原先 3.2 mm 的厚键帽。
- 左侧独立 MagSafe（五触点）、两个 USB-C（独立内舌），右侧圆形耳机插孔；去掉与 Air 外观不符的两条键盘侧边大扬声器槽，保留转轴旁细缝。
- 黑色显示边框、相机镜头朝向与实际显示面一致；缺口有明确尺寸。
- `MACBOOK.screenPlaneZ` 是真实显示面的深度，`MACBOOK_SCREEN` 将它和倾角一起变换；四角、中心、法线与实际 Mesh 矩阵一致，原来漏算的 1.94 mm 深度已包含。
- `MacBook` 新增可选 `finish` 参数（silver / skyBlue / starlight / midnight），也允许 `bodyColor` 自定义；默认银色，上层现有调用不变。颜色是原创材质近似，不声称精确色差还原。

验证：`node --test tests/macbook.test.ts` 5/5 通过；包括所有键的贴图范围/物理落点、倒 T 布局、实际 lid × face 矩阵与屏幕四角/法线的一致性。TypeScript 检查通过。真实浏览器近景、材质与屏幕过渡由集成验收统一检查，未将自动测试作为视觉验收。

本轮沿用可维护的程序模型，不生成新的外部贴图、字体或 Apple 素材，不增加第三方资产。独立 Blender/GLB 母版仍属于后续资产生产项；不把这个程序模型伪称为 Blender 交付。

## Editable export added during integration

`assets/architecture/macbook-air-m5-v3.glb` is exported from the actual corrected
browser model via the explicit SceneQA export button; the original screen/legend
canvas textures are embedded. Blender 5.2.2 imported this source and saved
`assets/architecture/macbook-air-m5-v3.blend` (122 editable scene objects,
27,892 mesh faces). `scripts/import_macbook_master.py` reproduces that import.
These are source/review assets only; the runtime continues to use the canonical
parametric TS model and does not download these extra files. No offline render
is used as browser verification. No Apple photo, logo or font file is included.
