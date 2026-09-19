import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  base: "./",
  build: {
    rollupOptions: {
      input: { main: "index.html", lab: "emotion-lab.html" },
      output: { manualChunks: { three: ["three"], vue: ["vue"] } },
    },
  },
});
