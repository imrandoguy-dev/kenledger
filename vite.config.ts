import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// SINGLEFILE=1 builds a self-contained preview (no service worker).
const single = process.env.SINGLEFILE === '1'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    single
      ? viteSingleFile()
      : VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.svg', 'icons/*.png'],
          manifest: {
            name: 'Kenledger',
            short_name: 'Kenledger',
            description: 'A calm, private notebook for your money.',
            theme_color: '#174C3B',
            background_color: '#F5F2E9',
            display: 'standalone',
            start_url: '/',
            scope: '/',
            icons: [
              { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
              { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
            navigateFallback: '/index.html',
          },
        }),
  ],
})
