// STORE = the only persistence layer. Classic script: STORE is a global shared with the other scripts.
//
// Two modes, picked at start-up by STORE.connect():
// - Shared (api.php answers, i.e. the hosted site): every change is applied on this phone at once, queued, and
//   sent to the server; every 15 s (and when the app comes back to the front) the phone sends its queue and pulls
//   whatever anyone else changed since its last pull. The queue survives a reload, so offline work is kept.
// - Local (no server: the claude.ai preview, a file:// copy): everything stays on this device, as before.
//
// Seed data (schools, teachers, the training schedule) ships in the app; the server only holds changes, which are
// laid over the seed by id — so a pin set by a coordinator, or a session Parth replaces, reaches everyone.
type SyncOp = { coll: string; op: 'put' | 'patch' | 'del'; id: string; rec?: unknown };
const STORE = (() => {
  const K = 'robobox_tep_v1', KS = 'robobox_tep_sync';
  const SYNCED: (keyof Collections)[] = ['schools', 'attendance', 'feedback', 'leaves', 'requests', 'tasks', 'materials', 'plans',
    'notices', 'holidays', 'events', 'lessons', 'planUpdates', 'profiles', 'members', 'visitReasons', 'modCheckins'];

  function seedDb(): Collections {
    const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x));
    return {
      schools: copy(SEED.schools), teachers: SEED.teachers, moderators: SEED.moderators,
      attendance: [], feedback: [], leaves: [], requests: [], tasks: [], materials: [], plans: [],
      notices: [], holidays: [], events: [], lessons: copy(SEED.lessons), planUpdates: [], profiles: [], passwords: [], members: [], visitReasons: [], modCheckins: [],
    };
  }
  function load(): Collections {
    // Spread over a fresh seedDb so a db saved by an older version (missing newer
    // collections like `plans`) is backfilled instead of leaving them undefined.
    try {
      const raw = localStorage.getItem(K);
      if (raw) {
        const d = { ...seedDb(), ...JSON.parse(raw) } as Collections;
        if (!d.lessons.length) d.lessons = SEED.lessons; // devices saved before the schedule shipped
        return withIds(d);
      }
    } catch (e) { /* ignore */ }
    return withIds(seedDb());
  }
  // Seeded lesson sessions ship without ids; give them stable ones so they can be replaced or removed.
  function withIds(d: Collections): Collections {
    d.lessons = d.lessons.map((p, i) => p.id ? p : { ...p, id: 'lesson_seed_' + i });
    // Geofences resolved from the sheet's Google Maps links fill in schools a device hasn't set yet,
    // and replace a pin when Robobox corrects that school's link.
    d.schools.forEach((s) => { const seed = SEED.schools.find((x) => x.id === s.id);
      if (seed) s.name = seed.name; // names come from the school sheet (e.g. NHPS Sec 3 / NHPS Sec 19)
      if (seed && seed.lat != null && (s.lat == null || s.mapLink !== seed.mapLink)) { s.lat = seed.lat; s.lng = seed.lng; s.mapLink = seed.mapLink; } });
    return d;
  }

  // Staff = the seeded teachers/coordinators plus anyone added in the app. A teacher's coordinator is their
  // first school's coordinator, so giving a school to a new coordinator moves its teachers with it.
  function compose(d: Collections): Collections {
    const added = d.members || [];
    d.teachers = [...SEED.teachers.map((t) => ({ ...t })),
      ...added.filter((m) => m.role === 'teacher').map((m): Teacher => ({ name: m.name, mod: '', schools: m.schools, grades: m.grades, phone: m.phone, added: true }))];
    d.teachers.forEach((t) => { const s = d.schools.find((x) => x.id === t.schools[0]); if (s) t.mod = s.mod; });
    d.moderators = [...SEED.moderators, ...added.filter((m) => m.role === 'mod' && !SEED.moderators.some((x) => x.toLowerCase() === m.name.toLowerCase())).map((m) => m.name)];
    d.schools.forEach((s) => { s.teachers = d.teachers.filter((t) => t.schools.includes(s.id)).map((t) => t.name); });
    return d;
  }
  let db = compose(load());
  function save(): void { compose(db); try { localStorage.setItem(K, JSON.stringify(db)); } catch (e) { /* ignore */ } }

  // ---- sync state: server mode, last version pulled, changes not yet sent ----
  let S: { shared: boolean; v: number; outbox: SyncOp[] } = { shared: false, v: 0, outbox: [] };
  try { S = { ...S, ...JSON.parse(localStorage.getItem(KS) || '{}') }; } catch (e) { /* ignore */ }
  const saveSync = () => { try { localStorage.setItem(KS, JSON.stringify(S)); } catch (e) { /* ignore */ } };
  let token = ''; let onChange: (() => void) | null = null; let onLost: (() => void) | null = null; let busy = false;
  const queue = (op: SyncOp) => { if (!S.shared) return; S.outbox.push(op); saveSync(); void sync(); };

  async function api(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = { ...(init.headers as Record<string, string> || {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) };
    return fetch('api.php?' + path, { ...init, headers, cache: 'no-store' });
  }
  // Applies records from the server onto this phone's copy. Records with a change still waiting to be sent are
  // skipped, so a slow upload is never overwritten by the older server copy.
  function apply(changes: Record<string, (Record<string, unknown> & { id: string; _del?: boolean })[]>): boolean {
    const pending = new Set(S.outbox.map((o) => o.coll + '|' + o.id)); let any = false;
    Object.keys(changes).forEach((coll) => {
      if (!SYNCED.includes(coll as keyof Collections)) return;
      const arr = db[coll as keyof Collections] as unknown as { id?: string }[];
      changes[coll].forEach((rec) => {
        if (pending.has(coll + '|' + rec.id)) return;
        const i = arr.findIndex((x) => x.id === rec.id); any = true;
        if (rec._del) { if (i >= 0) arr.splice(i, 1); return; }
        const clean = { ...rec }; delete clean._v;
        // Merge, not replace: a seeded record (a school, a session) is held on the server only as its changed fields.
        if (i >= 0) arr[i] = { ...arr[i], ...clean }; else arr.push(clean);
      });
    });
    if (any) save();
    return any;
  }
  // Send what's queued, then pull what changed. One run at a time; failures just wait for the next tick.
  async function sync(): Promise<void> {
    if (!S.shared || !token || busy) return;
    busy = true;
    try {
      while (S.outbox.length) {
        const ops = S.outbox.slice(0, 200);
        const r = await api('a=push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ops }) });
        if (r.status === 401) { token = ''; if (onLost) onLost(); break; }
        if (!r.ok) break;
        S.outbox.splice(0, ops.length); saveSync();
      }
      const r = await api('a=pull&since=' + S.v);
      if (r.status === 401) { token = ''; if (onLost) onLost(); }
      else if (r.ok) { const j = await r.json(); const changed = apply(j.changes || {}); S.v = j.v; saveSync(); if (changed && onChange) onChange(); }
    } catch (e) { /* offline: keep the queue, try again next tick */ }
    finally { busy = false; }
  }

  return {
    get<K2 extends keyof Collections>(coll: K2): Collections[K2] { return db[coll]; },
    school(id: string): School | undefined { return db.schools.find((s) => s.id === id); },
    teacher(name: string): Teacher | undefined { return db.teachers.find((t) => t.name.toLowerCase() === String(name).toLowerCase()); },
    add<K2 extends keyof Collections>(coll: K2, rec: Collections[K2][number]): Collections[K2][number] {
      const r = rec as { id?: string };
      r.id = r.id || (String(coll) + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
      (db[coll] as unknown[]).push(rec);
      save(); if (SYNCED.includes(coll)) queue({ coll, op: 'put', id: r.id, rec });
      return rec;
    },
    update<K2 extends keyof Collections>(coll: K2, id: string, patch: Partial<Collections[K2][number]>): void {
      const r = (db[coll] as { id?: string }[]).find((x) => x.id === id);
      if (r) Object.assign(r, patch);
      save(); if (SYNCED.includes(coll)) queue({ coll, op: 'patch', id, rec: patch });
    },
    remove<K2 extends keyof Collections>(coll: K2, id: string): void {
      const arr = db[coll] as { id?: string }[];
      const i = arr.findIndex((x) => x.id === id);
      if (i >= 0) { arr.splice(i, 1); save(); }
      if (SYNCED.includes(coll)) queue({ coll, op: 'del', id });
    },
    setSchoolLoc(id: string, lat: number, lng: number): void {
      const s = this.school(id); if (s) { s.lat = lat; s.lng = lng; save(); queue({ coll: 'schools', op: 'patch', id, rec: { lat, lng } }); }
    },
    reset(): void { db = compose(withIds(seedDb())); save(); },

    // ---- shared mode ----
    get shared(): boolean { return S.shared; },
    // Is there a server? Switching into shared mode starts this phone from the seed plus the server's changes,
    // dropping anything kept from local-only use (demo data must never leak into the shared record).
    async connect(): Promise<boolean> {
      let r: Response;
      try { r = await fetch('api.php?a=ping', { cache: 'no-store' }); } catch (e) { return S.shared; } // offline: stay as we were, keep the queue
      const j = r.ok ? await r.json().catch(() => null) : null;
      if (j && j.ok) {
        if (!S.shared) { db = compose(withIds(seedDb())); save(); S = { shared: true, v: 0, outbox: [] }; saveSync(); }
        // People added in the app, so a phone that has never signed in can still find its owner's name.
        try { const pr = await fetch('api.php?a=people', { cache: 'no-store' }); if (pr.ok) apply({ members: (await pr.json()).members || [] }); } catch (e) { /* offline */ }
        return true;
      }
      if (S.shared) { S = { shared: false, v: 0, outbox: [] }; saveSync(); } // a server answered, but not ours: local copy
      return false;
    },
    setToken(t: string): void { token = t; },
    onRemoteChange(fn: () => void): void { onChange = fn; },
    onSignedOut(fn: () => void): void { onLost = fn; },
    sync,
    pending(): number { return S.outbox.length; },
    api,
  };
})();
