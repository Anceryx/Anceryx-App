import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'),
  base: '/',
  plugins: [
    react(),
    {
        name: 'anceryx-web-production-policy',
      apply: 'build',
      transformIndexHtml(html) {
          return html
            .split(' http://localhost:3000').join('')
            .split(' ws://localhost:3000').join('')
            .split(' ws://localhost:5173').join('')
      },
    },
  ],
  define: {
    'import.meta.env.VITE_ANCERYX_PLATFORM': JSON.stringify('web'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@/': `${path.resolve(__dirname, 'src/renderer')}/`,
    },
  },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: {
    outDir: path.resolve(__dirname, 'web-dist'),
    emptyOutDir: true,
    sourcemap: false,
  },
})
