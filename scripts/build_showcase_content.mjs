import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { importPublicPackage } from "./import_public_content.mjs";
import { showcaseCatalog } from "./showcase_catalog.mjs";
import { emptyProjectDetails } from "../src/library/profile.ts";
if (!process.argv.includes("--reviewed"))
  throw new Error("需要逐项审核内容与授权后显式传入 --reviewed");
const root = resolve(process.argv[2] || "work/showcase/raw");
await mkdir("work/showcase", { recursive: true });
await mkdir("docs/projects", { recursive: true });
const now = new Date().toISOString();
const records = [];
const sources = [];
for (const [order, project] of showcaseCatalog.entries()) {
  const images = [];
  const imageNotes = [];
  for (const material of project.images) {
    const original = await readFile(resolve(root, material.file));
    const meta = await sharp(original).metadata();
    let pipeline = sharp(original)
      .rotate()
      .resize({
        width: material.file.startsWith("moirai/") ? 800 : 1920,
        height: material.file.startsWith("moirai/") ? 1200 : 2400,
        fit: "inside",
        withoutEnlargement: true,
      });
    if (project.slug === "courtcast")
      pipeline = pipeline.sharpen({ sigma: 0.35, m1: 0.25, m2: 0.5 });
    const full = await pipeline.webp({ quality: 90 }).toBuffer();
    const thumb = await sharp(original)
      .rotate()
      .resize({
        width: 480,
        height: 480,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();
    images.push({
      id: material.id,
      name: material.title,
      attachment: `data:image/webp;base64,${full.toString("base64")}`,
      thumbnailData: `data:image/webp;base64,${thumb.toString("base64")}`,
    });
    imageNotes.push({
      imageId: material.id,
      title: material.title,
      caption: material.caption,
      kind: material.kind,
      sourceURL: material.sourceURL,
      revision: material.revision,
      license: material.license,
    });
    sources.push({
      project: project.slug,
      imageId: material.id,
      title: material.title,
      sourceURL: material.sourceURL,
      sourceRevision: material.revision,
      originalRepository:
        project.slug === "courtcast"
          ? "TenetJustin/CourtCast (private)"
          : material.sourceURL.includes("/blob/")
            ? material.sourceURL.split("github.com/")[1].split("/blob/")[0]
            : "TenetJustin/MOIRAI-public-app",
      originalPath:
        project.slug === "courtcast"
          ? "user-upload/" +
            {
              "courtcast-cover":
                "codex-clipboard-3e1dab4b-f117-4f8b-9868-d51f5c06613f.png",
              "courtcast-analysis":
                "codex-clipboard-ff720f18-6b9f-4e31-84dd-4c191bc94088.png",
              "courtcast-player":
                "codex-clipboard-5164319b-05ba-4d48-b085-d5e2f1255f85.png",
            }[material.id]
          : material.sourceURL.includes("/blob/")
            ? material.sourceURL
                .split("/blob/")[1]
                .split("/")
                .slice(1)
                .join("/")
            : "official website browser capture 2026-10-26",
      sourceSHA256: createHash("sha256").update(original).digest("hex"),
      originalDimensions: { width: meta.width, height: meta.height },
      materialType: material.kind,
      captureMethod:
        project.slug === "courtcast"
          ? "user-provided project captures; current backend not rerun"
          : material.file.startsWith("moirai-ui/") ||
              material.kind === "workflow"
            ? "actual Chrome browser screenshot captured this task"
            : material.kind === "screenshot"
              ? "existing repository screenshot; capture environment not independently verified"
              : "original public-distribution artwork; not a browser screenshot",
      displayPermission: material.license,
      processing:
        project.slug === "courtcast"
          ? "mild deterministic sharpen sigma 0.35, WebP, no invented text or geometry"
          : "proportional downscale, WebP; metadata removed",
    });
  }
  records.push({
    id: `project-${project.slug}`,
    kind: "projects",
    title: project.title,
    body: project.body,
    tags: project.category,
    category: project.category,
    technology: project.technology,
    url: "",
    githubURL: project.githubURL,
    demoURL: project.demoURL,
    createdAt: now,
    updatedAt: now,
    sortOrder: order,
    images,
    projectDetails: {
      ...emptyProjectDetails(),
      summaryZH: project.summary,
      summaryEN: project.subtitle,
      problem: project.problem,
      contribution: project.role,
      features: project.features,
      results: project.results,
      status: project.status,
    },
    projectShowcase: {
      version: 1,
      galleryType: project.galleryType || "screenshots",
      subtitle: project.subtitle,
      credits: project.credits,
      upstreamURL: project.upstreamURL,
      coverId: images[0]?.id || "",
      tarotIds:
        project.galleryType === "tarot"
          ? images.slice(0, 12).map((image) => image.id)
          : [],
      cycleSeconds: 36,
      imageNotes,
    },
  });
}
const current = JSON.parse(
  await readFile("public/content/manifest.json", "utf8"),
);
const ids = new Set(records.map((record) => record.id));
// Preserve unrelated published content. This initial import never reads IndexedDB or private backups.
async function embedExisting(record) {
  const value = structuredClone(record);
  async function asset(path) {
    const match = /^assets\/[a-f0-9]{64}\.(webp|png|jpg|jpeg|gif|pdf)$/.exec(
      path,
    );
    if (!match) throw new Error("已有公开素材路径无效");
    const bytes = await readFile(resolve("public/content", path));
    const mime =
      match[1] === "pdf"
        ? "application/pdf"
        : "image/" + (match[1] === "jpg" ? "jpeg" : match[1]);
    return `data:${mime};base64,${bytes.toString("base64")}`;
  }
  for (const field of ["attachment", "thumbnailData"])
    if (value[field]) value[field] = await asset(value[field]);
  if (value.images)
    value.images = await Promise.all(
      value.images.map(async (image) => ({
        ...image,
        attachment: await asset(image.attachment),
        ...(image.thumbnailData
          ? { thumbnailData: await asset(image.thumbnailData) }
          : {}),
      })),
    );
  return value;
}
const preserved = await Promise.all(
  current.records.filter((record) => !ids.has(record.id)).map(embedExisting),
);
const pack = {
  format: "personal-world-public-package",
  version: 1,
  reviewedAt: now,
  records: [...preserved, ...records],
};
const input = "work/showcase/reviewed-projects-package.json";
await writeFile(input, JSON.stringify(pack));
const result = await importPublicPackage(input);
const published = JSON.parse(
  await readFile("public/content/manifest.json", "utf8"),
);
for (const source of sources) {
  const project = published.records.find(
    (record) => record.id === `project-${source.project}`,
  );
  const image = project.images.find((image) => image.id === source.imageId);
  source.publishedAsset = image.attachment;
  source.thumbnailAsset = image.thumbnailData;
  source.publishedBytes = (
    await readFile("public/content/" + image.attachment)
  ).length;
}
await writeFile(
  "docs/projects/asset-sources.json",
  JSON.stringify(
    {
      version: 1,
      reviewedAt: now,
      authorization:
        "User confirmed CityOS and MindCare team approval; instructed use of own MOIRAI/Seacoconut public-distribution assets; supplied CourtCast captures on 2026-10-26. No general asset relicensing.",
      sources,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    {
      result,
      projects: records.map((record) => ({
        id: record.id,
        images: record.images.length,
        tarot: record.projectShowcase.tarotIds.length,
      })),
      fullImageBytes: sources.reduce(
        (sum, source) => sum + source.publishedBytes,
        0,
      ),
    },
    null,
    2,
  ),
);
