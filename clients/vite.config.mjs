import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: "/",
  plugins: [react()],
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
  resolve: {
    alias: {
      state: path.resolve(__dirname, "src/state"),
      theme: path.resolve(__dirname, "src/theme.js"),
      components: path.resolve(__dirname, "src/components"),
      scenes: path.resolve(__dirname, "src/scenes"),
      assets: path.resolve(__dirname, "src/assets"),
    },
  },
});
