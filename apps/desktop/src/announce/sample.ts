import type { Incident } from '@stewardpad/shared'

/** What the preview and the test message show before any real incident exists. */
export const SAMPLE_INCIDENT: Incident = {
  id: 'sample',
  sequenceNumber: 12,
  source: 'STEWARD',
  mergedIntoId: null,
  mergedFromIds: [],
  eventSeconds: 2750,
  loggedAtSeconds: 2760,
  lookbackApplied: 10,
  wallClock: '',
  replayReference: 'RACE 00:45:50 · Lap 27',
  cars: [
    {
      carNumber: '38',
      carClass: 'LMGT3',
      driverName: 'Theo Lindqvist',
      lapAtIncident: 27,
      role: 'CAUSED',
    },
    {
      carNumber: '85',
      carClass: 'LMGT3',
      driverName: 'Karin Sato',
      lapAtIncident: 27,
      role: 'AFFECTED',
    },
  ],
  type: 'CONTACT',
  status: 'PENALTY_APPLIED',
  summary: 'Late lunge into T7: #38 had no overlap at turn-in and hit the rear of #85, who spun.',
  stewardNotes: '',
  decision: 'Contact caused by #38 with a late braking move.',
  penalty: { type: 'TIME_PENALTY', seconds: 5, appliedTo: '38', served: false, notes: '' },
  rules: [{ code: '3.3.c', title: 'Causing a collision is prohibited.' }],
  loggedBy: 'Steward',
  reviewers: ['Steward'],
  createdAt: '',
  updatedAt: '',
}
