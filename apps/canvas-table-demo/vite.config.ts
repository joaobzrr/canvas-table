import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// eslint-disable-next-line no-restricted-syntax
export default defineConfig({
  base: '/canvas-table/',
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
  plugins: [react()],
});
