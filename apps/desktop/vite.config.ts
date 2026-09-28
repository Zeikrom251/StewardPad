import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Tauri loads the dev server from a fixed URL (tauri.conf.json → build.devUrl),
// so the port must never drift: strictPort turns a clash into an error.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  build: {
    // WebView2 (Windows) is evergreen Chromium — no legacy output needed.
    target: 'chrome120',
  },
})
