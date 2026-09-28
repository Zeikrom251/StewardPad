import { useState } from 'react'
import { TitleBar } from './shell/TitleBar'
import { Rail, type Page } from './shell/Rail'
import { StatusBar } from './shell/StatusBar'
import { LiveProvider } from './backend/LiveProvider'
import styles from './App.module.scss'

const TITLES: Record<Page, string> = {
  race: 'Race Control',
  incidents: 'Incidents',
  reports: 'Reports',
  keys: 'Keyboard shortcuts',
  settings: 'Settings',
}

/** Window shell: title bar, rail, content, status bar (design/02-race-control.html). */
export function App() {
  const [page, setPage] = useState<Page>('race')
  return (
    <LiveProvider>
      <div className={styles.window}>
        <TitleBar />
        <div className={styles.body}>
          <Rail active={page} onNavigate={setPage} />
          <main className={styles.content}>
            <h1 className={styles.title}>{TITLES[page]}</h1>
            <p className={styles.placeholder}>Not built yet.</p>
          </main>
        </div>
        <StatusBar />
      </div>
    </LiveProvider>
  )
}
