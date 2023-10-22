import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  base: "/canvas-table/",
  plugins: [
    react(),
  ],
});
