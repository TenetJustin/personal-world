# Phase 01 · 视觉参考与资产候选（实施前建立）

继承 Phase 00 的米制空间、固定午后光、实时 PBR 近景 + 离线远景路线。本阶段只有木屋外立面、湖岸与两张镜头。最后的照片级判断由用户作出。

## 参考

- [Alps Field](https://polyhaven.com/a/alps_field)：Andreas Mischok，CC0。参考真实山谷、天空与山脊层次；候选超远景 / 环境输入，不能替代可接近岸地。
- [Forest Slope](https://polyhaven.com/a/forest_slope)：Andreas Mischok，CC0。参考林下苔藓、树皮和落针层次；不把晨光原样混入午后光照。
- S01：左侧湖面，右侧偏三分之一木屋；近石 / 草提供尺度；保持自然负空间。
- S02：沿干地小径靠近门廊，原木、屋檐、门窗、基础和材质细节必须成立。不得进入室内。

## 资产候选

| 资产 | 来源 / 权利 | 初始职责 |
| --- | --- | --- |
| Fir Tree 01，variant C | Poly Haven，Rob Tuytel / Rico Cilliers，CC0 | 真实针叶树源网格；源文件为制作级，必须离线处理，不能把原始千万级树群装进网页 |
| Rock Moss Set 01 / 02 | Poly Haven，Kless Gyzen，CC0 | 保留扫描轮廓、苔藓与岩石材质的岸石 |
| Grass Medium 01 | Poly Haven，Rob Tuytel / Rico Cilliers，CC0 | 近岸草丛，避免用普通绿色三角形充当写实植被 |
| Moss 01 | Poly Haven，Rob Tuytel，CC0 | 少量近景苔藓，配合扫描石材 |
| 木材与林地 PBR | Poly Haven CC0，选定后记录具体 ID 与作者 | 木屋表面、落针 / 草土地面，按物理尺寸铺设 |
| 原木小屋外立面 | 本项目原创 Blender 母版与可重复脚本 | 8.4×7m 起点；原木、榫接、屋顶、门廊、基础、封闭窗；没有内部内容 |

所有最终运行文件必须有来源、许可、处理参数与 SHA-256 台账。源资产保存在忽略的 `assets-source/`，导出的必要运行资产用 Git LFS。Poly Haven 权利依据：[CC0 许可](https://polyhaven.com/license)；素材 API 使用独立 User-Agent，最终场景只读取本地资源，不调用外部素材 API。

## 本机验证起点

Apple M5 MacBook Air、24GB 内存、macOS 27.0.1 为本轮实际可用开发机，不代表已确定最低支持硬件。Blender 5.2.2 LTS 后台最小运行已通过；沙箱内启动曾崩溃，后续使用隔离的本地配置与获准进程权限。不得把该问题记录为模型或浏览器测试已通过。

先完成静态 A，再完成静态 B；保存原始浏览器证据及问题修复记录后才进入完整运动与性能调优。无 Bloom、无强景深、不用浓雾掩盖缺陷。
