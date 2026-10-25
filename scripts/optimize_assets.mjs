// Runtime compression only: no geometry simplification here. Originals stay in ignored authoring storage.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  weld,
  meshopt,
  textureCompress,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
import sharp from "sharp";
import { mkdir, copyFile, stat, writeFile } from "node:fs/promises";
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
await mkdir("assets-source/runtime-before-compression", { recursive: true });
const results = [];
for (const name of process.argv.length > 2
  ? process.argv.slice(2)
  : ["fir", "cabin", "grass", "rocks"]) {
  const p = "public/assets/" + name + ".glb";
  const before = (await stat(p)).size;
  await copyFile(
    p,
    "assets-source/runtime-before-compression/" + name + ".glb",
  );
  const doc = await io.read(p);
  await doc.transform(
    dedup(),
    weld(),
    textureCompress({ encoder: sharp, targetFormat: "webp", quality: 90 }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  await io.write(p, doc);
  results.push({ file: name + ".glb", before, after: (await stat(p)).size });
  console.log(results.at(-1));
}
await writeFile(
  "docs/phase-01/compression.json",
  JSON.stringify(results, null, 2) + "\n",
);
