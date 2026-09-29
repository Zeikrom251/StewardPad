import { backend } from '../../backend/backend'
import { Icon } from '../../icons'
import { Select } from '../../ui/Select'
import { useWorkspace } from '../../workspace/Workspace'
import styles from './QuickLog.module.scss'

const PRESETS = [0, 5, 10, 15, 20, 30, 45, 60]

/** Look-back quick switch, from the quick-log header. */
export function LookbackPill({ value }: { value: number }) {
  const { report } = useWorkspace()
  const options = PRESETS.includes(value) ? PRESETS : [...PRESETS, value].sort((a, b) => a - b)
  const change = (seconds: number) => {
    backend
      .updateConfig({ lookbackSeconds: seconds })
      .catch((error: unknown) => report('Could not change the look-back', error))
  }
  return (
    <Select
      value={value}
      options={options.map((s) => ({ value: s, label: `${s}s` }))}
      onChange={change}
      label="Look-back"
      className={styles.pill}
      trigger={
        <>
          <Icon name="history" size={13} />
          Look-back <b>{value}s</b>
          <Icon name="down" size={12} />
        </>
      }
    />
  )
}
