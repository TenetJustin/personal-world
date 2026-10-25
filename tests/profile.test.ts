import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  newEntry,
  validateEntry,
  mergeEntries,
  type Entry,
} from "../src/library/model.ts";
import {
  emptyProfile,
  emptyProjectDetails,
  validateProfile,
  profileProgress,
  entryMarkdown,
} from "../src/library/profile.ts";
import { encodeBackup, decodeBackup } from "../src/library/storage.ts";
import {
  createPublicPackage,
  loadPublishedContent,
} from "../src/library/publishing.ts";
import {
  importPublicPackage,
  validatePublicPackage,
} from "../scripts/import_public_content.mjs";
import { validatePublicContent } from "../scripts/validate_public_content.mjs";
function filledProfile() {
  const p = emptyProfile();
  p.about = {
    ...p.about,
    displayName: "原创测试夹具",
    displayNameEN: "Disposable Fixture",
    headline: "资料模型验收",
    introZH: "不是任何真实人物。",
    introEN: "This is not a real person.",
    focus: "类型与迁移测试",
    city: "测试城市",
    githubURL: "https://github.com/example",
    publicEmail: "fixture@example.com",
    socialLinks: [
      { id: "link-social", label: "示例", url: "https://example.com/social" },
    ],
    otherLinks: [
      { id: "link-other", label: "其他", url: "https://example.com" },
    ],
  };
  p.education = [
    {
      id: "edu-1",
      school: "测试学校",
      degree: "测试学位",
      major: "测试专业",
      startDate: "2020-09",
      endDate: "2024-06",
      research: "模型研究",
      courses: "数据课程",
      honors: "测试荣誉",
    },
  ];
  p.experience = [
    {
      id: "exp-1",
      organization: "测试组织",
      role: "测试岗位",
      startDate: "2024-01",
      endDate: "2024-06",
      location: "远程",
      responsibilities: "测试职责",
      contributions: "测试贡献",
      outcomes: "测试成果",
      tools: "TypeScript",
    },
  ];
  p.skills = [
    {
      id: "skill-1",
      category: "工程",
      name: "TypeScript",
      context: "测试工具",
      relatedProjects: "测试项目",
      sortOrder: 2,
    },
  ];
  p.awards = [
    {
      id: "award-1",
      name: "测试奖项",
      organization: "测试颁发方",
      date: "2024-06",
      contribution: "测试团队贡献",
      proofURL: "https://example.com/proof",
      imageIds: [],
    },
  ];
  return p;
}
test("profile accepts partial local drafts, tracks actual missing fields and validates all repeatable structures", () => {
  const p = emptyProfile();
  assert.equal(profileProgress(p).about.done, 0);
  assert.deepEqual(profileProgress(p).about.missing, [
    "展示名称",
    "一句话身份介绍",
    "中文个人介绍",
  ]);
  assert.deepEqual(validateProfile(p), p);
  const filled = filledProfile();
  assert.equal(profileProgress(filled).about.done, 3);
  assert.deepEqual(validateProfile(filled), filled);
  const markdown = entryMarkdown({
    ...newEntry("resume", "结构化导出"),
    structuredProfile: filled,
  });
  assert.ok(markdown.includes(filled.about.introEN));
  assert.ok(markdown.includes(filled.education[0].school));
  assert.ok(markdown.includes(filled.awards[0].proofURL));
  assert.throws(() =>
    validateProfile({
      ...filled,
      about: { ...filled.about, publicEmail: "invalid" },
    }),
  );
  assert.throws(() =>
    validateProfile({
      ...filled,
      about: { ...filled.about, githubURL: "javascript:alert(1)" },
    }),
  );
  assert.throws(() =>
    validateProfile({
      ...filled,
      skills: [{ ...filled.skills[0], sortOrder: Infinity }],
    }),
  );
  assert.throws(() =>
    validateProfile({
      ...filled,
      education: [filled.education[0], filled.education[0]],
    }),
  );
});
test("v1/v2 legacy data and V3 text fields share the same compatible store/backup format", async () => {
  const legacy = newEntry("projects", "旧项目"),
    profile = {
      ...newEntry("resume", "资料测试"),
      structuredProfile: filledProfile(),
      publicationStatus: "ready" as const,
    },
    project = {
      ...newEntry("projects", "新项目"),
      projectDetails: {
        ...emptyProjectDetails(),
        summaryZH: "简介",
        summaryEN: "Summary",
        problem: "问题",
        contribution: "贡献",
        features: "功能",
        results: "成果",
        awards: "获奖",
        time: "2024",
        status: "已完成",
      },
    },
    photo = {
      ...newEntry("photos", "照片说明"),
      photoTakenAt: "2024-01-01T12:00",
      photoLocation: "PRIVATE_PLACE",
      photoLocationPublic: false,
      isAlbumCover: true,
    };
  const restored = await decodeBackup(
    new Blob([await encodeBackup([legacy, profile, project, photo])]),
  );
  assert.deepEqual(restored[1].structuredProfile, profile.structuredProfile);
  assert.deepEqual(restored[2].projectDetails, project.projectDetails);
  assert.equal(restored[3].photoLocation, "PRIVATE_PLACE");
  assert.equal(restored[3].photoLocationPublic, false);
  assert.equal(restored[3].isAlbumCover, true);
  assert.equal(restored[0].id, legacy.id);
  assert.equal(mergeEntries([legacy], restored).length, 4);
  for (const version of [1, 2]) {
    const old = await decodeBackup(
      new Blob([
        JSON.stringify({
          format: "personal-world-backup",
          version,
          records: [legacy],
        }),
      ]),
    );
    assert.deepEqual(old[0], legacy);
  }
});
test("photo location stays private by default; readiness is never permission to publish", async () => {
  const photo = {
    ...newEntry("photos", "隐私测试"),
    photoTakenAt: "2024-01-01",
    photoLocation: "PRIVATE_LOCATION",
    publicationStatus: "ready" as const,
  };
  await assert.rejects(createPublicPackage([photo], [photo.id], false));
  const pack = await createPublicPackage([photo], [photo.id], true);
  assert.ok(!JSON.stringify(pack).includes("PRIVATE_LOCATION"));
  assert.equal(pack.records[0].photoTakenAt, photo.photoTakenAt);
  assert.equal(pack.records[0].publicationStatus, undefined);
  const opted = await createPublicPackage(
    [{ ...photo, photoLocationPublic: true }],
    [photo.id],
    true,
  );
  assert.equal(opted.records[0].photoLocation, "PRIVATE_LOCATION");
  await assert.rejects(
    validatePublicPackage({
      ...pack,
      records: [{ ...pack.records[0], photoLocation: "FORBIDDEN" }],
    }),
  );
});
test("avatar, award proofs and note cover survive backup; public importer strips EXIF and excludes orphan media", async () => {
  const bytes = await sharp({
    create: { width: 64, height: 48, channels: 3, background: "#719688" },
  })
    .withExif({ IFD0: { Artist: "PRIVATE_CAMERA_OWNER" } })
    .jpeg()
    .toBuffer();
  assert.ok((await sharp(bytes).metadata()).exif);
  const media = (id: string) => ({
    id,
    name: `${id}.jpg`,
    blob: new Blob([bytes], { type: "image/jpeg" }),
  });
  const p = filledProfile();
  p.about.avatarId = "avatar";
  p.awards[0].imageIds = ["proof"];
  const entry: Entry = {
    ...newEntry("resume", "资料图片测试"),
    structuredProfile: p,
    images: [media("avatar"), media("proof"), media("old-unused-avatar")],
  };
  const note: Entry = {
    ...newEntry("notes", "封面笔记"),
    coverImageId: "cover",
    images: [media("cover")],
    body: "测试封面",
  };
  const previousBitmap = globalThis.createImageBitmap;
  globalThis.createImageBitmap = (async (blob: Blob) => {
    const m = await sharp(Buffer.from(await blob.arrayBuffer())).metadata();
    return { width: m.width, height: m.height, close() {} };
  }) as typeof createImageBitmap;
  try {
    const restored = await decodeBackup(
      new Blob([await encodeBackup([entry, note])]),
    );
    assert.deepEqual(restored[0].structuredProfile, p);
    assert.equal(restored[0].images?.length, 3);
    assert.deepEqual(
      Buffer.from(await restored[0].images![0].blob.arrayBuffer()),
      bytes,
    );
    assert.equal(restored[1].coverImageId, "cover");
  } finally {
    if (previousBitmap) globalThis.createImageBitmap = previousBitmap;
    else
      delete (globalThis as unknown as Record<string, unknown>)
        .createImageBitmap;
  }
  const pack = await createPublicPackage(
    [entry, note],
    [entry.id, note.id],
    true,
  );
  assert.equal(pack.records[0].images?.length, 2);
  assert.ok(!JSON.stringify(pack).includes("old-unused-avatar"));
  const directory = await mkdtemp(join(tmpdir(), "pw-v3-profile-"));
  try {
    const input = join(directory, "reviewed.json"),
      destination = join(directory, "content");
    await writeFile(input, JSON.stringify(pack));
    const result = await importPublicPackage(input, destination);
    assert.equal(result.records, 2);
    const manifest = JSON.parse(
      await readFile(join(destination, "manifest.json"), "utf8"),
    );
    for (const record of manifest.records)
      for (const image of record.images ?? []) {
        const asset = await readFile(join(destination, image.attachment));
        const meta = await sharp(asset).metadata();
        assert.equal(meta.exif, undefined);
        assert.equal(meta.format, "webp");
      }
    assert.deepEqual(await validatePublicContent(destination), {
      records: 2,
      assets: 1,
      privateBackupsIncluded: false,
    });
    const previousFetch = globalThis.fetch,
      previousLocation = globalThis.location;
    globalThis.location = { origin: "https://example.test" } as Location;
    globalThis.fetch = (async (input: URL | string) => {
      const path = new URL(String(input)).pathname;
      const relative = path.replace("/personal-world/content/", "");
      const data = await readFile(join(destination, relative));
      return new Response(data, {
        headers: {
          "content-type": relative.endsWith(".json")
            ? "application/json"
            : "image/webp",
        },
      });
    }) as typeof fetch;
    try {
      const loaded = await loadPublishedContent("/personal-world/");
      assert.deepEqual(loaded[0].structuredProfile, p);
      assert.equal(loaded[0].images?.length, 2);
      assert.equal(loaded[1].coverImageId, "cover");
    } finally {
      globalThis.fetch = previousFetch;
      if (previousLocation) globalThis.location = previousLocation;
      else delete (globalThis as unknown as Record<string, unknown>).location;
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("CI blocks manually committed image metadata and unknown nested public fields", async () => {
  const p = filledProfile(),
    e = { ...newEntry("resume", "测试"), structuredProfile: p };
  const pack = await createPublicPackage([e], [e.id], true);
  await assert.rejects(
    validatePublicPackage({
      ...pack,
      records: [
        {
          ...pack.records[0],
          structuredProfile: { ...p, privateNotes: "NOT_ALLOWED" },
        },
      ],
    }),
  );
  const { createHash } = await import("node:crypto");
  const { mkdir } = await import("node:fs/promises");
  const bytes = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#82998a" },
  })
    .withExif({ IFD0: { Artist: "PRIVATE_TEST_OWNER" } })
    .jpeg()
    .toBuffer();
  const hash = createHash("sha256").update(bytes).digest("hex"),
    directory = await mkdtemp(join(tmpdir(), "pw-exif-gate-"));
  try {
    await mkdir(join(directory, "assets"));
    await writeFile(join(directory, "assets", hash + ".jpg"), bytes);
    await writeFile(
      join(directory, "manifest.json"),
      JSON.stringify({
        format: "personal-world-published",
        version: 1,
        publishedAt: new Date().toISOString(),
        records: [
          { ...newEntry("photos", "测试"), attachment: `assets/${hash}.jpg` },
        ],
      }),
    );
    await assert.rejects(validatePublicContent(directory), /EXIF/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
