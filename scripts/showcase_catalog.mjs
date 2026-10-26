// Text approved for the initial portfolio import. Roles intentionally stay brief.
const revisions = {
  cityos: "5f096c53ebdf1d5e9c17e0dccb8a6aefd2122029",
  mindcare: "465700e8f572a853a8f4d14b2f20ef62e22e916d",
  moirai: "1c28d22b7d1ae46f9b1e47396bc707236781c43b",
  seacoconut: "44bec99f8984b4d4c0335da6d81f0f701ac9ad3c",
};
const repo = (name, revision, path) =>
  `https://github.com/${name}/blob/${revision}/${path}`;
const teamLicense =
  "项目团队已由作者确认授权个人网站署名展示；仓库没有通用开源许可证。";
const moiraiLicense =
  "© 2026 MOIRAI / TenetJustin. All rights reserved. 权利人本次授权个人作品展示，非开放素材许可。";
const suppliedLicense =
  "作者在本次会话提供并要求用于个人项目展示；保留画面内原有第三方署名。比赛画面与第三方标识不随项目代码许可转授。";
const image = (
  id,
  file,
  title,
  caption,
  kind,
  sourceURL,
  revision,
  license,
) => ({ id, file, title, caption, kind, sourceURL, revision, license });
export const showcaseCatalog = [
  {
    slug: "cityos",
    title: "CityOS",
    subtitle: "城市灾害世界模型 · 从深圳原型到浙江四城研究工作台",
    category: "城市韧性 / 世界模型",
    role: "参与 / 二次开发",
    summary:
      "把灾害证据、情景推演与人工复核放进同一工作台，探索城市灾害的空间表达。",
    technology: "Python, React, TypeScript, Three.js, SWMM, NetworkX",
    githubURL: "https://github.com/TenetJustin/cityos-flood",
    demoURL: "https://tenetjustin.github.io/cityos-flood/",
    problem:
      "台风、强降雨、潮位与城市空间证据分散在不同来源。CityOS 研究怎样让来源、时效、模拟假设与建议的边界一起被看见。",
    body: "### 深圳城市灾害与内涝原型\n\n历史 v4/v5 界面探索了深圳地形、台风与级联影响的三维表达。本页五张深色界面截图来自这一阶段，不代表当前浙江工作台的页面或验证水平。\n\n### 多灾种监测、推演与决策研究\n\n把地图、情景参数、影响分析和建议放在一条研究流程中。界面中的模拟值与演示值不能直接当作实时城市观测。\n\n### 浙江四城研究工作台\n\n当前个人仓库转向宁波、台州、温州与杭州，组织公开气象、历史台风与降雨证据。SWMM、Rasterio/GDAL、Shapely 与 NetworkX 的合成案例用于方法验证，真实点位、排水边界与模型参数仍需逐城校准。",
    features:
      "- 三维地形与地图联动的历史原型。\n- 真实来源、缺失状态、演示数据与情景假设分开展示。\n- 情景比较、影响研究与人工复核草案。",
    results:
      "当前为研究型工作台，不能包装为已投入生产的城市预警系统；不自动执行人员转移、封路或救援调度。历史截图与最新在线入口属于不同版本。",
    status: "研究原型 / 浙江四城持续迭代",
    credits:
      "CityOS 项目团队；历史协作版本 JhengXu/cityos-flood。截图经团队同意用于作者个人作品展示。",
    upstreamURL: "https://github.com/JhengXu/cityos-flood",
    images: [
      [
        "v5-final-top.jpg",
        "深圳原型 · 三维总览",
        "v5 历史界面：地形三维视图与空间态势概览。",
      ],
      [
        "v5-command-center.jpg",
        "v5 指挥中心界面",
        "历史研究演示，页面数值不作为实时城市预警证据。",
      ],
      [
        "v4-overview-3d.jpg",
        "v4 三维态势",
        "早期多灾种原型的空间表达与概览指标。",
      ],
      ["v4-typhoon-3d.jpg", "台风情景界面", "历史台风原型的事件与情景信息。"],
      [
        "v4-cascade-mangkhut.jpg",
        "山竹 · 级联影响研究",
        "历史级联情景界面；示例曲线不等于已校准的预测性能。",
      ],
    ].map(([file, title, caption], i) =>
      image(
        `cityos-${i}`,
        `cityos/${file}`,
        title,
        caption,
        "screenshot",
        repo(
          "TenetJustin/cityos-flood",
          revisions.cityos,
          `outputs/screenshots/${file}`,
        ),
        revisions.cityos,
        teamLicense,
      ),
    ),
  },
  {
    slug: "courtcast",
    title: "CourtCast",
    subtitle: "AI Basketball Analysis · 用你的眼睛，看懂每一球",
    category: "体育科技 / AI 解说",
    role: "参与",
    summary:
      "围绕篮球回合组织比赛画面、战术标注与解说，探索更容易理解的赛后分析体验。",
    technology: "Python, Computer Vision, JavaScript, AI Commentary",
    githubURL: "https://github.com/TenetJustin/CourtCast",
    demoURL: "",
    problem:
      "从看见一球的结果，到理解当时的空间、选择与回合逻辑，需要把画面与讲解放在同一时间线上。",
    body: "CourtCast 将回合播放、球员标注、战术解读与解说组织在一起。本页使用作者本轮提供的封面、分析标注和播放页素材。\n\n图中呈现了进攻／防守视角、回合章节、球员信息与解说设计。保留素材中的人工标注与估算提示，不把界面数值当作本轮独立验证的模型结果。",
    features:
      "- 回合章节、播放与讲解的信息组织。\n- 球员站位、选择与战术标注示例。\n- AI 解说与比赛记录相结合的产品探索。",
    results:
      "作品素材由作者提供。未在本轮重新运行云端分析或验证 AWS 后端。历史本地前端与作者最新版本存在差异，未把此前恢复的旧截图纳入展示。",
    status: "项目演示 / 作者提供素材",
    credits:
      "CourtCast / Team 15。仓库为私有，GitHub 链接需要已获授权的账号。比赛画面、NBA/ESPN 等标识归各自权利人，本站展示作者提供的项目示例。",
    upstreamURL: "",
    images: [
      image(
        "courtcast-cover",
        "courtcast-provided/cover.png",
        "CourtCast · 项目封面",
        "作者提供的项目展示封面；保留原设计与团队署名。",
        "artwork",
        "https://github.com/TenetJustin/CourtCast",
        "user-supplied-2026-10-26",
        suppliedLicense,
      ),
      image(
        "courtcast-analysis",
        "courtcast-provided/analysis.png",
        "回合讲解与选择标注",
        "作者提供的分析示例，包含人工站位标注和每 100 次进攻估算提示；不是本轮后端实测。",
        "screenshot",
        "https://github.com/TenetJustin/CourtCast",
        "user-supplied-2026-10-26",
        suppliedLicense,
      ),
      image(
        "courtcast-player",
        "courtcast-provided/player.png",
        "播放页与多视角讲解",
        "作者提供的播放界面，原图局部已有裁切与模糊；保留真实画面，不补写缺失文字。",
        "screenshot",
        "https://github.com/TenetJustin/CourtCast",
        "user-supplied-2026-10-26",
        suppliedLicense,
      ),
    ],
  },
  {
    slug: "mindcare",
    title: "MindCare AI",
    subtitle: "像素心灵驿站 · 心理支持与自我探索",
    category: "多智能体 / 交互产品",
    role: "参与",
    summary:
      "以像素风交互、多智能体陪伴和语音体验，构建温暖的情绪支持与自我探索空间。",
    technology: "Next.js, React, FastAPI, Python, WebRTC, Multi-Agent",
    githubURL: "https://github.com/JhengXu/mindcare-ai",
    demoURL: "",
    problem:
      "情绪支持产品既需要可理解的交互，也需要明确的能力与隐私边界。项目探索陪伴、语音与日常工具如何形成连续体验。",
    body: "MindCare AI 以像素风心灵驿站组织多种心理支持体验。语音交流、情绪工具、艺术小屋、花园与森林共同构成产品空间。\n\n仓库描述了多智能体协作、实时语音、授权访问与咨询师工作台等模块。本页截图来自团队公开仓库，不为拍摄展示图重建模型后端。",
    features:
      "- 多智能体陪伴与交互式产品设计。\n- 语音、文字与实时交互。\n- 情绪工具、艺术小屋、花园和森林。\n- 用户授权与支持工作台的产品探索。",
    results:
      "用于情绪支持与自我探索，不提供医学诊断，不宣称具备医疗资质。截图展示的是项目界面，不能替代后端可用性、安全性或临床效果验证。",
    status: "团队项目 / 研究与学习展示",
    credits:
      "MindCare AI 项目团队 / JhengXu 及协作者。团队已同意本次个人网站署名展示。仓库说明限学习与研究使用；本页不授予代码或素材的通用再分发许可。",
    upstreamURL: "",
    images: [
      ["01-landing.png", "像素心灵驿站", "产品首页与像素风视觉语言。"],
      ["02-home.png", "情绪支持首页", "日常入口与工具组织。"],
      ["03-voice.png", "语音交互", "语音陪伴的界面设计，非本轮模型调用结果。"],
      ["06-heal-tools.png", "情绪工具", "工具箱与日常支持入口。"],
      ["08-art-house.png", "艺术小屋", "把表达与体验融入产品空间。"],
      ["16-forest.png", "森林空间", "产品中的森林与支持工具界面。"],
    ].map(([file, title, caption], i) =>
      image(
        `mindcare-${i}`,
        `mindcare/${file}`,
        title,
        caption,
        "screenshot",
        repo(
          "JhengXu/mindcare-ai",
          revisions.mindcare,
          `docs/screenshots/${file}`,
        ),
        revisions.mindcare,
        teamLicense,
      ),
    ),
  },
  {
    slug: "moirai",
    title: "MOIRAI",
    subtitle: "ORACLE OF OLYMPUS · 奥林匹斯神谕",
    category: "原创数字艺术 / 仪式交互",
    role: "参与",
    summary:
      "让希腊神话、原创塔罗插画与本地优先的数字仪式，在同一个安静的空间里相遇。",
    technology: "React, TypeScript, Three.js, Framer Motion, Web Audio, PWA",
    githubURL: "https://github.com/TenetJustin/MOIRAI-public-app",
    demoURL: "https://tenetjustin.github.io/MOIRAI-public-app/",
    problem:
      "数字塔罗不只是一张随机图片。项目探索图像、象征、节奏与个人记录怎样形成完整而克制的仪式体验。",
    body: "MOIRAI 使用 78 张希腊神话主题原创牌面，支持单牌、三牌与凯尔特十字仪式。\n\n本页从公开分发版中精选十二张：九张大阿尔卡那与三张小阿尔卡那，以人物、色彩与构图形成连续的艺术牌廊。所有牌面保留完整纵向比例。\n\n原项目使用规则驱动的本地解读与设备内命运档案，不连接 AI 或第三方解读接口。作品页的牌廊使用 CSS 动画，另无新增 WebGL 画布。",
    features:
      "- 希腊神话主题原创牌面与对应解释。\n- 分阶段的意图、牌阵、净化、洗牌、切牌、抽牌与神谕体验。\n- 本地记录、备份恢复、PWA 与环境音。",
    results:
      "在线入口已经真实浏览器打开并进入仪式。仅使用公开分发版优化资产，不分发高清母版、Prompt、未发布图片或私有授权文件。",
    status: "已公开的本地优先 PWA",
    credits:
      "© 2026 MOIRAI / TenetJustin. All rights reserved. 本次按权利人要求用于个人作品展示。公开可见不等于开源，素材不适用 Personal World 的代码许可。",
    upstreamURL: "",
    galleryType: "tarot",
    images: [
      ["m00", "The Fool · 愚者", "伊卡洛斯 Icarus"],
      ["m01", "The Magician · 魔术师", "赫尔墨斯 Hermes"],
      ["m02", "The High Priestess · 女祭司", "珀耳塞福涅 Persephone"],
      ["m03", "The Empress · 皇后", "得墨忒耳 Demeter"],
      ["m06", "The Lovers · 恋人", "厄洛斯与普绪克 Eros & Psyche"],
      ["m17", "The Star · 星星", "阿斯克勒庇俄斯 Asclepius"],
      ["m18", "The Moon · 月亮", "阿尔忒弥斯 Artemis"],
      ["m19", "The Sun · 太阳", "赫利俄斯 Helios"],
      ["m21", "The World · 世界", "盖亚 Gaia"],
      ["cups-ace", "Ace of Cups · 圣杯一", "圣杯组 · 情感与连接"],
      ["wands-ace", "Ace of Wands · 权杖一", "权杖组 · 火种与创造"],
      [
        "pentacles-queen",
        "Queen of Pentacles · 星币皇后",
        "星币组 · 丰盛与照料",
      ],
    ]
      .map(([id, title, caption]) =>
        image(
          id,
          `moirai/${id}.webp`,
          title,
          caption,
          "artwork",
          repo(
            "TenetJustin/MOIRAI-public-app",
            revisions.moirai,
            `public/cards/fronts/${id}.webp`,
          ),
          revisions.moirai,
          moiraiLicense,
        ),
      )
      .concat([
        image(
          "moirai-landing",
          "moirai-ui/landing.png",
          "神话主题首页",
          "从官方在线入口拍摄的真实浏览器画面。",
          "screenshot",
          "https://tenetjustin.github.io/MOIRAI-public-app/",
          revisions.moirai,
          moiraiLicense,
        ),
        image(
          "moirai-ritual",
          "moirai-ui/ritual.png",
          "仪式 · 设置意图",
          "从官方入口实际进入仪式，设备本地保存意图。",
          "screenshot",
          "https://tenetjustin.github.io/MOIRAI-public-app/",
          revisions.moirai,
          moiraiLicense,
        ),
      ]),
  },
  {
    slug: "seacoconut",
    title: "Seacoconut IP Skills",
    subtitle: "可携带的人物身份 · 可复用的 Agent 工作流",
    category: "Agent Skills / 二次开发",
    role: "二次开发",
    summary:
      "围绕原创人物 IP，组织三视图、文章插画与视频叠加素材的可复用工作流。",
    technology: "Agent Skills, Markdown, IP Packs, Image Workflow",
    githubURL: "https://github.com/TenetJustin/seacoconut_ip_skills",
    demoURL: "",
    problem:
      "在不同文章和视频中重复使用人物 IP，需要身份、规范与输出格式保持一致，而不是每次从一张新人物图重新开始。",
    body: "基于 Jinchenma 的开源 IP Skills 进行独立二次开发，保留上游 MIT 版权声明。\n\n当前公开仓库整理了 IP Builder、文章插画与视频叠加三套 Skill，内置 Seacoconut 人物三视图与角色规范。相较基础版本，仓库记录了品牌独立化、上游人物素材清理、默认人物包以及视频动作输出工作流。\n\n本页展示实际人物三视图与真实仓库文档截图；文档中的工作流不是已生成效果图。尚未取得可供本轮展示的文章成图与透明动作片段，因此不制作伪造运行成果。",
    features:
      "- 人物包导入、激活与切换的规范。\n- 完整文章阅读、人物一致性与插画流程。\n- 短动作、透明背景与色键回退的输出约定。",
    results:
      "基础版本，后续视觉规范与工作流仍在迭代。代码与共享文档保留上游 MIT；Seacoconut 人物资产在其 manifest 中标记为 private，本次由权利人明确要求用于个人作品展示，不改为 MIT。",
    status: "基础版本 / 持续迭代",
    credits:
      "二次开发：TenetJustin / Seacoconut。上游：Jinchenma（金尘马）· jinchenma94/jinchenma-ip-skills，MIT License。Seacoconut 人物资产独立保留权利。",
    upstreamURL: "https://github.com/jinchenma94/jinchenma-ip-skills",
    images: [
      image(
        "seacoconut-turnaround",
        "seacoconut/turnaround.png",
        "Seacoconut · 角色三视图",
        "公开仓库分发的人物正面、侧面与背面，按作者指令展示。",
        "artwork",
        repo(
          "TenetJustin/seacoconut_ip_skills",
          revisions.seacoconut,
          "skills/seacoconut-ip-article-illustrations/assets/ip-packs/seacoconut/assets/turnaround.png",
        ),
        revisions.seacoconut,
        "人物资产 private；本次按权利人要求展示，非 MIT 素材。",
      ),
      image(
        "seacoconut-article",
        "seacoconut/article-workflow.png",
        "文章插画 Skill · 仓库文档",
        "真实 GitHub 文档页面截图，展示工作流说明；不是生成作品样例。",
        "workflow",
        repo(
          "TenetJustin/seacoconut_ip_skills",
          revisions.seacoconut,
          "skills/seacoconut-ip-article-illustrations/SKILL.md",
        ),
        revisions.seacoconut,
        "MIT 共享工作流文档，保留 Jinchenma 原版权声明与本项目署名。",
      ),
      image(
        "seacoconut-video",
        "seacoconut/video-workflow.png",
        "视频叠加 Skill · 仓库文档",
        "真实 GitHub 文档页面截图，说明输入和输出约定；不冒充已生成透明视频。",
        "workflow",
        repo(
          "TenetJustin/seacoconut_ip_skills",
          revisions.seacoconut,
          "skills/seacoconut-ip-video-overlays/SKILL.md",
        ),
        revisions.seacoconut,
        "MIT 共享工作流文档，保留 Jinchenma 原版权声明与本项目署名。",
      ),
    ],
  },
];
