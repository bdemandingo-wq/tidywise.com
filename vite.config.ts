import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { execSync } from "child_process";

function sitemapPlugin(): Plugin {
  return {
    name: "generate-sitemap",
    buildEnd() {
      try {
        execSync("npx tsx src/lib/generate-sitemap.ts", { stdio: "inherit" });
      } catch (e) {
        console.error("⚠️ Sitemap generation failed:", e);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    sitemapPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
