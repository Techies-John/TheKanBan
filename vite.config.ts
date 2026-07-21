import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const root = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8')) as {
  version: string
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Pages needs the repo subpath; local `npm run dev` stays at /
  base: command === 'build' ? '/TheKanBan/' : '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [vue()],
}))
