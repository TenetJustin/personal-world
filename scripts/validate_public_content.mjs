import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { validatePublicPackage } from "./import_public_content.mjs";

// The build reads only the reviewed, committed static package, never IndexedDB or backups.
export async function validatePublicContent(directory = "public/content") {
  const root = resolve(directory);
  const bytes = await readFile(resolve(root, "manifest.json"));
  if (bytes.length > 12 * 1024 * 1024)
    throw new Error("Public manifest is too large");
  const manifest = JSON.parse(bytes.toString());
  if (
    !manifest ||
    Object.keys(manifest).some(
      (k) => !["format", "version", "publishedAt", "records"].includes(k),
    ) ||
    manifest.format !== "personal-world-published" ||
    manifest.version !== 1 ||
    !Array.isArray(manifest.records)
  )
    throw new Error(
      "Invalid published manifest; a full private backup must never be published",
    );
  if (
    manifest.records.length &&
    (typeof manifest.publishedAt !== "string" ||
      !Number.isFinite(Date.parse(manifest.publishedAt)))
  )
    throw new Error(
      "Non-empty published content needs a review/publication date",
    );
  if (
    !manifest.records.length &&
    manifest.publishedAt !== null &&
    !Number.isFinite(Date.parse(manifest.publishedAt))
  )
    throw new Error("Invalid empty publication date");
  const referenced = new Set();
  const mime = {
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    pdf: "application/pdf",
  };
  const asset = async (path) => {
    const match =
      typeof path === "string" &&
      /^assets\/([a-f0-9]{64})\.(jpg|png|webp|gif|pdf)$/.exec(path);
    if (!match)
      throw new Error("Public attachment must be a hashed local content asset");
    const data = await readFile(resolve(root, path));
    if (createHash("sha256").update(data).digest("hex") !== match[1])
      throw new Error("Public attachment hash mismatch");
    referenced.add(path);
    return `data:${mime[match[2]]};base64,${data.toString("base64")}`;
  };
  const records = [];
  for (const record of manifest.records) {
    const r = { ...record };
    if (r.attachment) r.attachment = await asset(r.attachment);
    if (r.thumbnailData) r.thumbnailData = await asset(r.thumbnailData);
    if (r.images)
      r.images = await Promise.all(
        r.images.map(async (image) => ({
          ...image,
          attachment: await asset(image.attachment),
          ...(image.thumbnailData
            ? { thumbnailData: await asset(image.thumbnailData) }
            : {}),
        })),
      );
    records.push(r);
  }
  if (records.length)
    await validatePublicPackage({
      format: "personal-world-public-package",
      version: 1,
      reviewedAt: manifest.publishedAt,
      records,
    });
  const allowed = new Set(["manifest.json", "schema.json", "assets"]);
  for (const name of await readdir(root))
    if (!allowed.has(name))
      throw new Error(
        "Unexpected file in public/content; publish packages only",
      );
  let diskAssets = [];
  try {
    diskAssets = await readdir(resolve(root, "assets"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  for (const name of diskAssets)
    if (!referenced.has("assets/" + name))
      throw new Error(
        "Orphan public content attachment must be removed before deployment",
      );
  return {
    records: records.length,
    assets: referenced.size,
    privateBackupsIncluded: false,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)
) {
  try {
    console.log(
      JSON.stringify(await validatePublicContent(process.argv[2]), null, 2),
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
