// STORE = the only persistence layer. Swap the load/save pair for Supabase/Firebase to go multi-device.
// ponytail: localStorage = single-device demo persistence. Real cross-user sync needs a backend (see README).
// Classic script: STORE is a global shared with the other scripts.
const STORE = (() => {
  const K = 'robobox_tep_v1';

  function seedDb(): Collections {
    return {
      schools: SEED.schools, teachers: SEED.teachers, moderators: SEED.moderators,
      attendance: [], feedback: [], leaves: [], requests: [], tasks: [], materials: [], plans: [],
      notices: [], holidays: [], events: [], lessons: SEED.lessons, planUpdates: [], profiles: [],
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
      if (seed && seed.lat != null && (s.lat == null || s.mapLink !== seed.mapLink)) { s.lat = seed.lat; s.lng = seed.lng; s.mapLink = seed.mapLink; } });
    return d;
  }

  let db = load();
  function save(): void { try { localStorage.setItem(K, JSON.stringify(db)); } catch (e) { /* ignore */ } }

  return {
    get<K2 extends keyof Collections>(coll: K2): Collections[K2] { return db[coll]; },
    school(id: string): School | undefined { return db.schools.find((s) => s.id === id); },
    teacher(name: string): Teacher | undefined { return db.teachers.find((t) => t.name.toLowerCase() === String(name).toLowerCase()); },
    add<K2 extends keyof Collections>(coll: K2, rec: Collections[K2][number]): Collections[K2][number] {
      const r = rec as { id?: string };
      r.id = r.id || (String(coll) + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
      (db[coll] as unknown[]).push(rec);
      save();
      return rec;
    },
    update<K2 extends keyof Collections>(coll: K2, id: string, patch: Partial<Collections[K2][number]>): void {
      const r = (db[coll] as { id?: string }[]).find((x) => x.id === id);
      if (r) Object.assign(r, patch);
      save();
    },
    remove<K2 extends keyof Collections>(coll: K2, id: string): void {
      const arr = db[coll] as { id?: string }[];
      const i = arr.findIndex((x) => x.id === id);
      if (i >= 0) { arr.splice(i, 1); save(); }
    },
    setSchoolLoc(id: string, lat: number, lng: number): void {
      const s = this.school(id); if (s) { s.lat = lat; s.lng = lng; save(); }
    },
    reset(): void { db = seedDb(); save(); },
  };
})();
