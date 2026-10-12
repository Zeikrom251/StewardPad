import { useState } from 'react'
import type { InvolvedCar } from '@stewardpad/shared'
import { backend } from '../backend/backend'
import { useLive } from '../backend/LiveProvider'
import { Icon } from '../icons'
import { cx } from '../ui/primitives'
import ui from '../ui/ui.module.scss'
import { useWorkspace } from '../workspace/Workspace'
import { followCar } from './followCar'

/**
 * Moves Le Mans Ultimate's open replay to this time, instead of typing the reference into its
 * scrubber, and points its camera at the car under investigation (followCar). Shown only when
 * the time is the game's: this PC reads the game, or a teammate streams theirs. The
 * simulator's clock means nothing to a replay.
 */
export function GoToReplay({ seconds, cars }: { seconds: number; cars: InvolvedCar[] }) {
  const live = useLive()
  const { report } = useWorkspace()
  const [pending, setPending] = useState(false)
  if (!live || (live.config.adapter === 'mock' && !live.team.watching)) return null
  const go = () => {
    setPending(true)
    backend
      .goToReplay(seconds, followCar(cars, live.standings))
      .catch((error: unknown) => report('Could not go to the replay', error))
      .finally(() => setPending(false))
  }
  return (
    <button
      type="button"
      className={cx(ui.btn, ui.sm)}
      onClick={go}
      disabled={pending}
      title="Moves Le Mans Ultimate’s open replay to this time and follows the car under investigation"
    >
      <Icon name="monitor" size={13} />
      {pending ? 'Going…' : 'Go to'}
    </button>
  )
}
