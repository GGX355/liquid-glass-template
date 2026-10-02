import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
const path = (name) => fileURLToPath(new URL(name, import.meta.url));
export default defineConfig({
  root: path("./"),
  base: "/vote/",
  publicDir: false,
  define: { "import.meta.env.VITE_UI_PREVIEW": "true" },
  plugins: [tailwind(), react()],
  resolve: {
    alias: [
      { find: "@/lib/poll-api", replacement: path("./api.js") },
      { find: "@/lib/draw-api", replacement: path("./api.js") },
      { find: "@/lib/auth/use-current-user", replacement: path("./auth.jsx") },
      { find: "@/lib/auth/client", replacement: path("./auth.jsx") },
      { find: "@/lib/auth/gates", replacement: path("./auth.jsx") },
      { find: "@", replacement: path("../src") },
    ],
  },
  build: { outDir: path("../artifacts/ui-preview-dist"), emptyOutDir: true },
});
