import assert from "node:assert/strict";
import { readFile, stat, readdir } from "node:fs/promises";
import { resolve } from "node:path";
const base = (process.argv[2] ?? "/personal-world/").replace(/\/?$/, "/");
const root = resolve(process.argv[3] ?? "dist");
for (const route of ["", "notes/", "photos/", "projects/", "resume/"]) {
  const html = await readFile(resolve(root, route, "index.html"), "utf8");
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length, "HTML must contain bundled application assets");
  for (const ref of refs) {
    if (/^(?:https?:|data:)/.test(ref)) continue;
    assert.ok(ref.startsWith(base), `Asset escaped deployment base: ${ref}`);
    assert.ok((await stat(resolve(root, ref.slice(base.length)))).isFile());
  }
}
for (const file of await readdir(resolve(root, "assets"))) {
  if (!file.endsWith(".js")) continue;
  const code = await readFile(resolve(root, "assets", file), "utf8");
  assert.ok(
    !/["'`]\/(?:assets|pdfjs|content)\//.test(code),
    `Root-absolute public asset URL remains in ${file}`,
  );
}
for (const file of [
  "assets/cabin.glb",
  "assets/fir-full.glb",
  "assets/rocks.glb",
  "assets/alps-lighting.hdr",
]) {
  const data = await readFile(resolve(root, file));
  assert.ok(
    !data.subarray(0, 80).toString().includes("git-lfs.github.com/spec"),
    `Unresolved LFS pointer: ${file}`,
  );
}
for (const file of [
  "404.html",
  "content/manifest.json",
  "pdfjs/cmaps/Adobe-Japan1-UCS2.bcmap",
  "pdfjs/standard_fonts/LiberationSans-Regular.ttf",
  ".nojekyll",
])
  assert.ok(
    (await stat(resolve(root, file))).isFile(),
    `Missing static dependency: ${file}`,
  );
console.log(
  JSON.stringify(
    {
      base,
      staticApplicationRoutes: 5,
      lfsAssetsResolved: true,
      pdfResourcesPresent: true,
      rootAbsolutePublicAssetURLs: 0,
    },
    null,
    2,
  ),
);
