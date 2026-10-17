import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// SINGLEFILE=1 builds a self-contained preview (no service worker).
const single = process.env.SINGLEFILE === '1'
const BUILD_TIME = new Date().toISOString()
/** The latest commit's title, shown as "What's new" in the update popup. */
const NOTE = (() => { try { return execSync('git log -1 --format=%s', { encoding: 'utf8' }).trim() } catch { return '' } })()

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
    // Netlify sets COMMIT_REF during builds.
    __COMMIT__: JSON.stringify((process.env.COMMIT_REF ?? '').slice(0, 7)),
  },
  resolve: single ? { alias: { 'virtual:pwa-register': fileURLToPath(new URL('./src/pwa-register-stub.ts', import.meta.url)) } } : undefined,
  plugins: [
    react(),
    tailwindcss(),
    // /version.json lets the app ask which build is live (see src/pwa.ts).
    {
      name: 'kenledger-version',
      generateBundle() {
        if (single) return
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ built: BUILD_TIME, note: NOTE, commit: (process.env.COMMIT_REF ?? '').slice(0, 7) }) })
      },
    },
    single
      ? viteSingleFile()
      : VitePWA({
          // 'prompt' keeps control in our hands: UpdateBanner applies new deploys
          // automatically when it's safe (on open, or when the app is backgrounded).
          registerType: 'prompt',
          injectRegister: false,
          includeAssets: ['favicon.png', 'logo.png', 'icons/*.png'],
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
              { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
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
