import type { ReactNode } from 'react'
import { DocsPage } from './docs/DocsPage'
import { DownloadPage } from './download/DownloadPage'
import { HomePage } from './home/HomePage'
import { Footer } from './layout/Footer'
import { Nav } from './layout/Nav'
import { NotFound } from './layout/NotFound'
import { usePath, useScrollOnNavigate } from './router'

function page(path: string): ReactNode {
  if (path === '/') return <HomePage />
  if (path === '/download') return <DownloadPage />
  if (path === '/docs' || path.startsWith('/docs/')) return <DocsPage slug={path.slice(6)} />
  return <NotFound />
}

/** The website: home, download and the documentation, around one header and footer. */
export function App() {
  const path = usePath()
  useScrollOnNavigate(path)
  return (
    <>
      <Nav />
      <main>{page(path)}</main>
      <Footer />
    </>
  )
}
