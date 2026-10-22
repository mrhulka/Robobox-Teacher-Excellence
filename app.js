'use strict';
/* Robobox Teacher Excellence Portal — single-file app logic.
   No framework / no build step (lazy, deploys on any static host). */

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtT = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtD = (d) => d ? new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short' }) : '—';
const initials = (n) => n.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();

/* ---------- session ---------- */
const SESSION = {
  get() { try { return JSON.parse(localStorage.getItem('robobox_session')); } catch (e) { return null; } },
  set(u) { localStorage.setItem('robobox_session', JSON.stringify(u)); },
  clear() { localStorage.removeItem('robobox_session'); },
};

/* ---------- geofence (native Geolocation + haversine) ---------- */
function haversine(a, b) { // meters between {lat,lng}
  const R = 6371000, toR = (d) => d * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function getPos() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('Geolocation not supported on this device.'));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      (e) => rej(new Error(e.code === 1 ? 'Location permission denied. Allow location to continue.' : 'Could not get your location. Try again outdoors.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  });
}
// One GPS read. If the school has no geofence yet, offer to set it to the measured point
// (on-site, one-time) — reusing this exact fix avoids a second GPS read. Returns {ok,dist} or null if aborted.
async function atSchool(school) {
  const pos = await getPos();
  if (school.lat == null) {
    if (!confirm(`${school.name} has no geofence yet. Set it to your current location now?`)) return null;
    STORE.setSchoolLoc(school.id, pos.lat, pos.lng);
  }
  const dist = haversine(pos, { lat: school.lat, lng: school.lng });
  return { ok: dist <= CONFIG.geofenceMeters, dist };
}

/* ---------- RAG / scoring ---------- */
function visitScore(fb) {
  const vals = Object.values(fb.ratings || {}).filter((v) => typeof v === 'number');
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
function teacherFeedback(name) {
  return STORE.get('feedback').filter((f) => f.teacher.toLowerCase() === name.toLowerCase())
    .sort((a, b) => b.date.localeCompare(a.date));
}
function teacherRag(name) { // -> {key:'green|amber|red|none', avg}
  const fb = teacherFeedback(name);
  if (!fb.length) return { key: 'none', avg: null, visits: 0 };
  const scores = fb.map(visitScore).filter((x) => x != null);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  return { key: fb[0].rag, avg, visits: fb.length };
}
const ragPill = (key) => key === 'none'
  ? '<span class="pill tag">Not yet rated</span>'
  : `<span class="pill rag-${key}"><span class="dot ${key}"></span>${key[0].toUpperCase() + key.slice(1)}</span>`;

/* ---------- attendance ---------- */
function teacherAtt(name) { return STORE.get('attendance').filter((a) => a.teacher.toLowerCase() === name.toLowerCase()).sort((a, b) => b.date.localeCompare(a.date)); }
function openPunch(name) { return teacherAtt(name).find((a) => a.date === todayStr() && !a.outTime); }
function lateMins(iso) {
  const [h, m] = CONFIG.expectedStart.split(':').map(Number);
  const t = new Date(iso); const exp = new Date(t); exp.setHours(h, m, 0, 0);
  return Math.max(0, Math.round((t - exp) / 60000));
}
function avgLate(name) {
  const recs = teacherAtt(name).filter((a) => a.inTime);
  if (!recs.length) return 0;
  return Math.round(recs.reduce((s, a) => s + (a.inLate || 0), 0) / recs.length);
}

/* ---------- small UI helpers ---------- */
let BANNER = '';
function banner(kind, msg) { BANNER = `<div class="banner ${kind}">${esc(msg)}</div>`; render(); setTimeout(() => { BANNER = ''; }, 100); }
function flash(kind, msg) { const el = $('flash'); if (el) el.innerHTML = `<div class="banner ${kind}">${esc(msg)}</div>`; }
function schoolsOfTeacher(t) { return (t.schools || []).map((id) => STORE.school(id)).filter(Boolean); }
function schoolsOfMod(mod) { return STORE.get('schools').filter((s) => s.mod.toLowerCase() === mod.toLowerCase()); }
function teachersOfMod(mod) { return STORE.get('teachers').filter((t) => t.mod.toLowerCase() === mod.toLowerCase()); }
function teachersAtSchool(id) { const s = STORE.school(id); return (s ? s.teachers : []).map((n) => STORE.teacher(n)).filter(Boolean); }

/* ================= ROUTER ================= */
let TAB = {};
function go(tab) { const u = SESSION.get(); TAB[u.role] = tab; render(); }
function render() {
  const u = SESSION.get();
  const app = $('app');
  if (!u) { app.innerHTML = viewLogin(); return; }
  const tabs = ROLE_TABS[u.role];
  const active = TAB[u.role] || tabs[0].id;
  app.innerHTML = `
    <div class="topbar">
      <span class="logo">THE <b>ROBOBOX</b></span>
      <nav class="topnav">${tabs.map((t) => `<button class="${t.id === active ? 'on' : ''}" onclick="go('${t.id}')">${t.label}</button>`).join('')}</nav>
      <span class="who">${esc(u.name)}<small>${u.role === 'mod' ? 'Moderator' : u.role === 'ceo' ? 'CEO / Outsight' : 'Teacher'}</small></span>
      <button class="out" onclick="logout()">Exit</button>
    </div>
    <div class="wrap"><div id="flash"></div>${VIEWS[u.role][active](u)}</div>
    <nav class="tabbar">${tabs.map((t) => `<a class="${t.id === active ? 'on' : ''}" href="javascript:go('${t.id}')"><span class="ic">${t.ic}</span>${t.label}</a>`).join('')}</nav>`;
}
function logout() { SESSION.clear(); TAB = {}; render(); }

/* ================= LOGIN ================= */
let LOGIN = { role: null };
function viewLogin() {
  if (!LOGIN.role) {
    return `<div class="login"><div class="hero"><div class="robo">🤖</div>
      <h1 style="margin:.3em 0">Teacher Excellence Portal</h1>
      <p class="sub">One Robobox classroom, delivered consistently.</p></div>
      ${BANNER}
      <div class="card">
        <button class="btn" onclick="pickRole('teacher')">👩‍🏫 I'm a Teacher</button>
        <div style="height:10px"></div>
        <button class="btn sec" onclick="pickRole('mod')">🧭 I'm a Moderator</button>
        <div style="height:10px"></div>
        <button class="btn sec" onclick="pickRole('ceo')">📊 CEO / Outsight team</button>
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
        <button class="btn sec sm" style="margin-top:8px" onclick="LOGIN={role:null};render()">Back</button>
      </div></div>`;
  }
  if (LOGIN.role === 'mod') {
    return `<div class="login"><div class="hero"><div class="robo">🧭</div><h1>Moderator sign in</h1></div>${BANNER}
      <div class="card"><label class="f">Your name</label>
        <select id="who">${STORE.get('moderators').map((m) => `<option>${esc(m)}</option>`).join('')}</select>
        <div style="height:12px"></div>
        <button class="btn" onclick="doLogin('mod')">Continue</button>
        <button class="btn sec sm" style="margin-top:8px" onclick="LOGIN={role:null};render()">Back</button>
      </div></div>`;
  }
  return `<div class="login"><div class="hero"><div class="robo">📊</div><h1>CEO / Outsight</h1></div>${BANNER}
    <div class="card"><p class="sub">Network-wide view of teacher & moderator performance.</p>
      <button class="btn" onclick="doLogin('ceo')">Enter dashboard</button>
      <button class="btn sec sm" style="margin-top:8px" onclick="LOGIN={role:null};render()">Back</button>
    </div></div>`;
}
function pickRole(r) { LOGIN = { role: r }; render(); }
function doLogin(role) {
  const name = role === 'ceo' ? 'Outsight' : $('who').value;
  const u = { role, name };
  if (role === 'teacher') { const t = STORE.teacher(name); u.mod = t.mod; }
  SESSION.set(u); LOGIN = { role: null }; render();
}

/* ================= TEACHER VIEWS ================= */
async function punch(kind) {
  const u = SESSION.get(); const t = STORE.teacher(u.name);
  const schools = schoolsOfTeacher(t);
  const sel = $('punchSchool'); const school = STORE.school(sel ? sel.value : schools[0].id);
  flash('warn', 'Checking you are within 200 m of ' + school.name + '…');
  try {
    const g = await atSchool(school);
    if (!g) { flash('warn', 'Cancelled.'); return; }
    if (!g.ok) { flash('err', `You are ${Math.round(g.dist)} m from ${school.name}. Must be within ${CONFIG.geofenceMeters} m.`); return; }
    if (kind === 'in') {
      const now = new Date().toISOString(); const lm = lateMins(now);
      STORE.add('attendance', { teacher: u.name, date: todayStr(), inTime: now, inSchool: school.id, inLate: lm, inDist: Math.round(g.dist) });
      flash('ok', `Logged in at ${school.name}${lm ? ` · ${lm} min late` : ' · on time'}.`);
    } else {
      const open = openPunch(u.name);
      if (!open) { flash('err', 'No open session to log out from.'); return; }
      STORE.update('attendance', open.id, { outTime: new Date().toISOString(), outSchool: school.id, outDist: Math.round(g.dist) });
      flash('ok', `Logged out at ${school.name}.`);
    }
    render();
  } catch (e) { flash('err', e.message); }
}
function tHome(u) {
  const t = STORE.teacher(u.name); const schools = schoolsOfTeacher(t);
  const open = openPunch(u.name); const rag = teacherRag(u.name);
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
  return `<h1>My attendance</h1><p class="sub">Expected start ${CONFIG.expectedStart} · avg late ${avgLate(u.name)} min</p>
    <div class="card">${recs.length ? `<table class="mini"><tr><th>Date</th><th>In</th><th>Out</th><th>Late</th><th>School</th></tr>
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
    <h2>My requests</h2><div class="card">${mine.length ? mine.map(leaveRow).join('') : '<div class="empty">No leave requests.</div>'}</div>`;
}
function leaveRow(l, forMod) {
  const cls = l.status === 'Approved' ? 'rag-green' : l.status === 'Rejected' ? 'rag-red' : 'tag';
  return `<div class="listrow"><div class="main"><b>${esc(l.type)} · ${fmtD(l.from)}–${fmtD(l.to)}</b><small>${esc(l.reason || '')}${forMod ? ' · ' + esc(l.teacher) : ''}</small></div>
    <span class="pill ${cls}">${l.status}</span>
    ${forMod && l.status === 'Pending' ? `<button class="btn sec sm" onclick="setLeave('${l.id}','Approved')">✓</button><button class="btn sec sm" onclick="setLeave('${l.id}','Rejected')">✗</button>` : ''}
    ${!forMod && l.status === 'Pending' ? `<button class="btn sec sm" onclick="setLeave('${l.id}','Cancelled')">Withdraw</button>` : ''}</div>`;
}
function submitLeave() {
  const u = SESSION.get();
  STORE.add('leaves', { teacher: u.name, mod: u.mod, type: $('lvType').value, from: $('lvFrom').value, to: $('lvTo').value, reason: $('lvReason').value, status: 'Pending' });
  flash('ok', 'Leave request submitted.'); render();
}
function setLeave(id, status) { STORE.update('leaves', id, { status }); render(); }

function tRequests(u) {
  const mine = STORE.get('requests').filter((r) => r.teacher === u.name).sort((a, b) => (b.id).localeCompare(a.id));
  return `<h1>Component requests</h1><p class="sub">Raise requisitions for kits/components needed per project.</p>
    <div class="card"><label class="f">Project</label><input id="rqProj" placeholder="e.g. Line-follower robot">
      <label class="f">Category</label><select id="rqCat">${CONFIG.requestCategories.map((x) => `<option>${x}</option>`).join('')}</select>
      <div class="row"><div style="flex:3"><label class="f">Items needed</label><input id="rqItems" placeholder="e.g. IR sensors, L298N driver"></div>
      <div style="flex:1"><label class="f">Qty</label><input id="rqQty" type="number" value="1" min="1"></div></div>
      <label class="f">Note</label><textarea id="rqNote" placeholder="Optional"></textarea>
      <div style="height:10px"></div><button class="btn" onclick="submitReq()">Raise request</button></div>
    <h2>My requests</h2><div class="card">${mine.length ? mine.map(reqRow).join('') : '<div class="empty">No requests yet.</div>'}</div>`;
}
function reqRow(r, forMod) {
  const cls = r.status === 'Fulfilled' ? 'rag-green' : r.status === 'Approved' ? 'rag-amber' : 'tag';
  return `<div class="listrow"><div class="main"><b>${esc(r.items)} ×${r.qty}</b><small>${esc(r.project)} · ${esc(r.category)}${forMod ? ' · ' + esc(r.teacher) : ''}</small></div>
    <span class="pill ${cls}">${r.status}</span>
    ${forMod && r.status !== 'Fulfilled' ? `<button class="btn sec sm" onclick="setReq('${r.id}','${r.status === 'Open' ? 'Approved' : 'Fulfilled'}')">${r.status === 'Open' ? 'Approve' : 'Mark fulfilled'}</button>` : ''}</div>`;
}
function submitReq() {
  const u = SESSION.get();
  STORE.add('requests', { teacher: u.name, mod: u.mod, project: $('rqProj').value, category: $('rqCat').value, items: $('rqItems').value, qty: +$('rqQty').value || 1, note: $('rqNote').value, status: 'Open' });
  flash('ok', 'Request raised.'); render();
}
function setReq(id, status) { STORE.update('requests', id, { status }); render(); }

function materialsView(u) {
  const mats = STORE.get('materials').slice().reverse();
  const canAdd = u.role === 'mod' || u.role === 'ceo';
  return `<h1>Materials</h1><p class="sub">Handbook, curriculum & resources from Robobox.</p>
    ${canAdd ? `<div class="card"><h2 style="margin-top:0">Add material</h2>
      <label class="f">Title</label><input id="mtTitle" placeholder="e.g. Teacher Handbook v2">
      <label class="f">Link (Drive / URL)</label><input id="mtLink" placeholder="https://…">
      <label class="f">Note</label><input id="mtNote" placeholder="Optional">
      <div style="height:10px"></div><button class="btn" onclick="addMaterial()">Publish</button></div>` : ''}
    <div class="card">${mats.length ? mats.map((m) => `<div class="listrow"><div class="avatar">📄</div>
      <div class="main"><b>${esc(m.title)}</b><small>${esc(m.note || '')} · by ${esc(m.by)}</small></div>
      <a class="btn sec sm" href="${esc(m.link)}" target="_blank" rel="noopener">Open</a></div>`).join('') : '<div class="empty">No materials yet.</div>'}</div>`;
}
function addMaterial() {
  const u = SESSION.get();
  if (!$('mtTitle').value) return flash('err', 'Title required.');
  STORE.add('materials', { title: $('mtTitle').value, link: $('mtLink').value || '#', note: $('mtNote').value, by: u.name });
  flash('ok', 'Published.'); render();
}

/* ================= MODERATOR VIEWS ================= */
function mTeachers(u) {
  const ts = teachersOfMod(u.name);
  return `<h1>My teachers</h1><p class="sub">${ts.length} teachers · ${schoolsOfMod(u.name).length} schools</p>
    <div class="card">${ts.map((t) => {
      const rag = teacherRag(t.name); const al = avgLate(t.name);
      return `<div class="listrow"><div class="avatar">${initials(t.name)}</div>
        <div class="main"><b>${esc(t.name)}</b><small>${esc(schoolsOfTeacher(t).map((s) => s.name).join(', '))} · avg late ${al}m${rag.avg ? ' · score ' + rag.avg.toFixed(1) : ''}</small></div>
        ${ragPill(rag.key)}</div>`;
    }).join('')}</div>`;
}
function mVisit(u) {
  const schools = schoolsOfMod(u.name);
  return `<h1>Do a visit</h1><p class="sub">The feedback form unlocks only inside the school geofence (${CONFIG.geofenceMeters} m).</p>
    <div class="card"><label class="f">School</label>
      <select id="vSchool" onchange="render()">${schools.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
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
    if (!g) { flash('warn', 'Cancelled.'); return; }
    if (!g.ok) { flash('err', `You are ${Math.round(g.dist)} m away — must be within ${CONFIG.geofenceMeters} m to open the form.`); return; }
    VISIT = { school: school.id, teacher: null, ratings: {}, critical: {}, judgement: {}, step: 'pickTeacher' };
    render();
  } catch (e) { flash('err', e.message); }
}
/* ---- feedback form (unlocked) ---- */
let VISIT = null;
function mForm() {
  const school = STORE.school(VISIT.school);
  if (VISIT.step === 'pickTeacher') {
    const ts = teachersAtSchool(school.id);
    return `<h1>${esc(school.name)}</h1><div class="banner ok">✓ Location verified. Pick the teacher you observed.</div>
      <div class="card">${ts.map((t) => `<div class="listrow"><div class="avatar">${initials(t.name)}</div><div class="main"><b>${esc(t.name)}</b></div>
        <button class="btn sec sm" onclick="pickVisitTeacher('${esc(t.name)}')">Select</button></div>`).join('')}</div>
      <button class="btn sec" onclick="VISIT=null;render()">Cancel visit</button>`;
  }
  // the form
  const rq = (id, label) => `<div class="q"><div class="qt">${esc(label)}</div>
    <div class="rate">${CONFIG.ratingScale.map((r) => `<button title="${r.label}" onclick="setRate(this,'${id}',${r.v})">${r.v}</button>`).join('')}
    <button class="na" onclick="setRate(this,'${id}','na')">N/A</button></div></div>`;
  const cq = (id, label, opts) => `<label class="f">${esc(label)}</label><select onchange="VISIT.critical['${id}']=this.value">${['', ...opts].map((o) => `<option ${VISIT.critical[id] === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  return `<h1>Feedback · ${esc(VISIT.teacher)}</h1><p class="sub">${esc(school.name)} · ${todayStr()}</p>
    <div class="card"><div class="row"><div style="flex:1"><label class="f">Grade/Batch</label><select id="vGrade">${CONFIG.grades.map((g) => `<option>${g}</option>`).join('')}</select></div>
      <div style="flex:1"><label class="f">Module</label><select id="vModule">${CONFIG.modules.map((m) => `<option>${m}</option>`).join('')}</select></div>
      <div style="flex:1"><label class="f">Students present</label><input id="vStudents" type="number" min="0" value="0"></div></div></div>
    ${CONFIG.pillars.map((p) => `<h2>${p.id} · ${p.name}</h2><div class="card">${p.q.map((q) => rq(q[0], q[0] + '. ' + q[1])).join('')}</div>`).join('')}
    <h2>Critical standards</h2><div class="card">${CONFIG.critical.map((c) => cq(c[0], c[0] + '. ' + c[1], c[2])).join('')}
      <div id="safetyBox"></div></div>
    <h2>Coordinator judgement</h2><div class="card">
      <label class="f">Comfortable with teacher handling this class independently?</label>
      <select id="jInd">${CONFIG.judgement.independence.map((o) => `<option>${o}</option>`).join('')}</select>
      <label class="f">Current support status (RAG)</label>
      <select id="jRag"><option value="green">${CONFIG.rag.green}</option><option value="amber">${CONFIG.rag.amber}</option><option value="red">${CONFIG.rag.red}</option></select>
      <label class="f">Main improvement area</label><select id="jImp">${CONFIG.judgement.improvement.map((o) => `<option>${o}</option>`).join('')}</select>
      <label class="f">Action required</label><select id="jAct">${CONFIG.judgement.action.map((o) => `<option>${o}</option>`).join('')}</select>
      <label class="f">Observation / evidence (brief)</label><textarea id="jNote" placeholder="One short example, especially for a 1 or 2"></textarea>
    </div>
    <button class="btn" onclick="submitVisit()">Submit feedback</button>
    <button class="btn sec sm" style="margin-top:8px" onclick="VISIT.step='pickTeacher';render()">Back</button>`;
}
function pickVisitTeacher(name) { VISIT.teacher = name; VISIT.step = 'form'; render(); }
// Toggle in place (no re-render) so other uncontrolled fields — grade, module, students, RAG — aren't wiped.
function setRate(btn, id, v) {
  VISIT.ratings[id] = (v === 'na') ? 'na' : v;
  btn.parentElement.querySelectorAll('button').forEach((b) => b.classList.remove('on'));
  btn.classList.add('on');
}
function submitVisit() {
  const u = SESSION.get();
  const ratings = {}; Object.entries(VISIT.ratings).forEach(([k, v]) => { if (typeof v === 'number') ratings[k] = v; });
  const safety = VISIT.critical['N9'] === 'Yes';
  const fb = {
    mod: u.name, teacher: VISIT.teacher, school: VISIT.school, date: todayStr(),
    grade: $('vGrade').value, module: $('vModule').value, students: +$('vStudents').value || 0,
    ratings, critical: VISIT.critical,
    judgement: { independence: $('jInd').value, improvement: $('jImp').value, action: $('jAct').value },
    rag: $('jRag').value, note: $('jNote').value, safety,
  };
  fb.score = visitScore(fb);
  STORE.add('feedback', fb);
  VISIT = null;
  flash('ok', `Feedback saved${safety ? ' · ⚠ SAFETY concern flagged for escalation' : ''}.`);
  render();
}
function mLeaves(u) {
  const ls = STORE.get('leaves').filter((l) => l.mod === u.name).sort((a, b) => (a.status === 'Pending' ? -1 : 1));
  return `<h1>Leave requests</h1><div class="card">${ls.length ? ls.map((l) => leaveRow(l, true)).join('') : '<div class="empty">No leave requests.</div>'}</div>
    <h2>Component requests</h2><div class="card">${(() => { const rs = STORE.get('requests').filter((r) => r.mod === u.name); return rs.length ? rs.map((r) => reqRow(r, true)).join('') : '<div class="empty">No requests.</div>'; })()}</div>`;
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
  if (!$('tkTitle').value) return flash('err', 'Title required.');
  STORE.add('tasks', { teacher: $('tkWho').value, title: $('tkTitle').value, detail: $('tkDetail').value, due: $('tkDue').value, by: u.name, status: 'Assigned' });
  flash('ok', 'Task pushed.'); render();
}
function mCalendar(u) {
  const visits = STORE.get('feedback').filter((f) => f.mod === u.name).sort((a, b) => b.date.localeCompare(a.date));
  const leaves = STORE.get('leaves').filter((l) => l.mod === u.name && l.status === 'Approved');
  return `<h1>Calendar & visits</h1>
    <h2>Visit log</h2><div class="card">${visits.length ? visits.map(visitRow).join('') : '<div class="empty">No visits yet.</div>'}</div>
    <h2>Upcoming approved leave</h2><div class="card">${leaves.length ? leaves.map((l) => `<div class="listrow"><div class="main"><b>${esc(l.teacher)}</b><small>${esc(l.type)}</small></div><span class="tag">${fmtD(l.from)}–${fmtD(l.to)}</span></div>`).join('') : '<div class="empty">None.</div>'}</div>`;
}

/* ================= CEO / OUTSIGHT VIEWS ================= */
function ragCounts(teachers) {
  const c = { green: 0, amber: 0, red: 0, none: 0 };
  teachers.forEach((t) => { c[teacherRag(t.name).key]++; });
  return c;
}
function cOverview() {
  const ts = STORE.get('teachers'); const c = ragCounts(ts);
  const visits = STORE.get('feedback'); const safety = visits.filter((f) => f.safety);
  const actionable = visits.filter((f) => f.rag === 'red' || f.rag === 'amber');
  return `<h1>Network overview</h1><p class="sub">Robobox quality engine · all schools</p>
    <div class="kpis">
      <div class="stat"><div class="n">${ts.length}</div><div class="l">Teachers</div></div>
      <div class="stat"><div class="n">${STORE.get('schools').length}</div><div class="l">Schools</div></div>
      <div class="stat"><div class="n">${STORE.get('moderators').length}</div><div class="l">Moderators</div></div>
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
  const ts = STORE.get('teachers').map((t) => ({ t, rag: teacherRag(t.name) }))
    .sort((a, b) => ({ red: 0, amber: 1, green: 2, none: 3 }[a.rag.key] - { red: 0, amber: 1, green: 2, none: 3 }[b.rag.key]));
  return `<h1>All teachers</h1><p class="sub">Sorted by risk (red first)</p>
    <div class="card"><table class="mini"><tr><th>Teacher</th><th>Moderator</th><th>Visits</th><th>Score</th><th>RAG</th></tr>
    ${ts.map(({ t, rag }) => `<tr><td><b>${esc(t.name)}</b></td><td>${esc(t.mod)}</td><td>${rag.visits}</td><td>${rag.avg ? rag.avg.toFixed(1) : '—'}</td><td>${ragPill(rag.key)}</td></tr>`).join('')}
    </table></div>`;
}
function cModerators() {
  return `<h1>Moderator performance</h1>
    <div class="card"><table class="mini"><tr><th>Moderator</th><th>Teachers</th><th>Schools</th><th>Visits</th><th>Avg score</th><th>Pending</th></tr>
    ${STORE.get('moderators').map((m) => {
      const ts = teachersOfMod(m); const visits = STORE.get('feedback').filter((f) => f.mod === m);
      const scores = visits.map((v) => v.score).filter((x) => x != null);
      const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
      const pending = STORE.get('leaves').filter((l) => l.mod === m && l.status === 'Pending').length + STORE.get('requests').filter((r) => r.mod === m && r.status === 'Open').length;
      return `<tr><td><b>${esc(m)}</b></td><td>${ts.length}</td><td>${schoolsOfMod(m).length}</td><td>${visits.length}</td><td>${avg}</td><td>${pending || '—'}</td></tr>`;
    }).join('')}</table></div>
    <p class="note" style="margin-top:10px">Coverage = visits ÷ teachers. Low coverage means classrooms are unobserved.</p>`;
}

/* ================= role tab config ================= */
const ROLE_TABS = {
  teacher: [
    { id: 'home', label: 'Home', ic: '🏠' }, { id: 'att', label: 'Attendance', ic: '📅' },
    { id: 'leave', label: 'Leave', ic: '🌴' }, { id: 'req', label: 'Requests', ic: '📦' },
    { id: 'mat', label: 'Materials', ic: '📚' },
  ],
  mod: [
    { id: 'teachers', label: 'Teachers', ic: '👥' }, { id: 'visit', label: 'Visit', ic: '📍' },
    { id: 'leaves', label: 'Approvals', ic: '✅' }, { id: 'tasks', label: 'Tasks', ic: '📝' },
    { id: 'cal', label: 'Calendar', ic: '🗓️' }, { id: 'mat', label: 'Materials', ic: '📚' },
  ],
  ceo: [
    { id: 'overview', label: 'Overview', ic: '📊' }, { id: 'teachers', label: 'Teachers', ic: '👥' },
    { id: 'mods', label: 'Moderators', ic: '🧭' }, { id: 'mat', label: 'Materials', ic: '📚' },
  ],
};
const VIEWS = {
  teacher: { home: tHome, att: tAttendance, leave: tLeave, req: tRequests, mat: materialsView },
  mod: { teachers: mTeachers, visit: (u) => VISIT ? mForm() : mVisit(u), leaves: mLeaves, tasks: mTasks, cal: mCalendar, mat: materialsView },
  ceo: { overview: cOverview, teachers: cTeachers, mods: cModerators, mat: materialsView },
};

render();
