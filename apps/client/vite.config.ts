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

/**
 * Link previews (X, Discord, Slack) only load an absolute og:image URL, so the build prefixes
 * it with SITE_URL, the address the site is deployed at.
 */
function absoluteOgImage(site: string | undefined): Plugin {
  return {
    name: 'absolute-og-image',
    apply: 'build',
    configResolved(config) {
      if (!site) config.logger.warn('SITE_URL is not set: link previews will show no image.')
    },
    transformIndexHtml(html) {
      if (!site) return html
      return html.replace('content="/og.jpg"', `content="${site.replace(/\/$/, '')}/og.jpg"`)
    },
  }
}

export default defineConfig({
  plugins: [react(), spaFallback(), absoluteOgImage(process.env.SITE_URL)],
  // The site offers the version the desktop app builds: one number, from its Tauri config.
  define: { __APP_VERSION__: JSON.stringify(desktop.version) },
  server: { port: 5173, strictPort: true },
})
