import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['electron']
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        external: ['electron']
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src'),
        '@app': resolve('src/renderer/src/app'),
        '@shared': resolve('src/renderer/src/shared'),
        '@core': resolve('src/renderer/src/core'),
        '@domains': resolve('src/renderer/src/domains'),
        '@pages': resolve('src/renderer/src/pages')
      }
    },
    plugins: [
      vue(),
      visualizer({
        filename: './out/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true
      })
    ],
    optimizeDeps: {
      include: ['pinyin-pro']
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-libs': ['vue', 'vue-router', 'pinia'],
            'utils': ['lodash-es', 'nanoid', 'notyf'],
            'db': ['idb']
          }
        }
      }
    }
  }
})
