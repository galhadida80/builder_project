import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['@emotion/react', '@emotion/styled', 'react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      '@emotion/react',
      '@emotion/styled',
      'prop-types',
      'react-is',
      'hoist-non-react-statics',
      'react-transition-group',
      'clsx',
      'dayjs',
      'dayjs/plugin/customParseFormat',
      'dayjs/plugin/isBetween',
      'dayjs/plugin/localizedFormat',
      'dayjs/plugin/weekOfYear',
      '@mui/icons-material',
      '@mui/material',
      '@mui/x-date-pickers',
      '@mui/x-date-pickers/AdapterDayjs',
    ],
    exclude: ['web-ifc'],
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
    warmup: {
      clientFiles: ['./src/main.tsx', './src/App.tsx', './src/components/layout/Layout.tsx'],
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
