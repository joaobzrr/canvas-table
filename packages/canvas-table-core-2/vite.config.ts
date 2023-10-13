import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import eslint from "vite-plugin-eslint";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    dts({ insertTypesEntry: true }),
    eslint()
  ],
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "CanvasTableCore2",
      fileName: "canvas-table-core-2",
    }
  }
});
