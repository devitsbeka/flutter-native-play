import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    // Strip console.log/debug/info from production builds.
    // console.error and console.warn are preserved for real issues.
    pure: mode === "production" ? ["console.log", "console.debug", "console.info"] : [],
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Stable vendor chunks: better long-term caching and keeps
          // shared libs out of per-route chunks (confetti was inlined ~29x)
          if (id.includes("node_modules")) {
            if (id.includes("react-router")) return "vendor-router";
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "vendor-react";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("posthog")) return "vendor-posthog";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("canvas-confetti")) return "vendor-confetti";
            return undefined;
          }
          // Translations change rarely; isolating them lets clients keep
          // them cached across app deploys
          if (id.includes("/src/locales/")) return "locales";
          return undefined;
        },
      },
    },
  },
}));
