import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

// Netlify plugin only when building on Netlify (NETLIFY=true is set automatically there).
// Lovable publish uses Cloudflare Workers and must NOT include the Netlify plugin.
const isNetlify = process.env.NETLIFY === "true";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart(),
    ...(isNetlify ? [netlify()] : []),
    react(),
  ],
});
