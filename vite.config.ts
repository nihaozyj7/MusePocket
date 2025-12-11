import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  // 使用相对路径，确保在 file:// 协议下正常工作
  base: './',
  plugins: [
    vue(),
    visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ],
  optimizeDeps: {
    include: ['pinyin-pro']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    // 输出目录
    outDir: 'dist',
    // 确保资源使用相对路径
    assetsDir: 'assets',
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
