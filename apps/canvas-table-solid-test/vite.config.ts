import { defineConfig } from 'vite'
import solid from "vite-plugin-solid";

export default defineConfig({
  base: "/canvas-table/",
  plugins: [solid()],
});
