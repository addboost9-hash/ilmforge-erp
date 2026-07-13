import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    /* ─── Progressive Web App (PWA) ─────────────────────────
       Install prompt on mobile/desktop + offline caching
    ─────────────────────────────────────────────────────── */
    VitePWA({
      registerType: 'autoUpdate',        // auto-update SW when new version deployed
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      injectRegister: 'auto',
      workbox: {
        // Cache strategies
        runtimeCaching: [
          {
            // Cache API responses for offline use
            urlPattern: /^https:\/\/ilmforge-erp\.onrender\.com\/api\/v1\/.*/,
            handler: 'NetworkFirst',      // try network first, fallback to cache
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 24 * 60 * 60,  // 24 hours
              },
              networkTimeoutSeconds: 10,  // fallback to cache after 10s
            },
          },
          {
            // Cache static assets (fonts, images)
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60,  // 30 days
              },
            },
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
        ],
        // Pre-cache the app shell
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Skip waiting & claim clients immediately
        skipWaiting: true,
        clientsClaim: true,
      },

      /* ─── Web App Manifest ─── */
      manifest: {
        name: 'IlmForge School ERP',
        short_name: 'IlmForge',
        description: 'Pakistan ka #1 School Management System — Ilm Ko Asaan Banaye',
        theme_color: '#1B2F6E',
        background_color: '#ffffff',
        display: 'standalone',          // full-screen, no browser UI
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/dashboard',         // open dashboard directly
        lang: 'ur',
        dir: 'ltr',
        categories: ['education', 'productivity', 'business'],
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'Open school dashboard',
            url: '/dashboard',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
          },
          {
            name: 'Mark Attendance',
            short_name: 'Attendance',
            description: 'Mark daily attendance',
            url: '/attendance',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
          },
          {
            name: 'Collect Fee',
            short_name: 'Fees',
            description: 'Collect student fees',
            url: '/hub/fees',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
          },
          {
            name: 'Admit Student',
            short_name: 'Admission',
            description: 'Admit new student',
            url: '/admissions/wizard',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
          },
        ],
        screenshots: [
          {
            src: '/screenshots/dashboard.png',
            sizes: '1280x720',
            type: 'image/png',
            label: 'IlmForge Dashboard',
            form_factor: 'wide',
          },
          {
            src: '/screenshots/mobile.png',
            sizes: '390x844',
            type: 'image/png',
            label: 'IlmForge Mobile View',
            form_factor: 'narrow',
          },
        ],
      },

      devOptions: {
        enabled: false,  // disable in dev to avoid caching issues
      },
    }),
  ],

  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL
          ? process.env.VITE_API_URL.replace('/api/v1', '')
          : 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/pages/')) {
            const seg = id.split('/src/pages/')[1]?.split('/')[0];
            if (seg) return `page-${seg}`;
          }
          if (!id.includes('node_modules')) return;
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
          if (id.includes('@tanstack/react-query')) return 'vendor-query';
          if (id.includes('recharts')) return 'vendor-charts';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('axios') || id.includes('date-fns')) return 'vendor-utils';
          return;
        },
      },
    },
  },
});
