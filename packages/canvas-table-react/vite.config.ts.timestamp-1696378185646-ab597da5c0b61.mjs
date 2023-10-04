// vite.config.ts
import { resolve } from "path";
import { defineConfig } from "file:///C:/Users/bzrr/dev/canvas-table/node_modules/.pnpm/vite@4.4.5/node_modules/vite/dist/node/index.js";
import dts from "file:///C:/Users/bzrr/dev/canvas-table/node_modules/.pnpm/vite-plugin-dts@3.5.2_typescript@5.0.4_vite@4.4.5/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_dirname = "C:\\Users\\bzrr\\dev\\canvas-table\\packages\\canvas-table-react";
var vite_config_default = defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true
    })
  ],
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__vite_injected_original_dirname, "src/index.ts"),
      name: "CanvasTableReact",
      fileName: "canvas-table-react"
    },
    rollupOptions: {
      external: ["react", "react-dom"]
    }
  },
  resolve: {
    dedupe: ["react", "react-dom"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxienJyXFxcXGRldlxcXFxjYW52YXMtdGFibGVcXFxccGFja2FnZXNcXFxcY2FudmFzLXRhYmxlLXJlYWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxienJyXFxcXGRldlxcXFxjYW52YXMtdGFibGVcXFxccGFja2FnZXNcXFxcY2FudmFzLXRhYmxlLXJlYWN0XFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9ienJyL2Rldi9jYW52YXMtdGFibGUvcGFja2FnZXMvY2FudmFzLXRhYmxlLXJlYWN0L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XHJcbmltcG9ydCBkdHMgZnJvbSBcInZpdGUtcGx1Z2luLWR0c1wiO1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICBkdHMoe1xyXG4gICAgICBpbnNlcnRUeXBlc0VudHJ5OiB0cnVlXHJcbiAgICB9KVxyXG4gIF0sXHJcbiAgYnVpbGQ6IHtcclxuICAgIHNvdXJjZW1hcDogdHJ1ZSxcclxuICAgIGxpYjoge1xyXG4gICAgICBlbnRyeTogcmVzb2x2ZShfX2Rpcm5hbWUsIFwic3JjL2luZGV4LnRzXCIpLFxyXG4gICAgICBuYW1lOiBcIkNhbnZhc1RhYmxlUmVhY3RcIixcclxuICAgICAgZmlsZU5hbWU6IFwiY2FudmFzLXRhYmxlLXJlYWN0XCIsXHJcbiAgICB9LFxyXG4gICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICBleHRlcm5hbDogWydyZWFjdCcsICdyZWFjdC1kb20nXVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgZGVkdXBlOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbSddXHJcbiAgfVxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE4VyxTQUFTLGVBQWU7QUFDdFksU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxTQUFTO0FBRmhCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLElBQUk7QUFBQSxNQUNGLGtCQUFrQjtBQUFBLElBQ3BCLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxXQUFXO0FBQUEsSUFDWCxLQUFLO0FBQUEsTUFDSCxPQUFPLFFBQVEsa0NBQVcsY0FBYztBQUFBLE1BQ3hDLE1BQU07QUFBQSxNQUNOLFVBQVU7QUFBQSxJQUNaO0FBQUEsSUFDQSxlQUFlO0FBQUEsTUFDYixVQUFVLENBQUMsU0FBUyxXQUFXO0FBQUEsSUFDakM7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxRQUFRLENBQUMsU0FBUyxXQUFXO0FBQUEsRUFDL0I7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
