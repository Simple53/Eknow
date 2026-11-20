import { defineConfig, loadEnv } from "vite";
import tailwind from "@tailwindcss/vite";
import {localApi} from "../../services/api/handler.mjs";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react(),tailwind(),{name:"eknow-local-api",configureServer(server){server.middlewares.use(localApi({...process.env,...loadEnv("development",process.cwd(),"")}));},configurePreviewServer(server){server.middlewares.use(localApi({...process.env,...loadEnv("production",process.cwd(),"")}));}}],
});
