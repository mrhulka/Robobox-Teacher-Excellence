# Robobox Teacher Excellence Portal

A mobile-first web app for the Robobox teacher network. **Zero build step** — plain
HTML/CSS/JS. Drop the files on any static host (or the Robobox website) and it runs.

## Open it
- Locally: `python3 -m http.server` then visit `http://localhost:8000`
- Or just open `index.html` over `http(s)://` (geolocation needs a secure origin — `localhost` or `https`, not `file://`).

## Roles
| Role | What they get |
|------|---------------|
| **Teacher** | Geofenced log in / log out (punch), attendance + avg-late dashboard, leave requests, component requisitions, tasks assigned to them, materials. Can log in at one school and out at another. |
| **Moderator** | Their teachers with live RAG, geofenced classroom visits → the full feedback form, leave/request approvals, task assignment, visit calendar, materials. |
| **CEO / Outsight** | Network overview, RAG distribution, actionables (amber/red + safety escalations), teacher leaderboard, moderator performance. |

## Geofence (200 m)
Uses the browser's native Geolocation. A school's geofence centre is **captured on-site**
the first time a teacher/moderator acts there ("set to my current location") — this avoids
resolving the Google Maps short-links in the sheet and is more accurate. Login/visit is
allowed only within `CONFIG.geofenceMeters` (200 m).

## Data
Seeded from the uploaded School–Teacher sheet (29 schools, 61 teachers, 3 moderators) and
the Teacher Visit Feedback Form (20 ratings, 9 critical standards, RAG judgement).

- `seed.js` — master data (generated from the Excel)
- `config.js` — feedback form spec + RAG + dropdown lists
- `store.js` — **the only persistence layer** (localStorage)
- `app.js` — geofence, attendance, RAG engine, all role views
- `selfcheck.mjs` — `node selfcheck.mjs` checks the haversine geofence + RAG averaging

## Known limitation → next step
Persistence is **`localStorage`: single-device only.** For real cross-user sync (a teacher's
phone and their moderator's phone sharing data) and real passworded auth, swap `store.js` for
a backend. Supabase is the laziest path — it gives Postgres + auth + row-level security with
almost no server code; `store.js` is written as the single, ~15-line swap point for exactly this.

Also deferred (add when needed): file uploads for materials (currently link-based),
push notifications, and per-school class-start times (currently one global `expectedStart`).
