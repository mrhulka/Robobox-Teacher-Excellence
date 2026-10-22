// STORE = the only persistence layer. Swap these ~15 lines for Supabase/Firebase to go multi-device.
// ponytail: localStorage = single-device demo persistence. Real cross-user sync needs a backend (see README).
window.STORE = (function () {
  const K = 'robobox_tep_v1';
  let db = load();

  function load() {
    try { const raw = localStorage.getItem(K); if (raw) return JSON.parse(raw); } catch (e) {}
    return seedDb();
  }
  function save() { try { localStorage.setItem(K, JSON.stringify(db)); } catch (e) {} }

  function seedDb() {
    const d = {
      schools: SEED.schools, teachers: SEED.teachers, moderators: SEED.moderators,
      attendance: [], feedback: [], leaves: [], requests: [], tasks: [], materials: [],
    };
    return d;
  }

  return {
    get: (coll) => db[coll] || [],
    school: (id) => db.schools.find((s) => s.id === id),
    teacher: (name) => db.teachers.find((t) => t.name.toLowerCase() === String(name).toLowerCase()),
    add(coll, rec) { rec.id = rec.id || (coll + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)); db[coll].push(rec); save(); return rec; },
    update(coll, id, patch) { const r = db[coll].find((x) => x.id === id); if (r) Object.assign(r, patch); save(); return r; },
    setSchoolLoc(id, lat, lng) { const s = this.school(id); if (s) { s.lat = lat; s.lng = lng; save(); } return s; },
    reset() { db = seedDb(); save(); },
  };
})();
