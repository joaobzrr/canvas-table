import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true
    })
  ],
  build: {
    rollupOptions: {
    },
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "CanvasTableCore",
      fileName: "canvas-table-core",
    }
  }
});
