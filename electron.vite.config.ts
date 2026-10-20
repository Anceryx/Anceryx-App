import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          main: path.join(__dirname, 'src/main/main.ts'),
          electronSafeStorageSmoke: path.join(__dirname, 'scripts/electron-safe-storage-smoke.ts')
        },
        // Keep the native loader external so its dynamic .node require is
        // handled by Electron's real CommonJS runtime.
        external: ['node-gyp-build']
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          preload: path.join(__dirname, 'src/preload/preload.ts')
        }
      }
    }
  },
  renderer: {
    root: path.join(__dirname, 'src/renderer'),
    build: {
      rollupOptions: {
        input: {
          index: path.join(__dirname, 'src/renderer/index.html')
        }
      }
    },
    plugins: [
      react(),
      {
        name: 'anceryx-production-csp',
        apply: 'build',
        transformIndexHtml(html) {
          return html
            .split(' http://localhost:3000').join('')
            .split(' ws://localhost:3000').join('')
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.join(__dirname, 'src/renderer'),
        '@/': path.join(__dirname, 'src/renderer/')
      }
    }
  }
})
