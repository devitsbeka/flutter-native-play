/**
 * Vite config for Facebook Instant Games build.
 *
 * Produces an optimized bundle suitable for upload to the FB Instant Games dashboard.
 *
 * Key differences from the standard web build:
 *   - Entry: fb-instant.html (loads FBInstant SDK before React)
 *   - Base: './' (relative paths required inside FB iframe)
 *   - Output: dist-fb/ (separate from web dist/)
 *   - Post-build: rename fb-instant.html → index.html (FB requires index.html at root)
 *   - Defines VITE_PLATFORM=facebook for conditional compilation
 */

import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

/**
 * Vite plugin that renames fb-instant.html → index.html after build.
 * Facebook Instant Games requires index.html at the zip root.
 */
function renameFbEntryPlugin(): Plugin {
  return {
    name: 'rename-fb-entry',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist-fb');
      const src = path.join(distDir, 'fb-instant.html');
      const dest = path.join(distDir, 'index.html');
      if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
        console.log('\n  Renamed fb-instant.html → index.html (Facebook requirement)\n');
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  // Relative paths - required for Facebook iframe serving
  base: './',

  server: {
    host: "::",
    port: 8081,
  },

  build: {
    outDir: 'dist-fb',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'fb-instant': path.resolve(__dirname, 'fb-instant.html'),
      },
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['tailwind-merge', 'clsx', 'class-variance-authority'],
          'vendor-query': ['@tanstack/react-query'],
        },
      },
    },
    // Target modern browsers (FB iframe always runs in a modern browser)
    target: 'es2020',
    // Don't generate source maps for the FB upload
    sourcemap: false,
  },

  plugins: [
    react(),
    renameFbEntryPlugin(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Define compile-time constants for platform detection
  define: {
    'import.meta.env.VITE_PLATFORM': JSON.stringify('facebook'),
    'import.meta.env.VITE_FB_APP_ID': JSON.stringify('2784020051933983'),
  },

  esbuild: {
    pure: mode === "production" ? ["console.log", "console.debug", "console.info"] : [],
  },
}));
