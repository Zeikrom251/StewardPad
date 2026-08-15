# StewardPad

A race-control notebook for Le Mans Ultimate stewards. It runs on your own
laptop next to the game, logs incidents at one keypress with a timestamp you can
scrub straight to in the replay, and exports the decision sheet as a CSV that
opens cleanly in Excel.

**The one limitation you need to know up front:** StewardPad **records** penalty
decisions, it does not **apply** them. LMU exposes no way for an external tool to
put a penalty into race control. Drivers must be told their penalty and serve it
themselves. Nothing in this tool changes anything inside the game — it only
reads.

---

## Quick start (no terminal needed)

Double-click **`start-stewardpad.bat`**. It installs Node and pnpm if they are
missing, creates your `.env`, installs dependencies, starts the tool and opens
your browser. Keep the black window open — closing it stops StewardPad.

Everything below is the manual equivalent, for anyone who prefers a terminal.

---

## Prerequisites

- **Node 20 or newer** — <https://nodejs.org> (the LTS installer is fine)
- **pnpm** — after installing Node, run `corepack enable`
- **Windows**, on the same machine as Le Mans Ultimate
- LMU itself is **optional**: the whole tool runs on realistic mock data with the
  game closed, which is how you practise before race day

---

## Install

```bash
pnpm install
```

Once. It downloads everything the tool needs.

## Run

```bash
pnpm dev
```

Then open <http://localhost:5173> in your browser. Leave the terminal window
open — closing it stops the tool. Two things start together: the backend on port
3000 (which does the work) and the screen you look at on port 5173.

To stop it, press `Ctrl-C` in the terminal. Your incidents are already saved.

---

## Race-day guide

1. **Start LMU** and join or spectate the session. Start StewardPad with
   `pnpm dev` and open <http://localhost:5173>.
2. **Type your name** into the steward field in the header. It is remembered on
   this machine and stamped on every incident you log.
3. **Check the look-back value** in the header — it defaults to `10s`. This is
   the number of seconds StewardPad rewinds when you log an incident, because you
   always press the key _after_ you see the contact. If you tend to react
   slowly, raise it to 15.
4. **Check the connection dot** next to the track name. Green means StewardPad is
   reading live timing. If it is red, LMU is not being read — **logging still
   works**, you just will not have live standings.
5. **Watch the race.** The dashboard shows live standings.
6. **When you see contact:** click the car (or two cars) in the standings, then
   press **`Space`**. Or just press `Space` on its own and fill in the cars
   later. A toast confirms `Incident #12 logged at 01:23:45`. No dialog opens,
   nothing interrupts you — keep watching.
   - Press `1`–`9` to select the car in that position without the mouse.
   - Press `Esc` to clear the selection, `E` to open the last incident, `?` for
     the full shortcut list.
7. **After the race**, go to the **Incidents** page. Work down the list.
8. **For each incident:** copy the session time with the copy button, type it into
   the LMU replay scrubber, and watch what happened. If the moment is slightly
   off, nudge the timestamp with `-5s / -1s / +1s / +5s` until the reference
   matches what you see. The replay reference updates as you nudge.
9. **Write the decision.** Steward notes are internal and stay internal. The
   decision wording is what drivers will read. Set a status and, if there is a
   penalty, record its type and duration. Everything saves as you click away —
   there is no save button to forget.
10. **Export** from the Export page. Download the **driver decision sheet** to
    publish, and keep the **full steward log** for your own records.
11. **Tell the drivers.** Penalties in this file are not applied in-game.

---

## Practising without LMU (mock mode)

```bash
LMU_ADAPTER=mock pnpm dev
```

This is the default, so plain `pnpm dev` does the same thing. You get a
simulated 24-car grid across three classes, circulating
with laps, gaps, and pit stops, and a session clock counting up. Everything works
— quick-log, editing, penalties, export. It is the right way to learn the
keyboard shortcuts before a real race.

---

## Where your data lives

- **`data/current-session.json`** — every incident, written within half a second
  of any change. This is the file that matters.
- **`data/archive/<date>-<track>.json`** — a finished session, moved aside by the
  **Archive session** action so you can start the next race clean.

To back up, copy the `data` folder. To recover from a mistake, close StewardPad,
copy an archived file back over `data/current-session.json`, and start it again.

If StewardPad crashes or you close the terminal by accident, just start it again
— it prints `Restored N incidents from previous run` and everything is there.

---

## Known limitations

- **Penalties are recorded, not applied.** There is no API to put a penalty into
  LMU's race control. This is a limit of the game, not of this tool.
- **No automatic collision detection.** Detecting contact would need a native
  Windows shared-memory module. You log incidents yourself — which is also how
  you avoid a list full of harmless rubbing.
- **One session at a time.** No championship standings, no points, no
  multi-race aggregation. Archive a session before starting the next.
- **Desktop only.** The layout targets a laptop or desktop screen at 1280px or
  wider.
- **Live timing is read-only.** StewardPad only ever reads from LMU.
- **No top speed.** The standings endpoint has no top-speed field — only an
  instantaneous velocity — so the `Vmax` column stays empty rather than showing
  an invented number.

### Using live LMU timing

```bash
LMU_ADAPTER=rest pnpm dev
```

Start LMU first and be in a session. The track name, session type, phase,
elapsed clock and standings then come from the game. If LMU is closed or you are
sitting in a menu, StewardPad reports itself offline, retries every 5 seconds,
and **incident logging keeps working the whole time** — you never lose the
ability to press `Space`.

Confirmed against a live hosted session at Monza. If a future game update moves
a field, only one mapping function needs changing, and `pnpm discover` (with LMU
open) re-captures what the game actually exposes into `scripts/output/`.

**Run StewardPad on Windows, not inside WSL.** LMU serves its API on the Windows
loopback, which WSL cannot reach — from WSL the tool will simply report LMU
offline forever. If you develop in WSL, either run the backend from Windows or
set `networkingMode=mirrored` in `.wslconfig`.

---

## Future directions

- **Session result XML and the trace log.** LMU writes both, and they contain
  penalty and track-limits events that could pre-populate the incident list
  instead of relying purely on the steward spotting everything.
- **LMU's own contact list.** The game exposes
  `GET /rest/watch/getIncidentsList/{minTimeBetweenContacts}` over REST. It could
  pre-populate the incident list instead of relying purely on the steward
  spotting every contact — no native module needed, contrary to the original
  assumption.
- **Jumping the replay directly.** `PUT /rest/watch/replaytime/{time}` can move
  the replay to a timestamp, which would replace copying the reference and typing
  it into the scrubber by hand.
- **Richer session phases.** Only `GPHASE_GREEN` has been observed on a live
  session; the other phase names are best-effort and degrade to `UNKNOWN` rather
  than showing a wrong flag. Worth re-capturing during a real race start, a
  safety car, and a red flag.

---

## For developers

### Commands

```bash
pnpm dev              # backend + frontend together
pnpm build            # shared → backend → frontend (order matters)
pnpm lint             # typecheck every package + prettier --check
pnpm format           # prettier --write
pnpm test             # node:test via tsx
pnpm discover         # Phase 0 LMU discovery — requires LMU running
```

### Layout

| Path              | Package              | What it is                                    |
| ----------------- | -------------------- | --------------------------------------------- |
| `apps/server`     | `@stewardpad/server` | NestJS, Socket.IO gateway, LMU adapter        |
| `apps/client`     | `@stewardpad/client` | React, Vite, Tailwind                         |
| `packages/shared` | `@stewardpad/shared` | Domain types shared by both apps — types only |
| `scripts/`        | —                    | `discover-lmu.ts`, the Phase 0 probe          |
| `data/`           | —                    | gitignored session state                      |

Shared types are defined once in `packages/shared` and imported by both apps,
never duplicated. There is no database, no authentication, and no deployment
step by design — this is a local tool on a trusted machine.

### Dependencies, and why each one is here

Every dependency is justified or it does not go in. Versions are pinned exactly.

| Dependency                                                               | Why                                                                                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `@nestjs/*`, `reflect-metadata`, `rxjs`                                  | The backend framework named in the spec.                                                                                                    |
| `socket.io` / `socket.io-client`                                         | Pushes standings and incidents to the browser without polling.                                                                              |
| `class-validator`, `class-transformer`                                   | Validates every request body; a malformed request is rejected, not half-applied.                                                            |
| `react`, `react-dom`                                                     | The UI framework named in the spec.                                                                                                         |
| `vite`, `@vitejs/plugin-react`                                           | Dev server and build; proxies `/api` and the socket.                                                                                        |
| `tailwindcss`, `@tailwindcss/vite`                                       | Styling; design tokens live in `src/index.css`.                                                                                             |
| `typescript`, `@types/*`                                                 | Types. Pinned to 6.0.3 — the Nest CLI cannot use TypeScript 7's compiler API yet.                                                           |
| `@nestjs/cli`                                                            | Builds and watch-runs the backend with decorator metadata intact (esbuild-based runners drop it, which breaks Nest's dependency injection). |
| `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`, `@tiptap/markdown` | Rich-text markdown editor for stewardNotes and decision fields; stores plain markdown strings so the CSV export path is unaffected.         |
| `prettier`                                                               | Formatting.                                                                                                                                 |
| `tsx`                                                                    | Runs a TypeScript file directly — used by `pnpm discover` and `pnpm test`.                                                                  |

Deliberately **not** used: no axios (native `fetch`), no uuid
(`crypto.randomUUID()`), no CSV library (hand-written generator — the Excel
details in the spec need exact control), no router library (the three pages use
a ~20-line router over the History API), no test framework (`node:test` from the
standard library), no ESLint (`tsc --noEmit` plus Prettier covers this codebase
without two more dependencies and a config file to maintain).
