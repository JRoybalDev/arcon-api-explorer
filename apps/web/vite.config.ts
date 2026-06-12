import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const apiTarget = env.VITE_API_PROXY_TARGET ?? env.PUBLIC_API_URL ?? "http://localhost:3001";

  return {
    envDir: repoRoot,
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        "/api": apiTarget,
        "/content": apiTarget,
        "/content-thumbnails": apiTarget,
        "/uploads": apiTarget
      }
    }
  };
});
