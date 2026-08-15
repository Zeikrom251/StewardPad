import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite starts with the cwd at apps/client, so the repo-root .env has to be
// found by walking up — a cwd-relative lookup silently misses it and the proxy
// then points at the wrong port while the page still renders.
function repoRoot(): string {
  let dir = import.meta.dirname
  while (!existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(dir)
    if (parent === dir) return process.cwd()
    dir = parent
  }
  return dir
}

const envPath = path.join(repoRoot(), '.env')
if (existsSync(envPath)) process.loadEnvFile(envPath)

const backend = `http://localhost:${process.env.PORT ?? 3000}`

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Fail loudly instead of drifting to 5174. Vite's default is to increment
    // to the next free port, which under WSL mirrored networking (where WSL
    // shares the Windows port space, so any Windows app can take 5173) means
    // the steward opens a stale tab on a dead port mid-race and sees nothing.
    // Same contract as the backend's EADDRINUSE message in main.ts: a port
    // clash is an error to read, never a silent relocation.
    strictPort: true,
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/socket.io': { target: backend, ws: true },
    },
  },
})
