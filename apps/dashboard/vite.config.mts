/// <reference types="vitest/config" />
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test-setup.ts"],
  },
  plugins: [react(), tailwindcss()],
  base: "/",
  server: {
    proxy: {
      "/api": {
        target: "https://app.dev.twy.am",
        changeOrigin: true,
        secure: false,
      },
      "/s3-proxy": {
        target: "https://dev-twy-am-files-bucket.s3.us-east-1.amazonaws.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/s3-proxy/, ""),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@components": path.resolve(__dirname, "src/components"),
      "@utils": path.resolve(__dirname, "src/utils"),
      "@api": path.resolve(__dirname, "src/api/"),
      "@layouts": path.resolve(__dirname, "src/layouts"),
    },
  },
  build: {
    outDir: "out",
    minify: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("/node_modules/react/") || id.includes("/node_modules/react-dom/")) {
            return "react";
          }
          if (
            id.includes("/node_modules/@heroui/") ||
            id.includes("/node_modules/@react-aria/") ||
            id.includes("/node_modules/@react-stately/")
          ) {
            return "heroui";
          }
          if (id.includes("/node_modules/@tanstack/")) {
            return "tanstack";
          }
        },
      },
    },
  },
});
