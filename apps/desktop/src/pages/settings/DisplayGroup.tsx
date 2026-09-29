import type { Density } from '@stewardpad/shared'
import { Icon } from '../../icons'
import { cx } from '../../ui/primitives'
import ui from '../../ui/ui.module.scss'
import { useDisplay } from '../../workspace/useDisplay'
import { COLUMNS } from '../race/standingsColumns'
import { Segmented } from '../../ui/Segmented'
import { Group, Row } from './SettingsGroups'
import styles from './SettingsPage.module.scss'

const DENSITIES: Array<[Density, string]> = [
  ['compact', 'Compact'],
  ['comfortable', 'Comfortable'],
]
const TEXT_SCALES = [90, 100, 110, 125]
const HIDEABLE = COLUMNS.filter((c) => c.name)

function ColumnToggles() {
  const { prefs, update } = useDisplay()
  const toggle = (id: string) =>
    update({
      hiddenColumns: prefs.hiddenColumns.includes(id)
        ? prefs.hiddenColumns.filter((c) => c !== id)
        : [...prefs.hiddenColumns, id],
    })
  return (
    <div className={styles.columns}>
      {HIDEABLE.map((c) => {
        const shown = !prefs.hiddenColumns.includes(c.id)
        return (
          <button
            key={c.id}
            type="button"
            role="checkbox"
            aria-checked={shown}
            onClick={() => toggle(c.id)}
          >
            <span className={ui.check} aria-checked={shown}>
              {shown && <Icon name="check" size={11} strokeWidth={3} />}
            </span>
            {c.name}
          </button>
        )
      })}
    </div>
  )
}

function FoldedSections() {
  const { prefs, update } = useDisplay()
  const folded = prefs.collapsedSections.length
  return (
    <Row
      label="Inspector sections"
      help="Click a section title in the inspector to fold it. Folded ones stay folded."
    >
      <span className={styles.inline}>
        {folded ? `${folded} folded` : 'All open'}
        {folded > 0 && (
          <button
            type="button"
            className={cx(ui.btn, ui.sm)}
            onClick={() => update({ collapsedSections: [] })}
          >
            Unfold all
          </button>
        )}
      </span>
    </Row>
  )
}

/** Settings → Display: how dense the app is, how big, and which standings columns show. */
export function DisplayGroup() {
  const { prefs, update } = useDisplay()
  const scales = TEXT_SCALES.includes(prefs.textScale)
    ? TEXT_SCALES
    : [...TEXT_SCALES, prefs.textScale].sort((a, b) => a - b)
  return (
    <Group label="Display">
      <Row
        label="Density"
        help="Compact fits the most on screen. Comfortable adds room between rows and sections."
      >
        <Segmented
          value={prefs.density}
          options={DENSITIES}
          onChange={(density) => update({ density })}
        />
      </Row>
      <Row label="Text size" help="Scales the whole window: text, spacing and tables together.">
        <Segmented
          value={prefs.textScale}
          options={scales.map((s) => [s, `${s}%`])}
          onChange={(textScale) => update({ textScale })}
        />
      </Row>
      <Row
        label="Standings columns"
        help="Position, car number and driver always show. Hide what you don't watch in a race."
      >
        <ColumnToggles />
      </Row>
      <FoldedSections />
    </Group>
  )
}
