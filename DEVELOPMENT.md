# Developing StewardPad

Everything needed to build StewardPad, change it and ship a release. For what the app does, see
the [README](README.md).

## Prerequisites

- **Node 20.11 or newer**, and **pnpm**: run `corepack enable` once after installing Node.
- **For the desktop app:** Windows, the [Rust toolchain](https://rustup.rs) and the
  [Tauri prerequisites](https://tauri.app/start/prerequisites/) (Microsoft C++ Build Tools and
  WebView2, which Windows 10 and 11 already have).
- **Le Mans Ultimate is optional.** The built-in simulator stands in for the game.

## Commands

```bash
pnpm install          # once
pnpm desktop          # the desktop app in a dev window (Windows, needs Rust)
pnpm desktop:build    # Windows installer, in apps/desktop/src-tauri/target/release/bundle
pnpm desktop:test     # the desktop backend's Rust tests (cargo test)
pnpm lint             # typecheck every package + prettier --check
pnpm format           # prettier --write
pnpm test             # every *.test.ts, with node:test
pnpm discover         # probe LMU's REST API into scripts/output/ (LMU must be running)
```

Keep `cargo clippy --all-targets -- -D warnings` clean as well: CI fails on a warning.

## Layout

| Path                | Package               | What it is                                                    |
| ------------------- | --------------------- | ------------------------------------------------------------- |
| `apps/desktop`      | `@stewardpad/desktop` | The app: Tauri 2, a Rust backend in `src-tauri`, React + SCSS |
| `packages/shared`   | `@stewardpad/shared`  | Domain types, the contract between the UI and the backend     |
| `packages/brand`    | `@stewardpad/brand`   | Brand tokens, bundled fonts, the mark and the wordmark        |
| `scripts/`          | —                     | `discover-lmu.ts`, the LMU probe; `run-tests.mjs`             |
| `.github/workflows` | —                     | `ci.yml` on every pull request, `release.yml` on a release    |

Shared types are defined once in `packages/shared`, never duplicated; `src-tauri/src/domain/`
mirrors them, so change both together. The website, with the release notes it shows, lives in
its own repository (stewardpad.com); it keeps a copy of `packages/brand`, and it holds the
StewardPad API the Team features talk to. The desktop app itself has no database and nothing to
deploy: a steward on their own needs no account and no network.

## How the desktop app works

The backend is Rust (`apps/desktop/src-tauri/src`). Each operation is a Tauri command
(`commands/`), and the backend pushes changes to the UI as events (`session:update`,
`standings:update`, `incidents:update`, `config:update`, `account:update`, `team:update`).

| Folder       | What it holds                                                                 |
| ------------ | ----------------------------------------------------------------------------- |
| `app/`       | Startup, the shared state behind its lock, the events pushed to the UI        |
| `commands/`  | The Tauri commands, one file per area; thin: parse, call the core, emit       |
| `core.rs`    | `Core`: the store plus the live session and standings                         |
| `domain/`    | The wire types the UI sees (mirror of `packages/shared`)                      |
| `incidents/` | Incident inputs, rules and operations, and LMU contacts turned into incidents |
| `lmu/`       | The LMU adapter boundary: the REST adapter and the simulator                  |
| `settings/`  | The config the steward edits: display, Discord announcements, folders         |
| `store/`     | The session file: atomic writes, restore, the debounced saver                 |
| `export/`    | The CSVs and the results JSON                                                 |
| `rulebook/`  | The league's rule book: parsing, checking, numbering outlines                 |
| `share/`     | Session files exchanged between stewards, and their merge rules               |
| `api/`       | The StewardPad API client: TLS, the token, errors, live events, wire types    |
| `account/`   | Desktop sign-in (PKCE), the token in the OS credential store, the account     |
| `team/`      | Team sync: the league link, the outbox, live events and timing, streaming     |

Tests sit beside the file they test, as `<file>_tests.rs`.

**The LMU adapter.** Everything that talks to the game sits behind one adapter, with two
implementations: the REST adapter, which polls the game, and the simulator, which invents a grid.
Raw LMU field names live only in `lmu/rest/parse.rs` and `mapper.rs`. The data source is switched
in Settings while the app runs, and the choice is saved.

**Persistence.** The session is a JSON file in the app data folder
(`%APPDATA%\com.emeraldstudio.stewardpad`), written after every change (debounced 500 ms) as a
`.tmp` file, then renamed over the old one, so a crash never leaves half a file. It loads on
startup.

**Exports.** The CSVs (driver sheet, full log, penalty sheet) and the results JSON are built in
Rust (`export/`). The CSVs carry a UTF-8 BOM, use `;` by default, and put a `'` before any field
that starts with `=`, `+`, `-` or `@`. The stewards' decisions document is rendered by the UI
(`pages/reports/document`). No public export includes steward notes or penalty notes.

**Several stewards.** Each steward exports a session file; one imports the others'
(`share/`). Incidents match by id, then by the LMU contact they came from. A treated copy beats an
untouched one; when two stewards edited the same incident, the newer edit wins and is flagged.
The session is backed up to the archive folder before every import. The rules are in
`share/merge.rs`, pinned by `merge_tests.rs`.

**Team sync.** Signed in with Discord, a steward joins a league and every PC follows the
league's open race session (the API's reference is `docs/sync-api.md` in the website repo):

- _Sign-in_ goes through the browser (board 10): the app opens the website with a PKCE challenge,
  Discord signs the steward in there, and the browser hands back a one-time code (a
  `stewardpad://` link, or pasted) that only this app's verifier can redeem. The token lands in the
  OS credential store (`account/vault.rs`), never in a file, never in the webview: the UI only
  sees `AccountView`.
- _Every API call is made in Rust_ (`api/`), never by the webview, so nothing the UI renders
  (teammates' incident text included) can reach the token. Release builds talk to
  `https://api.stewardpad.com` only; the `STEWARDPAD_*_URL` overrides work in debug builds.
- _Each change_ to an incident is saved locally first, then queued in the outbox
  (`team/outbox.rs`, saved in the session file) and sent in order with its `opId`, so a retry is
  never applied twice and a night offline loses nothing. Edits carry only the changed fields;
  when two stewards change the same field, this PC's newer edit goes again on top and the
  incident says "Edited twice".
- _The league's changes_ arrive as live events (`team/listener.rs`), resumed from the last
  revision after any drop. A teammate's copy keeps this PC's unsent fields on top
  (`team/apply.rs`).
- _Live timing_: one PC streams its frames (gzipped, once a tick); while a teammate streams this
  session, their timing is the clock here and this PC logs no LMU contacts of its own. The
  simulator never feeds a league from a release build.
- _Privacy_: the profile (email included) stays in memory, so the session file (archived and
  shared) never holds the account. Avatars are initials: no image is loaded from Discord.
  Settings → Account downloads the steward's data and deletes the account (GDPR art. 15, 17, 20).

**Rule book.** Settings → Rule book imports a `.txt` or `.md` file. Numbered lines become rules;
an outline exported from Google Docs or Word (each level numbered from 1) is renumbered as the
document shows it (`rulebook/outline.rs`).

### Live LMU timing

The REST adapter reads `http://localhost:6397`; set `LMU_BASE_URL` to point it elsewhere. Start
LMU and join a session. If the game is closed or sitting in a menu, StewardPad reports itself
offline, retries every 5 seconds, and incident logging keeps working the whole time.

The field mapping was confirmed against a live hosted session at Monza. If a game update moves a
field, only the mapper needs changing; `pnpm discover` re-captures what the game exposes.

**Run StewardPad on Windows, not inside WSL.** LMU listens on the Windows loopback only, which
WSL cannot reach: from WSL the app reports LMU offline forever. Either run it from Windows or set
`networkingMode=mirrored` in `.wslconfig`.

Known gaps in what the game exposes:

- **No top speed.** The standings endpoint has an instantaneous velocity, not a top speed, so the
  Vmax column stays empty with live timing rather than showing an invented number.
- **Session phases.** Only the green-flag phase has been observed live; the others are
  best-effort and fall back to `UNKNOWN` rather than showing a wrong flag. Worth re-capturing
  during a race start, a safety car and a red flag.

### Team sync against a local API

Start the website repo's stack (`docker compose up -d` there: the API on `localhost:3001`, the
site on `localhost:5173`), then run the app pointed at it:

```bash
STEWARDPAD_API_URL=http://localhost:3001 STEWARDPAD_SITE_URL=http://localhost:5173 pnpm desktop
```

Signing in for real needs the Discord app's credentials in the website repo's `.env`.

## Tests

- `pnpm test` runs every `*.test.ts` with Node's built-in `node:test`. There is no test framework
  on purpose: write one test file beside a piece of logic that needs pinning down.
- `pnpm desktop:test` runs the Rust tests, which live in `*_tests.rs` beside the file they test.
- The end-to-end tests (`team/e2e_tests.rs`, `team/e2e_stream_tests.rs`, `account/e2e_tests.rs`)
  drive two stewards' PCs against a running local API. They are ignored by default. Seed two
  accounts in the local database (an owner with a subscription, a steward), each with a desktop
  session, and export their signed tokens as `STEWARDPAD_E2E_OWNER_DESKTOP` and
  `STEWARDPAD_E2E_STEWARD_DESKTOP` (and a browser session's as `STEWARDPAD_E2E_OWNER_BROWSER` for
  the sign-in test, used up by each run), then:
  `STEWARDPAD_API_URL=http://localhost:3001 cargo test e2e -- --ignored --test-threads=1`.
  Each test makes its own league and deletes it.

## Checks and releases

**Every pull request** runs `.github/workflows/ci.yml`: lint and tests on Linux, then clippy and
the Rust tests on Windows. Merge only when both are green.

**Publishing a release** runs `.github/workflows/release.yml`, which builds the Windows installer
and attaches it to the release. To ship version 0.2.0:

1. Set the version to `0.2.0` in `apps/desktop/src-tauri/tauri.conf.json`,
   `apps/desktop/src-tauri/Cargo.toml` and `apps/desktop/package.json`.
2. Merge to `main`, and add the release notes (`changelog/v0.2.0.md`) to the website repo.
3. On GitHub, **Releases → Draft a new release**, tag `v0.2.0` on `main`, publish.

The workflow stops if the tag doesn't equal `v` + the `tauri.conf.json` version. The installer is
built only for a published release, never for a pull request.

**Release notes.** One Markdown file per release in the website repo's `changelog/`, shown on
its changelog page; paste the same notes into the GitHub release, where the app reads them.

**In-app updates.** A release also publishes a signed update package and a `latest.json`. Each
time StewardPad starts, it reads `releases/latest/download/latest.json`; when that version is
newer, the status bar says **Update x.y.z available** and Settings → Updates shows the release
notes. Nothing installs by itself: the steward clicks **Install**, the app downloads the update,
saves the session, then runs the installer, which reopens StewardPad when it's done.

An update is trusted only if it's signed with the key whose public half is in `tauri.conf.json`
(`plugins.updater.pubkey`). One-time setup: add the private key as the repository secret
`TAURI_SIGNING_PRIVATE_KEY` (Settings → Secrets and variables → Actions), plus
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if it has one. Keep a backup of the key: without it,
installed copies can no longer update. A new key pair
(`pnpm --filter @stewardpad/desktop tauri signer generate`) means a new `pubkey`, and copies
already installed must be updated by hand once.

## Dependencies, and why each one is here

Every dependency is justified or it doesn't go in. Versions are pinned exactly.

| Dependency                                                                              | Why                                                                                                                                                            |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react`, `react-dom`                                                                    | The UI framework.                                                                                                                                              |
| `vite`, `@vitejs/plugin-react`                                                          | Dev server and build for the desktop UI.                                                                                                                       |
| `typescript`, `@types/*`                                                                | Types.                                                                                                                                                         |
| `sass`                                                                                  | SCSS modules; the brand tokens are CSS custom properties in `packages/brand`.                                                                                  |
| `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`, `@tiptap/markdown`                | The Markdown editor for the investigation, notes, decision and rule book; it stores plain Markdown strings.                                                    |
| `prettier`                                                                              | Formatting.                                                                                                                                                    |
| `tsx`                                                                                   | Runs a TypeScript file directly: `pnpm discover` and `pnpm test`.                                                                                              |
| `@tauri-apps/cli`, `tauri`, `tauri-build` (crates)                                      | Packages the React UI in a native Windows window and builds the installer, without shipping a whole browser.                                                   |
| `@tauri-apps/api`                                                                       | Calls the Rust backend, listens to its events, and drives the custom title bar (drag, minimise, maximise, close).                                              |
| `tauri-plugin-dialog` (crate), `@tauri-apps/plugin-dialog`                              | Native Windows Save and folder dialogs for the exports, the export folder and the archive folder.                                                              |
| `tauri-plugin-updater` (crate), `@tauri-apps/plugin-updater`                            | In-app updates: finds a newer GitHub release, checks its signature, downloads it and runs the installer.                                                       |
| `serde`, `serde_json` (crates)                                                          | The backend's JSON: the session file, LMU responses and the payloads the UI receives.                                                                          |
| `uuid` (crate)                                                                          | Random v4 incident ids, the same format as `crypto.randomUUID()`.                                                                                              |
| `ureq` (crate)                                                                          | Polls LMU's REST API over `http://localhost`, and calls the StewardPad API over TLS (rustls) with gzip: one small blocking client, on background threads.      |
| `flate2` (crate)                                                                        | Gzips the live timing frames a streaming PC uploads (~33 kB of JSON becomes ~4 kB). Already in the build through ureq.                                         |
| `sha2`, `base64` (crates)                                                               | PKCE for the desktop sign-in: base64url of the SHA-256 of the verifier. Both already in the build through Tauri.                                               |
| `keyring-core`, `windows-native-keyring-store`, `linux-keyutils-keyring-store` (crates) | Keeps the API token in Windows Credential Manager (the kernel keyring for development under WSL), never in a file.                                             |
| `tauri-plugin-deep-link`, `tauri-plugin-single-instance` (crates)                       | `stewardpad://` links from the website (the sign-in code, invites): the installer registers the scheme, and a second launch hands its link to the open window. |

Deliberately **not** used: no HTTP client in the UI (native `fetch`; Discord's webhook is posted
from the webview; the StewardPad API is called from Rust), no WebSocket library (the API's live
events are Server-Sent Events over the same HTTP client), no opener plugin (the sign-in page opens
with the OS's own command), no CSV library (a hand-written generator: Excel needs exact control), no
router library, no test
framework (`node:test` from the standard library), no ESLint (`tsc --noEmit` plus Prettier
covers this codebase without two more dependencies and a config to maintain).

## Future directions

- **Jump the replay directly.** `PUT /rest/watch/replaytime/{time}` can move the replay to a
  timestamp, which would replace copying the time and typing it into the scrubber.
- **Session result XML and the trace log.** LMU writes both, with penalty and track-limits
  events that could pre-fill the incident list.
