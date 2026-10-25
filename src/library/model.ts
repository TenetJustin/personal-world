export const KINDS = ["notes", "photos", "projects", "resume"] as const;
export type Kind = (typeof KINDS)[number];
export const LABELS: Record<Kind, string> = {
  notes: "Notes",
  photos: "Photos",
  projects: "Projects",
  resume: "Resume",
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
  return {
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
  const parts = path.split("/").filter(Boolean);
  if (!KINDS.includes(parts[0] as Kind)) return { kind: null, id: null };
  let id: string | null = null;
  try {
    id = parts[1] ? decodeURIComponent(parts[1]) : null;
  } catch {
    /* invalid route stays in list */
  }
  return { kind: parts[0] as Kind, id };
}
export const entryPath = (kind: Kind, id?: string | null) =>
  `/${kind}/${id ? encodeURIComponent(id) + "/" : ""}`;
