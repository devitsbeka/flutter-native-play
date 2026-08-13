/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// One id per build. It is compiled into the bundle AND written to
// dist/version.json, which lets a long-lived tab ask "is the build I am
// running still the one being served?" without depending on how the HTML
// happens to reference its script.
const BUILD_ID = `${Date.now().toString(36)}`;

function buildVersionFile() {
  return {
    name: "build-version-file",
    apply: "build" as const,
    generateBundle(_options: unknown, _bundle: unknown) {
      (this as unknown as { emitFile: (f: Record<string, string>) => void }).emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ build: BUILD_ID }),
      });
    },
  };
}

/**
 * Strip web-only markup from the native build.
 *
 * The Meta Pixel loads unconditionally from index.html. In a browser that is
 * a product decision; inside the iOS binary it is third-party tracking that
 * runs before the ATT prompt is ever shown, which is both an App Review
 * problem and a privacy-manifest one. Blocks between the marker comments are
 * removed when VITE_NATIVE_BUILD is set.
 */
function stripNativeExcludedHtml(isNative: boolean) {
  return {
    name: "strip-native-excluded-html",
    transformIndexHtml(html: string) {
      if (!isNative) return html;
      return html.replace(
        /<!--\s*native:strip:start\s*-->[\s\S]*?<!--\s*native:strip:end\s*-->/g,
        "",
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    buildVersionFile(),
    stripNativeExcludedHtml(process.env.VITE_NATIVE_BUILD === "true"),
  ],
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
  test: {
    // e2e/ holds Playwright specs, which throw if Vitest collects them
    // ("test.describe() was not expected to be called here").
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Stable vendor chunks: better long-term caching and keeps
          // shared libs out of per-route chunks (confetti was inlined ~29x).
          // IMPORTANT: every React-DEPENDENT library must share ONE chunk with
          // React itself - splitting them creates a circular chunk-init order
          // and a blank screen ("reading 'forwardRef'" of undefined).
          if (id.includes("node_modules")) {
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("posthog")) return "vendor-posthog";
            if (id.includes("canvas-confetti")) return "vendor-confetti";
            if (
              /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id) ||
              id.includes("@radix-ui") ||
              id.includes("framer-motion") ||
              id.includes("@remix-run")
            ) {
              return "vendor-react";
            }
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
