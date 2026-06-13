import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Use relative asset paths so the built site works under any base path
  // (Cloudflare Pages, GitHub Pages project sites, static hosts, etc.).
  base: "./",
});
