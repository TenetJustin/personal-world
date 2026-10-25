# Phase 01B · 建筑参考与设计拆解

状态：设计候选，待浏览器和用户人工视觉验收。基线 `5c2437d`，本地回退标签 `phase-01-baseline-5c2437d`。本轮不进入 Phase 02，不合并 main，不公开部署。

## 实景来源与观察

已阅读用户指定的 [FOX 5](https://www.fox5atlanta.com/news/tony-starks-cabin-from-avengers-endgame-can-be-rented-on-airbnb)、[House Beautiful](https://www.housebeautiful.com/lifestyle/a27919085/tony-stark-cabin-avengers-endgame-airbnb/)、[Movie Locations](https://movie-locations.com/movies/a/Avengers-Endgame.php)。FOX 报道为三卧室三浴室的真实住宅；Movie Locations 确认 Bouckaert Farms 的 Guest Cabin / Big Lake 外景。House Beautiful 文章图片署名 Airbnb，其网页本次在浏览器遇到 SSL 协议错误；文字可读取，图片不能据此声称已看见。

为实际检查建筑，另在真实浏览器查看 [ABC / Good Morning America 外景图](https://s.abcnews.com/images/GMA/gma-tony-stark-cabin-avengers-endgame-1-ht-jcl-190612_hpEmbed_4x3_992.jpg?w=992) 和 [Casa Vogue 背侧图](https://casavogue.globo.com/Interiores/casas/noticia/2021/08/cabana-de-tony-stark-em-vingadores-ultimato-pode-ser-alugada-por-r-4200.html)。图片只供来源链接 / 研究参考，不复制进运行时贴图或作为可再分发资产。参见输出参考板 HTML。

| 可见证据 | 转化为本项目设计 | 不作的推断 |
| --- | --- | --- |
| 陡坡金属主屋顶，突出正面山墙式老虎窗 | 一层半住宅，两个不同宽度的老虎窗，真实切开的主屋顶与泛水 | 不声称精确测绘电影房屋尺寸 |
| 低门廊屋面包围主体，连续木柱和细栏杆 | 前廊深 2.5m，两侧延伸 2.2m，独立梁柱和转角斜脊 | 不把悬空薄屋面当完整门廊 |
| 高石烟囱从屋面穿出，低处连续石基 | 一座有实体截面、收分和压顶的石烟囱，石砌坡地基础 | 背面构造与烟道内径为本项目设计 |
| 暗木墙、暖色石材、深色屋顶；窗处于深檐下 | CC0 木 / 石 PBR，真实洞口与框、非金属玻璃、细金属屋面缝 | 不使用电影 / 新闻照片做纹理 |
| 草坡与高树围合，房屋比树林小很多 | 建筑保持米制，树分龄分群，近景保留不齐草、湿岸与岩石 | 北欧针叶林与山湖为本项目的环境改编 |

## 米制原创建筑方案

- 主体平面 12 × 9m，主层地坪 +1.35m，楼层预留标高 +4.25m，膝墙 / 主檐约 +5.1m，屋脊约 +8.5m。净空间留空，无室内装饰、家具或应用开发。
- 外墙厚约 0.28m；按门窗区间切断墙体，窗洞不是贴在封闭墙面的黑片。地面层门净宽 1.12m、高 2.28m；主要窗 1.5–1.8 × 1.5–1.65m。
- 主屋顶沿建筑长向设脊，正面两处老虎窗；门廊使用连续的低坡三面屋顶，转角斜脊与主体错层。屋面有厚度、封檐、立边、滴水边与泛水。
- 梁柱落在石墩 / 石基上，门廊地板逐块铺设；1.0m 栏杆、立柱和扶手，入口留台阶缺口；台阶 0.17m 级高、0.30m 踏面。
- 建筑位于 (8,0,-3)，绕世界 Y 转 -35°，使面廊朝湖侧倾斜；两个标准镜头共享同一世界。具体相机通过浏览器 blockout 再确认。
- `.blend` 母版保留命名集合和独立构件、可调整尺寸、原始 UV、打包纹理；GLB 为派生运行时产物，不以合并后的单网格代替权威母版。

## 本轮资产清单

| 角色 | 来源 / 权利 | 处理 |
| --- | --- | --- |
| 建筑壳、门窗、门廊、屋顶、烟囱 | 本项目原创建模 | Blender 母版、独立构件、结构开口、运行时按材质合并 |
| 原木 | Poly Haven rough_wood，CC0，沿用 Phase 01 来源收据 | 物理尺度 UV，暖深木色，局部颜色与物理尺度贴图 |
| 烟囱 / 基础 | Poly Haven rock_wall_02，CC0，新收据 | 扫描 PBR + 有体积的错缝石块，不用平面墙纸代替轮廓 |
| 湿岸与林下 | Poly Haven grass_ground + 现有 forest_floor，CC0 | 湿度与坡度混合、减少黄色裸地，局部几何起伏 |
| 主景针叶树 | Poly Haven fir_tree_01 A，CC0 | A 树冠占据体素 + 原扫描枝叶图集派生三维叶簇；仅枝干减面，分群放置 |
| 草与苔石 | Phase 01 grass_medium_01 / rock_moss_set_01，CC0 | 密度按植被带和路径分布；保留扫描资产 |
| 远景 / 天空 | Phase 01 Alps Field，CC0 | 4K 高档；增加有视差的分层山麓，减少雾依赖 |
| 屋面、端纹、五金 | 本项目原创材质 / 几何 | 不使用任何电影商标、新闻照片或未知模型 |

视觉门槛独立于构建 / FPS。所有照片感和是否进入 Phase 02 的决定留给用户人工验收。

## 实施后设计修正

- 浏览器 blockout 暴露正面构图过强，建筑最终绕世界 Y 转 -35°，S02 位于 (15,3.2,20)，看向 (7,4.1,-3)，垂直 FOV 48°。S01 为 (6,2.8,43)，看向 (-3,4,-3)，FOV 48°。
- 烟囱移到侧面两扇首层窗之间，阁楼侧窗错开烟道；山墙原木端部裁到坡屋面以内，屋脊最后一段由木质三角封板闭合。
- 叶片整体折叠减面曾导致近树几乎无叶，已放弃；改为保留原始完整树冠的体素分布，以真实扫描枝叶构造交叉叶簇，保持三维体积。远景才使用从源模型生成的四向图集。
- 苔藓 atlas 与 leafy_grass 候选均实际检查过，未作为最终连续地表；最终 meadow 贴图为 grass_ground。草簇分别采用完整源网格（最近前景）与源图集的弯曲交叉叶片（中景）。
- 母版在 assets/architecture/cabin-phase01b.blend，运行时为 public/assets/cabin.glb。母版保留 13 个命名集合、独立构件和锚点；运行时按材质合并。
