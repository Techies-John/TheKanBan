import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Pages needs the repo subpath; local `npm run dev` stays at /
  base: command === 'build' ? '/TheKanBan/' : '/',
  plugins: [vue()],
}))
