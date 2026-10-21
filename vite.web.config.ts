import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

const webCsp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; connect-src 'self' https: wss:; font-src 'self' data:; media-src 'self' blob: https:; object-src 'none'; base-uri 'self'; form-action 'self'"

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'),
  base: '/',
  plugins: [
    react(),
    {
      name: 'anceryx-web-security-policy',
      apply: 'build',
      transformIndexHtml(html) {
        return html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*\/?\s*>/i, `<meta http-equiv="Content-Security-Policy" content="${webCsp}" />`)
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
