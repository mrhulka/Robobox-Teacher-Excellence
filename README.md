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

## Design
Matches the **Robobox Connect** platform (`mrhulka/Connect`): same tokens (charcoal `#23262C` + yellow
`#F2BE14` on paper `#F4F1EA`, red only for problems), Bricolage Grotesque / Inter, pill buttons with the
yellow glow, frosted top bar and floating tab bar, calendar day-cells (today ringed, picked day charcoal),
and the same motion curve and keyframes (`rb-rise`, `rb-pop`, `rb-shake`…). It's the last block of
`styles.css`; respects reduced motion and reduced transparency.

## Roles & permissions
| Sign-in | What they get | Sees scores? |
|---------|---------------|--------------|
| **Teacher** | Geofenced check-in/out (100 m; can check in at one school, out at another), weekly **lesson plans** with progress updates, attendance calendar (present / late / absent / leave / holiday) + leave, component requests with delivery tracking, school events, updates. | **No** |
| **Coordinator** | Their teachers only: scores, trend, action plans, lesson-plan compliance; geofenced visits → feedback form (action plan + next visit required, follow-up added to the calendar); calendar; **own leave** + their teachers' leave (view only); school events on the dashboard; updates. | Their teachers' — not their own |
| **Parth (CEO) / Manish** | Overview (incl. Operations KPI and school events), all teachers, coordinator scores, **leave approvals for teachers and coordinators**, lesson-plan loading (Excel upload), reports. **Parth only:** the profile repository + birthday calendar (*Teachers → Profiles*, Excel download). | Everything |
| **Outsight** | Overview, all teachers, reports, updates. | Teacher scores only |
| **Operations** | All component requests: confirm an expected date (the teacher sees it), mark fulfilled, Excel export, fulfilment KPI. | No |
| **HR** | Publishes official updates, the holiday list and the library (handbook). | No |

Leadership names, who is "top" and who sees profiles (`profiles: true`, Parth) live in `CONFIG.leaders`. Operations and HR are one shared sign-in each.

## Signing in
One screen: **Name** and **Password**. Typing a name lists everyone who matches (login name or profile full
name, any word) with their role and school — e.g. *Mayuri · Teacher · Harmony*; arrow keys + Enter or a tap
picks one. People who share a name (e.g. Manisha the teacher and Manisha the coordinator) must pick from the
list. The **default password is the person's name** (any capitalisation); anyone can change it under *My
profile → Password* (min 6 characters, not their name). Operations and HR sign in as "Operations" / "HR".
Changed passwords are stored as salted SHA-256 hashes **on the device** — a prototype convenience; real
sign-in moves to the backend with the data (see the end of this file).

## My profile & birthdays
Every user can open **My profile** by tapping their name in the top bar. For **teachers and coordinators it is
compulsory**: until a **photo** (a selfie or one from the phone's library), full name, education, birthday and location are saved, the app shows only the profile form.
Education and location are prefilled for the 37 teachers listed in `TEACHERS.xlsx` (training sheet) — they just
check, add their birthday and a photo. The photo is cropped and shrunk on the phone (320 px JPEG,
~20 KB) and shows as their avatar for coordinators and Parth. Coordinators see their teachers' upcoming birthdays on *My teachers*, as pink dots
on the *Calendar*, and each teacher's profile on their detail page. Parth sees birthdays on the Overview, and
*Teachers → Profiles* holds the whole repository (completion count, missing profiles, birthday calendar for the
year ahead) with an `.xlsx` download.

## Lesson plans
Seeded from `TEACHERS.xlsx` → *Location & Training Schedule*: each batch (Batch 01–06, Team 01–03,
Group 01–04) has its teachers, trainer and session dates, and the month column gives the topic
(Code of Conduct & Lesson Plan, Primary + Secondary Projects Making, Softwares, 3D Printing, Drone,
Mechatronics, Doubt Solving). 186 sessions; each teacher sees only their batch, as weekly cards plus a
month-by-month schedule. Sheet names are matched to app teachers (6 spelling variants mapped in the
seed script, e.g. ACHAL → AACHAL); Group 02's two September sessions dated 5/12 Aug are read as 5/12 Sep.

More sessions (e.g. the empty Nov–Jan columns) are added by Parth or Manish on *Teachers → Lesson plans*:
download the **blank template** (or **current plans**, same columns), edit it in Excel and **upload** it — or paste
rows directly. Columns: `Date or week · Batch or grade · Topic · Activity`; a row for an existing week + batch
replaces that session, so re-uploading the edited current-plans file updates in place. The `.xlsx` reader is built
in (no library; first sheet only; dates typed in Excel are understood). A batch name inherits
that batch's teachers and trainer; a grade applies to everyone. Teachers mark each session *Done /
Partly done / Not done* by Saturday; the reason box appears only for *Partly done* or *Not done* (late updates
are still flagged "Updated late"). **Progress bars** (done / partly / not done / not updated) for the week and
the month are shown to the teacher (Lessons), the coordinator (My teachers + each teacher's page) and on
*Teachers → Lesson plans* for leadership (all teachers + per coordinator). Coordinators and leadership see who updated; a week counts only if its plan was published
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

## Geofence (100 m) + Google Maps
Check-in/out and coordinator visits read the phone's GPS (browser Geolocation) and are allowed only within
`CONFIG.geofenceMeters` (100 m) of the school's pin. Each school's pin is set by its coordinator (*Visit →
School locations*) or by Parth/Manish (*Coordinators → School locations*): paste the school's **Google Maps
link** (or `lat, lng`) — `parseLatLng()` reads the place pin from it — or stand at the gate and tap *Use my
current location*. **Check-in map:** on the teacher's Home (and the coordinator's Visit screen) the selected school shows on a
Google map with its 100 m fence and the user as a blue dot (with GPS accuracy halo), plus "Inside the fence ·
40 m" / "Outside · 300 m away".

- **With `CONFIG.googleMapsKey` set** (in `src/config.ts`): the real Google map via the Maps JavaScript API —
  drag, pinch-zoom, fullscreen — with the fence drawn as a Google Maps Circle and the user as a marker. Create
  the key in Google Cloud (enable *Maps JavaScript API*) and restrict it to Robobox's domain.
- **Without a key**: the keyless Google embed with the fence and dot overlaid at a fixed zoom-17 scale (the
  embed can't draw shapes). *Tap to explore* makes it a normal draggable/zoomable map (the overlay hides,
  since it can't follow); *Re-centre* brings the fence back. **Teachers can't set a pin**: check-in at a school without one is refused.
The sheet's `maps.app.goo.gl` short links were resolved once to coordinates and are built into `seed.ts`
(all 29 schools; HARMONY, G D Somani, Ideal and RIS from Robobox's corrected links). When a school's link
changes in `seed.ts`, devices pick up the new pin on next load.
Short links can't be read inside a browser; to change a pin, open the link and paste the full address-bar link.

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
