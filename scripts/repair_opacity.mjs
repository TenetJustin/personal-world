import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
for (const [asset, stem] of [
  ["grass_medium_01", "grass_medium_01"],
  ["fir_tree_01", "fir_tree_01_twig"],
]) {
  const folder = "assets-source/" + asset + "/";
  const alpha = await sharp(folder + "textures/" + stem + "_alpha_1k.png")
    .removeAlpha()
    .greyscale()
    .raw()
    .toBuffer();
  const diffuse =
    folder +
    "textures/" +
    stem +
    "_diff_1k." +
    (asset === "grass_medium_01" ? "jpg" : "jpg");
  const rgb = await sharp(diffuse)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  await sharp(rgb.data, { raw: rgb.info })
    .joinChannel(alpha, { raw: { width: 1024, height: 1024, channels: 1 } })
    .png()
    .toFile(folder + "textures/" + stem + "_rgba_1k.png");
  const file = folder + asset + ".gltf";
  const g = JSON.parse(await readFile(file, "utf8"));
  for (const im of g.images)
    if (im.name.includes(asset === "grass_medium_01" ? "diff" : "twig_diff")) {
      im.uri = "textures/" + stem + "_rgba_1k.png";
      im.mimeType = "image/png";
    }
  for (const m of g.materials)
    if (m.alphaMode === "BLEND") {
      m.alphaMode = "MASK";
      m.alphaCutoff = 0.35;
      m.doubleSided = true;
    }
  await writeFile(file, JSON.stringify(g));
}
