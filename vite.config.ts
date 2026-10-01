import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'plugin-inspect-react-code'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Deploy di bawah /smart/board/ (pesat.app/smart/board/)
  base: process.env.VITE_BASE ?? '/smart/board/',
  plugins: [
    inspectAttr(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-mark.svg', 'pwa-icon-192.png', 'pwa-icon-512.png'],
      manifest: {
        name: 'Pesat Board',
        short_name: 'Pesat',
        description: 'Kanban tim dengan WhatsApp dua arah',
        lang: 'id',
        start_url: '/smart/board/',
        scope: '/smart/board/',
        display: 'standalone',
        theme_color: '#7C3AED',
        background_color: '#F8FAFC',
        icons: [
          { src: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache app shell saja — JANGAN cache /api, /socket.io, /uploads
        navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/, /^\/uploads/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api') ||
              url.pathname.startsWith('/socket.io') ||
              url.pathname.startsWith('/uploads'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:3400', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3400', changeOrigin: true },
      '/board/socket.io': { target: 'http://localhost:3400', changeOrigin: true, ws: true },
      '/socket.io': { target: 'http://localhost:3400', changeOrigin: true, ws: true },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
