import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rendererRoot = fileURLToPath(new URL('../src/renderer', import.meta.url))
export default defineConfig({
  root: rendererRoot,
  plugins: [react()],
  resolve: { alias: { '@': rendererRoot, '@/': `${rendererRoot}${path.sep}` } },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
})