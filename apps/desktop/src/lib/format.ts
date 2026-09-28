/** "01:02:05" — same clock format the backend writes into replay references. */
export function formatHms(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const parts = [Math.floor(safe / 3600), Math.floor((safe % 3600) / 60), safe % 60]
  return parts.map((n) => String(n).padStart(2, '0')).join(':')
}
