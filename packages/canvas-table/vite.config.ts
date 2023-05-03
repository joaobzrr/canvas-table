import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true
    }),
    react()
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "CanvasTable",
      fileName: "canvas-table",
    },
    rollupOptions: {
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM"
        }
      }
    }
  }
});
