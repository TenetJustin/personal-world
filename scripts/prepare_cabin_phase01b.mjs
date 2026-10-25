import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  flatten,
  join,
  dedup,
  weld,
  meshopt,
  textureCompress,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
import sharp from "sharp";
import { stat, writeFile, rename } from "node:fs/promises";
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
const block = process.argv.includes("--blockout");
const input =
  "public/assets/" + (block ? "cabin-blockout" : "cabin-authoring") + ".glb";
const d = await io.read(input);
await d.transform(flatten(), join(), dedup(), weld());
if (!block)
  await d.transform(
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      quality: 94,
      resize: [2048, 2048],
    }),
  );
await d.transform(meshopt({ encoder: MeshoptEncoder, level: "medium" }));
const out = "public/assets/" + (block ? "cabin-blockout" : "cabin") + ".glb";
await io.write(out + ".next.glb", d);
await rename(out + ".next.glb", out);
if (!block)
  await rename(
    input,
    "assets-source/phase01b/cabin-runtime-before-compression.glb",
  );
const r = {
  file: out,
  bytes: (await stat(out)).size,
  materials: d
    .getRoot()
    .listMaterials()
    .map((m) => m.getName()),
  meshes: d.getRoot().listMeshes().length,
  textures: d
    .getRoot()
    .listTextures()
    .map((t) => ({
      name: t.getName(),
      size: t.getSize(),
      mime: t.getMimeType(),
    })),
};
await writeFile(
  "docs/phase-01b/" + (block ? "blockout" : "architecture") + "-runtime.json",
  JSON.stringify(r, null, 2) + "\n",
);
console.log(r);
