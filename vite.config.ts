import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 将 vue 相关库打包在一起
          'vue-libs': [
            'vue',
            'vue-router',
            'pinia'
          ],
          // 将工具库打包在一起
          'utils': [
            'lodash-es',
            'nanoid',
            'notyf'
          ],
          // 将数据库相关库打包在一起
          'db': [
            'idb'
          ]
        }
      }
    }
  }
})
