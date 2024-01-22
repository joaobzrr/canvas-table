import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import eslint from "vite-plugin-eslint";

export default defineConfig({
  plugins: [
    dts({ insertTypesEntry: true }),
    eslint({ fix: true })
  ],
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      fileName: "canvas-table-react",
      formats: ["es"]
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        '@bzrr/canvas-table-core'
      ],
      output: {
        globals: {
          react: "React"
        }
      }
    }
  }
});
