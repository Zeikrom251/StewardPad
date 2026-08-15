import { StandingsGrid } from '../components/StandingsGrid'
import { SelectionBar } from '../components/SelectionBar'
import { IncidentRail } from '../components/IncidentRail'

export function DashboardPage() {
  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto">
        <StandingsGrid />
      </div>
      <IncidentRail />
      <SelectionBar />
    </div>
  )
}
