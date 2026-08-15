# StewardPad visual language

Race-control screen, not a marketing page. Tokens live in `src/index.css`
under `@theme` — this is the lookup table for using them, read alongside
prompt §8. Tailwind v4: `--color-x` in `@theme` generates `bg-x`/`text-x`/
`border-x`/`ring-x` automatically, including opacity (`bg-x/8`).

## Neutrals

| Token            | Hex            | Use                                                                 |
| ---------------- | -------------- | ------------------------------------------------------------------- |
| `ground`         | `#100d0c`      | page background                                                     |
| `surface`        | `#1a1512`      | header, grid, cards                                                 |
| `surface-raised` | `#241e1a`      | hover, modal, toast (depth cue only)                                |
| `border`         | `#2f2621`      | decorative hairlines (grid dividers) — not a 3:1 boundary           |
| `border-strong`  | = `text-faint` | real boundaries: input outline, panel/modal edge, dropdown          |
| `text`           | `#efece9`      | primary copy                                                        |
| `text-muted`     | `#a89d96`      | secondary labels, de-emphasised pit rows                            |
| `text-faint`     | `#746a64`      | large text (≥18px) or non-text UI only — under 4.5:1 for small copy |

Body sets `bg-ground text-text` globally; don't repeat it per page.

Grounds are warm near-black — R the highest channel, B the lowest, the way
carbon/asphalt reads under sodium pit lighting rather than a blue-lit
monitor. Same small luminance steps as before between the three layers, just
a different hue family.

## The one accent — `accent` `#ff5533`

Le Mans red: a fully-saturated warm vermilion (hue ~10°). Reserved for
"needs the steward's attention now": focus ring, selected standings rows,
primary buttons. Never a class tint or a calm confirmation — if it shows up
in more than ~3 places, something should've been a status color instead.
6.08:1 vs ground, 5.69:1 vs surface, 5.17:1 vs surface-raised — clears both
small-text and 2px-outline use everywhere it appears.

### The red-accent / red-penalty collision

Making the accent red put it in direct competition with
`PENALTY_APPLIED`, which was already red (`#e2596b`). Same hue for "look at
this right now" and "a penalty was already decided" would have blurred
together exactly the way the brief warns about — a steward glancing at a red
edge on a standings row couldn't tell "you selected this car" from "this car
already got a penalty" without stopping to read.

Resolved by moving `PENALTY_APPLIED` around the hue wheel, not just down in
brightness: it's now a cooler magenta-crimson (`#da4e7d`, hue ~340°), about
30° from the accent's hue. It's still unambiguously in the red family — this
is a penalty, not a warning or a note — but it's a different color, not a
paler or duller version of the accent, so it survives a peripheral glance.
It's also the semantically correct move: `PENALTY_APPLIED` is a resolved,
past-tense state, same category as `NO_FURTHER_ACTION` and `DISMISSED`, not
a live "act now" cue — it should never have shared the accent's exact hue.

`phase-fcy` (session phase, orange) needed the same check: with the accent
now warm-red, its hue (~26°) sits only ~16° from the accent's (~10°). There
was no room to shift it further — the other side of the gap is
`UNDER_INVESTIGATION`'s amber at ~36°. It stays close in hue but was pulled
down in saturation and lightness (`#d9722f` → `#c26b29`) so it reads as a
duller, burnt-rust orange next to the accent's neon vermilion — separation
by intensity where hue had no room left.

## Incident status — one color each, everywhere

Badge: `bg-status-x/12 text-status-x border border-status-x/40 rounded-sm
px-2 py-0.5 text-xs font-medium`, label text always alongside, never color
alone. Fill is the same hex at 12% alpha; text is the information carrier.

| Status                | Token                              | Hex       | vs surface | vs ground |
| --------------------- | ---------------------------------- | --------- | ---------- | --------- |
| `NOTED`               | `status-noted`                     | `#5b8def` | 5.60:1     | 5.99:1    |
| `UNDER_INVESTIGATION` | `status-under-investigation`       | `#e2a03f` | 8.05:1     | 8.60:1    |
| `NO_FURTHER_ACTION`   | `status-no-further-action`         | `#4ea86f` | 6.17:1     | 6.59:1    |
| `PENALTY_APPLIED`     | `status-penalty-applied`           | `#da4e7d` | 4.63:1     | 4.95:1    |
| `DISMISSED`           | `status-dismissed` (=`text-muted`) | `#a89d96` | 6.84:1     | 7.31:1    |

`PENALTY_APPLIED` moved from red to magenta-crimson — see "The red-accent /
red-penalty collision" above. `NOTED`, `UNDER_INVESTIGATION`, and
`NO_FURTHER_ACTION` keep their hexes; ratios shifted a hair because the
grounds moved warmer.

## Session phase badge

Same badge recipe. Reuses status hues wherever the real flag color already
matches — don't mint tokens for these.

| Phase        | Classes                                                    | Why                                                                                                                                                                                                                                                |
| ------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GREEN`      | `status-no-further-action` set                             | green flag                                                                                                                                                                                                                                         |
| `YELLOW`     | `status-under-investigation` set                           | local caution                                                                                                                                                                                                                                      |
| `FCY`        | `phase-fcy` set (`#c26b29`, 4.68:1/surface, 5.00:1/ground) | full-course reads more severe than local yellow — the one new phase token                                                                                                                                                                          |
| `SAFETY_CAR` | `status-noted` set                                         | procedural, not a flag color — blue keeps it out of the yellow family                                                                                                                                                                              |
| `RED`        | `accent` set                                               | red flag — a live "attention now" event, the exact case the accent hue is reserved for, unlike `PENALTY_APPLIED` which is a past-tense decided outcome; no collision risk since session-phase and per-incident-status badges never appear adjacent |
| `FINISHED`   | `bg-transparent text-text-muted border-border-strong`      | neutral, session over                                                                                                                                                                                                                              |
| `UNKNOWN`    | same as `FINISHED`                                         | differentiate by label text only — never invent a color for "don't know"                                                                                                                                                                           |

("set" = `bg-x/12 text-x border-x/40` using that token.)

## Car class row tint

Background wash at fixed 8% alpha, never solid — don't raise it without
re-checking text contrast. Unknown class → no tint, plain row.

| Class      | Token                      | Classes               |
| ---------- | -------------------------- | --------------------- |
| `HYPERCAR` | `class-hypercar` `#3b6fd8` | `bg-class-hypercar/8` |
| `LMP2`     | `class-lmp2` `#2f9e8f`     | `bg-class-lmp2/8`     |
| `LMGT3`    | `class-lmgt3` `#c97a4a`    | `bg-class-lmgt3/8`    |

Row text stays `text-text`/`text-text tabular-nums` regardless — at 8% alpha
the background shift is small enough that primary text stays above 15:1 and
muted above 6.8:1 even against the worst-case class hue.

Re-checked against the red accent: all three class hexes are unchanged.
`class-lmgt3` (`#c97a4a`) sits close to the accent and `phase-fcy` in raw
hue, same as it did before this repaint — that's fine because it's only
ever an 8% wash across a whole row, never a saturated badge, border, or
ring, so it never competes with the accent's or phase-fcy's full-strength
chrome for attention. `class-hypercar` (blue) and `class-lmp2` (teal) were
never close to red and stay that way.

## LMU connection dot

`h-2 w-2 rounded-full` + label, always: `Connected` (bg
`status-no-further-action`) / `Connecting…` (bg `status-under-investigation`)
/ `Offline` (bg `status-penalty-applied`).

The dot is an accurate light — offline is genuinely red. What must NOT read
as alarming is the reassurance line next to it: `LMU offline — logging still
works` stays `text-text-muted`, no icon, no red — it reports the LMU link,
not a failure of the tool. Don't let the dot's color bleed into the sentence.

## Standings grid

- Row `h-11` (44px); header row `h-9 sticky top-0 bg-surface`, cells
  `text-xs uppercase tracking-wide text-text-muted font-medium`.
- Numeric columns (`P`…`Vmax`) `text-right tabular-nums`; text columns
  (`Driver`, `Team`, `Class`) `text-left`.
- Selected row (up to 2): `bg-surface-raised border-l-2 border-accent
font-semibold`, plus a `1`/`2` order chip (`bg-accent text-ground
rounded-full h-4 w-4 text-[10px] font-bold` — the one acceptable arbitrary
  value, a fixed numeral chip, not a reusable scale step) — order matters for
  "car A vs car B" phrasing, color is never the only cue.
- Pit row: swap cell text `text-text` → `text-text-muted` (not opacity — that
  interacts unpredictably with the class tint). Add a literal `PIT` tag,
  `text-text-faint text-xs`.

## Type scale — the two hero numbers

Everything else stays `text-sm`/`text-xs`. Only these two get size:

| Element                         | Classes                                                   |
| ------------------------------- | --------------------------------------------------------- |
| Header elapsed clock            | `text-3xl font-mono tabular-nums font-semibold text-text` |
| Incidents `Session Time` column | `text-lg font-mono tabular-nums font-medium text-text`    |

`font-mono tabular-nums` also covers every other lap time, gap, sector, and
timestamp — Tailwind's default mono stack plus its built-in `tabular-nums`
utility, no new tokens needed.

## Incident editor (centred modal)

Converting from a side panel to a centred modal — no new tokens needed, the
existing depth scale already has the right layer for it.

- **Backdrop**: `fixed inset-0 bg-ground/80` — `ground` at 80% opacity, using
  Tailwind's automatic opacity modifier on the existing token rather than a
  new scrim color. Dark enough to pull focus off the standings grid behind
  it; never fully opaque, because the point of a modal here (unlike a
  marketing site) is that a live session is still running underneath —
  the steward should still sense motion in the grid through it. Click on the
  backdrop or `Esc` closes (component concern, not styling).
- **Surface**: `bg-surface-raised` — the same "most raised" layer already
  used for hover and toast; a modal is the deepest thing on screen, so it
  gets the deepest step that already exists. Don't invent a fourth ground
  layer for it.
- **Edge**: `border border-border-strong rounded-md` — `border-strong` is
  already the token for "load-bearing boundaries" (input outline, dropdown);
  a modal edge is exactly that category. Same 3:1+ contrast guarantee
  applies.
- **Elevation**: `shadow-2xl` (Tailwind default utility, no new token) —
  unlike the old flush-to-viewport-edge panel, the modal now floats over
  content and needs a shadow to read as lifted off the backdrop.
- **Size**: `max-w-lg w-full mx-4` (Tailwind's default `max-w-*` scale, not
  an arbitrary value), centered on the backdrop with flex/grid. Own scroll
  container if content exceeds viewport height, capped below full height so
  the backdrop stays clickable to dismiss (`max-h-[85vh] overflow-y-auto` —
  the one arbitrary value here, justified because "percent of viewport" has
  no equivalent step on Tailwind's fixed spacing scale).
- **Motion**: enter `fade + scale-95→100`, 150–200ms; exit fade only, 150ms
  — same pattern as the quick-log toast below. Add `motion-reduce:` on the
  scale transform as belt-and-suspenders over the global reduced-motion rule.

Content is unchanged: five sections in prompt order (When / Who / What /
Investigation / Decision), separated by `border-t border-border py-4` — a
hairline is enough, these are steps in one form. Section labels match grid
header treatment. Autosave-on-blur: a brief (`duration-150`)
`border-status-no-further-action` flash on the field, no toast per field —
that's noise during a live session.

## Selects

Every native `<select>` goes through `components/Select.tsx`, not a raw
`<select>` — it was the one field type rendering with OS chrome (default
arrow, system font) instead of the app's own. The wrapper adds an inline
`ChevronDownIcon` chevron; callers pass the same border/bg/text classes
already used on inputs, with `pl-*`/`pr-*` instead of `px-*` so there's room
for the chevron without a cascade fight (`px-2` vs a later `pr-7` isn't a
reliable override — Tailwind resolves that by generation order, not string
order). `wrapperClassName="mt-1 block w-full"` on the four editor selects
that need to fill their row; the compact header/filter/who selects stay
`inline-block` (the wrapper's default).

The open option list is themed too, via one global rule in `index.css`, not
per component — same pattern as the scrollbar rule below. It uses the
customizable-`<select>` CSS API (`appearance: base-select`, styling the
picker through `::picker(select)`/`::picker-icon`/`::checkmark`), which
hands the picker's shadow DOM to author CSS while the browser keeps running
focus management, keyboard nav, and screen-reader bindings — no custom
listbox, no JS, exactly what was ruled out earlier as a structural build.

```css
select {
  appearance: none; /* fallback: kept when base-select is invalid */
  appearance: base-select;
}
select::picker(select) {
  appearance: base-select;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border-strong);
}
select::picker-icon {
  display: none; /* Select.tsx already draws a chevron; avoid a double arrow */
}
select option:hover,
select option:focus {
  background-color: var(--color-surface-raised);
}
select option:checked {
  border-left: 2px solid var(--color-accent);
  font-weight: 600;
}
```

`appearance: none` is declared first so an unsupported browser drops the
invalid `base-select` value and keeps `none` — today's exact fallback look
(native OS list, Select.tsx's own chevron), zero regression. Supported on
Chrome/Edge 135+ (Apr 2025) only; Firefox and Safari keep the OS-native list
silently, no `@supports` gate needed. Option states reuse existing tokens
only: `surface`/`surface-raised` is the app's one hover step everywhere
else, and the selected option reuses the standings-grid selected-row cue
(accent left border) plus bold weight and the native checkmark glyph — three
non-color signals, matching "never color alone." No new tokens.

Note for `Select.tsx`: it must never apply Tailwind's `appearance-none`
utility class to the `<select>` — that class lives in Tailwind's utilities
layer, which always wins over this base-layer rule regardless of source
order or value validity, and would silently disable base-select in every
browser that supports it.

## Scrollbars

One dark treatment, applied once globally in `index.css` (`scrollbar-width:
thin` + `scrollbar-color` for Firefox, `::-webkit-scrollbar*` for
Chromium/Edge) rather than a class on each scroll container — every
scrollable region (standings grid, incidents grid, incident rail, editor
modal) inherits it automatically. Track is `surface`, thumb is
`border-strong`, hover is `text-faint` — all existing neutrals, no new
tokens.

## Icons

Hand-written inline SVG, `currentColor`, no icon library — this is a token
and rules layer, not a glyph set.

- **Size**: `size-4` (16px) when an icon sits inline beside `text-sm` copy;
  `size-5` (20px) for a standalone icon in a header, button, or toast with
  no label-height to match. Nothing bigger without a documented exception —
  this is a timing screen, not an app icon grid.
- **Stroke**: `fill="none" stroke="currentColor" stroke-width="1.5"` on
  every icon, no exceptions and no mixing filled and stroked glyphs in the
  same set. `1.5` is the one arbitrary numeric value in this rule (Tailwind
  doesn't scale SVG `stroke-width`) — chosen for thin, technical linework
  that matches tabular-nums timing data, not a bold consumer icon style.
- **Color**: an icon never sets its own `text-*`/color — it inherits
  `currentColor` from whatever wraps it (`text-text-muted`, `text-status-x`,
  `text-accent`, …). It carries exactly the meaning its adjacent text
  already carries, never more: the "never color alone" rule for status
  extends to icons the same way it applies to text.
- **Icon without a label**: allowed only for a small, fixed, always-in-the-
  same-place set (close, copy, the `?` shortcut trigger) and only with an
  `aria-label`/accessible name. Everywhere else, icon and text label appear
  together — an icon is a reinforcement, not a replacement for the word.
- **Never accent-colored for decoration**: same "reserved for attention
  right now" contract as everywhere else in this file. An icon is
  accent-colored only when it's inside something that's already accent
  (e.g. a focused control's own outline), never to make an icon stand out
  on its own.

## Quick-log toast

`Incident #12 logged at 01:23:45` (timestamp `font-mono tabular-nums`).
`fixed top-4 right-4` — opposite the bottom selection bar so they never
overlap. `bg-surface-raised border-l-2 border-status-no-further-action
rounded-sm px-4 py-3 text-sm shadow-lg` (green edge = confirmation, not a
status). Enter: fade + `translate-x-2 → 0`, 200ms. Exit: fade only, 150ms.
Auto-dismiss 3s. Add `motion-reduce:` on the transform as belt-and-suspenders
over the global reduced-motion rule.

## Focus-visible

Handled once, globally, in `index.css` (`*:focus-visible { outline: 2px
solid var(--color-accent); outline-offset: 2px }`, 5.17–6.08:1 against every
surface). Components shouldn't add their own `focus:ring-*` for this —
only override locally if a background would swallow the ring (none do today).

## Motion

150–250ms, standard easing, only ever attached to a state change: row
selection, toast, autosave flash. No decorative animation, no page-load
sequences. `prefers-reduced-motion` handled globally in `index.css`; bespoke
transforms should still add `motion-reduce:` as belt-and-suspenders.
