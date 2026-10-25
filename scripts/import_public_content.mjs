#!/usr/bin/env node
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
function decode(value) {
  if (typeof value !== "string" || value.length > 35_000_000)
    throw new Error("公开附件无效或过大");
  const m =
    /^data:(image\/(?:jpeg|png|webp|gif)|application\/pdf);base64,([A-Za-z0-9+/]*={0,2})$/.exec(
      value,
    );
  if (!m || m[2].length % 4 !== 0)
    throw new Error("附件仅接受有效 JPEG / PNG / WebP / GIF / PDF");
  const bytes = Buffer.from(m[2], "base64");
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
  return {
    bytes,
    type: m[1],
    path: `assets/${digest(bytes)}.${extensions[m[1]]}`,
  };
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
  function asset(value) {
    const a = decode(value);
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
    const record = { ...r };
    const blob = r.attachment ? asset(r.attachment) : undefined;
    const thumbnail = r.thumbnailData ? asset(r.thumbnailData) : undefined;
    if (
      r.images !== undefined &&
      (!Array.isArray(r.images) || r.images.length > 12)
    )
      throw new Error("项目图片数量无效");
    const images = r.images?.map((i) => {
      if (
        !i ||
        Object.keys(i).some(
          (k) => !["id", "name", "attachment", "thumbnailData"].includes(k),
        )
      )
        throw new Error("图片字段无效");
      const a = asset(i.attachment),
        t = i.thumbnailData ? asset(i.thumbnailData) : undefined;
      return {
        id: i.id,
        name: i.name,
        blob: new Blob([a.bytes], { type: a.type }),
        ...(t ? { thumbnail: new Blob([t.bytes], { type: t.type }) } : {}),
      };
    });
    entries.push(
      validateEntry({
        ...r,
        blob: blob ? new Blob([blob.bytes], { type: blob.type }) : undefined,
        thumbnail: thumbnail
          ? new Blob([thumbnail.bytes], { type: thumbnail.type })
          : undefined,
        images,
      }),
    );
    if (blob) record.attachment = blob.path;
    if (thumbnail) record.thumbnailData = thumbnail.path;
    if (r.images)
      record.images = r.images.map((i) => ({
        id: i.id,
        name: i.name,
        attachment: decode(i.attachment).path,
        ...(i.thumbnailData
          ? { thumbnailData: decode(i.thumbnailData).path }
          : {}),
      }));
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
