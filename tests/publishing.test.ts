import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newEntry, validateEntry, libraryBytes } from "../src/library/model.ts";
import { encodeBackup, decodeBackup } from "../src/library/storage.ts";
import { createPublicPackage } from "../src/library/publishing.ts";
import {
  validatePublicPackage,
  importPublicPackage,
} from "../scripts/import_public_content.mjs";
test("public export is opt-in, excludes unselected drafts/trash and accepts no private metadata", async () => {
  const publicNote = {
      ...newEntry("notes", "公开测试"),
      category: "随笔",
      body: "只用于单元测试的正文",
    },
    privateNote = {
      ...newEntry("notes", "私密测试"),
      body: "不应出现在公开包",
    },
    trashed = {
      ...newEntry("notes", "删除测试"),
      deletedAt: new Date().toISOString(),
    };
  await assert.rejects(
    createPublicPackage([publicNote, privateNote], [publicNote.id], false),
  );
  await assert.rejects(createPublicPackage([trashed], [trashed.id], true));
  const pack = await createPublicPackage(
    [publicNote, privateNote],
    [publicNote.id],
    true,
  );
  assert.equal(pack.records.length, 1);
  assert.equal(pack.records[0].category, "随笔");
  assert.ok(!JSON.stringify(pack).includes(privateNote.body));
  assert.ok(!JSON.stringify(pack).includes("deletedAt"));
  const checked = await validatePublicPackage(pack);
  assert.equal(checked.manifest.records.length, 1);
  assert.equal(checked.assets.size, 0);
  await assert.rejects(
    validatePublicPackage({
      ...pack,
      records: [{ ...pack.records[0], secret: "forbidden" }],
    }),
  );
  await assert.rejects(
    validatePublicPackage(JSON.parse(await encodeBackup([privateNote]))),
  );
});
test("reviewed PDF package produces hashed static assets, never source paths or data URLs", async () => {
  const e = {
    ...newEntry("resume", "测试结构履历"),
    resume: {
      profile: "简介",
      education: "教育",
      experience: "经历",
      projects: "项目",
      skills: "技能",
      awards: "荣誉",
    },
    blob: new Blob(["%PDF-1.7\nfixture\n%%EOF"], { type: "application/pdf" }),
    fileName: "private-original-name.pdf",
  };
  const pack = await createPublicPackage([e], [e.id], true),
    checked = await validatePublicPackage(pack);
  assert.match(
    checked.manifest.records[0].attachment!,
    /^assets\/[a-f0-9]{64}\.pdf$/,
  );
  assert.ok(!JSON.stringify(checked.manifest).includes("data:"));
  assert.equal(checked.manifest.records[0].resume?.skills, "技能");
  const dir = await mkdtemp(join(tmpdir(), "pw-public-test-"));
  try {
    const input = join(dir, "reviewed.json");
    await writeFile(input, JSON.stringify(pack));
    const result = await importPublicPackage(input, join(dir, "content"));
    assert.equal(result.assets, 1);
    const stored = JSON.parse(
      await readFile(join(dir, "content/manifest.json"), "utf8"),
    );
    assert.equal(stored.records[0].id, e.id);
    assert.deepEqual(
      await readFile(join(dir, "content", stored.records[0].attachment)),
      Buffer.from(await e.blob.arrayBuffer()),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("importer rejects malformed attachments, unsafe public links and duplicate records before writing", async () => {
  const e = newEntry("resume", "测试"),
    pack = await createPublicPackage([e], [e.id], true);
  await assert.rejects(
    validatePublicPackage({
      ...pack,
      records: [
        { ...pack.records[0], attachment: "data:application/pdf;base64,eA==" },
      ],
    }),
  );
  await assert.rejects(
    validatePublicPackage({
      ...pack,
      records: [{ ...pack.records[0], demoURL: "javascript:alert(1)" }],
    }),
  );
  await assert.rejects(
    validatePublicPackage({
      ...pack,
      records: [pack.records[0], pack.records[0]],
    }),
  );
  await assert.rejects(
    validatePublicPackage({
      ...pack,
      records: [{ ...pack.records[0], attachment: "../../private.pdf" }],
    }),
  );
});
test("v1 backups migrate without rewriting original records and v2 preserves structured metadata", async () => {
  const old = newEntry("notes", "旧笔记");
  const restored = await decodeBackup(
    new Blob([
      JSON.stringify({
        format: "personal-world-backup",
        version: 1,
        records: [old],
      }),
    ]),
  );
  assert.equal(restored[0].id, old.id);
  assert.equal(restored[0].body, old.body);
  const project = {
    ...newEntry("projects", "项目"),
    category: "Web",
    sortOrder: 2,
    technology: "TypeScript",
    githubURL: "https://github.com/example/project",
    demoURL: "https://example.com",
  };
  const e = {
    ...newEntry("resume", "履历"),
    resume: {
      profile: "介绍",
      education: "教育",
      experience: "工作",
      projects: "项目",
      skills: "技能",
      awards: "奖项",
    },
  };
  const backup = await encodeBackup([project, e]);
  assert.equal(JSON.parse(backup).version, 2);
  const result = await decodeBackup(new Blob([backup]));
  assert.deepEqual(result[0], validateEntry(project));
  assert.deepEqual(result[1].resume, e.resume);
  assert.ok(libraryBytes(result) > 0);
});
