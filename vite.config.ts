import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 相對路徑：不論部署在網域根目錄或子路徑都能運作
  base: './',
  build: {
    // Cloud Phone 為伺服器端 Chromium 渲染，可安全使用 ES2022
    target: 'es2022',
    // 遠端渲染下載一次就好，把資源合併減少往返
    assetsInlineLimit: 8192,
    sourcemap: false,
  },
  server: {
    // 方便用手機或模擬器連進來測試
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
})
