import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  base: "/canvas-table/",
  css: {
    modules: {
      localsConvention: "camelCase"
    }
  },
  plugins: [
    react(),
  ],
});
