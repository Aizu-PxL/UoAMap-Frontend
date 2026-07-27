import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function normalizeBasePath(basePath: string | undefined): string {
  const trimmed = basePath?.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  return `/${trimmed.replace(/^\/+|\/+$/gu, "")}/`;
}

export default defineConfig({
  base: normalizeBasePath(process.env.APP_BASE_PATH),
  plugins: [react()],
});
