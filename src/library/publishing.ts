import { PROJECT_IMAGE_LIMIT } from "./projectShowcase.ts";
import { SITE_BASE } from "../site.ts";
import {
  type Entry,
  KINDS,
  MAX_BACKUP,
  validateEntry,
  mergeEntries,
} from "./model.ts";
import { dataURL, prepareImage, resolveImageBlob } from "./storage.ts";
export type PublicRecord = Omit<
  Entry,
  "blob" | "thumbnail" | "images" | "deletedAt"
> & {
  attachment?: string;
  thumbnailData?: string;
  images?: {
    id: string;
    name: string;
    attachment: string;
    thumbnailData?: string;
  }[];
};
export type PublicPackage = {
  format: "personal-world-public-package";
  version: 1;
  reviewedAt: string;
  records: PublicRecord[];
};
export type PublishedManifest = {
  format: "personal-world-published";
  version: 1;
  publishedAt: string | null;
  records: PublicRecord[];
};
const permitted = [
  "id",
  "kind",
  "title",
  "body",
  "tags",
  "url",
  "createdAt",
  "updatedAt",
  "category",
  "album",
  "sortOrder",
  "githubURL",
  "demoURL",
  "technology",
  "resume",
  "fileName",
  "structuredProfile",
  "projectDetails",
  "projectShowcase",
  "photoTakenAt",
  "photoLocation",
  "photoLocationPublic",
  "isAlbumCover",
  "coverImageId",
] as const;
export async function createPublicPackage(
  entries: Entry[],
  selectedIDs: string[],
  reviewed: boolean,
): Promise<PublicPackage> {
  if (!reviewed) throw new Error("请逐项审核，并明确确认这些内容可以公开");
  if (!selectedIDs.length || new Set(selectedIDs).size !== selectedIDs.length)
    throw new Error("请选择至少一条不重复的公开资料");
  const records: PublicRecord[] = [];
  for (const id of selectedIDs) {
    const entry = entries.find((e) => e.id === id);
    if (!entry || entry.deletedAt)
      throw new Error("所选资料已移除，请重新审核");
    const materialized = entry.images?.some((image) => image.publicURL)
      ? {
          ...entry,
          images: await Promise.all(
            entry.images.map(async (image) => ({
              ...image,
              blob: await resolveImageBlob(image),
              thumbnail:
                image.thumbnail || image.publicThumbnailURL
                  ? await resolveImageBlob(image, true)
                  : undefined,
            })),
          ),
        }
      : entry;
    const e = validateEntry(materialized);
    const r = Object.fromEntries(
      permitted.filter((k) => e[k] !== undefined).map((k) => [k, e[k]]),
    ) as unknown as PublicRecord;
    if (!e.photoLocationPublic) {
      delete r.photoLocation;
      delete r.photoLocationPublic;
    }
    const publicBlob = async (blob: Blob) =>
      blob.type.startsWith("image/") && typeof document !== "undefined"
        ? (await prepareImage(blob)).blob
        : blob;
    if (e.blob) {
      const clean = await publicBlob(e.blob);
      r.attachment = await dataURL(clean);
      if (clean.type !== e.blob.type && r.fileName)
        r.fileName = r.fileName.replace(/\.[^.]+$/, "") + ".webp";
    }
    if (e.thumbnail)
      r.thumbnailData = await dataURL(await publicBlob(e.thumbnail));
    const referenced = e.structuredProfile
      ? new Set([
          e.structuredProfile.about.avatarId,
          ...e.structuredProfile.awards.flatMap((a) => a.imageIds),
        ])
      : e.kind === "notes"
        ? new Set([e.coverImageId])
        : null;
    if (e.images)
      r.images = await Promise.all(
        e.images
          .filter((x) => !referenced || referenced.has(x.id))
          .map(async (x) => ({
            id: x.id,
            name: x.name,
            attachment: await dataURL(
              await publicBlob(await resolveImageBlob(x)),
            ),
            ...(x.thumbnail
              ? { thumbnailData: await dataURL(await publicBlob(x.thumbnail)) }
              : {}),
          })),
      );
    records.push(r);
  }
  const value: PublicPackage = {
    format: "personal-world-public-package",
    version: 1,
    reviewedAt: new Date().toISOString(),
    records,
  };
  if (new Blob([JSON.stringify(value)]).size > MAX_BACKUP)
    throw new Error("公开内容包超过 150 MB，请减少本次选择");
  return value;
}
function publicAsset(path: string, contentBase: URL): string {
  if (!/^assets\/[a-f0-9]{64}\.(webp|png|jpg|gif|pdf)$/.test(path))
    throw new Error("公开附件路径无效");
  return new URL(path, contentBase).href;
}
export async function loadPublishedContent(base = SITE_BASE): Promise<Entry[]> {
  const contentBase = new URL(
    `${base.replace(/\/?$/, "/")}content/`,
    location.origin,
  );
  const response = await fetch(new URL("manifest.json", contentBase), {
    cache: "no-cache",
  });
  if (!response.ok) throw new Error(`公开内容暂不可用 (${response.status})`);
  const data = (await response.json()) as PublishedManifest;
  if (
    data.format !== "personal-world-published" ||
    data.version !== 1 ||
    !Array.isArray(data.records) ||
    data.records.length > 5000
  )
    throw new Error("公开内容清单格式无效");
  const attachment = async (path: string) => {
    const r = await fetch(publicAsset(path, contentBase));
    if (!r.ok) throw new Error("公开附件加载失败");
    const blob = await r.blob();
    if (blob.size > 25 * 1024 * 1024) throw new Error("公开附件过大");
    return blob;
  };
  const entries: Entry[] = [];
  // Sequential records bound memory and connection pressure for a static personal site.
  for (const record of data.records) {
    if (
      !record ||
      typeof record !== "object" ||
      Object.keys(record).some(
        (key) =>
          ![...permitted, "attachment", "thumbnailData", "images"].includes(
            key as (typeof permitted)[number],
          ),
      )
    )
      throw new Error("公开记录含有未知字段或未审核的本地数据");
    if (
      record.images &&
      (!Array.isArray(record.images) ||
        record.images.length >
          (record.kind === "projects"
            ? PROJECT_IMAGE_LIMIT
            : record.kind === "notes"
              ? 1
              : 50))
    )
      throw new Error("公开项目图片数量无效");
    if (record.photoLocation && record.photoLocationPublic !== true)
      throw new Error("公开照片地点缺少明确同意");
    const blob = record.attachment
      ? await attachment(record.attachment)
      : undefined;
    const thumbnail = record.thumbnailData
      ? await attachment(record.thumbnailData)
      : undefined;
    const images: Entry["images"] = record.images
      ? await Promise.all(
          record.images.map(async (image) =>
            record.kind === "projects"
              ? {
                  id: image.id,
                  name: image.name,
                  blob: new Blob([], { type: "image/webp" }),
                  publicURL: publicAsset(image.attachment, contentBase),
                  publicThumbnailURL: image.thumbnailData
                    ? publicAsset(image.thumbnailData, contentBase)
                    : undefined,
                }
              : {
                  id: image.id,
                  name: image.name,
                  blob: await attachment(image.attachment),
                  thumbnail: image.thumbnailData
                    ? await attachment(image.thumbnailData)
                    : undefined,
                },
          ),
        )
      : undefined;
    const valid = validateEntry({ ...record, blob, thumbnail, images });
    if (record.kind === "projects" && valid.images)
      valid.images = valid.images.map((image, index) => ({
        ...image,
        publicURL: images![index].publicURL,
        publicThumbnailURL: images![index].publicThumbnailURL,
      }));
    entries.push(valid);
  }
  mergeEntries([], entries);
  return entries;
}
export const PUBLIC_KINDS = KINDS;
