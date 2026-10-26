#!/usr/bin/env node
import { PROJECT_IMAGE_LIMIT } from "../src/library/projectShowcase.ts";
// Only explicit reviewed packages enter public/content; complete backups are rejected.
import {
  readFile,
  writeFile,
  mkdir,
  rename,
  rm,
  readdir,
} from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { createHash } from "node:crypto";
import {
  validateEntry,
  mergeEntries,
  MAX_BACKUP,
} from "../src/library/model.ts";
const fields = new Set([
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
  "attachment",
  "thumbnailData",
  "images",
]);
const extensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function decode(value) {
  if (typeof value !== "string" || value.length > 35_000_000)
    throw new Error("公开附件无效或过大");
  const m =
    /^data:(image\/(?:jpeg|png|webp|gif)|application\/pdf);base64,([A-Za-z0-9+/]*={0,2})$/.exec(
      value,
    );
  if (!m || m[2].length % 4 !== 0)
    throw new Error("附件仅接受有效 JPEG / PNG / WebP / GIF / PDF");
  let bytes = Buffer.from(m[2], "base64");
  const magic =
    (m[1] === "application/pdf" &&
      bytes.subarray(0, 5).toString() === "%PDF-") ||
    (m[1] === "image/png" &&
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (m[1] === "image/jpeg" &&
      bytes[0] === 255 &&
      bytes[1] === 216 &&
      bytes[2] === 255) ||
    (m[1] === "image/webp" &&
      bytes.subarray(0, 4).toString() === "RIFF" &&
      bytes.subarray(8, 12).toString() === "WEBP") ||
    (m[1] === "image/gif" &&
      /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString()));
  if (!magic || bytes.length > 25 * 1024 * 1024)
    throw new Error("附件头部或文件大小无效");
  let type = m[1];
  if (type.startsWith("image/")) {
    bytes = await sharp(bytes, { limitInputPixels: 80_000_000 })
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 88 })
      .toBuffer();
    type = "image/webp";
  }
  return { bytes, type, path: `assets/${digest(bytes)}.${extensions[type]}` };
}
export async function validatePublicPackage(data) {
  if (
    !data ||
    data.format !== "personal-world-public-package" ||
    data.version !== 1 ||
    typeof data.reviewedAt !== "string" ||
    !Number.isFinite(Date.parse(data.reviewedAt)) ||
    !Array.isArray(data.records) ||
    !data.records.length ||
    data.records.length > 5000
  )
    throw new Error("只接受逐项审核后导出的公开内容包；不能使用完整备份");
  const assets = new Map(),
    entries = [],
    records = [];
  let total = 0;
  async function asset(value) {
    const a = await decode(value);
    assets.set(a.path, a.bytes);
    total += a.bytes.length;
    if (total > 100 * 1024 * 1024) throw new Error("公开资料超过 100 MB");
    return a;
  }
  for (const r of data.records) {
    if (
      !r ||
      typeof r !== "object" ||
      Object.keys(r).some((k) => !fields.has(k))
    )
      throw new Error("公开记录包含未授权字段或本地回收站数据");
    if (r.photoLocation && r.photoLocationPublic !== true)
      throw new Error("照片地点未明确选择公开，不能进入静态内容");
    const record = { ...r };
    const blob = r.attachment ? await asset(r.attachment) : undefined;
    const thumbnail = r.thumbnailData
      ? await asset(r.thumbnailData)
      : undefined;
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
    const imageAssets = [];
    const images = r.images
      ? await Promise.all(
          r.images.map(async (i) => {
            if (
              !i ||
              Object.keys(i).some(
                (k) =>
                  !["id", "name", "attachment", "thumbnailData"].includes(k),
              )
            )
              throw new Error("图片字段无效");
            const a = await asset(i.attachment),
              t = i.thumbnailData ? await asset(i.thumbnailData) : undefined;
            imageAssets.push({
              id: i.id,
              name: i.name,
              attachment: a.path,
              ...(t ? { thumbnailData: t.path } : {}),
            });
            return {
              id: i.id,
              name: i.name,
              blob: new Blob([a.bytes], { type: a.type }),
              ...(t
                ? { thumbnail: new Blob([t.bytes], { type: t.type }) }
                : {}),
            };
          }),
        )
      : undefined;
    const valid = validateEntry({
      ...r,
      blob: blob ? new Blob([blob.bytes], { type: blob.type }) : undefined,
      thumbnail: thumbnail
        ? new Blob([thumbnail.bytes], { type: thumbnail.type })
        : undefined,
      images,
    });
    if (valid.structuredProfile || valid.kind === "notes") {
      const refs = valid.structuredProfile
        ? new Set([
            valid.structuredProfile.about.avatarId,
            ...valid.structuredProfile.awards.flatMap((a) => a.imageIds),
          ])
        : new Set([valid.coverImageId]);
      if (valid.images?.some((i) => !refs.has(i.id)))
        throw new Error(
          "公开内容包含未引用的旧头像、封面或证明图片，请重新在浏览器审核导出",
        );
    }
    entries.push(valid);
    if (valid.structuredProfile) {
      const canonical = (v) => {
        if (Array.isArray(v)) return v.map(canonical);
        if (v && typeof v === "object")
          return Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, canonical(v[k])]),
          );
        return v;
      };
      if (
        JSON.stringify(canonical(valid.structuredProfile)) !==
        JSON.stringify(canonical(r.structuredProfile))
      )
        throw new Error(
          "个人资料公开结构包含未知字段，请使用填写中心重新审核导出",
        );
      record.structuredProfile = valid.structuredProfile;
    }
    if (valid.projectDetails) {
      const keys = Object.keys(valid.projectDetails).sort(),
        original = Object.keys(r.projectDetails ?? {}).sort();
      if (JSON.stringify(keys) !== JSON.stringify(original))
        throw new Error("项目公开详情包含未知字段，请重新审核导出");
      record.projectDetails = valid.projectDetails;
    }
    if (blob) {
      record.attachment = blob.path;
      if (blob.type === "image/webp" && record.fileName)
        record.fileName = record.fileName.replace(/\.[^.]+$/, "") + ".webp";
    }
    if (thumbnail) record.thumbnailData = thumbnail.path;
    if (r.images)
      record.images = r.images.map((i) =>
        imageAssets.find((x) => x.id === i.id),
      );
    records.push(record);
  }
  mergeEntries([], entries);
  return {
    manifest: {
      format: "personal-world-published",
      version: 1,
      publishedAt: new Date().toISOString(),
      records,
    },
    assets,
  };
}
export async function importPublicPackage(
  input,
  destination = resolve("public/content"),
) {
  const bytes = await readFile(input);
  if (bytes.length > MAX_BACKUP) throw new Error("公开内容包超过 150 MB");
  const { manifest, assets } = await validatePublicPackage(
    JSON.parse(bytes.toString()),
  );
  const temp = `${destination}.next-${process.pid}`;
  await mkdir(join(temp, "assets"), { recursive: true });
  try {
    for (const [path, data] of assets) await writeFile(join(temp, path), data);
    await writeFile(
      join(temp, "manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n",
    );
    try {
      await writeFile(
        join(temp, "schema.json"),
        await readFile(join(destination, "schema.json")),
      );
    } catch {}
    // All validation and asset writes finish before replacing the checked static package.
    await mkdir(destination, { recursive: true });
    await mkdir(join(destination, "assets"), { recursive: true });
    for (const [path] of assets)
      await rename(join(temp, path), join(destination, path));
    await rename(
      join(temp, "manifest.json"),
      join(destination, "manifest.json"),
    );
    const used = new Set([...assets.keys()].map((x) => x.split("/")[1]));
    for (const name of await readdir(join(destination, "assets")))
      if (!used.has(name))
        await rm(join(destination, "assets", name), { force: true });
    return { records: manifest.records.length, assets: assets.size };
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  const source = process.argv[2];
  if (!source) {
    console.error(
      "Usage: node scripts/import_public_content.mjs /path/to/reviewed-public-package.json",
    );
    process.exitCode = 1;
  } else
    try {
      console.log(
        JSON.stringify(await importPublicPackage(resolve(source)), null, 2),
      );
    } catch (e) {
      console.error(e.message);
      process.exitCode = 1;
    }
}
