"use strict";
// Robobox Teacher Excellence Portal — app logic.
// Classic script (no import/export) so top-level functions are global and the inline
// on* handlers in the generated HTML resolve to them — no framework, no bundler.
// Depends on globals from the other scripts: SEED, CONFIG, STORE, and the types.ts interfaces.
// Cast covers both container (.innerHTML) and input (.value) reads; the id is always present when used.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtT = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtD = (d) => d ? new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short' }) : '—';
const initials = (n) => n.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
/* ---------- session ---------- */
const SESSION = {
    get() { try {
        return JSON.parse(localStorage.getItem('robobox_session') || 'null');
    }
    catch (e) {
        return null;
    } },
    set(u) { localStorage.setItem('robobox_session', JSON.stringify(u)); },
    clear() { localStorage.removeItem('robobox_session'); },
};
/* ---------- demo mode (testing without GPS) ----------
   Off by default. When on, GPS is simulated and geofence setup skips the native confirm()
   dialog — so every flow is testable inside a sandboxed iframe or on a laptop with no GPS.
   On a real phone with location allowed, leave it off and the real 200 m geofence applies. */
// Default ON inside an iframe (e.g. a hosted preview that blocks GPS), OFF on a normal
// top-level page (real deployment). An explicit toggle choice always wins.
const DEMO = { on: (() => {
        try {
            const stored = localStorage.getItem('robobox_demo');
            if (stored != null)
                return stored === '1';
            return window.self !== window.top; // in an iframe → simulate location
        }
        catch (e) {
            return true;
        }
    })() };
const DEMO_POS = { lat: 19.0760, lng: 72.8777, acc: 5 };
function toggleDemo(cb) {
    DEMO.on = cb.checked;
    try {
        localStorage.setItem('robobox_demo', DEMO.on ? '1' : '0');
    }
    catch (e) { /* ignore */ }
}
/* ---------- file storage (IndexedDB) for material uploads up to 20 MB ----------
   ponytail: per-device IndexedDB blob store — fine for the prototype; a real deployment
   points fileSave/fileGet at object storage (S3 / Supabase Storage). */
const MAX_FILE = 20 * 1024 * 1024;
function idb() {
    return new Promise((res, rej) => {
        const r = indexedDB.open('robobox_files', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('files');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
    });
}
async function fileSave(id, blob) {
    const db = await idb();
    await new Promise((res, rej) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').put(blob, id); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}
async function fileGet(id) {
    const db = await idb();
    return new Promise((res, rej) => { const tx = db.transaction('files', 'readonly'); const g = tx.objectStore('files').get(id); g.onsuccess = () => res(g.result); g.onerror = () => rej(g.error); });
}
function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}
// Report export → CSV (opens in Excel/Sheets). ponytail: CSV covers it; add .xlsx only if formatting is required.
function csvCell(v) { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function downloadCSV(filename, rows) {
    const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
    triggerDownload(new Blob([csv], { type: 'text/csv' }), filename);
}
function haversine(a, b) {
    const R = 6371000, toR = (d) => d * Math.PI / 180;
    const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
}
function getPos() {
    if (DEMO.on)
        return Promise.resolve({ ...DEMO_POS });
    return new Promise((res, rej) => {
        if (!navigator.geolocation)
            return rej(new Error('Geolocation not supported on this device.'));
        navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }), (e) => rej(new Error(e.code === 1 ? 'Location permission denied. Allow location to continue.' : 'Could not get your location. Try again outdoors.')), { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
    });
}
// One GPS read. If the school has no geofence yet, set it to the measured point
// (on-site, one-time). Returns {ok,dist} or null if aborted.
async function atSchool(school) {
    const pos = await getPos();
    if (school.lat == null) {
        if (!DEMO.on && !confirm(`${school.name} has no geofence yet. Set it to your current location now?`))
            return null;
        STORE.setSchoolLoc(school.id, pos.lat, pos.lng);
    }
    const dist = haversine(pos, { lat: school.lat, lng: school.lng });
    return { ok: dist <= CONFIG.geofenceMeters, dist };
}
/* ---------- RAG / scoring ---------- */
function visitScore(fb) {
    const vals = Object.values(fb.ratings || {}).filter((v) => typeof v === 'number');
    if (!vals.length)
        return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
}
function teacherFeedback(name) {
    return STORE.get('feedback').filter((f) => f.teacher.toLowerCase() === name.toLowerCase())
        .sort((a, b) => b.date.localeCompare(a.date));
}
function teacherRag(name) {
    const fb = teacherFeedback(name);
    if (!fb.length)
        return { key: 'none', avg: null, visits: 0 };
    const scores = fb.map(visitScore).filter((x) => x != null);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return { key: fb[0].rag, avg, visits: fb.length };
}
const ragPill = (key) => key === 'none'
    ? '<span class="pill tag">Not yet rated</span>'
    : `<span class="pill rag-${key}"><span class="dot ${key}"></span>${key[0].toUpperCase() + key.slice(1)}</span>`;
// RAG is auto-calculated from the moderator's ratings + critical standards — never chosen by hand.
// ponytail: default thresholds (avg ≥4 green, ≥3 amber, else red; critical fails & safety escalate).
// Confirm these with Robobox before go-live — this function is the single calibration knob.
function computeRag(ratings, critical) {
    if (critical['N9'] === 'Yes')
        return 'red'; // safety concern → immediate red, regardless of score
    const vals = Object.values(ratings).filter((v) => typeof v === 'number');
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    const fails = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8'].filter((k) => critical[k] === 'No').length;
    let key = avg == null ? 'amber' : avg >= 4 ? 'green' : avg >= 3 ? 'amber' : 'red';
    if (fails >= 2)
        key = 'red';
    else if (fails === 1 && key === 'green')
        key = 'amber';
    return key;
}
// Change from first to latest scored visit (growth +, degrowth −).
function teacherGrowth(name) {
    const sc = teacherFeedback(name).slice().reverse().map((f) => f.score).filter((x) => x != null);
    return sc.length > 1 ? sc[sc.length - 1] - sc[0] : null;
}
// Coordinator score = mean of their teachers' average scores (teacher-weighted).
function coordScore(mod) {
    const avgs = teachersOfMod(mod).map((t) => teacherRag(t.name).avg).filter((x) => x != null);
    return avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
}
/* ---------- attendance ---------- */
function teacherAtt(name) { return STORE.get('attendance').filter((a) => a.teacher.toLowerCase() === name.toLowerCase()).sort((a, b) => b.date.localeCompare(a.date)); }
function openPunch(name) { return teacherAtt(name).find((a) => a.date === todayStr() && !a.outTime); }
function lateMins(iso) {
    const [h, m] = CONFIG.expectedStart.split(':').map(Number);
    const t = new Date(iso);
    const exp = new Date(t);
    exp.setHours(h, m, 0, 0);
    return Math.max(0, Math.round((t.getTime() - exp.getTime()) / 60000));
}
function avgLate(name) {
    const recs = teacherAtt(name).filter((a) => a.inTime);
    if (!recs.length)
        return 0;
    return Math.round(recs.reduce((s, a) => s + (a.inLate || 0), 0) / recs.length);
}
const isoDaysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
// Average login delay over a window: rolling 7 days ('week') or current calendar month ('month').
function avgLateWindow(name, window) {
    const from = window === 'week' ? isoDaysAgo(6) : todayStr().slice(0, 7); // month = yyyy-mm prefix
    const recs = teacherAtt(name).filter((a) => a.inTime && (window === 'week' ? a.date >= from : a.date.startsWith(from)));
    if (!recs.length)
        return 0;
    return Math.round(recs.reduce((s, a) => s + (a.inLate || 0), 0) / recs.length);
}
/* ---------- small UI helpers ---------- */
let BANNER = '';
function flash(kind, msg) { const el = $('flash'); if (el)
    el.innerHTML = `<div class="banner ${kind}">${esc(msg)}</div>`; }
function schoolsOfTeacher(t) { return (t.schools || []).map((id) => STORE.school(id)).filter((s) => !!s); }
function schoolsOfMod(mod) { return STORE.get('schools').filter((s) => s.mod.toLowerCase() === mod.toLowerCase()); }
function teachersOfMod(mod) { return STORE.get('teachers').filter((t) => t.mod.toLowerCase() === mod.toLowerCase()); }
function teachersAtSchool(id) { const s = STORE.school(id); return (s ? s.teachers : []).map((n) => STORE.teacher(n)).filter((t) => !!t); }
/* ================= ROUTER ================= */
const TAB = {};
function go(tab) { const u = SESSION.get(); TAB[u.role] = tab; SEL = null; render(); }
function render() {
    const u = SESSION.get();
    const app = $('app');
    if (!u) {
        app.innerHTML = viewLogin();
        return;
    }
    const tabs = ROLE_TABS[u.role];
    const active = TAB[u.role] || tabs[0].id;
    app.innerHTML = `
    <div class="topbar">
      <img class="logo-img" src="assets/logo-mark.webp" alt="The Robobox">
      <span class="portal-tag">Teacher Excellence</span>
      <nav class="topnav">${tabs.map((t) => `<button class="${t.id === active ? 'on' : ''}" onclick="go('${t.id}')">${t.label}</button>`).join('')}</nav>
      <span class="who">${esc(u.name)}<small>${u.role === 'mod' ? 'Coordinator' : u.role === 'ceo' ? 'CEO / Outsight' : 'Teacher'}</small></span>
      <button class="out" onclick="logout()">Exit</button>
    </div>
    <div class="wrap"><div id="flash"></div>${VIEWS[u.role][active](u)}</div>
    <nav class="tabbar">${tabs.map((t) => `<a class="${t.id === active ? 'on' : ''}" href="javascript:go('${t.id}')"><span class="ic">${t.ic}</span>${t.label}</a>`).join('')}</nav>`;
}
function logout() { SESSION.clear(); render(); }
/* ================= LOGIN ================= */
let LOGIN = { role: null };
function viewLogin() {
    if (!LOGIN.role) {
        return `<div class="login"><div class="hero"><img class="logo-full" src="assets/logo.webp" alt="The Robobox — Teacher Excellence">
      <p class="sub" style="margin-top:12px">Teacher Excellence Portal — one Robobox classroom, delivered consistently.</p></div>
      ${BANNER}
      <div class="card">
        <button class="btn" onclick="pickRole('teacher')">👩‍🏫 I'm a Teacher</button>
        <div style="height:10px"></div>
        <button class="btn sec" onclick="pickRole('mod')">🧭 I'm a Coordinator</button>
        <div style="height:10px"></div>
        <button class="btn sec" onclick="pickRole('ceo')">📊 CEO / Outsight team</button>
        <label style="display:flex;align-items:center;gap:8px;margin-top:14px;font-size:13px;color:var(--muted)">
          <input type="checkbox" style="width:auto" ${DEMO.on ? 'checked' : ''} onchange="toggleDemo(this)">
          Demo mode — simulate location (for testing without GPS)
        </label>
        ${DEMO.on ? '<p class="note" style="margin:6px 0 0">📍 Demo mode is on — location is simulated, so the geofence always passes. Turn it off on a real device to use true GPS.</p>' : ''}
      </div></div>`;
    }
    if (LOGIN.role === 'teacher') {
        const ts = STORE.get('teachers').slice().sort((a, b) => a.name.localeCompare(b.name));
        return `<div class="login"><div class="hero"><div class="robo">👩‍🏫</div><h1>Teacher sign in</h1>
      <p class="sub">Select your name. You'll punch in from school.</p></div>${BANNER}
      <div class="card">
        <label class="f">Your name</label>
        <select id="who">${ts.map((t) => `<option value="${esc(t.name)}">${esc(t.name)} — ${esc(schoolsOfTeacher(t).map((s) => s.name).join(', '))}</option>`).join('')}</select>
        <div style="height:12px"></div>
        <button class="btn" onclick="doLogin('teacher')">Continue</button>
        <button class="btn sec sm" style="margin-top:8px" onclick="backToRoles()">Back</button>
      </div></div>`;
    }
    if (LOGIN.role === 'mod') {
        return `<div class="login"><div class="hero"><div class="robo">🧭</div><h1>Coordinator sign in</h1></div>${BANNER}
      <div class="card"><label class="f">Your name</label>
        <select id="who">${STORE.get('moderators').map((m) => `<option>${esc(m)}</option>`).join('')}</select>
        <div style="height:12px"></div>
        <button class="btn" onclick="doLogin('mod')">Continue</button>
        <button class="btn sec sm" style="margin-top:8px" onclick="backToRoles()">Back</button>
      </div></div>`;
    }
    return `<div class="login"><div class="hero"><div class="robo">📊</div><h1>CEO / Outsight</h1></div>${BANNER}
    <div class="card"><p class="sub">Network-wide view of teacher & coordinator performance.</p>
      <button class="btn" onclick="doLogin('ceo')">Enter dashboard</button>
      <button class="btn sec sm" style="margin-top:8px" onclick="backToRoles()">Back</button>
    </div></div>`;
}
function pickRole(r) { LOGIN = { role: r }; render(); }
function backToRoles() { LOGIN = { role: null }; render(); }
function doLogin(role) {
    const name = role === 'ceo' ? 'Outsight' : $('who').value;
    const u = { role, name };
    if (role === 'teacher') {
        const t = STORE.teacher(name);
        u.mod = t.mod;
    }
    SESSION.set(u);
    LOGIN = { role: null };
    render();
}
/* ================= TEACHER VIEWS ================= */
async function punch(kind) {
    const u = SESSION.get();
    const t = STORE.teacher(u.name);
    const schools = schoolsOfTeacher(t);
    const sel = $('punchSchool');
    const school = STORE.school(sel ? sel.value : schools[0].id);
    flash('warn', 'Checking you are within 200 m of ' + school.name + '…');
    try {
        const g = await atSchool(school);
        if (!g) {
            flash('warn', 'Cancelled.');
            return;
        }
        if (!g.ok) {
            flash('err', `You are ${Math.round(g.dist)} m from ${school.name}. Must be within ${CONFIG.geofenceMeters} m.`);
            return;
        }
        if (kind === 'in') {
            const now = new Date().toISOString();
            const lm = lateMins(now);
            STORE.add('attendance', { teacher: u.name, date: todayStr(), inTime: now, inSchool: school.id, inLate: lm, inDist: Math.round(g.dist) });
            flash('ok', `Logged in at ${school.name}${lm ? ` · ${lm} min late` : ' · on time'}.`);
        }
        else {
            const open = openPunch(u.name);
            if (!open) {
                flash('err', 'No open session to log out from.');
                return;
            }
            STORE.update('attendance', open.id, { outTime: new Date().toISOString(), outSchool: school.id, outDist: Math.round(g.dist) });
            flash('ok', `Logged out at ${school.name}.`);
        }
        render();
    }
    catch (e) {
        flash('err', e.message);
    }
}
function tHome(u) {
    const t = STORE.teacher(u.name);
    const schools = schoolsOfTeacher(t);
    const open = openPunch(u.name);
    const rag = teacherRag(u.name);
    const tasks = STORE.get('tasks').filter((x) => x.teacher === u.name && x.status !== 'Done');
    return `
    <h1>Hi ${esc(u.name.split(' ')[0])} 👋</h1>
    <div class="kpis" style="margin-bottom:14px">
      <div class="stat"><div class="n">${open ? '🟢' : '⚪'}</div><div class="l">${open ? 'On campus' : 'Not logged in'}</div></div>
      <div class="stat"><div class="n">${avgLate(u.name)}m</div><div class="l">Avg late</div></div>
      <div class="stat"><div class="n">${teacherAtt(u.name).filter((a) => a.inTime).length}</div><div class="l">Days present</div></div>
      <div class="stat"><div class="n" style="font-size:16px;padding-top:6px">${ragPill(rag.key)}</div><div class="l">Current status</div></div>
    </div>
    <div class="card">
      <label class="f">Select school</label>
      <select id="punchSchool">${schools.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
      <p class="note" style="margin:8px 0 12px">Login & logout are geofenced to within ${CONFIG.geofenceMeters} m. You may log in at one school and log out at another.</p>
      ${open
        ? `<div class="banner ok" style="margin-bottom:10px">Logged in at <b>${esc(STORE.school(open.inSchool).name)}</b> · ${fmtT(open.inTime)}</div>
           <button class="btn dark" onclick="punch('out')">Log out (punch out)</button>`
        : `<button class="btn" onclick="punch('in')">Log in (punch in)</button>`}
    </div>
    ${tasks.length ? `<h2>Tasks for you</h2><div class="card">${tasks.map(taskRow).join('')}</div>` : ''}`;
}
function taskRow(x) {
    return `<div class="listrow"><div class="main"><b>${esc(x.title)}</b><small>${esc(x.detail || '')} ${x.due ? '· due ' + fmtD(x.due) : ''} · by ${esc(x.by)}</small></div>
    ${x.status === 'Done' ? '<span class="pill rag-green">Done</span>' : `<button class="btn sec sm" onclick="markTask('${x.id}')">Mark done</button>`}</div>`;
}
function markTask(id) { STORE.update('tasks', id, { status: 'Done', doneAt: new Date().toISOString() }); render(); }
function tAttendance(u) {
    const recs = teacherAtt(u.name);
    return `<h1>My attendance</h1><p class="sub">Reporting time ${CONFIG.expectedStart} — delay is measured from here.</p>
    <div class="kpis" style="margin-bottom:14px">
      <div class="stat"><div class="n">${avgLateWindow(u.name, 'week')}m</div><div class="l">Avg delay · this week</div></div>
      <div class="stat"><div class="n">${avgLateWindow(u.name, 'month')}m</div><div class="l">Avg delay · this month</div></div>
      <div class="stat"><div class="n">${avgLate(u.name)}m</div><div class="l">Avg delay · all time</div></div>
    </div>
    <div class="card scrollx">${recs.length ? `<table class="mini"><tr><th>Date</th><th>In</th><th>Out</th><th>Late</th><th>School</th></tr>
      ${recs.map((a) => `<tr><td>${fmtD(a.date)}</td><td>${fmtT(a.inTime)}</td><td>${fmtT(a.outTime)}</td><td>${a.inLate ? a.inLate + 'm' : '—'}</td>
        <td>${esc(STORE.school(a.inSchool).name)}${a.outSchool && a.outSchool !== a.inSchool ? ' → ' + esc(STORE.school(a.outSchool).name) : ''}</td></tr>`).join('')}</table>`
        : '<div class="empty">No attendance yet. Punch in from Home.</div>'}</div>`;
}
function tLeave(u) {
    const mine = STORE.get('leaves').filter((l) => l.teacher === u.name).sort((a, b) => b.from.localeCompare(a.from));
    return `<h1>Leave</h1>
    <div class="card"><h2 style="margin-top:0">Request leave</h2>
      <label class="f">Type</label><select id="lvType">${CONFIG.leaveTypes.map((x) => `<option>${x}</option>`).join('')}</select>
      <div class="row"><div style="flex:1"><label class="f">From</label><input type="date" id="lvFrom" value="${todayStr()}"></div>
      <div style="flex:1"><label class="f">To</label><input type="date" id="lvTo" value="${todayStr()}"></div></div>
      <label class="f">Reason</label><textarea id="lvReason" placeholder="Short reason"></textarea>
      <div style="height:10px"></div><button class="btn" onclick="submitLeave()">Submit request</button></div>
    <h2>My requests</h2><div class="card">${mine.length ? mine.map((l) => leaveRow(l)).join('') : '<div class="empty">No leave requests.</div>'}</div>`;
}
function leaveRow(l, forMod) {
    const cls = l.status === 'Approved' ? 'rag-green' : l.status === 'Rejected' ? 'rag-red' : 'tag';
    return `<div class="listrow"><div class="main"><b>${esc(l.type)} · ${fmtD(l.from)}–${fmtD(l.to)}</b><small>${esc(l.reason || '')}${forMod ? ' · ' + esc(l.teacher) : ''}</small></div>
    <div class="actions"><span class="pill ${cls}">${l.status}</span>
    ${forMod && l.status === 'Pending' ? `<button class="btn sec sm" onclick="setLeave('${l.id}','Approved')">✓</button><button class="btn sec sm" onclick="setLeave('${l.id}','Rejected')">✗</button>` : ''}
    ${!forMod && l.status === 'Pending' ? `<button class="btn sec sm" onclick="setLeave('${l.id}','Cancelled')">Withdraw</button>` : ''}</div></div>`;
}
function submitLeave() {
    const u = SESSION.get();
    STORE.add('leaves', { teacher: u.name, mod: u.mod, type: $('lvType').value, from: $('lvFrom').value, to: $('lvTo').value, reason: $('lvReason').value, status: 'Pending' });
    flash('ok', 'Leave request submitted.');
    render();
}
function setLeave(id, status) { STORE.update('leaves', id, { status }); render(); }
function tRequests(u) {
    const mine = STORE.get('requests').filter((r) => r.teacher === u.name).sort((a, b) => (b.id || '').localeCompare(a.id || ''));
    return `<h1>Component requests</h1><p class="sub">Raise requisitions for kits/components needed per project.</p>
    <div class="card"><label class="f">Project</label><input id="rqProj" placeholder="e.g. Line-follower robot">
      <label class="f">Category</label><select id="rqCat">${CONFIG.requestCategories.map((x) => `<option>${x}</option>`).join('')}</select>
      <div class="row"><div style="flex:3"><label class="f">Items needed</label><input id="rqItems" placeholder="e.g. IR sensors, L298N driver"></div>
      <div style="flex:1"><label class="f">Qty</label><input id="rqQty" type="number" value="1" min="1"></div></div>
      <label class="f">Note</label><textarea id="rqNote" placeholder="Optional"></textarea>
      <div style="height:10px"></div><button class="btn" onclick="submitReq()">Raise request</button></div>
    <h2>My requests</h2><div class="card">${mine.length ? mine.map((r) => reqRow(r)).join('') : '<div class="empty">No requests yet.</div>'}</div>`;
}
function reqRow(r, forMod) {
    const cls = r.status === 'Fulfilled' ? 'rag-green' : r.status === 'Approved' ? 'rag-amber' : 'tag';
    return `<div class="listrow"><div class="main"><b>${esc(r.items)} ×${r.qty}</b><small>${esc(r.project)} · ${esc(r.category)}${forMod ? ' · ' + esc(r.teacher) : ''}</small></div>
    <div class="actions"><span class="pill ${cls}">${r.status}</span>
    ${forMod && r.status !== 'Fulfilled' ? `<button class="btn sec sm" onclick="setReq('${r.id}','${r.status === 'Open' ? 'Approved' : 'Fulfilled'}')">${r.status === 'Open' ? 'Approve' : 'Mark fulfilled'}</button>` : ''}</div></div>`;
}
function submitReq() {
    const u = SESSION.get();
    STORE.add('requests', { teacher: u.name, mod: u.mod, project: $('rqProj').value, category: $('rqCat').value, items: $('rqItems').value, qty: +$('rqQty').value || 1, note: $('rqNote').value, status: 'Open' });
    flash('ok', 'Request raised.');
    render();
}
function setReq(id, status) { STORE.update('requests', id, { status }); render(); }
function materialsView(u) {
    const mats = STORE.get('materials').slice().reverse();
    const canAdd = u.role === 'mod' || u.role === 'ceo';
    return `<h1>Materials</h1><p class="sub">Handbook, curriculum & resources from Robobox.</p>
    ${canAdd ? `<div class="card"><h2 style="margin-top:0">Add material</h2>
      <label class="f">Title</label><input id="mtTitle" placeholder="e.g. Teacher Handbook v2">
      <label class="f">Link (Drive / URL)</label><input id="mtLink" placeholder="https://… — or attach a file below">
      <label class="f">Or attach a file (max 20 MB)</label><input id="mtFile" type="file">
      <label class="f">Note</label><input id="mtNote" placeholder="Optional">
      <div style="height:10px"></div><button class="btn" onclick="addMaterial()">Publish</button></div>` : ''}
    <div class="card">${mats.length ? mats.map((m) => {
        const isFile = m.kind === 'file';
        const meta = isFile ? `${esc(m.fileName)} · ${((m.size || 0) / 1048576).toFixed(1)} MB` : esc(m.link);
        const action = isFile
            ? `<button class="btn sec sm" onclick="openFile('${m.id}')">Download</button>`
            : `<a class="btn sec sm" href="${esc(m.link)}" target="_blank" rel="noopener">Open</a>`;
        return `<div class="listrow"><div class="avatar">${isFile ? '📎' : '🔗'}</div>
        <div class="main"><b>${esc(m.title)}</b><small>${esc(m.note || '')} · ${meta} · by ${esc(m.by)}</small></div>${action}</div>`;
    }).join('') : '<div class="empty">No materials yet.</div>'}</div>`;
}
async function addMaterial() {
    const u = SESSION.get();
    const title = $('mtTitle').value;
    if (!title) {
        flash('err', 'Title required.');
        return;
    }
    const fileInput = $('mtFile');
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (file) {
        if (file.size > MAX_FILE) {
            flash('err', `File is ${(file.size / 1048576).toFixed(1)} MB — max 20 MB.`);
            return;
        }
        const id = 'mat_file_' + Date.now();
        try {
            await fileSave(id, file);
        }
        catch (e) {
            flash('err', 'Could not store the file on this device.');
            return;
        }
        STORE.add('materials', { id, title, note: $('mtNote').value, by: u.name, kind: 'file', fileName: file.name, size: file.size, mime: file.type });
    }
    else {
        STORE.add('materials', { title, note: $('mtNote').value, by: u.name, kind: 'link', link: $('mtLink').value || '#' });
    }
    flash('ok', 'Published.');
    render();
}
async function openFile(id) {
    const blob = await fileGet(id);
    if (!blob) {
        flash('err', 'File not found on this device.');
        return;
    }
    const mat = STORE.get('materials').find((m) => m.id === id);
    triggerDownload(blob, (mat === null || mat === void 0 ? void 0 : mat.fileName) || 'material');
}
/* ================= MODERATOR VIEWS ================= */
let SEL = null; // coordinator's currently opened teacher (performance detail)
function openTeacher(name) { SEL = name; render(); }
function closeTeacher() { SEL = null; render(); }
function mTeachers(u) {
    const ts = teachersOfMod(u.name);
    const sc = coordScore(u.name);
    return `<h1>My teachers</h1><p class="sub">${ts.length} teachers · ${schoolsOfMod(u.name).length} schools · tap a teacher for their trend</p>
    <div class="row" style="align-items:center;margin-bottom:12px">
      <span class="pill tag">My score: <b style="margin-left:4px">${sc != null ? sc.toFixed(1) : '—'}</b></span>
      <button class="btn sec sm right" onclick="reportCoordTeachers('${esc(u.name)}')">⬇ Download report</button>
    </div>
    <div class="card">${ts.map((t) => {
        const rag = teacherRag(t.name);
        const al = avgLate(t.name);
        return `<div class="listrow" style="cursor:pointer" onclick="openTeacher('${esc(t.name)}')"><div class="avatar">${initials(t.name)}</div>
        <div class="main"><b>${esc(t.name)}</b><small>${esc(schoolsOfTeacher(t).map((s) => s.name).join(', '))} · avg late ${al}m${rag.avg ? ' · score ' + rag.avg.toFixed(1) : ''}</small></div>
        ${ragPill(rag.key)}</div>`;
    }).join('')}</div>`;
}
// Performance trend for one teacher: every visit the coordinator logged, oldest→newest, with score deltas.
// Shared performance block (KPIs + visit history), used by the coordinator's teacher detail
// and by the teacher's own score tab — it's the teacher's own data either way.
function perfInner(name, emptyMsg) {
    var _a, _b;
    const fb = teacherFeedback(name).slice().reverse(); // oldest first
    const scored = fb.filter((f) => f.score != null);
    const first = (_a = scored[0]) === null || _a === void 0 ? void 0 : _a.score;
    const last = (_b = scored[scored.length - 1]) === null || _b === void 0 ? void 0 : _b.score;
    const trend = (first != null && last != null && scored.length > 1)
        ? (last > first + 0.1 ? '<span class="pill rag-green">Improving ↑</span>' : last < first - 0.1 ? '<span class="pill rag-red">Declining ↓</span>' : '<span class="pill tag">Steady →</span>')
        : '<span class="pill tag">Needs more visits</span>';
    let prev = null;
    const rows = fb.map((f) => {
        const s = f.score;
        const delta = (s != null && prev != null) ? s - prev : null;
        if (s != null)
            prev = s;
        const bar = s != null ? Math.round((s / 5) * 100) : 0;
        const dstr = delta == null ? '' : delta > 0.05 ? `<span style="color:var(--green)">▲ ${delta.toFixed(1)}</span>` : delta < -0.05 ? `<span style="color:var(--red)">▼ ${Math.abs(delta).toFixed(1)}</span>` : '<span class="note">no change</span>';
        return `<div class="q" style="padding:12px 0">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="flex:1;min-width:0"><b>${fmtD(f.date)}</b> <span class="note">· ${esc(STORE.school(f.school).name)} · ${esc(f.judgement.improvement)}</span></div>
        <div style="font-weight:800;white-space:nowrap">${s != null ? s.toFixed(1) : '—'} ${dstr}</div>
        ${ragPill(f.rag)}
      </div>
      <div style="height:8px;border-radius:5px;background:#eee;margin-top:8px;overflow:hidden"><div style="height:100%;width:${bar}%;background:var(--${f.rag})"></div></div>
    </div>`;
    }).join('');
    return `<div class="kpis" style="margin-bottom:14px">
      <div class="stat"><div class="n" style="font-size:15px;padding-top:8px">${trend}</div><div class="l">Trend</div></div>
      <div class="stat"><div class="n">${scored.length ? (scored.reduce((a, b) => a + b.score, 0) / scored.length).toFixed(1) : '—'}</div><div class="l">Avg score</div></div>
      <div class="stat"><div class="n">${avgLateWindow(name, 'week')}m</div><div class="l">Delay · week</div></div>
      <div class="stat"><div class="n">${avgLateWindow(name, 'month')}m</div><div class="l">Delay · month</div></div>
    </div>
    <h2>Visit history</h2>
    <div class="card">${fb.length ? rows : `<div class="empty">${emptyMsg}</div>`}</div>`;
}
function mTeacherDetail(name) {
    const t = STORE.teacher(name);
    return `<button class="btn sec sm" onclick="closeTeacher()">← All teachers</button>
    <h1 style="margin-top:12px">${esc(name)}</h1><p class="sub">${esc(schoolsOfTeacher(t).map((s) => s.name).join(', '))}</p>
    ${perfInner(name, 'No visits yet. Log a visit from the Visit tab.')}`;
}
function tScore(u) {
    return `<h1>My performance</h1><p class="sub">Your ongoing score from coordinator classroom visits.</p>
    ${perfInner(u.name, 'No visits yet. Your coordinator will rate you during school visits.')}`;
}
function mVisit(u) {
    const schools = schoolsOfMod(u.name);
    return `<h1>Do a visit</h1><p class="sub">The feedback form unlocks only inside the school geofence (${CONFIG.geofenceMeters} m).</p>
    <div class="card"><label class="f">School</label>
      <select id="vSchool">${schools.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
      <div style="height:10px"></div>
      <button class="btn" onclick="unlockVisit()">📍 Verify I'm at this school</button>
      <p class="note" style="margin-top:8px">Tip: if a school's geofence isn't set, you'll be asked to set it to your current location (one-time, on-site).</p>
    </div>
    <h2>Recent visits</h2><div class="card">${STORE.get('feedback').filter((f) => f.mod === u.name).slice(-8).reverse().map(visitRow).join('') || '<div class="empty">No visits logged yet.</div>'}</div>`;
}
function visitRow(f) {
    return `<div class="listrow"><div class="avatar">${initials(f.teacher)}</div>
    <div class="main"><b>${esc(f.teacher)}</b><small>${esc(STORE.school(f.school).name)} · ${fmtD(f.date)} · score ${f.score ? f.score.toFixed(1) : '—'}</small></div>${ragPill(f.rag)}</div>`;
}
async function unlockVisit() {
    const school = STORE.school($('vSchool').value);
    flash('warn', 'Verifying location at ' + school.name + '…');
    try {
        const g = await atSchool(school);
        if (!g) {
            flash('warn', 'Cancelled.');
            return;
        }
        if (!g.ok) {
            flash('err', `You are ${Math.round(g.dist)} m away — must be within ${CONFIG.geofenceMeters} m to open the form.`);
            return;
        }
        VISIT = { school: school.id, teacher: null, ratings: {}, critical: {}, judgement: {}, step: 'pickTeacher' };
        render();
    }
    catch (e) {
        flash('err', e.message);
    }
}
/* ---- feedback form (unlocked) ---- */
let VISIT = null;
function mForm() {
    const v = VISIT;
    const school = STORE.school(v.school);
    if (v.step === 'pickTeacher') {
        const ts = teachersAtSchool(school.id);
        return `<h1>${esc(school.name)}</h1><div class="banner ok">✓ Location verified. Pick the teacher you observed.</div>
      <div class="card">${ts.map((t) => `<div class="listrow"><div class="avatar">${initials(t.name)}</div><div class="main"><b>${esc(t.name)}</b></div>
        <button class="btn sec sm" onclick="pickVisitTeacher('${esc(t.name)}')">Select</button></div>`).join('')}</div>
      <button class="btn sec" onclick="cancelVisit()">Cancel visit</button>`;
    }
    const rq = (id, label) => `<div class="q"><div class="qt">${esc(label)}</div>
    <div class="rate">${CONFIG.ratingScale.map((r) => `<button title="${r.label}" onclick="setRate(this,'${id}',${r.v})">${r.v}</button>`).join('')}
    <button class="na" onclick="setRate(this,'${id}','na')">N/A</button></div></div>`;
    // Critical standards use the same one-tap segmented control as the ratings (consistent input).
    const cq = (id, label, opts) => `<div class="q"><div class="qt">${esc(label)}</div>
    <div class="rate">${opts.map((o) => { const cls = o === 'Yes' ? 'yes' : o === 'No' ? 'no' : ''; return `<button class="${cls}${v.critical[id] === o ? ' on' : ''}" onclick="setCritical(this,'${id}','${o}')">${o}</button>`; }).join('')}</div></div>`;
    return `<h1>Feedback · ${esc(v.teacher)}</h1><p class="sub">${esc(school.name)} · ${todayStr()}</p>
    <div class="card"><div class="row"><div style="flex:1"><label class="f">Grade/Batch</label><select id="vGrade">${CONFIG.grades.map((g) => `<option>${g}</option>`).join('')}</select></div>
      <div style="flex:1"><label class="f">Module</label><select id="vModule">${CONFIG.modules.map((m) => `<option>${m}</option>`).join('')}</select></div>
      <div style="flex:1"><label class="f">Students present</label><input id="vStudents" type="number" min="0" value="0"></div></div></div>
    <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:12px">
      <div><div style="font-weight:700">Auto status (RAG)</div><div class="note">Calculated live from your ratings & critical standards — not chosen manually.</div></div>
      <span id="ragLive">${ragLiveHtml(v)}</span>
    </div>
    ${CONFIG.pillars.map((p) => `<h2>${p.id} · ${p.name}</h2><div class="card">${p.q.map((q) => rq(q[0], q[0] + '. ' + q[1])).join('')}</div>`).join('')}
    <h2>Critical standards</h2><div class="card">${CONFIG.critical.map((c) => cq(c[0], c[0] + '. ' + c[1], c[2])).join('')}</div>
    <h2>Coordinator judgement</h2><div class="card">
      <label class="f">Comfortable with teacher handling this class independently?</label>
      <select id="jInd">${CONFIG.judgement.independence.map((o) => `<option>${o}</option>`).join('')}</select>
      <label class="f">Main improvement area</label><select id="jImp">${CONFIG.judgement.improvement.map((o) => `<option>${o}</option>`).join('')}</select>
      <label class="f">Action required</label><select id="jAct">${CONFIG.judgement.action.map((o) => `<option>${o}</option>`).join('')}</select>
      <label class="f">Observation / evidence (brief)</label><textarea id="jNote" placeholder="One short example, especially for a 1 or 2"></textarea>
    </div>
    <button class="btn" onclick="submitVisit()">Submit feedback</button>
    <button class="btn sec sm" style="margin-top:8px" onclick="backToPickTeacher()">Back</button>`;
}
// Live RAG preview: amber default once there's input; blank until the moderator rates anything.
function ragLiveHtml(v) {
    const hasInput = Object.values(v.ratings).some((x) => typeof x === 'number') || Object.values(v.critical).some((x) => x && x !== '');
    return hasInput ? ragPill(computeRag(v.ratings, v.critical)) : '<span class="pill tag">Awaiting input</span>';
}
function updateRagLive() { const el = document.getElementById('ragLive'); if (el && VISIT)
    el.innerHTML = ragLiveHtml(VISIT); }
function pickVisitTeacher(name) { VISIT.teacher = name; VISIT.step = 'form'; render(); }
function backToPickTeacher() { VISIT.step = 'pickTeacher'; render(); }
function cancelVisit() { VISIT = null; render(); }
// Both inputs toggle in place (no re-render, so other fields aren't wiped) and refresh the live RAG.
function setCritical(btn, id, value) {
    VISIT.critical[id] = value;
    btn.parentElement.querySelectorAll('button').forEach((b) => b.classList.remove('on'));
    btn.classList.add('on');
    updateRagLive();
}
function setRate(btn, id, v) {
    VISIT.ratings[id] = v;
    btn.parentElement.querySelectorAll('button').forEach((b) => b.classList.remove('on'));
    btn.classList.add('on');
    updateRagLive();
}
function submitVisit() {
    const u = SESSION.get();
    const v = VISIT;
    const ratings = {};
    Object.entries(v.ratings).forEach(([k, val]) => { if (typeof val === 'number')
        ratings[k] = val; });
    const safety = v.critical['N9'] === 'Yes';
    const fb = {
        mod: u.name, teacher: v.teacher, school: v.school, date: todayStr(),
        grade: $('vGrade').value, module: $('vModule').value, students: +$('vStudents').value || 0,
        ratings, critical: v.critical,
        judgement: { independence: $('jInd').value, improvement: $('jImp').value, action: $('jAct').value },
        rag: computeRag(v.ratings, v.critical), note: $('jNote').value, safety, score: null,
    };
    fb.score = visitScore(fb);
    STORE.add('feedback', fb);
    // Auto-complete a matching planned visit (same coordinator, school, today).
    const plan = STORE.get('plans').find((p) => p.mod === u.name && p.school === fb.school && p.date === fb.date && p.status === 'Planned');
    if (plan)
        STORE.update('plans', plan.id, { status: 'Done' });
    VISIT = null;
    flash('ok', `Feedback saved${safety ? ' · ⚠ SAFETY concern flagged for escalation' : ''}.`);
    render();
}
function mLeaves(u) {
    const ls = STORE.get('leaves').filter((l) => l.mod === u.name).sort((a, b) => (a.status === 'Pending' ? -1 : 1));
    const rs = STORE.get('requests').filter((r) => r.mod === u.name);
    return `<h1>Leave requests</h1><div class="card">${ls.length ? ls.map((l) => leaveRow(l, true)).join('') : '<div class="empty">No leave requests.</div>'}</div>
    <h2>Component requests</h2><div class="card">${rs.length ? rs.map((r) => reqRow(r, true)).join('') : '<div class="empty">No requests.</div>'}</div>`;
}
function mTasks(u) {
    const ts = teachersOfMod(u.name);
    const all = STORE.get('tasks').filter((x) => ts.some((t) => t.name === x.teacher)).slice().reverse();
    return `<h1>Assign tasks</h1>
    <div class="card"><label class="f">Teacher</label><select id="tkWho">${ts.map((t) => `<option>${esc(t.name)}</option>`).join('')}</select>
      <label class="f">Task title</label><input id="tkTitle" placeholder="e.g. Submit Module 3 lesson plan">
      <label class="f">Detail</label><input id="tkDetail" placeholder="Optional">
      <label class="f">Due</label><input id="tkDue" type="date">
      <div style="height:10px"></div><button class="btn" onclick="addTask()">Push task</button></div>
    <h2>Assigned</h2><div class="card">${all.length ? all.map((x) => `<div class="listrow"><div class="main"><b>${esc(x.title)}</b><small>${esc(x.teacher)} ${x.due ? '· due ' + fmtD(x.due) : ''}</small></div>
      <span class="pill ${x.status === 'Done' ? 'rag-green' : 'tag'}">${x.status}</span></div>`).join('') : '<div class="empty">No tasks yet.</div>'}</div>`;
}
function addTask() {
    const u = SESSION.get();
    if (!$('tkTitle').value) {
        flash('err', 'Title required.');
        return;
    }
    STORE.add('tasks', { teacher: $('tkWho').value, title: $('tkTitle').value, detail: $('tkDetail').value, due: $('tkDue').value, by: u.name, status: 'Assigned' });
    flash('ok', 'Task pushed.');
    render();
}
function mCalendar(u) {
    const schools = schoolsOfMod(u.name);
    const plans = STORE.get('plans').filter((p) => p.mod === u.name).sort((a, b) => a.date.localeCompare(b.date));
    const upcoming = plans.filter((p) => p.status === 'Planned' && p.date >= todayStr());
    const past = plans.filter((p) => p.status === 'Done' || p.date < todayStr());
    const visits = STORE.get('feedback').filter((f) => f.mod === u.name).sort((a, b) => b.date.localeCompare(a.date));
    const leaves = STORE.get('leaves').filter((l) => l.mod === u.name && l.status === 'Approved');
    const planRow = (p, done) => `<div class="listrow"><div class="main"><b>${esc(STORE.school(p.school).name)}</b><small>${fmtD(p.date)}${p.note ? ' · ' + esc(p.note) : ''}</small></div>
    <div class="actions">${done ? `<span class="pill ${p.status === 'Done' ? 'rag-green' : 'tag'}">${p.status === 'Done' ? 'Done' : 'Missed'}</span>`
        : `<button class="btn sec sm" onclick="donePlan('${p.id}')">Done</button><button class="btn sec sm" onclick="delPlan('${p.id}')">✕</button>`}</div></div>`;
    return `<h1>Calendar</h1><p class="sub">Plan your school visits for the month.</p>
    <div class="card"><h2 style="margin-top:0">Plan a visit</h2>
      <label class="f">School</label><select id="plSchool">${schools.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
      <div class="row"><div style="flex:1"><label class="f">Date</label><input type="date" id="plDate" value="${todayStr()}" min="${todayStr()}"></div></div>
      <label class="f">Note</label><input id="plNote" placeholder="Optional — e.g. observe Module 3">
      <div style="height:10px"></div><button class="btn" onclick="addPlan()">Add to plan</button></div>
    <h2>Planned (${upcoming.length})</h2><div class="card">${upcoming.length ? upcoming.map((p) => planRow(p, false)).join('') : '<div class="empty">No visits planned. Add one above.</div>'}</div>
    ${past.length ? `<h2>Past plans</h2><div class="card">${past.map((p) => planRow(p, true)).join('')}</div>` : ''}
    <h2>Visit log</h2><div class="card">${visits.length ? visits.map(visitRow).join('') : '<div class="empty">No visits yet.</div>'}</div>
    <h2>Approved leave</h2><div class="card">${leaves.length ? leaves.map((l) => `<div class="listrow"><div class="main"><b>${esc(l.teacher)}</b><small>${esc(l.type)}</small></div><span class="tag">${fmtD(l.from)}–${fmtD(l.to)}</span></div>`).join('') : '<div class="empty">None.</div>'}</div>`;
}
function addPlan() {
    const u = SESSION.get();
    STORE.add('plans', { mod: u.name, school: $('plSchool').value, date: $('plDate').value, note: $('plNote').value, status: 'Planned' });
    flash('ok', 'Visit added to your plan.');
    render();
}
function donePlan(id) { STORE.update('plans', id, { status: 'Done' }); render(); }
function delPlan(id) { STORE.remove('plans', id); render(); }
/* ================= CEO / OUTSIGHT VIEWS ================= */
function ragCounts(teachers) {
    const c = { green: 0, amber: 0, red: 0, none: 0 };
    teachers.forEach((t) => { c[teacherRag(t.name).key]++; });
    return c;
}
function cOverview() {
    const ts = STORE.get('teachers');
    const c = ragCounts(ts);
    const visits = STORE.get('feedback');
    const safety = visits.filter((f) => f.safety);
    const actionable = visits.filter((f) => f.rag === 'red' || f.rag === 'amber');
    return `<h1>Network overview</h1><p class="sub">Robobox quality engine · all schools</p>
    <div class="kpis">
      <div class="stat"><div class="n">${ts.length}</div><div class="l">Teachers</div></div>
      <div class="stat"><div class="n">${STORE.get('schools').length}</div><div class="l">Schools</div></div>
      <div class="stat"><div class="n">${STORE.get('moderators').length}</div><div class="l">Coordinators</div></div>
      <div class="stat"><div class="n">${visits.length}</div><div class="l">Visits done</div></div>
    </div>
    <h2>Teacher RAG distribution</h2>
    <div class="card"><div class="row">
      <div class="stat" style="flex:1"><div class="n" style="color:var(--green)">${c.green}</div><div class="l">Green</div></div>
      <div class="stat" style="flex:1"><div class="n" style="color:var(--amber)">${c.amber}</div><div class="l">Amber</div></div>
      <div class="stat" style="flex:1"><div class="n" style="color:var(--red)">${c.red}</div><div class="l">Red</div></div>
      <div class="stat" style="flex:1"><div class="n" style="color:var(--muted)">${c.none}</div><div class="l">Unrated</div></div>
    </div></div>
    ${safety.length ? `<div class="banner err" style="margin-top:14px">⚠ ${safety.length} open safety concern(s) flagged — require immediate escalation.</div>` : ''}
    <h2>Actionables (${actionable.length})</h2><div class="card">${actionable.length ? actionable.slice(-10).reverse().map((f) => `<div class="listrow">${ragPill(f.rag)}
      <div class="main"><b>${esc(f.teacher)}</b><small>${esc(STORE.school(f.school).name)} · ${esc(f.judgement.action)} · ${fmtD(f.date)}</small></div></div>`).join('') : '<div class="empty">No amber/red actionables.</div>'}</div>`;
}
function cTeachers() {
    const order = { red: 0, amber: 1, green: 2, none: 3 };
    const ts = STORE.get('teachers').map((t) => ({ t, rag: teacherRag(t.name) }))
        .sort((a, b) => order[a.rag.key] - order[b.rag.key]);
    return `<h1>All teachers</h1><p class="sub">Sorted by risk (red first)</p>
    <div class="row" style="margin-bottom:12px"><button class="btn sec sm" onclick="reportAllTeachers()">⬇ Teachers CSV</button><button class="btn sec sm" onclick="reportVisits()">⬇ Visit log (over time)</button></div>
    <div class="card scrollx"><table class="mini"><tr><th>Teacher</th><th>Coordinator</th><th>Visits</th><th>Score</th><th>Growth</th><th>RAG</th></tr>
    ${ts.map(({ t, rag }) => { const g = teacherGrowth(t.name); return `<tr><td><b>${esc(t.name)}</b></td><td>${esc(t.mod)}</td><td>${rag.visits}</td><td>${rag.avg ? rag.avg.toFixed(1) : '—'}</td><td>${g == null ? '—' : (g > 0 ? '+' : '') + g.toFixed(1)}</td><td>${ragPill(rag.key)}</td></tr>`; }).join('')}
    </table></div>`;
}
function cModerators() {
    return `<h1>Coordinator performance</h1>
    <div class="row" style="margin-bottom:12px"><button class="btn sec sm" onclick="reportCoords()">⬇ Coordinators CSV</button></div>
    <div class="card scrollx"><table class="mini"><tr><th>Coordinator</th><th>Teachers</th><th>Schools</th><th>Visits</th><th>Score</th><th>Pending</th></tr>
    ${STORE.get('moderators').map((m) => {
        const ts = teachersOfMod(m);
        const visits = STORE.get('feedback').filter((f) => f.mod === m);
        const sc = coordScore(m);
        const pending = STORE.get('leaves').filter((l) => l.mod === m && l.status === 'Pending').length + STORE.get('requests').filter((r) => r.mod === m && r.status === 'Open').length;
        return `<tr><td><b>${esc(m)}</b></td><td>${ts.length}</td><td>${schoolsOfMod(m).length}</td><td>${visits.length}</td><td>${sc != null ? sc.toFixed(1) : '—'}</td><td>${pending || '—'}</td></tr>`;
    }).join('')}</table></div>
    <p class="note" style="margin-top:10px">Coordinator score = average of their teachers' scores. Coverage = visits ÷ teachers.</p>`;
}
/* ================= report downloads (CSV) ================= */
function reportCoordTeachers(mod) {
    const rows = [['Teacher', 'Schools', 'Visits', 'Avg score', 'Latest RAG', 'Growth', 'Avg delay (min)']];
    teachersOfMod(mod).forEach((t) => {
        const r = teacherRag(t.name);
        const g = teacherGrowth(t.name);
        rows.push([t.name, schoolsOfTeacher(t).map((s) => s.name).join('; '), r.visits, r.avg != null ? r.avg.toFixed(2) : '', r.key === 'none' ? 'Unrated' : r.key, g != null ? g.toFixed(2) : '', avgLate(t.name)]);
    });
    downloadCSV(`robobox-${mod}-teachers.csv`, rows);
}
function reportAllTeachers() {
    const rows = [['Teacher', 'Coordinator', 'Schools', 'Visits', 'Avg score', 'Latest RAG', 'Growth', 'Avg delay (min)']];
    STORE.get('teachers').forEach((t) => {
        const r = teacherRag(t.name);
        const g = teacherGrowth(t.name);
        rows.push([t.name, t.mod, schoolsOfTeacher(t).map((s) => s.name).join('; '), r.visits, r.avg != null ? r.avg.toFixed(2) : '', r.key === 'none' ? 'Unrated' : r.key, g != null ? g.toFixed(2) : '', avgLate(t.name)]);
    });
    downloadCSV('robobox-all-teachers.csv', rows);
}
function reportCoords() {
    const rows = [['Coordinator', 'Teachers', 'Schools', 'Visits', 'Coordinator score', 'Pending']];
    STORE.get('moderators').forEach((m) => {
        const sc = coordScore(m);
        const pending = STORE.get('leaves').filter((l) => l.mod === m && l.status === 'Pending').length + STORE.get('requests').filter((rq) => rq.mod === m && rq.status === 'Open').length;
        rows.push([m, teachersOfMod(m).length, schoolsOfMod(m).length, STORE.get('feedback').filter((f) => f.mod === m).length, sc != null ? sc.toFixed(2) : '', pending]);
    });
    downloadCSV('robobox-coordinators.csv', rows);
}
function reportVisits() {
    const rows = [['Date', 'Coordinator', 'Teacher', 'School', 'Grade', 'Module', 'Students', 'Score', 'RAG', 'Improvement', 'Action']];
    STORE.get('feedback').slice().sort((a, b) => a.date.localeCompare(b.date)).forEach((f) => {
        var _a;
        rows.push([f.date, f.mod, f.teacher, ((_a = STORE.school(f.school)) === null || _a === void 0 ? void 0 : _a.name) || f.school, f.grade, f.module, f.students, f.score != null ? f.score.toFixed(2) : '', f.rag, f.judgement.improvement, f.judgement.action]);
    });
    downloadCSV('robobox-visits-timeseries.csv', rows);
}
const ROLE_TABS = {
    teacher: [
        { id: 'home', label: 'Home', ic: '🏠' }, { id: 'score', label: 'Score', ic: '📈' },
        { id: 'att', label: 'Attend', ic: '📅' }, { id: 'leave', label: 'Leave', ic: '🌴' },
        { id: 'req', label: 'Requests', ic: '📦' }, { id: 'mat', label: 'Materials', ic: '📚' },
    ],
    mod: [
        { id: 'teachers', label: 'Teachers', ic: '👥' }, { id: 'visit', label: 'Visit', ic: '📍' },
        { id: 'leaves', label: 'Approvals', ic: '✅' }, { id: 'tasks', label: 'Tasks', ic: '📝' },
        { id: 'cal', label: 'Calendar', ic: '🗓️' }, { id: 'mat', label: 'Materials', ic: '📚' },
    ],
    ceo: [
        { id: 'overview', label: 'Overview', ic: '📊' }, { id: 'teachers', label: 'Teachers', ic: '👥' },
        { id: 'mods', label: 'Coordinators', ic: '🧭' }, { id: 'mat', label: 'Materials', ic: '📚' },
    ],
};
const VIEWS = {
    teacher: { home: tHome, score: tScore, att: tAttendance, leave: tLeave, req: tRequests, mat: materialsView },
    mod: { teachers: (u) => SEL ? mTeacherDetail(SEL) : mTeachers(u), visit: (u) => VISIT ? mForm() : mVisit(u), leaves: mLeaves, tasks: mTasks, cal: mCalendar, mat: materialsView },
    ceo: { overview: cOverview, teachers: cTeachers, mods: cModerators, mat: materialsView },
};
render();
