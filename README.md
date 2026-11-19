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
| Sign-in | What they get | Sees scores? |
|---------|---------------|--------------|
| **Teacher** | Geofenced check-in/out (100 m; can check in at one school, out at another), weekly **lesson plans** with progress updates, attendance calendar (present / late / absent / leave / holiday) + leave, component requests with delivery tracking, school events, updates. | **No** |
| **Coordinator** | Their teachers only: scores, trend, action plans, lesson-plan compliance; geofenced visits → feedback form (action plan + next visit required, follow-up added to the calendar); calendar; **own leave** + their teachers' leave (view only); school events on the dashboard; updates. | Their teachers' — not their own |
| **Parth (CEO) / Manish** | Overview (incl. Operations KPI and school events), all teachers, coordinator scores, **leave approvals for teachers and coordinators**, lesson-plan loading, reports. | Everything |
| **Outsight** | Overview, all teachers, reports, updates. | Teacher scores only |
| **Operations** | All component requests: confirm an expected date (the teacher sees it), mark fulfilled, Excel export, fulfilment KPI. | No |
| **HR** | Publishes official updates, the holiday list and the library (handbook). | No |

Leadership names and who is "top" live in `CONFIG.leaders`. Operations and HR are one shared sign-in each.

## Lesson plans
Seeded from `TEACHERS.xlsx` → *Location & Training Schedule*: each batch (Batch 01–06, Team 01–03,
Group 01–04) has its teachers, trainer and session dates, and the month column gives the topic
(Code of Conduct & Lesson Plan, Primary + Secondary Projects Making, Softwares, 3D Printing, Drone,
Mechatronics, Doubt Solving). 186 sessions; each teacher sees only their batch, as weekly cards plus a
month-by-month schedule. Sheet names are matched to app teachers (6 spelling variants mapped in the
seed script, e.g. ACHAL → AACHAL); Group 02's two September sessions dated 5/12 Aug are read as 5/12 Sep.

More sessions (e.g. the empty Nov–Jan columns) are added by Parth or Manish on *Teachers → Lesson plans*
by pasting rows from Excel — `Date or Week · Batch or Grade · Topic · Activity`. A batch name inherits
that batch's teachers and trainer; a grade applies to everyone. Teachers mark each session *Done /
Partly done / Not done* by Saturday; a reason is required for anything not done and for any late
update. Coordinators and leadership see who updated; a week counts only if its plan was published
before that week's Saturday.

## Component requests
Projects and components come from `Robobox_Kits.xlsx` (sheet "ROBOBOX KIT") in `CONFIG.kits`. A teacher
picks a project and quantities and gets a `REQ-yymmdd-NNN` reference. Requests go to **Operations**, who
confirm an expected date (shown to the teacher with an optional note) and mark them fulfilled; the
teacher sees *placed → expected by → fulfilled (N days)*. The Operations KPI — average days to fulfil,
share within `CONFIG.opsSlaDays` (default 3), expected dates kept, open/overdue — is shown to Operations
and on the leadership overview.

## Updates tab (every role)
- **Official** — communications and the yearly holiday list, published by **HR**. Updates can be pinned and carry an attachment (≤20 MB). Everyone else reads;
  Holidays also appear on coordinators'
  calendars and on the teacher's home screen.
- **School events** — teachers add exhibitions, PTAs, exams etc. for their own schools
  (`CONFIG.eventTypes`). Their coordinator sees them in Updates, on the calendar and on the Visit
  screen ("Today at your schools"); leadership sees all schools.
- **Library** — handbook, curriculum and other resources (published by HR).

New updates and library items show a count bubble on the Updates tab until it is opened.

## Reports
All downloads are real Excel `.xlsx` files (bold, frozen header; numbers stored as numbers), written
in `downloadXLSX()` with no library — a single-sheet SpreadsheetML workbook in an uncompressed zip.

## Geofence (100 m)
Uses the browser's native Geolocation. A school's geofence centre is **captured on-site**
the first time a teacher/coordinator acts there ("set to my current location") — this avoids
resolving the Google Maps short-links in the sheet and is more accurate. Login/visit is
allowed only within `CONFIG.geofenceMeters` (100 m).

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
