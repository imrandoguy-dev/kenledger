import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// SINGLEFILE=1 builds a self-contained preview (no service worker).
const single = process.env.SINGLEFILE === '1'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    // Netlify sets COMMIT_REF during builds.
    __COMMIT__: JSON.stringify((process.env.COMMIT_REF ?? '').slice(0, 7)),
  },
  resolve: single ? { alias: { 'virtual:pwa-register': fileURLToPath(new URL('./src/pwa-register-stub.ts', import.meta.url)) } } : undefined,
  plugins: [
    react(),
    tailwindcss(),
    single
      ? viteSingleFile()
      : VitePWA({
          // 'prompt' keeps control in our hands: UpdateBanner applies new deploys
          // automatically when it's safe (on open, or when the app is backgrounded).
          registerType: 'prompt',
          injectRegister: false,
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
            cleanupOutdatedCaches: true,
          },
        }),
  ],
})
