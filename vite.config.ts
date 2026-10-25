import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cp } from "node:fs/promises";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "local-pdf-resources",
      async closeBundle() {
        for (const name of ["cmaps", "standard_fonts", "wasm"])
          await cp(`node_modules/pdfjs-dist/${name}`, `dist/pdfjs/${name}`, {
            recursive: true,
          });
      },
    },
  ],
  optimizeDeps: { entries: ["index.html"] },
  server: { host: "127.0.0.1" },
  build: { target: "es2022" },
});
