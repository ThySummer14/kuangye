import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  base: "./",
  build: {
    rollupOptions: {
      input: { main: "index.html", lab: "emotion-lab.html" },
      output: {
        manualChunks(id) {
          // Three already separates its math/scene core from the WebGL renderer.
          // Preserve those cache boundaries instead of forcing both into one file.
          if (id.includes('/three/build/three.core.js')) return 'three-core';
          if (id.includes('/three/build/three.module.js')) return 'three-renderer';
          if (id.includes('/node_modules/@vue/') || id.includes('/node_modules/vue/')) return 'vue';
        },
      },
    },
  },
});
