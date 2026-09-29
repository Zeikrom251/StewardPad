import type { ComponentType } from 'react'
import { TitleBar } from './shell/TitleBar'
import { Rail } from './shell/Rail'
import { StatusBar } from './shell/StatusBar'
import { AnnouncerProvider } from './announce/AnnouncerProvider'
import { LiveProvider } from './backend/LiveProvider'
import { CommandPalette } from './palette/CommandPalette'
import { IncidentsPage } from './pages/incidents/IncidentsPage'
import { RacePage } from './pages/race/RacePage'
import { ReviewPage } from './pages/review/ReviewPage'
import { RulesPage } from './pages/rules/RulesPage'
import { AnnouncePage } from './pages/announce/AnnouncePage'
import { ReportsPage } from './pages/reports/ReportsPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { KeysPage } from './pages/settings/Shortcuts'
import { WorkspaceProvider, useWorkspace, type Page } from './workspace/Workspace'
import { useShortcuts } from './workspace/useShortcuts'
import { useApplyDisplay } from './workspace/useDisplay'
import styles from './App.module.scss'

const PAGES: Record<Page, ComponentType> = {
  race: RacePage,
  incidents: IncidentsPage,
  review: ReviewPage,
  rules: RulesPage,
  reports: ReportsPage,
  announce: AnnouncePage,
  keys: KeysPage,
  settings: SettingsPage,
}

function Window() {
  const { page } = useWorkspace()
  useShortcuts()
  useApplyDisplay()
  const Content = PAGES[page]
  return (
    <div className={styles.window}>
      <TitleBar />
      <div className={styles.body}>
        <Rail />
        <main className={styles.content}>
          <Content />
        </main>
      </div>
      <StatusBar />
      <CommandPalette />
    </div>
  )
}

/** Window shell: title bar, rail, the current page, status bar (design/02-race-control.html). */
export function App() {
  return (
    <LiveProvider>
      <WorkspaceProvider>
        <AnnouncerProvider>
          <Window />
        </AnnouncerProvider>
      </WorkspaceProvider>
    </LiveProvider>
  )
}
