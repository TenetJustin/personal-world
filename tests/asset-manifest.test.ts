import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
test("every shipped asset has a matching hash and an explicit licensed or original source", async () => {
  const manifest = JSON.parse(
    await readFile("public/assets/manifest.json", "utf8"),
  );
  const sources = JSON.parse(
    await readFile("docs/phase-01/asset-sources.json", "utf8"),
  );
  const ids = new Set([
    "original-exterior",
    ...sources.map((s: { id: string }) => s.id),
  ]);
  const files = await readdir("public/assets");
  assert.equal(manifest.files.length, files.length - 1);
  for (const item of manifest.files) {
    const bytes = await readFile("public/assets/" + item.file);
    assert.equal(bytes.length, item.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256);
    assert.ok(item.sourceIds.length);
    for (const id of item.sourceIds) assert.ok(ids.has(id));
    if (item.file.endsWith(".glb")) {
      const jsonSize = bytes.readUInt32LE(12);
      const gltf = JSON.parse(bytes.subarray(20, 20 + jsonSize).toString());
      for (const image of gltf.images ?? [])
        assert.ok(
          !image.uri || image.uri.startsWith("data:"),
          "No remote glTF image URI",
        );
    }
  }
  for (const s of sources) {
    assert.equal(s.license, "CC0-1.0");
    assert.ok(Object.keys(s.authors).length);
    assert.ok(s.source.startsWith("https://polyhaven.com/a/"));
  }
});
