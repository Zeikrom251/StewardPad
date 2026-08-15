import { AppDataProvider } from './context/AppDataProvider'
import { Header } from './components/Header'
import { Nav } from './components/Nav'
import { IncidentEditor } from './components/IncidentEditor'
import { GlobalShortcuts } from './components/GlobalShortcuts'
import { DashboardPage } from './pages/DashboardPage'
import { IncidentsPage } from './pages/IncidentsPage'
import { ExportPage } from './pages/ExportPage'
import { usePathname } from './lib/router'

function CurrentPage() {
  const pathname = usePathname()
  if (pathname === '/incidents') return <IncidentsPage />
  if (pathname === '/export') return <ExportPage />
  return <DashboardPage />
}

export function App() {
  return (
    <AppDataProvider>
      <div className="flex h-screen flex-col">
        <Header />
        <Nav />
        <main className="flex-1 overflow-hidden">
          <CurrentPage />
        </main>
      </div>
      <IncidentEditor />
      <GlobalShortcuts />
    </AppDataProvider>
  )
}
