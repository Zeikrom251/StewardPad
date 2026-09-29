import type { SVGProps } from 'react'

// Lucide-style 24 px stroke icons, drawn in currentColor, one path each (circles and
// rects written as arcs). Add paths here as screens need them.
const PATHS = {
  gauge: 'M12 14l4-4M3.34 19a10 10 0 1 1 17.32 0',
  flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  file: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8',
  keyboard:
    'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10',
  sliders: 'M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4',
  minimize: 'M6 12h12',
  maximize: 'M7 6h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z',
  close: 'M17 7 7 17M7 7l10 10',
  search: 'M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM21 21l-4.3-4.3',
  plus: 'M5 12h14M12 5v14',
  minus: 'M5 12h14',
  x: 'M18 6 6 18M6 6l12 12',
  down: 'm6 9 6 6 6-6',
  left: 'm15 18-6-6 6-6',
  right: 'm9 18 6-6-6-6',
  up: 'm18 15-6-6-6 6',
  book: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2ZM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z',
  queue: 'm3 17 2 2 4-4M3 7l2 2 4-4M13 6h8M13 12h8M13 18h8',
  list: 'M3 12h.01M3 18h.01M3 6h.01M8 12h13M8 18h13M8 6h13',
  copy: 'M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2ZM4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2',
  lock: 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2ZM7 11V7a5 5 0 0 1 10 0v4',
  eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  check: 'M20 6 9 17l-5-5',
  dots: 'M11 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0M18 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0M4 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0',
  merge:
    'M21 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6 21V9a9 9 0 0 0 9 9',
  trash: 'M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2',
  folder:
    'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  archive:
    'M3 3h18a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4',
  history: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2',
  radio:
    'M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M19.1 4.9C23 8.8 23 15.1 19.1 19M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  user: 'M17 8a5 5 0 1 1-10 0 5 5 0 0 1 10 0ZM20 21a8 8 0 0 0-16 0',
  alert:
    'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4M12 17h.01',
  clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 6v6l4 2',
  circle: 'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  gavel: 'm14.5 12.5-8 8a2.12 2.12 0 1 1-3-3l8-8M16 16l6-6M8 8l6-6M9 7l8 8M21 11l-8-8',
  ban: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM5.7 5.7l12.6 12.6',
  heading: 'M6 12h12M6 20V4M18 20V4',
  bold: 'M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8',
  italic: 'M19 4h-9M14 20H5M15 4 9 20',
  numbered: 'M10 12h11M10 18h11M10 6h11M4 10h2M4 6h1v4M6 18H4c0-1 2-2 2-3s-1-1.5-2-1',
  enter: 'M9 10 4 15l5 5M20 4v7a4 4 0 0 1-4 4H4',
  updown: 'm7 15 5 5 5-5M7 9l5-5 5 5',
  plug: 'M12 22v-5M9 8V2M15 8V2M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z',
  sort: 'm3 16 4 4 4-4M7 20V4M11 4h10M11 8h7M11 12h4',
  save: 'M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7M7 3v4a1 1 0 0 0 1 1h7',
} as const

export type IconName = keyof typeof PATHS

export function Icon({
  name,
  size = 16,
  strokeWidth = 1.75,
  ...rest
}: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flex: 'none' }}
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
