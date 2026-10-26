/** Optional extension of the existing project Entry; old v1/v2 backups remain valid. */
export const PROJECT_IMAGE_LIMIT = 32;
export type ProjectImageNote = {
  imageId: string;
  title: string;
  caption: string;
  kind: "screenshot" | "prototype" | "artwork" | "workflow";
  sourceURL: string;
  revision: string;
  license: string;
};
export type ProjectShowcaseData = {
  version: 1;
  galleryType: "screenshots" | "tarot";
  subtitle: string;
  credits: string;
  upstreamURL: string;
  coverId: string;
  tarotIds: string[];
  cycleSeconds: number;
  imageNotes: ProjectImageNote[];
};
export const emptyShowcase = (): ProjectShowcaseData => ({
  version: 1,
  galleryType: "screenshots",
  subtitle: "",
  credits: "",
  upstreamURL: "",
  coverId: "",
  tarotIds: [],
  cycleSeconds: 36,
  imageNotes: [],
});
export function validateShowcase(
  value: unknown,
  imageIds: Set<string>,
): ProjectShowcaseData {
  if (!value || typeof value !== "object") throw new Error("作品展示数据无效");
  const v = value as Record<string, unknown>;
  const permitted = [
    "version",
    "galleryType",
    "subtitle",
    "credits",
    "upstreamURL",
    "coverId",
    "tarotIds",
    "cycleSeconds",
    "imageNotes",
  ];
  if (
    Object.keys(v).some((key) => !permitted.includes(key)) ||
    v.version !== 1 ||
    !["screenshots", "tarot"].includes(v.galleryType as string)
  )
    throw new Error("作品展示版本或字段无效");
  const text = (x: unknown, max = 4000): string => {
    if (typeof x !== "string" || x.length > max)
      throw new Error("作品展示文本无效");
    return x;
  };
  const link = (x: unknown): string => {
    const s = text(x, 2048);
    if (s && !/^https?:$/.test(new URL(s).protocol))
      throw new Error("素材来源必须是 HTTP(S) 链接");
    return s;
  };
  const ref = (x: unknown): string => {
    const s = text(x, 80);
    if (s && !imageIds.has(s)) throw new Error("作品展示引用了不存在的图片");
    return s;
  };
  if (
    !Array.isArray(v.tarotIds) ||
    v.tarotIds.length > 12 ||
    new Set(v.tarotIds).size !== v.tarotIds.length
  )
    throw new Error("精选牌面最多 12 张，不能重复");
  if (!Array.isArray(v.imageNotes) || v.imageNotes.length > PROJECT_IMAGE_LIMIT)
    throw new Error("作品图片说明过多");
  const imageNotes = v.imageNotes.map((raw) => {
    if (!raw || typeof raw !== "object") throw new Error("作品图片说明无效");
    const n = raw as Record<string, unknown>;
    if (
      Object.keys(n).some(
        (k) =>
          ![
            "imageId",
            "title",
            "caption",
            "kind",
            "sourceURL",
            "revision",
            "license",
          ].includes(k),
      ) ||
      !["screenshot", "prototype", "artwork", "workflow"].includes(
        n.kind as string,
      )
    )
      throw new Error("作品图片说明字段无效");
    const imageId = ref(n.imageId);
    if (!imageId) throw new Error("作品图片说明需要有效图片 ID");
    return {
      imageId,
      title: text(n.title, 240),
      caption: text(n.caption),
      kind: n.kind as ProjectImageNote["kind"],
      sourceURL: link(n.sourceURL),
      revision: text(n.revision, 120),
      license: text(n.license),
    };
  });
  if (new Set(imageNotes.map((n) => n.imageId)).size !== imageNotes.length)
    throw new Error("作品图片说明不能重复");
  if (
    typeof v.cycleSeconds !== "number" ||
    !Number.isFinite(v.cycleSeconds) ||
    v.cycleSeconds < 25 ||
    v.cycleSeconds > 60
  )
    throw new Error("牌廊循环时长应为 25–60 秒");
  return {
    version: 1,
    galleryType: v.galleryType as ProjectShowcaseData["galleryType"],
    subtitle: text(v.subtitle),
    credits: text(v.credits, 8000),
    upstreamURL: link(v.upstreamURL),
    coverId: ref(v.coverId),
    tarotIds: v.tarotIds.map((id) => {
      const imageId = ref(id);
      if (!imageId) throw new Error("精选牌面 ID 不能为空");
      return imageId;
    }),
    cycleSeconds: v.cycleSeconds,
    imageNotes,
  };
}
