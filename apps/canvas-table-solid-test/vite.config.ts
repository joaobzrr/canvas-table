import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

// eslint-disable-next-line no-restricted-syntax
export default defineConfig({
  base: '/canvas-table/',
  plugins: [solid()],
});
