/**
 * Vite config for Facebook Instant Games build.
 *
 * Produces an optimized bundle suitable for upload to the FB Instant Games dashboard.
 *
 * Key differences from the standard web build:
 *   - Entry: fb-instant.html (loads FBInstant SDK before React)
 *   - Base: './' (relative paths required inside FB iframe)
 *   - Output: dist-fb/ (separate from web dist/)
 *   - Aggressive code splitting for fast initial load (<1 MB target)
 *   - Excludes Capacitor plugins, Three.js, Cobe, heavy animation libs
 *   - Defines VITE_PLATFORM=facebook for conditional compilation
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  // Relative paths - required for Facebook iframe serving
  base: './',

  // Use fb-instant.html as entry
  build: {
    outDir: 'dist-fb',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'fb-instant.html'),
      },
      output: {
        // Aggressive code splitting for fast initial load
        manualChunks: {
          // Core React in its own chunk (~140KB gzipped)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
          // UI framework
          'vendor-ui': ['tailwind-merge', 'clsx', 'class-variance-authority'],
          // TanStack Query
          'vendor-query': ['@tanstack/react-query'],
          // Animation (only framer-motion, skip GSAP/Lottie/Three.js)
          'vendor-animation': ['framer-motion'],
        },
      },
      // Exclude heavy native-only dependencies
      external: [
        '@capacitor/core',
        '@capacitor/ios',
        '@capacitor/android',
        '@capacitor/camera',
        '@capacitor/haptics',
        '@capacitor/push-notifications',
        '@capacitor-community/admob',
        '@capacitor-community/apple-sign-in',
        '@revenuecat/purchases-capacitor',
        // Heavy 3D/globe libraries not needed on Facebook
        'three',
        '@react-three/fiber',
        '@react-three/drei',
        'three-globe',
        'cobe',
        'vanta',
        // GSAP can be replaced with CSS animations
        'gsap',
      ],
    },
    // Target modern browsers (FB iframe always runs in a modern browser)
    target: 'es2020',
    // Aggressive minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: true,
      },
    },
  },

  plugins: [react()],

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
