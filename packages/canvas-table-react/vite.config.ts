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
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "CanvasTableReact",
      fileName: "canvas-table-react",
    },
    rollupOptions: {
      external: ['react', 'react-dom']
    }
  },
  resolve: {
    dedupe: ['react', 'react-dom']
  }
});
