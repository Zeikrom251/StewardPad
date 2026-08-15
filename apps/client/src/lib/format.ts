/** Formatting helpers for the tabular-nums time columns (DESIGN.md). */

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0')
}

/** Float seconds → "HH:MM:SS", floored to the whole second. */
export function formatElapsed(totalSeconds: number): string {
  const whole = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const seconds = whole % 60
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

/**
 * "HH:MM:SS" | "MM:SS" | "SS" → seconds, `null` when unparseable. The steward
 * types back what the LMU replay scrubber shows them, so the input is a
 * colon-separated string rather than `<input type="time">` — race elapsed runs
 * past 24h at Le Mans, which a time picker's clock-of-day semantics can't hold.
 */
export function parseElapsed(value: string): number | null {
  const parts = value.trim().split(':')
  if (parts.length > 3) return null
  const numbers = parts.map((part) => (/^\d+$/.test(part) ? Number(part) : NaN))
  if (numbers.some(Number.isNaN)) return null
  return numbers.reduce((total, n) => total * 60 + n, 0)
}

/** Float seconds → "M:SS.mmm" for lap/sector times, or a dash when absent. */
export function formatLapTime(seconds: number | null): string {
  if (seconds === null) return '–'
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds - minutes * 60
  return `${minutes}:${remainder.toFixed(3).padStart(6, '0')}`
}
