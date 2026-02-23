import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tsconfigPaths()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: mode === "development",
    rollupOptions: {
      input: {
        popup: "popup.html",
        panel: "panel.html",
        background: "src/background/index.ts",
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  test: {
    environment: "node",
  },
}));
