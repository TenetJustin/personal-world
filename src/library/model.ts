import {
  PROJECT_IMAGE_LIMIT,
  validateShowcase,
  type ProjectShowcaseData,
} from "./projectShowcase.ts";
import {
  validateProfile,
  emptyProjectDetails,
  type StructuredProfile,
  type ProjectDetails,
} from "./profile.ts";
import { appURL, sitePath } from "../site.ts";
export const KINDS = ["notes", "photos", "projects", "resume"] as const;
export type Kind = (typeof KINDS)[number];
export const LABELS: Record<Kind, string> = {
  notes: "备忘录",
  photos: "照片",
  projects: "作品",
  resume: "履历",
};
export type ImageAttachment = {
  id: string;
  name: string;
  blob: Blob;
  thumbnail?: Blob;
  /** Runtime-only same-origin URLs; backups materialize the bytes. */
  publicURL?: string;
  publicThumbnailURL?: string;
};
export type ResumeSections = {
  profile: string;
  education: string;
  experience: string;
  projects: string;
  skills: string;
  awards: string;
};
export const RESUME_LABELS: Record<keyof ResumeSections, string> = {
  profile: "个人简介",
  education: "教育",
  experience: "实习和工作经历",
  projects: "项目",
  skills: "技术技能",
  awards: "荣誉与奖项",
};
export type Entry = {
  id: string;
  kind: Kind;
  title: string;
  body: string;
  tags: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  fileName?: string;
  blob?: Blob;
  deletedAt?: string;
  category?: string;
  album?: string;
  sortOrder?: number;
  githubURL?: string;
  demoURL?: string;
  technology?: string;
  thumbnail?: Blob;
  images?: ImageAttachment[];
  resume?: ResumeSections;
  structuredProfile?: StructuredProfile;
  projectDetails?: ProjectDetails;
  projectShowcase?: ProjectShowcaseData;
  publicationStatus?: "draft" | "ready";
  photoTakenAt?: string;
  photoLocation?: string;
  photoLocationPublic?: boolean;
  isAlbumCover?: boolean;
  coverImageId?: string;
};
export const MAX_FILE = 25 * 1024 * 1024;
export const MAX_LIBRARY = 100 * 1024 * 1024;
export const MAX_BACKUP = 150 * 1024 * 1024;
export function safeURL(value: string): string | null {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
export function newEntry(kind: Kind, title = ""): Entry {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    kind,
    title:
      title ||
      {
        notes: "未命名笔记",
        photos: "未命名照片",
        projects: "新项目",
        resume: "我的履历",
      }[kind],
    body: "",
    tags: "",
    url: "",
    createdAt: now,
    updatedAt: now,
  };
}
function text(v: unknown, max: number, field: string): string {
  if (typeof v !== "string" || v.length > max)
    throw new Error(`${field}格式不正确或内容过长`);
  return v;
}
export function validateEntry(value: unknown): Entry {
  if (!value || typeof value !== "object") throw new Error("资料格式不正确");
  const r = value as Record<string, unknown>;
  const id = text(r.id, 80, "ID");
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error("资料 ID 无效");
  if (!KINDS.includes(r.kind as Kind)) throw new Error("不支持的资料类型");
  const title = text(r.title, 240, "标题").trim();
  if (!title) throw new Error("请填写标题");
  const body = text(r.body, 1_000_000, "正文");
  const tags = text(r.tags, 1000, "标签");
  const url = text(r.url, 2048, "网址");
  if (url && !safeURL(url))
    throw new Error("网址必须以 https:// 或 http:// 开头");
  const dates = [r.createdAt, r.updatedAt].map((v) => text(v, 40, "时间"));
  if (dates.some((v) => !Number.isFinite(Date.parse(v))))
    throw new Error("资料时间无效");
  const blob = r.blob instanceof Blob ? r.blob : undefined;
  if (
    blob &&
    (blob.size > MAX_FILE ||
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "application/pdf",
      ].includes(blob.type))
  )
    throw new Error("附件格式不支持或超过 25 MB");
  if (
    blob &&
    ((r.kind === "photos" && !blob.type.startsWith("image/")) ||
      (r.kind === "resume" && blob.type !== "application/pdf") ||
      !["photos", "resume"].includes(r.kind as string))
  )
    throw new Error("附件与资料类型不匹配");
  if (
    r.deletedAt !== undefined &&
    (typeof r.deletedAt !== "string" ||
      !Number.isFinite(Date.parse(r.deletedAt)))
  )
    throw new Error("回收站时间无效");
  const extra: Partial<Entry> = {};
  for (const key of ["category", "album", "technology"] as const)
    if (r[key] !== undefined) extra[key] = text(r[key], 1000, key);
  for (const key of ["githubURL", "demoURL"] as const)
    if (r[key] !== undefined) {
      const u = text(r[key], 2048, key);
      if (u && !safeURL(u))
        throw new Error("项目链接必须使用 https:// 或 http://");
      extra[key] = u;
    }
  if (r.sortOrder !== undefined) {
    if (typeof r.sortOrder !== "number" || !Number.isFinite(r.sortOrder))
      throw new Error("排序值无效");
    extra.sortOrder = r.sortOrder;
  }
  if (r.thumbnail !== undefined) {
    if (
      !(r.thumbnail instanceof Blob) ||
      r.thumbnail.size > 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(r.thumbnail.type)
    )
      throw new Error("缩略图无效");
    extra.thumbnail = r.thumbnail;
  }
  if (r.images !== undefined) {
    if (
      !["projects", "resume", "notes"].includes(r.kind as string) ||
      !Array.isArray(r.images) ||
      r.images.length >
        (r.kind === "projects"
          ? PROJECT_IMAGE_LIMIT
          : r.kind === "notes"
            ? 1
            : 50)
    )
      throw new Error(
        "图片数量或资料类型无效（项目 32 张、笔记 1 张、个人资料 50 张）",
      );
    extra.images = r.images.map((v: Record<string, unknown>) => {
      if (
        !v ||
        typeof v !== "object" ||
        !(v.blob instanceof Blob) ||
        !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
          v.blob.type,
        ) ||
        v.blob.size > MAX_FILE
      )
        throw new Error("项目图片无效");
      const image = {
        id: text(v.id, 80, "图片 ID"),
        name: text(v.name, 240, "图片名称"),
        blob: v.blob,
        ...(v.thumbnail instanceof Blob ? { thumbnail: v.thumbnail } : {}),
      };
      if (!/^[a-zA-Z0-9_-]{1,80}$/.test(image.id))
        throw new Error("图片 ID 无效");
      if (
        image.thumbnail &&
        (image.thumbnail.size > 1024 * 1024 ||
          !["image/jpeg", "image/png", "image/webp"].includes(
            image.thumbnail.type,
          ))
      )
        throw new Error("项目缩略图无效");
      return image;
    });
  }
  if (r.resume !== undefined) {
    if (r.kind !== "resume" || !r.resume || typeof r.resume !== "object")
      throw new Error("履历结构无效");
    extra.resume = Object.fromEntries(
      Object.keys(RESUME_LABELS).map((key) => [
        key,
        text((r.resume as Record<string, unknown>)[key] ?? "", 100_000, key),
      ]),
    ) as ResumeSections;
  }
  if (r.publicationStatus !== undefined) {
    if (!["draft", "ready"].includes(r.publicationStatus as string))
      throw new Error("公开准备状态无效");
    extra.publicationStatus = r.publicationStatus as "draft" | "ready";
  }
  for (const key of ["photoTakenAt", "photoLocation", "coverImageId"] as const)
    if (r[key] !== undefined) extra[key] = text(r[key], 1000, key);
  for (const key of ["photoLocationPublic", "isAlbumCover"] as const)
    if (r[key] !== undefined) {
      if (typeof r[key] !== "boolean") throw new Error("照片公开设置无效");
      extra[key] = r[key];
    }
  if (r.projectDetails !== undefined) {
    if (
      r.kind !== "projects" ||
      !r.projectDetails ||
      typeof r.projectDetails !== "object"
    )
      throw new Error("项目详细资料无效");
    extra.projectDetails = Object.fromEntries(
      Object.keys(emptyProjectDetails()).map((k) => [
        k,
        text(
          (r.projectDetails as Record<string, unknown>)[k] ?? "",
          100_000,
          k,
        ),
      ]),
    ) as ProjectDetails;
  }
  if (r.structuredProfile !== undefined) {
    if (r.kind !== "resume") throw new Error("个人介绍必须保存在履历资料中");
    extra.structuredProfile = validateProfile(r.structuredProfile);
  }
  const mediaIds = new Set(extra.images?.map((i) => i.id) ?? []);
  if (mediaIds.size !== (extra.images?.length ?? 0))
    throw new Error("图片 ID 重复");
  if (r.projectShowcase !== undefined) {
    if (r.kind !== "projects") throw new Error("作品展示字段只适用于项目");
    extra.projectShowcase = validateShowcase(r.projectShowcase, mediaIds);
  }
  const refs = [
    extra.coverImageId,
    extra.structuredProfile?.about.avatarId,
    ...(extra.structuredProfile?.awards.flatMap((a) => a.imageIds) ?? []),
  ].filter(Boolean);
  if (refs.some((ref) => !mediaIds.has(ref!)))
    throw new Error("封面、头像或荣誉图片引用不存在");
  return {
    ...extra,
    id,
    kind: r.kind as Kind,
    title,
    body,
    tags,
    url,
    createdAt: dates[0],
    updatedAt: dates[1],
    ...(r.deletedAt ? { deletedAt: r.deletedAt as string } : {}),
    ...(blob
      ? { blob, fileName: text(r.fileName ?? "attachment", 240, "文件名") }
      : {}),
  };
}
export function libraryBytes(entries: Entry[]) {
  return entries.reduce(
    (n, e) =>
      n +
      (e.blob?.size ?? 0) +
      (e.thumbnail?.size ?? 0) +
      (e.images?.reduce(
        (n, x) => n + x.blob.size + (x.thumbnail?.size ?? 0),
        0,
      ) ?? 0) +
      new TextEncoder().encode(
        JSON.stringify(e.resume ?? {}) +
          JSON.stringify(e.structuredProfile ?? {}) +
          JSON.stringify(e.projectDetails ?? {}) +
          JSON.stringify(e.projectShowcase ?? {}) +
          (e.photoLocation ?? "") +
          (e.photoTakenAt ?? "") +
          (e.technology ?? "") +
          (e.category ?? "") +
          (e.album ?? ""),
      ).length +
      new TextEncoder().encode(e.body + e.title + e.tags + e.url).length,
    0,
  );
}
export function mergeEntries(existing: Entry[], incoming: Entry[]) {
  const ids = new Set<string>();
  const valid = incoming.map((v) => {
    const e = validateEntry(v);
    if (ids.has(e.id)) throw new Error("备份包含重复 ID");
    ids.add(e.id);
    return e;
  });
  const merged = new Map(existing.map((e) => [e.id, e]));
  valid.forEach((e) => merged.set(e.id, e));
  const result = [...merged.values()];
  if (result.length > 5000 || libraryBytes(result) > MAX_LIBRARY)
    throw new Error("本地资料库上限为 5,000 项 / 100 MB，请先导出并整理资料");
  return result;
}
export type Route = { kind: Kind | null; id: string | null };
export function parseRoute(path: string): Route {
  const [pathname, search] = path.split("?");
  const parts = sitePath(pathname).split("/").filter(Boolean);
  if (!KINDS.includes(parts[0] as Kind)) return { kind: null, id: null };
  let id: string | null = null;
  try {
    id = parts[1]
      ? decodeURIComponent(parts[1])
      : new URLSearchParams(
          search ?? (typeof location !== "undefined" ? location.search : ""),
        ).get("id");
    if (id && !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) id = null;
  } catch {
    /* invalid route stays in list */
  }
  return { kind: parts[0] as Kind, id };
}
export const entryPath = (kind: Kind, id?: string | null) => appURL(kind, id);
