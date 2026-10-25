import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Real static entry points provide HTTP 200 on Pages refresh (no server rewrites).
export async function preparePages(outDir = "dist") {
  const html = await readFile(resolve(outDir, "index.html"), "utf8");
  for (const kind of ["notes", "photos", "projects", "resume"]) {
    await mkdir(resolve(outDir, kind), { recursive: true });
    await writeFile(resolve(outDir, kind, "index.html"), html);
  }
  const manifest = JSON.parse(
    await readFile("public/content/manifest.json", "utf8"),
  );
  for (const record of manifest.records) {
    if (
      !/^[a-zA-Z0-9_-]{1,80}$/.test(record.id) ||
      !["notes", "photos", "projects", "resume"].includes(record.kind)
    )
      throw new Error("Invalid public record route");
    const target = resolve(outDir, record.kind, record.id);
    await mkdir(target, { recursive: true });
    await writeFile(resolve(target, "index.html"), html);
  }
  // Unknown or obsolete bookmarked paths still expose a usable application.
  await copyFile(resolve(outDir, "index.html"), resolve(outDir, "404.html"));
  await writeFile(resolve(outDir, ".nojekyll"), "");
}

if (
  process.argv[1] &&
  import.meta.url === new URL(process.argv[1], "file:").href
)
  await preparePages(process.argv[2] ?? "dist");
