import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { newEntry, validateEntry, type Entry } from "../src/library/model.ts";
import {
  emptyShowcase,
  validateShowcase,
} from "../src/library/projectShowcase.ts";
import { encodeBackup, decodeBackup } from "../src/library/storage.ts";
import {
  createPublicPackage,
  loadPublishedContent,
} from "../src/library/publishing.ts";
import { validatePublicPackage } from "../scripts/import_public_content.mjs";

const originalBitmap = globalThis.createImageBitmap;
before(() => {
  globalThis.createImageBitmap = (async (blob: Blob) => {
    const metadata = await sharp(
      Buffer.from(await blob.arrayBuffer()),
    ).metadata();
    return { width: metadata.width, height: metadata.height, close() {} };
  }) as typeof createImageBitmap;
});
after(() => {
  if (originalBitmap) globalThis.createImageBitmap = originalBitmap;
  else delete (globalThis as { createImageBitmap?: unknown }).createImageBitmap;
});

async function fixture(): Promise<Entry> {
  const bytes = await sharp({
    create: { width: 12, height: 18, channels: 3, background: "#bda46f" },
  })
    .webp()
    .toBuffer();
  const images = Array.from({ length: 14 }, (_, index) => ({
    id: `image-${index}`,
    name: `Public artwork ${index}`,
    blob: new Blob([bytes], { type: "image/webp" }),
  }));
  return {
    ...newEntry("projects", "Gallery fixture"),
    images,
    projectShowcase: {
      ...emptyShowcase(),
      galleryType: "tarot",
      coverId: images[0].id,
      tarotIds: images.slice(0, 12).map((image) => image.id),
      credits: "Original fixture",
      imageNotes: images.map((image) => ({
        imageId: image.id,
        title: image.name,
        caption: "Fixture, not user data",
        kind: "artwork",
        sourceURL: "https://example.com/source",
        revision: "test-commit",
        license: "Original test fixture",
      })),
    },
  };
}
test("14-image project and gallery metadata survive backup, restore and explicit reviewed publication", async () => {
  const entry = await fixture();
  const [restored] = await decodeBackup(
    new Blob([await encodeBackup([entry])]),
  );
  assert.equal(restored.images?.length, 14);
  assert.deepEqual(restored.projectShowcase, entry.projectShowcase);
  const before = await createPublicPackage([restored], [restored.id], true);
  const checked = await validatePublicPackage(before);
  assert.equal(checked.manifest.records[0].images.length, 14);
  assert.deepEqual(
    checked.manifest.records[0].projectShowcase,
    entry.projectShowcase,
  );
  await assert.rejects(createPublicPackage([entry], [entry.id], false));
});
test("gallery rejects dangling refs, duplicate cards, hidden fields, invalid links and extreme animation speeds", () => {
  const valid = { ...emptyShowcase(), coverId: "a" };
  const ids = new Set(["a"]);
  assert.equal(validateShowcase(valid, ids).coverId, "a");
  for (const data of [
    { ...valid, coverId: "absent" },
    { ...valid, tarotIds: ["a", "a"] },
    { ...valid, privateNotes: "not permitted" },
    { ...valid, cycleSeconds: 0 },
    { ...valid, upstreamURL: "javascript:alert(1)" },
  ])
    assert.throws(() => validateShowcase(data, ids));
  assert.throws(() =>
    validateEntry({
      ...newEntry("notes", "Wrong kind"),
      projectShowcase: emptyShowcase(),
    }),
  );
});
test("public project images stay lazy until explicit export; backups embed bytes, not temporary URL references", async () => {
  const entry = await fixture();
  const checked = await validatePublicPackage(
    await createPublicPackage([entry], [entry.id], true),
  );
  const originalFetch = globalThis.fetch;
  const locationDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "location",
  );
  const requests: string[] = [];
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { origin: "https://example.com" },
  });
  globalThis.fetch = async (input) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith("manifest.json")) return Response.json(checked.manifest);
    const asset = [...checked.assets].find(([path]) => url.endsWith(path));
    return asset
      ? new Response(asset[1], { headers: { "content-type": "image/webp" } })
      : new Response("missing", { status: 404 });
  };
  try {
    const [loaded] = await loadPublishedContent("/personal-world/");
    assert.equal(
      requests.length,
      1,
      "scene boot must not download every project image",
    );
    assert.equal(loaded.images?.[0].blob.size, 0);
    assert.match(
      loaded.images?.[0].publicURL ?? "",
      /\/content\/assets\/.*webp$/,
    );
    const backup = await encodeBackup([loaded]);
    assert.ok(!backup.includes("publicURL"));
    const [restored] = await decodeBackup(new Blob([backup]));
    assert.ok(restored.images![0].blob.size > 0);
    assert.deepEqual(restored.projectShowcase, entry.projectShowcase);
    const republished = await validatePublicPackage(
      await createPublicPackage([loaded], [loaded.id], true),
    );
    assert.equal(republished.manifest.records[0].images.length, 14);
  } finally {
    globalThis.fetch = originalFetch;
    if (locationDescriptor)
      Object.defineProperty(globalThis, "location", locationDescriptor);
    else delete (globalThis as { location?: unknown }).location;
  }
});
