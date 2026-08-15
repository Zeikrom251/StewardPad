/** Prompt §7.3 — the load-bearing look-back offset. Pure, server-side truth. */
export function computeEventSeconds(
  currentElapsedSeconds: number,
  lookbackSeconds: number,
): number {
  return Math.max(0, currentElapsedSeconds - lookbackSeconds)
}
