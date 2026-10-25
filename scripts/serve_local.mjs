// Dependency-free loopback server for the prebuilt, private local MVP package.
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve(process.argv[2] ?? "app");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".glb": "model/gltf-binary",
  ".hdr": "application/octet-stream",
  ".wasm": "application/wasm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".pfb": "application/octet-stream",
  ".bcmap": "application/octet-stream",
};
const server = createServer(async (req, res) => {
  if (!["GET", "HEAD"].includes(req.method ?? "")) {
    res.writeHead(405).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://127.0.0.1:5177").pathname,
    );
    let file = resolve(root, "." + pathname);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    if (
      pathname === "/" ||
      /^\/(notes|photos|projects|resume)(\/[^/]+)?\/?$/.test(pathname)
    )
      file = resolve(root, "index.html");
    const info = await stat(file);
    if (!info.isFile()) throw new Error("Not a file");
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] ?? "application/octet-stream",
      "Content-Length": info.size,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    if (req.method === "HEAD") res.end();
    else
      createReadStream(file)
        .on("error", () => res.destroy())
        .pipe(res);
  } catch {
    res
      .writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
      .end("文件不存在");
  }
});
server.on("error", (e) => {
  console.error(
    e.code === "EADDRINUSE"
      ? "端口 5177 已在使用。如果已有 Personal World 服务，请直接打开 http://127.0.0.1:5177；否则先停止占用此端口的程序。"
      : e.message,
  );
  process.exitCode = 1;
});
server.listen(5177, "127.0.0.1", () =>
  console.log(
    "Personal World · 仅本机访问\nhttp://127.0.0.1:5177\n保持此终端打开；Ctrl+C 停止。个人资料保存在浏览器中，请定期导出备份。",
  ),
);
