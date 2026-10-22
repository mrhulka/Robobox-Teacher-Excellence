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

## Roles
| Role | What they get |
|------|---------------|
| **Teacher** | Geofenced log in / log out (punch), attendance + avg-late dashboard, leave requests, component requisitions, tasks assigned to them, materials. Can log in at one school and out at another. |
| **Coordinator** | Their teachers with live RAG, geofenced classroom visits → the full feedback form, leave/request approvals, performance trend, task assignment, monthly visit planner, materials. |
| **CEO / Outsight** | Network overview, RAG distribution, actionables (amber/red + safety escalations), teacher leaderboard, coordinator performance. |

## Geofence (200 m)
Uses the browser's native Geolocation. A school's geofence centre is **captured on-site**
the first time a teacher/coordinator acts there ("set to my current location") — this avoids
resolving the Google Maps short-links in the sheet and is more accurate. Login/visit is
allowed only within `CONFIG.geofenceMeters` (200 m).

## Data
Seeded from the uploaded School–Teacher sheet (29 schools, 61 teachers, 3 coordinators) and
the Teacher Visit Feedback Form (20 ratings, 9 critical standards, RAG judgement).

## Known limitation → next step
Persistence is **`localStorage`: single-device only.** For real cross-user sync (a teacher's
phone and their coordinator's phone sharing data) and real passworded auth, swap `store.js` for
a backend. Supabase is the laziest path — it gives Postgres + auth + row-level security with
almost no server code; `src/store.ts` is written as the single swap point for exactly this.

Material file uploads work on-device (IndexedDB, ≤20 MB); a real deployment points
`fileSave`/`fileGet` at object storage (S3 / Supabase Storage). Also deferred (add when needed):
push notifications, and per-school class-start times (currently one global `expectedStart`, 08:00).
