"use strict";
// STORE = the only persistence layer. Swap the load/save pair for Supabase/Firebase to go multi-device.
// ponytail: localStorage = single-device demo persistence. Real cross-user sync needs a backend (see README).
// Classic script: STORE is a global shared with the other scripts.
const STORE = (() => {
    const K = 'robobox_tep_v1';
    function seedDb() {
        return {
            schools: SEED.schools, teachers: SEED.teachers, moderators: SEED.moderators,
            attendance: [], feedback: [], leaves: [], requests: [], tasks: [], materials: [], plans: [],
        };
    }
    function load() {
        // Spread over a fresh seedDb so a db saved by an older version (missing newer
        // collections like `plans`) is backfilled instead of leaving them undefined.
        try {
            const raw = localStorage.getItem(K);
            if (raw)
                return { ...seedDb(), ...JSON.parse(raw) };
        }
        catch (e) { /* ignore */ }
        return seedDb();
    }
    let db = load();
    function save() { try {
        localStorage.setItem(K, JSON.stringify(db));
    }
    catch (e) { /* ignore */ } }
    return {
        get(coll) { return db[coll]; },
        school(id) { return db.schools.find((s) => s.id === id); },
        teacher(name) { return db.teachers.find((t) => t.name.toLowerCase() === String(name).toLowerCase()); },
        add(coll, rec) {
            const r = rec;
            r.id = r.id || (String(coll) + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
            db[coll].push(rec);
            save();
            return rec;
        },
        update(coll, id, patch) {
            const r = db[coll].find((x) => x.id === id);
            if (r)
                Object.assign(r, patch);
            save();
        },
        remove(coll, id) {
            const arr = db[coll];
            const i = arr.findIndex((x) => x.id === id);
            if (i >= 0) {
                arr.splice(i, 1);
                save();
            }
        },
        setSchoolLoc(id, lat, lng) {
            const s = this.school(id);
            if (s) {
                s.lat = lat;
                s.lng = lng;
                save();
            }
        },
        reset() { db = seedDb(); save(); },
    };
})();
