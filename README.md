# Robobox Teacher Excellence Portal

A mobile-first web app for the Robobox teacher network. **TypeScript, no runtime
dependencies, no framework, no bundler** — compiles to plain classic scripts with `tsc`.
Drop `index.html` + `dist/` + `styles.css` on any static host (or the Robobox website) and it runs.

## Build & run
```bash
npm install     # one dev dependency: typescript
npm run build   # tsc  →  src/*.ts  compiles to  dist/*.js
npm run check   # build + run the geofence/RAG self-check
```
Then serve over http(s) (geolocation needs a secure origin — `localhost` or `https`, not `file://`):
```bash
python3 -m http.server   # visit http://localhost:8000
```
`dist/` is committed so the site also hosts as-is without a build; re-run `npm run build` after editing `src/`.

## Source layout (`src/`, TypeScript)
- `types.ts` — the shared data model (interfaces, type-only)
- `seed.ts` — master data, generated from the Excel (do not hand-edit)
- `config.ts` — feedback-form spec + RAG + dropdown lists
- `store.ts` — **the only persistence layer** (localStorage)
- `app.ts` — geofence, attendance, RAG engine, all role views
- `selfcheck.ts` — `npm run check` verifies the haversine geofence + RAG averaging

The files are **classic scripts** (no `import`/`export`): `SEED`, `CONFIG`, `STORE` and the
view functions are globals, so the generated HTML's inline `on*` handlers resolve to them —
no module graph, no build tooling beyond `tsc`. Load order (set in `index.html`):
`seed → config → store → app`.

## Roles & permissions
| Role | What they get | Can see scores? |
|------|---------------|-----------------|
| **Teacher** | Geofenced check-in/out (can check in at one school, out at another), attendance with weekly/monthly delay from 08:00, leave applications, component requests by project, tasks, school events, official updates, library. | **No** — teachers never see their own scores or RAG. |
| **Coordinator** | Their teachers only: scores + trend + action plans, geofenced classroom visits → feedback form (action plan + next visit date required; the follow-up is added to their calendar), monthly calendar, teacher leave (read-only), component requests → Excel download + email to operations, library. | Their teachers' scores — **not** their own coordinator score. |
| **Parth (CEO) / Manish** | Network overview, all teachers, coordinator scores, **leave approvals**, CSV reports, library. | Everything. |
| **Outsight** | Network overview, all teachers, teacher CSV reports, library. | Teacher scores — not coordinator scores. |

Leadership names and who is "top" (sees coordinator scores, approves leave) live in `CONFIG.leaders`.

## Component requests
Projects and their components come from `Robobox_Kits.xlsx` (sheet "ROBOBOX KIT") and live in
`CONFIG.kits` — 4 live projects: CGA, CBT, RA, Robotics Kit. A teacher picks a project, sets
quantities, and gets a reference (`REQ-yymmdd-NNN`) as acknowledgement. The coordinator downloads
new requests as an Excel `.xlsx` file (one row per component), emails operations (set
`CONFIG.opsEmail` to pre-address it), and marks requests *Sent to Ops* → *Fulfilled*; the
teacher sees each status change. To add a project, add it to `CONFIG.kits`.

## Updates tab (every role)
- **Official** — communications and the yearly holiday list, published by Manish (`comms: true` in
  `CONFIG.leaders`). Updates can be pinned and carry an attachment (≤20 MB). Everyone else reads;
  new updates show a dot on the Updates tab until opened. Holidays also appear on coordinators'
  calendars and on the teacher's home screen.
- **School events** — teachers add exhibitions, PTAs, exams etc. for their own schools
  (`CONFIG.eventTypes`). Their coordinator sees them in Updates, on the calendar and on the Visit
  screen ("Today at your schools"); leadership sees all schools.
- **Library** — handbook, curriculum and other resources.

## Reports
All downloads are real Excel `.xlsx` files (bold, frozen header; numbers stored as numbers), written
in `downloadXLSX()` with no library — a single-sheet SpreadsheetML workbook in an uncompressed zip.

## Geofence (200 m)
Uses the browser's native Geolocation. A school's geofence centre is **captured on-site**
the first time a teacher/coordinator acts there ("set to my current location") — this avoids
resolving the Google Maps short-links in the sheet and is more accurate. Login/visit is
allowed only within `CONFIG.geofenceMeters` (200 m).

## Data
Seeded from the uploaded School–Teacher sheet (29 schools, 61 teachers, 3 coordinators) and
the Teacher Visit Feedback Form (20 ratings, 9 critical standards). RAG is auto-computed in
`computeRag()` — the single place to tune thresholds.

## Known limitation → next step
Persistence is **`localStorage`: single-device only.** For real cross-user sync (a teacher's
phone and their coordinator's phone sharing data) and real passworded auth, swap `store.js` for
a backend. Supabase is the laziest path — it gives Postgres + auth + row-level security with
almost no server code; `src/store.ts` is written as the single swap point for exactly this.

**Permissions are enforced in the UI only** while data lives on-device. When a backend is added,
the same rules (teachers can't read scores; coordinators see only their teachers; only Parth/Manish
see coordinator scores and approve leave) must be enforced server-side, e.g. Supabase row-level security.

Library files and official-update attachments are stored on-device (IndexedDB, ≤20 MB); a real deployment points
`fileSave`/`fileGet` at object storage (S3 / Supabase Storage). Also deferred (add when needed):
push notifications, and per-school class-start times (currently one global `expectedStart`, 08:00).
