#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const sourceDirectory = process.argv[2] ? resolve(process.argv[2]) : null;
if (!sourceDirectory) {
  console.error(
    "Usage: node scripts/add_personal_photos.mjs /path/to/source-directory",
  );
  process.exit(1);
}

const catalogPath = join(
  root,
  "docs/personal-content/photo-library-source.json",
);
const manifestPath = join(root, "public/content/manifest.json");
const assetsDirectory = join(root, "public/content/assets");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

if (
  catalog.version !== 1 ||
  !Array.isArray(catalog.items) ||
  catalog.items.length !== 17 ||
  !Number.isFinite(Date.parse(catalog.reviewedAt))
) {
  throw new Error("Personal photo catalog is invalid");
}

await mkdir(assetsDirectory, { recursive: true });
const records = [];
let fullBytes = 0;
let thumbnailBytes = 0;
for (const [index, item] of catalog.items.entries()) {
  const sourcePath = join(sourceDirectory, basename(item.sourceFile));
  const source = await readFile(sourcePath);
  if (digest(source) !== item.sourceSha256)
    throw new Error(`Source hash mismatch: ${item.sourceFile}`);

  const pipeline = sharp(source, { limitInputPixels: 80_000_000 }).rotate();
  const full = await pipeline
    .clone()
    .resize({
      width: 2400,
      height: 2400,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 86, effort: 6 })
    .toBuffer();
  const thumbnail = await pipeline
    .clone()
    .resize({
      width: 480,
      height: 480,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 76, effort: 6 })
    .toBuffer();
  const fullName = `${digest(full)}.webp`;
  const thumbnailName = `${digest(thumbnail)}.webp`;
  await writeFile(join(assetsDirectory, fullName), full);
  await writeFile(join(assetsDirectory, thumbnailName), thumbnail);
  fullBytes += full.length;
  thumbnailBytes += thumbnail.length;
  records.push({
    id: item.id,
    kind: "photos",
    title: item.title,
    body: item.body,
    tags: item.tags,
    url: "",
    createdAt: catalog.reviewedAt,
    updatedAt: catalog.reviewedAt,
    fileName: `${item.id}.webp`,
    album: item.album,
    sortOrder: index,
    ...(item.isAlbumCover ? { isAlbumCover: true } : {}),
    attachment: `assets/${fullName}`,
    thumbnailData: `assets/${thumbnailName}`,
  });
}

manifest.records = [
  ...manifest.records.filter(
    (record) =>
      record.kind !== "photos" || !record.id.startsWith("personal-photo-"),
  ),
  ...records,
];
manifest.publishedAt = catalog.reviewedAt;
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      photos: records.length,
      fullBytes,
      thumbnailBytes,
    },
    null,
    2,
  ),
);
