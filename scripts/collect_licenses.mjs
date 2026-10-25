import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  copyFile,
} from "node:fs/promises";
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const notices = [];
await mkdir("licenses/dependencies", { recursive: true });
for (const [path, pkg] of Object.entries(lock.packages)) {
  if (!path || pkg.dev || pkg.optional) continue;
  let files;
  try {
    files = await readdir(path);
  } catch {
    continue;
  }
  const name = JSON.parse(await readFile(path + "/package.json", "utf8")).name;
  const licenseFile = files.find((x) => /^licen[sc]e(?:\.txt|\.md)?$/i.test(x));
  const saved = name.replaceAll("/", "_") + ".txt";
  if (licenseFile)
    await copyFile(path + "/" + licenseFile, "licenses/dependencies/" + saved);
  else await readFile("licenses/dependencies/" + saved);

  notices.push({
    name,
    version: pkg.version,
    license: pkg.license,
    file: "dependencies/" + saved,
    ...(!licenseFile
      ? {
          sourceURL:
            "https://raw.githubusercontent.com/pmndrs/react-three-fiber/v9.4.0/LICENSE",
        }
      : {}),
  });
}
await writeFile(
  "licenses/dependencies.json",
  JSON.stringify(notices, null, 2) + "\n",
);
console.log("Runtime dependency licenses", notices.length);
