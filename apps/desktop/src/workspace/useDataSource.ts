import type { AdapterName } from '@stewardpad/shared'
import { backend } from '../backend/backend'
import { useWorkspace } from './Workspace'

/** Switch between the simulator and the real game — Settings and the offline screen. */
export function useDataSource() {
  const { report } = useWorkspace()
  return (adapter: AdapterName) => {
    backend
      .setAdapter(adapter)
      .catch((error: unknown) => report('Could not switch the data source', error))
  }
}
