// The updater plugin's errors arrive as plain text: each known one gets the steward's words.
const FAILURES: Array<[RegExp, string]> = [
  [
    /platform .* was not found|fallback platforms/i,
    'No update for this system: StewardPad releases are built for Windows.',
  ],
  [/valid release JSON/i, 'No release is published on GitHub yet.'],
  [
    /error sending request|dns|connect|timed out/i,
    'Could not reach GitHub. Check the connection and try again.',
  ],
]

/** Why a check failed, as Settings → Updates says it. */
export function failureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const known = FAILURES.find(([pattern]) => pattern.test(message))
  return known ? known[1] : `Could not check for updates: ${message}`
}
