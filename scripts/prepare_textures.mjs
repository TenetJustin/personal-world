import sharp from "sharp";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
await mkdir("public/assets", { recursive: true });
const tasks = [
  ["forest_floor", "forest"],
  ["aerial_grass_rock", "grass"],
];
for (const [src, id] of tasks)
  for (const [channel, suffix] of [
    ["Diffuse", "color"],
    ["nor_gl", "normal"],
    ["Rough", "rough"],
  ]) {
    if (id === "forest" && channel !== "Diffuse") continue;
    await sharp(`assets-source/${src}/${channel}.jpg`)
      .resize(2048, 2048, { fit: "fill" })
      .webp({ quality: channel === "Diffuse" ? 88 : 95 })
      .toFile(`public/assets/${id}-${suffix}.webp`);
  }
await copyFile("node_modules/three/LICENSE", "licenses/three-MIT.txt");
const manifest = [];
const { readdir, stat } = await import("node:fs/promises");
for (const file of await readdir("public/assets")) {
  if (file === "manifest.json") continue;
  const b = await readFile("public/assets/" + file);
  manifest.push({
    file,
    sourceIds:
      file.startsWith("alps-") || file === "environment.json"
        ? ["alps_field"]
        : file.startsWith("fir")
          ? ["fir_tree_01"]
          : file.startsWith("cabin")
            ? ["original-exterior", "rough_wood"]
            : file.startsWith("rocks")
              ? ["rock_moss_set_01"]
              : file === "grass.glb"
                ? ["grass_medium_01"]
                : file.startsWith("forest-")
                  ? ["forest_floor"]
                  : file.startsWith("grass-")
                    ? ["aerial_grass_rock"]
                    : [],
    bytes: b.length,
    sha256: createHash("sha256").update(b).digest("hex"),
  });
}
await writeFile(
  "public/assets/manifest.json",
  JSON.stringify(
    { generatedAt: new Date().toISOString(), files: manifest },
    null,
    2,
  ) + "\n",
);
console.log("TEXTURES_AND_MANIFEST_READY", manifest.length);
