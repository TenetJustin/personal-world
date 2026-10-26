import { PROJECT_IMAGE_LIMIT } from "./projectShowcase.ts";
import type { ImageAttachment } from "./model.ts";
import {
  type Entry,
  MAX_BACKUP,
  MAX_FILE,
  mergeEntries,
  validateEntry,
} from "./model.ts";
let connection: Promise<IDBDatabase> | undefined;
function openDB() {
  if (!connection)
    connection = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("personal-world-library", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("entries", { keyPath: "id" });
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          connection = undefined;
        };
        resolve(db);
      };
      request.onerror = () => {
        connection = undefined;
        reject(request.error);
      };
      request.onblocked = () => {
        connection = undefined;
        reject(new Error("资料库被旧页面占用，请关闭其他本站标签页后重试"));
      };
    });
  return connection;
}
export async function readEntries(): Promise<Entry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("entries", "readonly");
    const req = tx.objectStore("entries").getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function writeEntries(incoming: Entry[]) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("entries", "readwrite");
    const store = tx.objectStore("entries");
    // Read + validate quota + write in a single transaction, including across tabs.
    const req = store.getAll();
    let failure: unknown;
    req.onsuccess = () => {
      try {
        mergeEntries(req.result, incoming);
        incoming.forEach((e) => store.put(validateEntry(e)));
      } catch (e) {
        failure = e;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(failure ?? tx.error);
    tx.onabort = () => reject(failure ?? tx.error ?? new Error("保存失败"));
  });
}
export async function removeEntry(id: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("entries", "readwrite");
    const store = tx.objectStore("entries");
    const req = store.get(id);
    req.onsuccess = () => {
      if (req.result)
        store.put({ ...req.result, deletedAt: new Date().toISOString() });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export async function dataURL(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 16384)
    binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return `data:${blob.type};base64,${btoa(binary)}`;
}
export async function encodeBackup(entries: Entry[]) {
  const records = [];
  for (const e of entries) {
    const { blob, thumbnail, images, publicURL, ...rest } = e;
    records.push({
      ...rest,
      ...(blob ? { attachment: await dataURL(blob) } : {}),
      ...(thumbnail ? { thumbnailData: await dataURL(thumbnail) } : {}),
      ...(images
        ? {
            images: await Promise.all(
              images.map(async (media) => {
                const {
                  blob,
                  thumbnail,
                  publicURL,
                  publicThumbnailURL,
                  ...image
                } = media;
                return {
                  ...image,
                  attachment: await dataURL(await resolveImageBlob(media)),
                  ...(thumbnail || publicThumbnailURL
                    ? {
                        thumbnailData: await dataURL(
                          await resolveImageBlob(media, true),
                        ),
                      }
                    : {}),
                };
              }),
            ),
          }
        : {}),
    });
  }
  return JSON.stringify(
    {
      format: "personal-world-backup",
      version: 2,
      exportedAt: new Date().toISOString(),
      records,
    },
    null,
    2,
  );
}
export async function decodeBackup(file: Blob): Promise<Entry[]> {
  if (file.size > MAX_BACKUP) throw new Error("备份超过 150 MB");
  const data = JSON.parse(await file.text());
  if (
    data.format !== "personal-world-backup" ||
    ![1, 2].includes(data.version) ||
    !Array.isArray(data.records) ||
    data.records.length > 5000
  )
    throw new Error("不是受支持的 Personal World v1 / v2 备份");
  const records: Entry[] = [];
  for (const r of data.records) {
    if (!r || typeof r !== "object") throw new Error("备份资料格式错误");
    const blob =
      r.attachment === undefined
        ? undefined
        : await decodeAttachment(r.attachment);
    const thumbnail =
      r.thumbnailData === undefined
        ? undefined
        : await decodeAttachment(r.thumbnailData);
    if (
      r.images !== undefined &&
      (!Array.isArray(r.images) ||
        r.images.length >
          (r.kind === "projects"
            ? PROJECT_IMAGE_LIMIT
            : r.kind === "notes"
              ? 1
              : 50))
    )
      throw new Error("项目图片数量无效");
    const images =
      r.images === undefined
        ? undefined
        : await Promise.all(
            r.images.map(async (image: Record<string, unknown>) => ({
              ...image,
              blob: await decodeAttachment(image.attachment),
              thumbnail:
                image.thumbnailData === undefined
                  ? undefined
                  : await decodeAttachment(image.thumbnailData),
            })),
          );
    records.push(validateEntry({ ...r, blob, thumbnail, images }));
  }
  mergeEntries([], records);
  return records;
}
export async function decodeAttachment(value: unknown): Promise<Blob> {
  if (typeof value !== "string" || value.length > MAX_FILE * 1.34 + 100)
    throw new Error("备份附件过大或无效");
  const match =
    /^data:(image\/(?:jpeg|png|webp|gif)|application\/pdf);base64,([A-Za-z0-9+/]*={0,2})$/.exec(
      value,
    );
  if (!match) throw new Error("备份附件格式无效");
  const binary = atob(match[2]);
  const blob = new Blob([Uint8Array.from(binary, (c) => c.charCodeAt(0))], {
    type: match[1],
  });
  await validateAttachment(blob);
  return blob;
}
export async function prepareImage(
  file: Blob,
): Promise<{ blob: Blob; thumbnail: Blob }> {
  await validateAttachment(file);
  const image = await createImageBitmap(file);
  try {
    const encode = async (max: number, quality: number) => {
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("浏览器无法生成照片缩略图");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (v) => (v ? resolve(v) : reject(new Error("图片压缩失败"))),
          "image/webp",
          quality,
        ),
      );
    };
    return {
      blob: await encode(2400, 0.88),
      thumbnail: await encode(360, 0.76),
    };
  } finally {
    image.close();
  }
}
export async function validateAttachment(file: Blob) {
  if (file.size > MAX_FILE) throw new Error("单个附件不能超过 25 MB");
  if (file.type === "application/pdf") {
    if (!(await file.slice(0, 5).text()).startsWith("%PDF-"))
      throw new Error("PDF 文件内容无效");
    return;
  }
  if (
    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
  )
    throw new Error("照片请使用 JPEG、PNG、WebP 或 GIF");
  const image = await createImageBitmap(file);
  const huge = image.width * image.height > 80_000_000;
  image.close();
  if (huge) throw new Error("照片超过 8,000 万像素，请先缩小");
}
export function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Materialize lazy public images for an explicit backup/export, never at scene boot. */
export async function resolveImageBlob(
  image: ImageAttachment,
  thumbnail = false,
): Promise<Blob> {
  const source = thumbnail ? image.publicThumbnailURL : image.publicURL;
  const local = thumbnail ? image.thumbnail : image.blob;
  if (!source) {
    if (!local) throw new Error("图片附件不存在");
    return local;
  }
  const u = new URL(source);
  if (
    typeof location === "undefined" ||
    u.origin !== location.origin ||
    !/\/content\/assets\/[a-f0-9]{64}\.(webp|png|jpg|gif)$/.test(u.pathname)
  )
    throw new Error("公开图片来源无效");
  const response = await fetch(u);
  if (!response.ok) throw new Error("公开图片暂时无法下载，请重试");
  const blob = await response.blob();
  await validateAttachment(blob);
  return blob;
}
