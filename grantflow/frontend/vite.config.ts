import { defineConfig } from "vite";
import tailwindcss from '@tailwindcss/vite'

import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.BACKEND_URL ?? "http://localhost:3001",
        changeOrigin: true,
      },
      "/ai": {
        target: process.env.AI_RUNTIME_URL ?? "http://localhost:8002",
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/ai/, ""),
      },
    },
  },
});
