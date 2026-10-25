import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
const run = (cmd, args, env = process.env) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", env });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run(process.execPath, ["scripts/repair_opacity.mjs"]);
await mkdir("work/blender-config", { recursive: true });
const blender =
  process.env.BLENDER_BIN ??
  (process.platform === "darwin"
    ? "/Applications/Blender.app/Contents/MacOS/Blender"
    : "blender");
run(
  blender,
  [
    "--background",
    "--factory-startup",
    "--disable-autoexec",
    "--python",
    "scripts/build_assets.py",
  ],
  {
    ...process.env,
    BLENDER_USER_CONFIG: process.cwd() + "/work/blender-config",
  },
);
run(process.execPath, ["scripts/optimize_assets.mjs"]);
run(process.execPath, ["scripts/prepare_textures.mjs"]);
run(process.execPath, ["scripts/collect_licenses.mjs"]);
