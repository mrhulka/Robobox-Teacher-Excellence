"use strict";
const STORE = (() => {
    const K = 'robobox_tep_v1', KS = 'robobox_tep_sync';
    const SYNCED = ['schools', 'attendance', 'feedback', 'leaves', 'requests', 'tasks', 'materials', 'plans',
        'notices', 'holidays', 'events', 'lessons', 'planUpdates', 'profiles'];
    function seedDb() {
        const copy = (x) => JSON.parse(JSON.stringify(x));
        return {
            schools: copy(SEED.schools), teachers: SEED.teachers, moderators: SEED.moderators,
            attendance: [], feedback: [], leaves: [], requests: [], tasks: [], materials: [], plans: [],
            notices: [], holidays: [], events: [], lessons: copy(SEED.lessons), planUpdates: [], profiles: [], passwords: [],
        };
    }
    function load() {
        // Spread over a fresh seedDb so a db saved by an older version (missing newer
        // collections like `plans`) is backfilled instead of leaving them undefined.
        try {
            const raw = localStorage.getItem(K);
            if (raw) {
                const d = { ...seedDb(), ...JSON.parse(raw) };
                if (!d.lessons.length)
                    d.lessons = SEED.lessons; // devices saved before the schedule shipped
                return withIds(d);
            }
        }
        catch (e) { /* ignore */ }
        return withIds(seedDb());
    }
    // Seeded lesson sessions ship without ids; give them stable ones so they can be replaced or removed.
    function withIds(d) {
        d.lessons = d.lessons.map((p, i) => p.id ? p : { ...p, id: 'lesson_seed_' + i });
        // Geofences resolved from the sheet's Google Maps links fill in schools a device hasn't set yet,
        // and replace a pin when Robobox corrects that school's link.
        d.schools.forEach((s) => {
            const seed = SEED.schools.find((x) => x.id === s.id);
            if (seed && seed.lat != null && (s.lat == null || s.mapLink !== seed.mapLink)) {
                s.lat = seed.lat;
                s.lng = seed.lng;
                s.mapLink = seed.mapLink;
            }
        });
        return d;
    }
    let db = load();
    function save() { try {
        localStorage.setItem(K, JSON.stringify(db));
    }
    catch (e) { /* ignore */ } }
    // ---- sync state: server mode, last version pulled, changes not yet sent ----
    let S = { shared: false, v: 0, outbox: [] };
    try {
        S = { ...S, ...JSON.parse(localStorage.getItem(KS) || '{}') };
    }
    catch (e) { /* ignore */ }
    const saveSync = () => { try {
        localStorage.setItem(KS, JSON.stringify(S));
    }
    catch (e) { /* ignore */ } };
    let token = '';
    let onChange = null;
    let onLost = null;
    let busy = false;
    const queue = (op) => { if (!S.shared)
        return; S.outbox.push(op); saveSync(); void sync(); };
    async function api(path, init = {}) {
        const headers = { ...(init.headers || {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) };
        return fetch('api.php?' + path, { ...init, headers, cache: 'no-store' });
    }
    // Applies records from the server onto this phone's copy. Records with a change still waiting to be sent are
    // skipped, so a slow upload is never overwritten by the older server copy.
    function apply(changes) {
        const pending = new Set(S.outbox.map((o) => o.coll + '|' + o.id));
        let any = false;
        Object.keys(changes).forEach((coll) => {
            if (!SYNCED.includes(coll))
                return;
            const arr = db[coll];
            changes[coll].forEach((rec) => {
                if (pending.has(coll + '|' + rec.id))
                    return;
                const i = arr.findIndex((x) => x.id === rec.id);
                any = true;
                if (rec._del) {
                    if (i >= 0)
                        arr.splice(i, 1);
                    return;
                }
                const clean = { ...rec };
                delete clean._v;
                // Merge, not replace: a seeded record (a school, a session) is held on the server only as its changed fields.
                if (i >= 0)
                    arr[i] = { ...arr[i], ...clean };
                else
                    arr.push(clean);
            });
        });
        if (any)
            save();
        return any;
    }
    // Send what's queued, then pull what changed. One run at a time; failures just wait for the next tick.
    async function sync() {
        if (!S.shared || !token || busy)
            return;
        busy = true;
        try {
            while (S.outbox.length) {
                const ops = S.outbox.slice(0, 200);
                const r = await api('a=push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ops }) });
                if (r.status === 401) {
                    token = '';
                    if (onLost)
                        onLost();
                    break;
                }
                if (!r.ok)
                    break;
                S.outbox.splice(0, ops.length);
                saveSync();
            }
            const r = await api('a=pull&since=' + S.v);
            if (r.status === 401) {
                token = '';
                if (onLost)
                    onLost();
            }
            else if (r.ok) {
                const j = await r.json();
                const changed = apply(j.changes || {});
                S.v = j.v;
                saveSync();
                if (changed && onChange)
                    onChange();
            }
        }
        catch (e) { /* offline: keep the queue, try again next tick */ }
        finally {
            busy = false;
        }
    }
    return {
        get(coll) { return db[coll]; },
        school(id) { return db.schools.find((s) => s.id === id); },
        teacher(name) { return db.teachers.find((t) => t.name.toLowerCase() === String(name).toLowerCase()); },
        add(coll, rec) {
            const r = rec;
            r.id = r.id || (String(coll) + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
            db[coll].push(rec);
            save();
            if (SYNCED.includes(coll))
                queue({ coll, op: 'put', id: r.id, rec });
            return rec;
        },
        update(coll, id, patch) {
            const r = db[coll].find((x) => x.id === id);
            if (r)
                Object.assign(r, patch);
            save();
            if (SYNCED.includes(coll))
                queue({ coll, op: 'patch', id, rec: patch });
        },
        remove(coll, id) {
            const arr = db[coll];
            const i = arr.findIndex((x) => x.id === id);
            if (i >= 0) {
                arr.splice(i, 1);
                save();
            }
            if (SYNCED.includes(coll))
                queue({ coll, op: 'del', id });
        },
        setSchoolLoc(id, lat, lng) {
            const s = this.school(id);
            if (s) {
                s.lat = lat;
                s.lng = lng;
                save();
                queue({ coll: 'schools', op: 'patch', id, rec: { lat, lng } });
            }
        },
        reset() { db = seedDb(); save(); },
        // ---- shared mode ----
        get shared() { return S.shared; },
        // Is there a server? Switching into shared mode starts this phone from the seed plus the server's changes,
        // dropping anything kept from local-only use (demo data must never leak into the shared record).
        async connect() {
            let r;
            try {
                r = await fetch('api.php?a=ping', { cache: 'no-store' });
            }
            catch (e) {
                return S.shared;
            } // offline: stay as we were, keep the queue
            const j = r.ok ? await r.json().catch(() => null) : null;
            if (j && j.ok) {
                if (!S.shared) {
                    db = withIds(seedDb());
                    save();
                    S = { shared: true, v: 0, outbox: [] };
                    saveSync();
                }
                return true;
            }
            if (S.shared) {
                S = { shared: false, v: 0, outbox: [] };
                saveSync();
            } // a server answered, but not ours: local copy
            return false;
        },
        setToken(t) { token = t; },
        onRemoteChange(fn) { onChange = fn; },
        onSignedOut(fn) { onLost = fn; },
        sync,
        pending() { return S.outbox.length; },
        api,
    };
})();
