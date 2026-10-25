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
import { writeFile } from "node:fs/promises";
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
for (const name of ["fir-full", "grass-dense"]) {
  const d = await io.read("public/assets/" + name + ".glb");
  for (const m of d.getRoot().listMaterials())
    if (m.getName().includes("twig clusters"))
      m.setAlphaMode("MASK").setAlphaCutoff(0.35).setDoubleSided(true);
  if (name === "fir-full")
    for (const level of ["near", "mid"]) {
      const root = d.createNode("fir_full_" + level);
      for (const scene of d.getRoot().listScenes())
        for (const node of [...scene.listChildren()])
          if (node.getName().startsWith("fir_full_" + level + "_")) {
            scene.removeChild(node);
            root.addChild(node);
            if (!scene.listChildren().includes(root)) scene.addChild(root);
          }
    }
  await d.transform(
    dedup(),
    weld(),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      quality: 92,
      resize: [1024, 1024],
    }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  await io.write("public/assets/" + name + ".next.glb", d);
  const { rename } = await import("node:fs/promises");
  await rename(
    "public/assets/" + name + ".next.glb",
    "public/assets/" + name + ".glb",
  );
}
for (const [a, b] of [
  ["Diffuse", "color"],
  ["nor_gl", "normal"],
  ["Rough", "rough"],
])
  await sharp("assets-source/grass_ground/" + a + ".jpg")
    .resize(2048, 2048)
    .webp({ quality: a === "Diffuse" ? 92 : 95 })
    .toFile("public/assets/meadow-" + b + ".webp");
console.log("FULL_CROWN_AND_MEADOW_COMPRESSED");
