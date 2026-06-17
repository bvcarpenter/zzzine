import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  // Use relative asset paths so the built site works under any base path
  // (Cloudflare Pages, GitHub Pages project sites, static hosts, etc.).
  base: "./",
});