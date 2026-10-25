import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cp } from "node:fs/promises";
import { preparePages } from "./scripts/prepare_pages.mjs";
export default defineConfig({
  // Override for a future custom domain with VITE_BASE_PATH=/.
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [
    react(),
    {
      name: "local-pdf-resources",
      async closeBundle() {
        await cp("licenses", "dist/licenses", { recursive: true });
        await cp(
          "docs/phase-01/asset-sources.json",
          "dist/licenses/environment-phase01.json",
        );
        await cp(
          "docs/phase-01b/asset-sources.json",
          "dist/licenses/environment-phase01b.json",
        );
        for (const name of ["cmaps", "standard_fonts", "wasm"])
          await cp(`node_modules/pdfjs-dist/${name}`, `dist/pdfjs/${name}`, {
            recursive: true,
          });
        await preparePages();
      },
    },
  ],
  optimizeDeps: { entries: ["index.html"] },
  server: { host: "127.0.0.1" },
  build: { target: "es2022" },
});
