import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

/**
 * Vite plugin to redirect @mui/system and @mui/utils subpath imports
 * to their ESM equivalents. These packages have CJS at root and ESM in esm/.
 * When excluded from optimizeDeps (to avoid esbuild createTheme bug),
 * Vite serves CJS files for subpath imports which browsers can't handle.
 */
function muiEsmRedirect(): Plugin {
  const muiPackages = ['@mui/system', '@mui/utils', '@mui/icons-material']
  return {
    name: 'mui-esm-redirect',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      for (const pkg of muiPackages) {
        if (source.startsWith(pkg + '/') && !source.includes('/esm/') && !source.includes('/node/')) {
          const subpath = source.slice(pkg.length + 1)
          const esmSource = `${pkg}/esm/${subpath}`
          const resolved = await this.resolve(esmSource, importer, { ...options, skipSelf: true })
          if (resolved) return resolved
        }
      }
      return null
    },
  }
}

export default defineConfig({
  plugins: [
    muiEsmRedirect(),
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: false,
      selfDestroying: true,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 10
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['@mui/material', '@mui/system', '@mui/utils'],
  },
  optimizeDeps: {
    exclude: [
      '@mui/material',
      '@mui/system',
      '@mui/utils',
      '@mui/base',
      '@mui/icons-material',
      '@mui/x-charts',
      '@mui/x-data-grid',
      '@mui/x-date-pickers',
    ],
    include: [
      '@emotion/react',
      '@emotion/styled',
      'prop-types',
      'react-is',
      'hoist-non-react-statics',
      'react-transition-group',
      'clsx',
      '@babel/runtime > regenerator-runtime',
      'dayjs',
      'dayjs/plugin/customParseFormat',
      'dayjs/plugin/isBetween',
      'dayjs/plugin/localizedFormat',
      'dayjs/plugin/weekOfYear',
    ],
  },
  ssr: {
    noExternal: ['@mui/*'],
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
