import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    // Tree-shake Sentry Replay, Feedback & debug code (~60 KiB savings)
    __SENTRY_DEBUG__: false,
    __RRWEB_EXCLUDE_IFRAME__: true,
    __RRWEB_EXCLUDE_SHADOW_DOM__: true,
    __SENTRY_EXCLUDE_REPLAY_WORKER__: true,
  },
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    sourcemap: mode === 'production' ? 'hidden' : true,
    // Optimize chunk splitting for better caching and smaller initial bundles
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React - smallest possible initial bundle
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          // Router - needed for navigation
          if (id.includes('node_modules/react-router')) {
            return 'router';
          }
          // Query - needed for data fetching
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'query';
          }
          // Forms - only loaded on pages with forms
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('node_modules/zod/')) {
            return 'forms';
          }
          // i18n - translation system
          if (id.includes('i18next')) {
            return 'i18n';
          }
          // Sentry - loaded lazily via requestIdleCallback
          if (id.includes('@sentry')) {
            return 'sentry';
          }
          // Framer Motion - used for animations, can be deferred
          if (id.includes('framer-motion')) {
            return 'motion';
          }
          // Supabase - core backend client
          if (id.includes('@supabase')) {
            return 'supabase';
          }
          // Radix UI - component primitives, split by usage
          if (id.includes('@radix-ui')) {
            return 'radix';
          }
          // lucide-react - icons, tree-shaken per-route
          // NOT in manual chunks to allow per-component tree-shaking
        },
      },
    },
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 500,
    // Enable minification
    minify: 'esbuild',
    // Target modern browsers for smaller output
    target: 'es2022',
    // Enable CSS code splitting
    cssCodeSplit: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
    ],
    // lucide-react excluded — tree-shaken per-component, pre-bundling negates savings
    // framer-motion excluded — lazy-loaded per-component to reduce initial parse
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script-defer",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png", "custom-sw.js", "manifest.webmanifest", "manifest-admin.json", "offline.html"],
      // Disable automatic manifest injection - we handle this dynamically in useAdminManifest
      manifest: false,
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Bump this to force workbox to invalidate its precache on next deploy
        cacheId: 'eclipse-v6',
        // Only precache static assets — JS/CSS are content-hashed and served fresh from network.
        // Precaching JS/CSS causes stale chunk errors after deploys on iOS Safari.
        globPatterns: ["**/*.{ico,png,svg,woff,woff2}"],
        // Navigation is handled by custom-sw.js (network-first)
        // Prevent Workbox from intercepting ANY navigation request
        navigateFallbackDenylist: [/./],
        // Import custom service worker for push notifications
        importScripts: ["/custom-sw.js"],
        runtimeCaching: [
          // No Supabase caching — stale auth tokens cause boot failures
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /\.(?:woff|woff2|ttf|otf)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "font-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
