import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  // Project Pages site: https://techies-john.github.io/TheKanBan/
  base: '/TheKanBan/',
  plugins: [vue()],
})
