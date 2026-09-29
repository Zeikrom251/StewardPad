/** "01:02:05" — same clock format the backend writes into replay references. */
export function formatHms(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const parts = [Math.floor(safe / 3600), Math.floor((safe % 3600) / 60), safe % 60]
  return parts.map((n) => String(n).padStart(2, '0')).join(':')
}

/**
 * "HH:MM:SS" | "MM:SS" | "SS" → seconds, `null` when unparseable. The steward types
 * back what the LMU replay scrubber shows; a time picker can't hold a 24 h+ race clock.
 */
export function parseHms(value: string): number | null {
  const parts = value.trim().split(':')
  if (parts.length > 3) return null
  const numbers = parts.map((part) => (/^\d+$/.test(part) ? Number(part) : NaN))
  if (numbers.some(Number.isNaN)) return null
  return numbers.reduce((total, n) => total * 60 + n, 0)
}

/** Lap time "1:47.350", or a dash when LMU hasn't timed one yet. */
export function formatLapTime(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '–'
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${(seconds - minutes * 60).toFixed(3).padStart(6, '0')}`
}

/** Sector time "32.742", or a dash. */
export function formatSector(seconds: number | null): string {
  return seconds === null || seconds <= 0 ? '–' : seconds.toFixed(3)
}

/** "12s ago", "4 min ago" — for autosave and export timestamps. */
export function formatAgo(from: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - from) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  return `${Math.round(seconds / 60)} min ago`
}
