/**
 * Fictional 24-car grid across three classes. Not real drivers or teams.
 * `'77'` is deliberately reused by both HYPERCAR and LMGT3 — real LMU grids
 * don't guarantee unique car numbers across classes, and this is what lets
 * the mock demo the slotID-based identity fix in lmu-incident-resolver.ts
 * without needing the game running.
 */

export type MockCarClass = 'HYPERCAR' | 'LMP2' | 'LMGT3'

export interface MockRosterEntry {
  carNumber: string
  driverName: string
  teamName: string
  carClass: MockCarClass
  baseLapSeconds: number
  baseTopSpeedKph: number
}

interface ClassSpec {
  lapSeconds: number
  topSpeed: number
  numbers: string[]
}

const CLASS_SPECS: Record<MockCarClass, ClassSpec> = {
  HYPERCAR: {
    lapSeconds: 107,
    topSpeed: 300,
    numbers: ['2', '7', '8', '15', '36', '50', '83', '77'],
  },
  LMP2: {
    lapSeconds: 112,
    topSpeed: 290,
    numbers: ['9', '22', '23', '28', '31', '35', '38', '48'],
  },
  LMGT3: {
    lapSeconds: 119,
    topSpeed: 270,
    numbers: ['46', '54', '55', '60', '63', '77', '85', '92'],
  },
}

const FIRST_NAMES = [
  'Liam',
  'Noah',
  'Mateo',
  'Lucas',
  'Elena',
  'Sofia',
  'Kenji',
  'Priya',
  'Marco',
  'Anders',
  'Hugo',
  'Fabio',
  'Nina',
  'Omar',
  'Theo',
  'Yuki',
  'Ben',
  'Carlos',
  'Erik',
  'Freya',
  'Ivo',
  'Jonas',
  'Karin',
  'Leo',
]

const LAST_NAMES = [
  'Dubois',
  'Rossi',
  'Larsen',
  'Alvarez',
  'Kowalski',
  'Nakamura',
  'Silva',
  'Weber',
  'Novak',
  'Petrov',
  'Costa',
  'Berger',
  'Moreau',
  'Haddad',
  'Lindqvist',
  'Okada',
  'Reyes',
  'Fischer',
  'Bianchi',
  'Holm',
  'Andrade',
  'Meyer',
  'Sato',
  'Vidal',
]

const TEAM_NAMES = [
  'Nordwind Racing',
  'Scuderia Levante',
  'Ironclad Motorsport',
  'Aurora Endurance',
  'Meridian Racing Team',
  'Vantage Competition',
  'Solstice Motorsport',
  'Redline Racing',
]

function pick<T>(arr: readonly T[], index: number): T {
  const value = arr[index % arr.length]
  if (value === undefined) throw new Error('pick() called on an empty array')
  return value
}

export function buildRoster(): MockRosterEntry[] {
  const roster: MockRosterEntry[] = []
  let index = 0
  for (const [carClass, spec] of Object.entries(CLASS_SPECS) as [MockCarClass, ClassSpec][]) {
    for (let n = 0; n < spec.numbers.length; n++) {
      roster.push({
        carNumber: pick(spec.numbers, n),
        driverName: `${pick(FIRST_NAMES, index)} ${pick(LAST_NAMES, index)}`,
        teamName: pick(TEAM_NAMES, index),
        carClass,
        baseLapSeconds: spec.lapSeconds,
        baseTopSpeedKph: spec.topSpeed,
      })
      index++
    }
  }
  return roster
}
