import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assetURL, appURL, sitePath } from "../src/site.ts";
import { validatePublicContent } from "../scripts/validate_public_content.mjs";

test("shared site helpers preserve public resource URLs and encode record links", () => {
  assert.equal(assetURL("/assets/cabin.glb"), "/assets/cabin.glb");
  assert.equal(
    assetURL("data:image/png;base64,AA=="),
    "data:image/png;base64,AA==",
  );
  assert.equal(
    assetURL("https://example.com/photo.jpg"),
    "https://example.com/photo.jpg",
  );
  assert.equal(appURL("notes", "a b"), "/notes/?id=a%20b");
  assert.equal(sitePath("/notes/"), "/notes/");
});

test("public build gate accepts the empty reviewed baseline and rejects backup/path leaks", async () => {
  const root = await mkdtemp(join(tmpdir(), "personal-world-public-check-"));
  const manifest = {
    format: "personal-world-published",
    version: 1,
    publishedAt: null,
    records: [],
  };
  try {
    await writeFile(join(root, "manifest.json"), JSON.stringify(manifest));
    assert.equal((await validatePublicContent(root)).records, 0);
    await writeFile(
      join(root, "manifest.json"),
      JSON.stringify({
        format: "personal-world-backup",
        version: 1,
        records: [],
      }),
    );
    await assert.rejects(validatePublicContent(root), /backup/i);
    await writeFile(
      join(root, "manifest.json"),
      JSON.stringify({
        ...manifest,
        publishedAt: "2026-10-25T00:00:00.000Z",
        records: [{ attachment: "../private.pdf" }],
      }),
    );
    await assert.rejects(validatePublicContent(root), /hashed local/i);
    await writeFile(join(root, "manifest.json"), JSON.stringify(manifest));
    await mkdir(join(root, "assets"));
    await writeFile(join(root, "assets", "private-backup.json"), "{}");
    await assert.rejects(validatePublicContent(root), /Orphan/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
