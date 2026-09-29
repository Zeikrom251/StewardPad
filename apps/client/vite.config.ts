import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import desktop from '../desktop/src-tauri/tauri.conf.json' with { type: 'json' }

/**
 * Static hosts (GitHub Pages and the like) answer an unknown path with 404.html: a copy of
 * the app shell lets a shared /docs/rule-book link open on the right page.
 */
function spaFallback(): Plugin {
  return {
    name: 'spa-fallback',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const index = bundle['index.html']
      if (index?.type === 'asset') {
        this.emitFile({ type: 'asset', fileName: '404.html', source: index.source })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), spaFallback()],
  // The site offers the version the desktop app builds: one number, from its Tauri config.
  define: { __APP_VERSION__: JSON.stringify(desktop.version) },
  server: { port: 5173, strictPort: true },
})
