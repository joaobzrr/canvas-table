import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import eslint from "vite-plugin-eslint";

export default defineConfig({
  plugins: [
    dts({ insertTypesEntry: true }),
    eslint()
  ],
  build: {
    outDir: "dist",
    sourcemap: true,
    lib: {
      entry: {
        "canvas-table-core": "src/index.ts",
        "lib/Stage/index": "./src/lib/Stage/index.ts",
        "lib/Renderer/index": "./src/lib/Renderer/index.ts",
        "lib/LineRenderer/index": "./src/lib/LineRenderer/index.ts",
        "lib/TextRenderer/index": "./src/lib/TextRenderer/index.ts",
        "lib/GlyphAtlas/index": "./src/lib/GlyphAtlas/index.ts",
        "lib/UiContext/index": "./src/lib/UiContext/index.ts"
      }
    }
  }
});
