import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadPublishedContent } from "../src/library/publishing.ts";
import { validatePublicContent } from "../scripts/validate_public_content.mjs";

const root = resolve(import.meta.dirname, "..");

test("the reviewed personal photo catalog publishes 17 metadata-clean records", async () => {
  const catalog = JSON.parse(
    await readFile(
      resolve(root, "docs/personal-content/photo-library-source.json"),
      "utf8",
    ),
  );
  const manifest = JSON.parse(
    await readFile(resolve(root, "public/content/manifest.json"), "utf8"),
  );
  const photos = manifest.records.filter(
    (record: { kind: string; id: string }) =>
      record.kind === "photos" && record.id.startsWith("personal-photo-"),
  );
  assert.equal(catalog.items.length, 17);
  assert.equal(photos.length, 17);
  assert.equal(
    new Set(photos.map((record: { id: string }) => record.id)).size,
    17,
  );
  for (const photo of photos) {
    assert.match(photo.attachment, /^assets\/[a-f0-9]{64}\.webp$/);
    assert.match(photo.thumbnailData, /^assets\/[a-f0-9]{64}\.webp$/);
    assert.equal(photo.photoLocation, undefined);
    assert.equal(photo.photoTakenAt, undefined);
    assert.equal(photo.sourceFile, undefined);
    assert.equal(photo.sourceSha256, undefined);
  }
  const result = await validatePublicContent(resolve(root, "public/content"));
  assert.equal(result.privateBackupsIncluded, false);
  assert.equal(result.records, manifest.records.length);
});

test("published photos load thumbnails at boot and defer the full image", async () => {
  const manifest = JSON.parse(
    await readFile(resolve(root, "public/content/manifest.json"), "utf8"),
  );
  const photo = manifest.records.find(
    (record: { id: string }) => record.id === "personal-photo-01",
  );
  assert.ok(photo);
  const onePhotoManifest = { ...manifest, records: [photo] };
  const originalFetch = globalThis.fetch;
  const locationDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "location",
  );
  const requests: string[] = [];
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { origin: "https://example.test" },
  });
  globalThis.fetch = (async (input: URL | string) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith("manifest.json")) return Response.json(onePhotoManifest);
    if (url.endsWith(photo.thumbnailData)) {
      const bytes = await readFile(
        resolve(root, "public/content", photo.thumbnailData),
      );
      return new Response(bytes, { headers: { "content-type": "image/webp" } });
    }
    throw new Error(`Full photo must stay lazy during boot: ${url}`);
  }) as typeof fetch;
  try {
    const [loaded] = await loadPublishedContent("/personal-world/");
    assert.equal(requests.length, 2);
    assert.equal(loaded.blob, undefined);
    assert.ok(loaded.thumbnail?.size);
    assert.ok(
      (loaded.publicURL ?? "").endsWith(`/content/${photo.attachment}`),
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (locationDescriptor)
      Object.defineProperty(globalThis, "location", locationDescriptor);
    else delete (globalThis as { location?: unknown }).location;
  }
});
