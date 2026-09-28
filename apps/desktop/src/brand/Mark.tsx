import { useId } from 'react'

type Point = readonly [number, number]
type Triangle = readonly [Point, Point, Point]
interface Cut {
  viewBox: number
  radius: number
  top: Triangle
  bottom: Triangle
}

// Brand v2 geometry (design/00-brand.html, "Construction"). Every size is
// generated from these points — never redrawn.
const CUTS = {
  // ≥ 33 px: two 20 × 14 triangles, white offset +7 (35 % of width), 0.5 overlap.
  primary: {
    viewBox: 32,
    radius: 1.3,
    top: [
      [2.5, 2.25],
      [22.5, 2.25],
      [12.5, 16.25],
    ],
    bottom: [
      [19.5, 15.75],
      [29.5, 29.75],
      [9.5, 29.75],
    ],
  },
  // 17–32 px: taller, tighter, rounder — survives the 20 px title bar.
  reduced: {
    viewBox: 32,
    radius: 2,
    top: [
      [3, 1.125],
      [24, 1.125],
      [13.5, 16.625],
    ],
    bottom: [
      [18.5, 15.375],
      [29, 30.875],
      [8, 30.875],
    ],
  },
  // 16 px: whole-pixel edges, 40 % offset so the tips never merge.
  px16: {
    viewBox: 16,
    radius: 0.5,
    top: [
      [1, 1],
      [11, 1],
      [6, 8],
    ],
    bottom: [
      [10, 8],
      [15, 15],
      [5, 15],
    ],
  },
} satisfies Record<string, Cut>

const round = (v: number): number => Math.round(v * 100) / 100

/** Triangle with each corner cut back by `d` along both edges and closed with a quadratic curve. */
function roundedTriangle(points: Triangle, d: number): string {
  const toward = (a: Point, b: Point): Point => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const length = Math.hypot(dx, dy)
    return [round(a[0] + (dx * d) / length), round(a[1] + (dy * d) / length)]
  }
  const [p0, p1, p2] = points
  // Each corner with its previous and next neighbour, walking the triangle in order.
  const corners: ReadonlyArray<readonly [Point, Point, Point]> = [
    [p0, p2, p1],
    [p1, p0, p2],
    [p2, p1, p0],
  ]
  const segments = corners.map(([corner, previous, next], i) => {
    const a = toward(corner, previous)
    const b = toward(corner, next)
    return `${i === 0 ? 'M' : 'L'}${a.join(' ')}Q${corner.join(' ')} ${b.join(' ')}`
  })
  return `${segments.join('')}Z`
}

function cutFor(size: number): Cut {
  if (size <= 16) return CUTS.px16
  if (size <= 32) return CUTS.reduced
  return CUTS.primary
}

/** The StewardPad mark. Monochrome (`color`) for the tray and single-colour uses. */
export function Mark({ size, color }: { size: number; color?: string }) {
  const gradientId = useId()
  const cut = cutFor(size)
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${cut.viewBox} ${cut.viewBox}`}
      aria-hidden="true"
      focusable="false"
    >
      {!color && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2=".75" y2="1">
            <stop offset="0" stopColor="var(--color-accent)" />
            <stop offset=".55" stopColor="var(--color-brand-red)" />
            <stop offset="1" stopColor="var(--color-brand-red-lo)" />
          </linearGradient>
        </defs>
      )}
      <path d={roundedTriangle(cut.top, cut.radius)} fill={color ?? `url(#${gradientId})`} />
      <path d={roundedTriangle(cut.bottom, cut.radius)} fill={color ?? 'var(--color-text)'} />
    </svg>
  )
}
