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
const results = [];
for (const [source, target] of [
  ["cabin-shell", "cabin"],
  ["cabin-door", "cabin-door"],
]) {
  const d = await io.read(`assets-source/sprint-v2/${source}-authoring.glb`);
  await d.transform(
    flatten(),
    join(),
    dedup(),
    weld(),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      quality: 94,
      resize: [2048, 2048],
    }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  const file = `public/assets/${target}.glb`;
  await io.write(file + ".next.glb", d);
  await rename(file + ".next.glb", file);
  results.push({
    file,
    bytes: (await stat(file)).size,
    meshes: d.getRoot().listMeshes().length,
    materials: d
      .getRoot()
      .listMaterials()
      .map((m) => m.getName()),
  });
}
await writeFile(
  "docs/sprint-v2/architecture-runtime.json",
  JSON.stringify(results, null, 2) + "\n",
);
console.log(results);
