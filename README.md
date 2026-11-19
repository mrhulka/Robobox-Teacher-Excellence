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

## Deploying (Hostinger or any PHP host)
Upload a zip of the live files only — `index.html`, `styles.css`, `api.php`, `.htaccess`, `robots.txt`,
`assets/`, and `dist/seed.js` `dist/config.js` `dist/store.js` `dist/app.js` — into the site's `public_html`
and extract it (on Hostinger: File Manager, or *Deploy static site archive*). Source files are never needed on
the server. `.htaccess` forces HTTPS (GPS and camera need it) and keeps app files fresh after each deploy.

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
| **Coordinator** | Their teachers only: scores, trend, action plans, lesson-plan compliance; geofenced visits (checked on arrival **and again at submit**; both readings saved with the visit) → feedback form (action plan + next visit required, follow-up added to the calendar); calendar; **own leave** + their teachers' leave (view only); school events on the dashboard; updates. | Their teachers' — not their own |
| **Parth (CEO) / Manish** | Overview (incl. Operations KPI and school events), all teachers, coordinator scores, **leave approvals for teachers and coordinators**, lesson-plan loading (Excel upload), reports. **Parth only:** the profile repository + birthday calendar (*Teachers → Profiles*, Excel download). | Everything |
| **Sajesh / Yash (Outsight team)** | Everything Parth sees — overview, schools, teachers, profiles, coordinators, leave, reports and downloads — but **no decisions**: no leave approval, lesson-plan loading, adding coordinators or moving school pins. | Everything |
| **Operations** | All component requests: confirm an expected date (the teacher sees it), mark fulfilled, Excel export, fulfilment KPI. | No |
| **HR** | Publishes official updates, the holiday list and the library (handbook). | No |

Leadership lives in `CONFIG.leaders`: `top` = decides (Parth, Manish), `full` = sees everything, `profiles` = the profile repository (Parth, Sajesh, Yash). The same names are listed in `LEADERS` in `api.php` — keep the two in step. Operations and HR are one shared sign-in each.

## Adding people
**Parth / Manish** (Teachers → *Add member*) add a **teacher** (name, school, grades, phone) or a **coordinator**
(name, the schools they take over — those schools' teachers move with them). A **coordinator** (My teachers →
*Add teacher*) adds teachers to their own schools only. New people appear everywhere at once, including the
sign-in suggestions on any phone; they sign in with their name, and their first password is that name.
A teacher's coordinator is always their school's coordinator; leadership can change a school's coordinator on
its school page. Only real people can sign in — the server checks the name against the staff list.

## Schools, attendance and coordinator visits
- Overview → **Schools** (tap the tile): every school with its coordinator, teachers and who's present today →
  a school: present today, visits, lesson-plan progress, each teacher's check-in, average lateness and score.
- Overview shows teachers, coordinators, **present today** (teachers checked in at school) and each coordinator's
  **visits this month** against the target of **one visit per school per month**.
- Coordinators see their own target on *My teachers*. On the month's last day, if schools are still unvisited,
  they must give a reason; a month that ended short keeps asking until they do. Leadership sees the reasons.
  Tracking starts in `CONFIG.visitsFrom` (November 2026).
- **All schools (Excel)** on the Schools page: one workbook with *Schools*, *Teachers* (lesson-plan progress,
  scores, reporting time, average check-in time, average lateness, days present, leave) and *Coordinators*
  (visits vs target, last month's reason).

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
current location*. **Check-in map:** on the teacher's Home (and the coordinator's Visit screen) the selected school shows on an
**OpenStreetMap** map (free, no API key, no billing) with its 100 m fence as a circle, the school as a pin and
the user as a blue dot with a GPS-accuracy halo, plus "Inside the fence · 40 m" / "Outside · 300 m away". It
drags and pinch-zooms like any map app and the fence and dot stay on it; *Re-centre* frames the school (and you,
if you're nearby but outside). Built with [Leaflet](https://leafletjs.com) 1.9.4, vendored in
`assets/lib/leaflet/` (BSD-2, licence included) — no CDN. Tiles come from `tile.openstreetmap.org`, which is
fine at Robobox's volume; for heavy use point `OSM_TILES` in `src/app.ts` at a tile provider (MapTiler, Stadia…)
per the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

The sheet's `maps.app.goo.gl` short links were resolved once to coordinates and are built into `seed.ts`
(all 29 schools; HARMONY, G D Somani, Ideal and RIS from Robobox's corrected links). When a school's link
changes in `seed.ts`, devices pick up the new pin on next load.
Short links can't be read inside a browser; to change a pin, open the link and paste the full address-bar link.

## Data
Seeded from the uploaded School–Teacher sheet (29 schools, 61 teachers, 3 coordinators) and
the Teacher Visit Feedback Form (20 ratings, 9 critical standards). RAG is auto-computed in
`computeRag()` — the single place to tune thresholds.

## Shared data (`api.php`)
On the hosted site everyone works on **one shared record**: a teacher's check-in, leave, lesson update or
request, a coordinator's visit or school pin, Parth's approval, HR's update — each reaches every other phone.

- `api.php` (plain PHP, no database server) keeps the data in `../robobox-data/` — **outside the web root**, so a
  browser can never fetch it and deploying a new version never touches it. Set `ROBOBOX_DATA` to move it.
- Sign-in is checked by the server (default password = the person's name; changed passwords stored with
  `password_hash`) and returns a signed 30-day token; every data call needs it.
- Each phone applies its own changes at once, queues them, sends them, and pulls everyone else's changes every
  15 s and whenever the app is reopened. Offline changes stay queued and go when the phone is back online.
  Screens refresh with others' changes, but never while someone is typing or moving the map.
- Library files and update attachments (≤ 20 MB) are stored by the server too.
- Without a server (the Claude preview, a copy opened from disk) the app runs on-device only, as before.

**Back up** `robobox-data/` (state.json, passwords.json, secret.key, files/) — that folder *is* the data.

**Still to do:** the per-role rules (teachers don't see scores; coordinators see their own teachers) are enforced
in the app, not by `api.php`; any signed-in person could read the raw data with the right tools. Fine for an
internal pilot; move them server-side (or to MySQL with per-role queries) before wider use.
