// Robobox Teacher Excellence Portal — app logic.
// Classic script (no import/export) so top-level functions are global and the inline
// on* handlers in the generated HTML resolve to them — no framework, no bundler.
// Depends on globals from the other scripts: SEED, CONFIG, STORE, and the types.ts interfaces.

// Cast covers both container (.innerHTML) and input (.value) reads; the id is always present when used.
const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
const esc = (s: unknown) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
// Dates are local calendar days (yyyy-mm-dd). toISOString() would use UTC and shift the day
// for India before 05:30 IST, so build the string from local parts instead.
const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayStr = () => isoLocal(new Date());
const parseD = (d: string) => new Date(d.length === 10 ? d + 'T00:00' : d);
const addDays = (iso: string, n: number) => { const d = parseD(iso); d.setDate(d.getDate() + n); return isoLocal(d); };
const fmtT = (iso?: string) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtD = (d?: string) => d ? parseD(d).toLocaleDateString([], { day: 'numeric', month: 'short' }) : '—';
const fmtLong = (d: string) => parseD(d).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
const initials = (n: string) => n.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/* ---------- icons (Lucide paths, inline SVG — no emoji, no icon font) ---------- */
const ICONS: Record<string, string> = {
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  calx: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m14 14-4 4"/><path d="m10 14 4 4"/>',
  package: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/><path d="m7.5 4.27 9 5.15"/>',
  book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  briefcase: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  cap: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  clipboard: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
  up: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  down: '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  pinI: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
};
const ic = (n: string, s = 20) => `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------- session & permissions ---------- */
const SESSION = {
  get(): User | null { try { return JSON.parse(localStorage.getItem('robobox_session') || 'null'); } catch (e) { return null; } },
  set(u: User) { localStorage.setItem('robobox_session', JSON.stringify(u)); },
  clear() { localStorage.removeItem('robobox_session'); },
};
const leaderOf = (name: string) => CONFIG.leaders.find((l) => l.name === name);
// Parth & Manish: see coordinator scores and approve leave. Outsight: teacher scores only.
const isTop = (u: User) => u.role === 'ceo' && !!leaderOf(u.name)?.top;

/* ---------- demo mode (testing without GPS) ----------
   Default ON inside an iframe (e.g. a hosted preview that blocks GPS), OFF on a normal
   top-level page (real deployment). An explicit toggle choice always wins. */
const DEMO = { on: (() => {
  try {
    const stored = localStorage.getItem('robobox_demo');
    if (stored != null) return stored === '1';
    return window.self !== window.top;
  } catch (e) { return true; }
})() };
const DEMO_POS = { lat: 19.0760, lng: 72.8777, acc: 5 };
function toggleDemo(cb: HTMLInputElement): void {
  DEMO.on = cb.checked;
  try { localStorage.setItem('robobox_demo', DEMO.on ? '1' : '0'); } catch (e) { /* ignore */ }
}

/* ---------- file storage (IndexedDB) for library uploads up to 20 MB ----------
   ponytail: per-device IndexedDB blob store — fine for the prototype; a real deployment
   points fileSave/fileGet at object storage (S3 / Supabase Storage). */
const MAX_FILE = 20 * 1024 * 1024;
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open('robobox_files', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function fileSave(id: string, blob: Blob): Promise<void> {
  const db = await idb();
  await new Promise<void>((res, rej) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').put(blob, id); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}
async function fileGet(id: string): Promise<Blob | undefined> {
  const db = await idb();
  return new Promise((res, rej) => { const tx = db.transaction('files', 'readonly'); const g = tx.objectStore('files').get(id); g.onsuccess = () => res(g.result as Blob | undefined); g.onerror = () => rej(g.error); });
}
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
/* ---------- Excel export (.xlsx) ----------
   A one-sheet workbook as SpreadsheetML inside an uncompressed ("stored") zip — no library.
   Bold, tinted, frozen header row; columns sized to content; numeric strings become numbers. */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b: Uint8Array): number { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipStore(files: [string, string][]): Blob {
  const enc = new TextEncoder(); const out: BlobPart[] = []; const dir: BlobPart[] = []; let offset = 0, size = 0;
  for (const [name, text] of files) {
    const nb = enc.encode(name), data = enc.encode(text), crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30)); // local file header
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(12, 0x21, true); // UTF-8 names, date 1980-01-01, method 0 (store)
    lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, nb.length, true);
    const ch = new DataView(new ArrayBuffer(46)); // central directory entry
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(14, 0x21, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, nb.length, true); ch.setUint32(42, offset, true);
    out.push(lh.buffer, nb, data); dir.push(ch.buffer, nb);
    offset += 30 + nb.length + data.length; size += 46 + nb.length;
  }
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, size, true); end.setUint32(16, offset, true);
  return new Blob([...out, ...dir, end.buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
const xmlEsc = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
function colName(i: number): string { let s = ''; for (i++; i; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; }
function downloadXLSX(filename: string, rows: unknown[][], sheet = 'Sheet1'): void {
  const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const NS = 'http://schemas.openxmlformats.org/', REL = NS + 'officeDocument/2006/relationships';
  const widths = rows[0].map((_, c) => Math.min(60, Math.max(8, ...rows.map((r) => String(r[c] == null ? '' : r[c]).length + 2))));
  const cell = (v: unknown, r: number, c: number) => {
    if (v == null || v === '') return '';
    const ref = colName(c) + (r + 1), st = r === 0 ? ' s="1"' : '';
    const n = typeof v === 'number' ? v : typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : NaN;
    return isFinite(n) ? `<c r="${ref}"${st}><v>${n}</v></c>` : `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(String(v))}</t></is></c>`;
  };
  const ws = `${X}<worksheet xmlns="${NS}spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    + `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    + `<sheetData>${rows.map((r, i) => `<row r="${i + 1}">${r.map((v, c) => cell(v, i, c)).join('')}</row>`).join('')}</sheetData></worksheet>`;
  const name = xmlEsc(sheet.replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31));
  triggerDownload(zipStore([
    ['[Content_Types].xml', `${X}<Types xmlns="${NS}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ['_rels/.rels', `${X}<Relationships xmlns="${NS}package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `${X}<workbook xmlns="${NS}spreadsheetml/2006/main" xmlns:r="${REL}"><sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `${X}<Relationships xmlns="${NS}package/2006/relationships"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL}/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', `${X}<styleSheet xmlns="${NS}spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2C2"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ['xl/worksheets/sheet1.xml', ws],
  ]), filename);
}

/* ---------- geofence (native Geolocation + haversine) ---------- */
interface LatLng { lat: number; lng: number; }
function haversine(a: LatLng, b: LatLng): number { // metres
  const R = 6371000, toR = (d: number) => d * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function getPos(): Promise<{ lat: number; lng: number; acc: number }> {
  if (DEMO.on) return Promise.resolve({ ...DEMO_POS });
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('Geolocation is not supported on this device.'));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      (e) => rej(new Error(e.code === 1 ? 'Location permission denied. Allow location and try again.' : 'Could not get your location. Move outdoors and try again.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  });
}
// One GPS read. If the school has no geofence yet, set it to the measured point
// (on-site, one-time). Returns {ok,dist} or null if aborted.
async function atSchool(school: School): Promise<{ ok: boolean; dist: number } | null> {
  const pos = await getPos();
  if (school.lat == null) {
    if (!DEMO.on && !confirm(`${school.name} has no geofence yet. Set it to your current location now?`)) return null;
    STORE.setSchoolLoc(school.id, pos.lat, pos.lng);
  }
  const dist = haversine(pos, { lat: school.lat as number, lng: school.lng as number });
  return { ok: dist <= CONFIG.geofenceMeters, dist };
}

/* ---------- RAG / scoring ---------- */
function visitScore(fb: { ratings?: Record<string, unknown> }): number | null {
  const vals = Object.values(fb.ratings || {}).filter((v): v is number => typeof v === 'number');
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
function teacherFeedback(name: string): Feedback[] {
  return STORE.get('feedback').filter((f) => f.teacher.toLowerCase() === name.toLowerCase())
    .sort((a, b) => b.date.localeCompare(a.date));
}
function teacherRag(name: string): { key: RagOrNone; avg: number | null; visits: number } {
  const fb = teacherFeedback(name);
  if (!fb.length) return { key: 'none', avg: null, visits: 0 };
  const scores = fb.map(visitScore).filter((x): x is number => x != null);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  return { key: fb[0].rag, avg, visits: fb.length };
}
// RAG is auto-calculated from the coordinator's ratings + critical standards — never chosen by hand.
// ponytail: default thresholds (avg ≥4 green, ≥3 amber, else red; critical fails & safety escalate).
// Confirm these with Robobox before go-live — this function is the single calibration knob.
function computeRag(ratings: Record<string, number | 'na'>, critical: Record<string, string>): RagKey {
  if (critical['N9'] === 'Yes') return 'red'; // safety concern → immediate red, regardless of score
  const vals = Object.values(ratings).filter((v): v is number => typeof v === 'number');
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  const fails = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8'].filter((k) => critical[k] === 'No').length;
  let key: RagKey = avg == null ? 'amber' : avg >= 4 ? 'green' : avg >= 3 ? 'amber' : 'red';
  if (fails >= 2) key = 'red';
  else if (fails === 1 && key === 'green') key = 'amber';
  return key;
}
// Change from first to latest scored visit (growth +, degrowth −).
function teacherGrowth(name: string): number | null {
  const sc = teacherFeedback(name).slice().reverse().map((f) => f.score).filter((x): x is number => x != null);
  return sc.length > 1 ? sc[sc.length - 1] - sc[0] : null;
}
// Coordinator score = mean of their teachers' average scores (teacher-weighted). Parth & Manish only.
function coordScore(mod: string): number | null {
  const avgs = teachersOfMod(mod).map((t) => teacherRag(t.name).avg).filter((x): x is number => x != null);
  return avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
}

/* ---------- attendance ---------- */
function teacherAtt(name: string): Attendance[] { return STORE.get('attendance').filter((a) => a.teacher.toLowerCase() === name.toLowerCase()).sort((a, b) => b.date.localeCompare(a.date)); }
function openPunch(name: string): Attendance | undefined { return teacherAtt(name).find((a) => a.date === todayStr() && !a.outTime); }
function lateMins(iso: string): number {
  const [h, m] = CONFIG.expectedStart.split(':').map(Number);
  const t = new Date(iso); const exp = new Date(t); exp.setHours(h, m, 0, 0);
  return Math.max(0, Math.round((t.getTime() - exp.getTime()) / 60000));
}
function avgOf(recs: Attendance[]): number { return recs.length ? Math.round(recs.reduce((s, a) => s + (a.inLate || 0), 0) / recs.length) : 0; }
function avgLate(name: string): number { return avgOf(teacherAtt(name).filter((a) => a.inTime)); }
// Average login delay over a window: rolling 7 days ('week') or current calendar month ('month').
function avgLateWindow(name: string, window: 'week' | 'month'): number {
  const from = window === 'week' ? addDays(todayStr(), -6) : todayStr().slice(0, 7);
  return avgOf(teacherAtt(name).filter((a) => a.inTime && (window === 'week' ? a.date >= from : a.date.startsWith(from))));
}

/* ---------- leave & requests helpers ---------- */
const leaveCovers = (l: Leave, date: string) => l.from <= date && date <= l.to;
function leaveOn(name: string, date = todayStr()): Leave | undefined {
  return STORE.get('leaves').find((l) => l.teacher === name && l.status === 'Approved' && leaveCovers(l, date));
}
function reqLines(r: Requisition): ReqLine[] { return r.lines || (r.items ? [{ component: r.items, qty: r.qty || 1 }] : []); }
// Older records used Open/Approved; show them in the current vocabulary.
function reqStatus(r: Requisition): string { return r.status === 'Open' ? 'Submitted' : r.status === 'Approved' ? 'Sent to Ops' : r.status; }
const kitOf = (id: string) => CONFIG.kits.find((k) => k.id === id);
const kitLabel = (id: string) => { const k = kitOf(id); return k ? `${k.name} (${k.id})` : id; };
function nextRef(): string {
  const d = todayStr().slice(2).replace(/-/g, '');
  const n = STORE.get('requests').filter((r) => (r.ref || '').startsWith('REQ-' + d)).length + 1;
  return `REQ-${d}-${String(n).padStart(3, '0')}`;
}

/* ---------- small UI helpers ---------- */
let toastTimer = 0;
function flash(kind: 'ok' | 'warn' | 'err', msg: string): void {
  const el = document.getElementById('toast'); if (!el) return;
  el.innerHTML = `<div class="toast ${kind}">${ic(kind === 'ok' ? 'check' : kind === 'err' ? 'alert' : 'info', 18)}<span>${esc(msg)}</span></div>`;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { el.innerHTML = ''; }, kind === 'err' ? 5000 : 3500);
}
const badge = (text: string, tone = 'neutral') => `<span class="badge ${tone}">${esc(text)}</span>`;
const ragPill = (key: RagOrNone): string => key === 'none' ? badge('Not rated') : `<span class="badge ${key}"><span class="dot"></span>${cap(key)}</span>`;
function pageHead(title: string, sub = '', actions = ''): string {
  return `<header class="page-head"><div class="ph-text"><h1 tabindex="-1">${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${actions ? `<div class="head-actions">${actions}</div>` : ''}</header>`;
}
const kpi = (label: string, value: string | number, icon: string, tone = '') =>
  `<div class="stat"><div class="stat-top"><span class="stat-ic ${tone}">${ic(icon, 16)}</span><span class="stat-l">${label}</span></div><div class="stat-n">${value}</div></div>`;
const empty = (icon: string, title: string, hint = '') => `<div class="empty">${ic(icon, 28)}<b>${title}</b>${hint ? `<span>${hint}</span>` : ''}</div>`;
const backLink = (label: string, fn: string) => `<button class="back-link" onclick="${fn}">${ic('chevL', 18)}<span>${label}</span></button>`;
function setErr(id: string, msg: string): void {
  const el = document.getElementById(id); if (el) el.textContent = msg;
  const input = document.getElementById(id.replace(/Err$/, '')); if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
}
// In-place list filter (no re-render, so the search box keeps focus).
function filterList(input: HTMLInputElement, containerId: string): void {
  const q = input.value.trim().toLowerCase();
  document.querySelectorAll(`#${containerId} [data-q]`).forEach((el) => { (el as HTMLElement).hidden = !!q && !((el as HTMLElement).dataset.q || '').includes(q); });
}
const searchBox = (target: string, placeholder: string) =>
  `<div class="search">${ic('search', 18)}<input type="search" aria-label="${placeholder}" placeholder="${placeholder}" oninput="filterList(this,'${target}')"></div>`;
function schoolsOfTeacher(t: Teacher): School[] { return (t.schools || []).map((id) => STORE.school(id)).filter((s): s is School => !!s); }
function schoolsOfMod(mod: string): School[] { return STORE.get('schools').filter((s) => s.mod.toLowerCase() === mod.toLowerCase()); }
function teachersOfMod(mod: string): Teacher[] { return STORE.get('teachers').filter((t) => t.mod.toLowerCase() === mod.toLowerCase()); }
function teachersAtSchool(id: string): Teacher[] { const s = STORE.school(id); return (s ? s.teachers : []).map((n) => STORE.teacher(n)).filter((t): t is Teacher => !!t); }
const schoolName = (id?: string) => (id && STORE.school(id)?.name) || '—';

/* ================= ROUTER ================= */
// `short` + `at` = compact label shown in the bottom bar below that viewport width ('sm' ≤370px, 'xs' ≤340px).
interface Tab { id: string; label: string; icon: string; short?: string; at?: 'sm' | 'xs'; }
// Max 5 bottom-nav items per role.
function tabsFor(u: User): Tab[] {
  if (u.role === 'teacher') return [
    { id: 'home', label: 'Home', icon: 'home' }, { id: 'att', label: 'Attendance', icon: 'clock', short: 'Attend', at: 'xs' },
    { id: 'leave', label: 'Leave', icon: 'calx' }, { id: 'req', label: 'Requests', icon: 'package' },
    { id: 'upd', label: 'Updates', icon: 'megaphone' },
  ];
  if (u.role === 'mod') return [
    { id: 'teachers', label: 'Teachers', icon: 'users' }, { id: 'visit', label: 'Visit', icon: 'pin' },
    { id: 'cal', label: 'Calendar', icon: 'calendar' }, { id: 'req', label: 'Requests', icon: 'package' },
    { id: 'upd', label: 'Updates', icon: 'megaphone' },
  ];
  const t: Tab[] = [{ id: 'overview', label: 'Overview', icon: 'chart' }, { id: 'teachers', label: 'Teachers', icon: 'users' }];
  if (isTop(u)) t.push({ id: 'coords', label: 'Coordinators', icon: 'briefcase', short: 'Coords', at: 'sm' }, { id: 'leave', label: 'Leave', icon: 'calx' });
  t.push({ id: 'upd', label: 'Updates', icon: 'megaphone' });
  return t;
}
const TAB: Partial<Record<Role, string>> = {};
let SEL: string | null = null; // teacher detail opened by a coordinator or leadership
function go(tab: string): void {
  const u = SESSION.get()!; TAB[u.role] = tab; SEL = null; render(); entered();
  (document.querySelector('h1') as HTMLElement | null)?.focus({ preventScroll: true });
}
function openTeacher(name: string): void {
  const u = SESSION.get()!; if (u.role === 'ceo') TAB.ceo = 'teachers';
  SEL = name; render(); entered();
}
// Page-enter motion only on navigation, not on every in-page re-render.
function entered(): void { window.scrollTo(0, 0); document.getElementById('main')?.classList.add('enter'); }
function closeTeacher(): void { SEL = null; render(); }
function render(): void {
  const u = SESSION.get();
  const app = $('app');
  if (!u) { app.innerHTML = viewLogin(); return; }
  const tabs = tabsFor(u);
  const active = tabs.some((t) => t.id === TAB[u.role]) ? TAB[u.role]! : tabs[0].id;
  // Unread official updates → dot on the Updates tab (cleared once the Official section is opened).
  const unread = active === 'upd' && UPD === 'official' ? 0 : unreadNotices(u);
  const dot = (t: Tab) => t.id === 'upd' && unread ? `<span class="tab-dot" aria-hidden="true"></span><span class="sr-only">, ${unread} new</span>` : '';
  const roleLabel = u.role === 'mod' ? 'Coordinator' : u.role === 'teacher' ? 'Teacher' : (leaderOf(u.name)?.title || 'Leadership');
  app.innerHTML = `
    <header class="topbar">
      <img class="logo-img" src="assets/logo-mark.webp" width="75" height="28" alt="The Robobox">
      <nav class="topnav" aria-label="Main">${tabs.map((t) => `<button class="${t.id === active ? 'on' : ''}" ${t.id === active ? 'aria-current="page"' : ''} onclick="go('${t.id}')">${ic(t.icon, 18)}<span>${t.label}</span>${dot(t)}</button>`).join('')}</nav>
      <div class="user-chip"><span class="avatar sm" aria-hidden="true">${initials(u.name)}</span><span class="who"><b>${esc(u.name)}</b><small>${esc(roleLabel)}</small></span></div>
      <button class="icon-btn" onclick="logout()" aria-label="Sign out" title="Sign out">${ic('logout')}</button>
    </header>
    <main class="wrap" id="main">${VIEWS[u.role + ':' + active](u)}</main>
    <nav class="tabbar" aria-label="Main">${tabs.map((t) => `<button class="tab${t.id === active ? ' on' : ''}${t.short ? ' s-' + t.at : ''}" ${t.short ? `aria-label="${t.label}"` : ''} ${t.id === active ? 'aria-current="page"' : ''} onclick="go('${t.id}')">${ic(t.icon, 22)}<span class="lbl">${t.label}</span>${t.short ? `<span class="lbl-s" aria-hidden="true">${t.short}</span>` : ''}${dot(t)}</button>`).join('')}</nav>`;
}
function logout(): void { SESSION.clear(); SEL = null; VISIT = null; UPD = 'official'; const t = document.getElementById('toast'); if (t) t.innerHTML = ''; render(); }

/* ================= LOGIN ================= */
let LOGIN: { role: Role | null } = { role: null };
const roleCard = (r: Role, icon: string, title: string, desc: string) =>
  `<button class="role-card" onclick="pickRole('${r}')"><span class="role-ic">${ic(icon, 22)}</span><span class="role-txt"><b>${title}</b><small>${desc}</small></span>${ic('chevR', 20)}</button>`;
function viewLogin(): string {
  if (!LOGIN.role) {
    return `<div class="login">
      <img class="logo-full" src="assets/logo.webp" width="260" height="123" alt="The Robobox — Teacher Excellence">
      <p class="login-sub">One Robobox classroom, delivered consistently.</p>
      <div class="role-list">
        ${roleCard('teacher', 'cap', 'Teacher', 'Check in, leave, component requests')}
        ${roleCard('mod', 'pin', 'Coordinator', 'Visits, action plans, teacher progress')}
        ${roleCard('ceo', 'shield', 'Leadership', 'Parth · Manish · Outsight')}
      </div>
      <label class="switch-row"><input type="checkbox" ${DEMO.on ? 'checked' : ''} onchange="toggleDemo(this)">
        <span><b>Demo mode</b><small>Simulates location so you can test without GPS. Turn off on a real device.</small></span></label>
    </div>`;
  }
  let title = '', sub = '', options = '';
  if (LOGIN.role === 'teacher') {
    title = 'Teacher sign in'; sub = 'Select your name. You check in from school.';
    options = STORE.get('teachers').slice().sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => `<option value="${esc(t.name)}">${esc(t.name)} — ${esc(schoolsOfTeacher(t).map((s) => s.name).join(', '))}</option>`).join('');
  } else if (LOGIN.role === 'mod') {
    title = 'Coordinator sign in'; sub = 'Select your name.';
    options = STORE.get('moderators').map((m) => `<option>${esc(m)}</option>`).join('');
  } else {
    title = 'Leadership sign in'; sub = 'Parth, Manish or the Outsight team.';
    options = CONFIG.leaders.map((l) => `<option value="${esc(l.name)}">${esc(l.name)} — ${esc(l.title)}</option>`).join('');
  }
  return `<div class="login">
    ${backLink('Back', 'backToRoles()')}
    <h1 class="login-title">${title}</h1><p class="login-sub left">${sub}</p>
    <div class="card"><label class="field-l" for="who">Your name</label><select id="who">${options}</select>
      <button class="btn block" onclick="doLogin('${LOGIN.role}')">Continue</button></div>
  </div>`;
}
function pickRole(r: Role): void { LOGIN = { role: r }; render(); }
function backToRoles(): void { LOGIN = { role: null }; render(); }
function doLogin(role: Role): void {
  const name = $('who').value;
  const u: User = { role, name };
  if (role === 'teacher') u.mod = STORE.teacher(name)!.mod;
  SESSION.set(u); LOGIN = { role: null }; render();
}

/* ================= TEACHER ================= */
async function punch(kind: 'in' | 'out'): Promise<void> {
  const u = SESSION.get()!; const t = STORE.teacher(u.name)!;
  const sel = $('punchSchool'); const school = STORE.school(sel ? sel.value : t.schools[0])!;
  flash('warn', `Checking you are within ${CONFIG.geofenceMeters} m of ${school.name}…`);
  try {
    const g = await atSchool(school);
    if (!g) { flash('warn', 'Cancelled.'); return; }
    if (!g.ok) { flash('err', `You are ${Math.round(g.dist)} m from ${school.name}. Move within ${CONFIG.geofenceMeters} m and try again.`); return; }
    if (kind === 'in') {
      const now = new Date().toISOString(); const lm = lateMins(now);
      STORE.add('attendance', { teacher: u.name, date: todayStr(), inTime: now, inSchool: school.id, inLate: lm, inDist: Math.round(g.dist) });
      flash('ok', `Checked in at ${school.name}${lm ? ` · ${lm} min late` : ' · on time'}.`);
    } else {
      const open = openPunch(u.name);
      if (!open) { flash('err', 'No open check-in to close.'); return; }
      STORE.update('attendance', open.id!, { outTime: new Date().toISOString(), outSchool: school.id, outDist: Math.round(g.dist) });
      flash('ok', `Checked out at ${school.name}.`);
    }
    render();
  } catch (e) { flash('err', (e as Error).message); }
}
function tHome(u: User): string {
  const t = STORE.teacher(u.name)!; const schools = schoolsOfTeacher(t);
  const open = openPunch(u.name); const lv = leaveOn(u.name);
  const tasks = STORE.get('tasks').filter((x) => x.teacher === u.name && x.status !== 'Done');
  const openReqs = STORE.get('requests').filter((r) => r.teacher === u.name && reqStatus(r) !== 'Fulfilled').length;
  const monthDays = teacherAtt(u.name).filter((a) => a.inTime && a.date.startsWith(todayStr().slice(0, 7))).length;
  return pageHead(`Hi, ${esc(cap(u.name.split(' ')[0].toLowerCase()))}`, fmtLong(todayStr())) +
    (unreadNotices(u) ? `<button class="notice brand as-btn" onclick="openOfficial()">${ic('megaphone', 18)}<span><b>${unreadNotices(u)} new official update${unreadNotices(u) > 1 ? 's' : ''}</b> — tap to read</span></button>` : '') +
    (lv ? `<div class="notice info">${ic('calx', 18)}<span>You're on approved ${esc(lv.type.toLowerCase())} leave until ${fmtD(lv.to)}.</span></div>` : '') +
    `<section class="card checkin">
      <div class="checkin-status${open ? ' in' : ''}"><span class="status-dot" aria-hidden="true"></span><div>
        <b>${open ? 'Checked in' : 'Not checked in'}</b>
        <small>${open ? `${esc(schoolName(open.inSchool))} · since ${fmtT(open.inTime)}${open.inLate ? ` · ${open.inLate} min late` : ' · on time'}` : `Reporting time ${CONFIG.expectedStart} · within ${CONFIG.geofenceMeters} m of school`}</small>
      </div></div>
      <label class="field-l" for="punchSchool">School</label>
      <select id="punchSchool">${schools.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
      ${open ? `<button class="btn dark block" onclick="punch('out')">${ic('logout', 18)}Check out</button>`
        : `<button class="btn block" onclick="punch('in')">${ic('login', 18)}Check in</button>`}
      ${schools.length > 1 ? '<p class="hint">You can check in at one school and check out at another.</p>' : ''}
    </section>
    <div class="kpis">
      ${kpi('Avg delay · week', avgLateWindow(u.name, 'week') + ' min', 'clock')}
      ${kpi('Days present · month', monthDays, 'calendar')}
      ${kpi('Open tasks', tasks.length, 'clipboard')}
      ${kpi('Open requests', openReqs, 'package')}
    </div>
    ${comingUp(u)}
    <h2 class="section-title">Tasks from your coordinator</h2>
    <div class="card list">${tasks.length ? tasks.map((x) => taskRow(x)).join('') : empty('clipboard', 'No open tasks', 'New tasks from your coordinator appear here.')}</div>`;
}
function taskRow(x: Task, canComplete = true): string {
  return `<div class="row-item"><span class="row-ic">${ic('clipboard', 18)}</span><span class="row-main"><b>${esc(x.title)}</b><small>${x.detail ? esc(x.detail) + ' · ' : ''}${x.due ? 'Due ' + fmtD(x.due) + ' · ' : ''}from ${esc(x.by)}</small></span>
    <span class="row-end">${x.status === 'Done' ? badge('Done', 'green') : canComplete ? `<button class="btn ghost sm" onclick="markTask('${x.id}')">${ic('check', 16)}Done</button>` : badge('Open', 'amber')}</span></div>`;
}
function markTask(id: string): void { STORE.update('tasks', id, { status: 'Done', doneAt: new Date().toISOString() }); flash('ok', 'Task marked done.'); render(); }

function tAttendance(u: User): string {
  const recs = teacherAtt(u.name);
  return pageHead('Attendance', `Reporting time ${CONFIG.expectedStart} — delay is counted from here.`) +
    `<div class="kpis three">
      ${kpi('Avg delay · this week', avgLateWindow(u.name, 'week') + ' min', 'clock')}
      ${kpi('Avg delay · this month', avgLateWindow(u.name, 'month') + ' min', 'calendar')}
      ${kpi('Avg delay · all time', avgLate(u.name) + ' min', 'chart')}
    </div>
    <div class="card flush">${recs.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Date</th><th>In</th><th>Out</th><th>Delay</th><th>School</th></tr></thead><tbody>
      ${recs.map((a) => `<tr><td>${fmtD(a.date)}</td><td class="num">${fmtT(a.inTime)}</td><td class="num">${fmtT(a.outTime)}</td><td class="num">${a.inLate ? a.inLate + ' min' : badge('On time', 'green')}</td>
        <td>${esc(schoolName(a.inSchool))}${a.outSchool && a.outSchool !== a.inSchool ? ' → ' + esc(schoolName(a.outSchool)) : ''}</td></tr>`).join('')}</tbody></table></div>`
      : empty('clock', 'No attendance yet', 'Check in from Home when you reach school.')}</div>`;
}

function tLeave(u: User): string {
  const mine = STORE.get('leaves').filter((l) => l.teacher === u.name).sort((a, b) => b.from.localeCompare(a.from));
  return pageHead('Leave', 'Leave is approved by Parth (CEO) or Manish.') +
    `<section class="card">
      <label class="field-l" for="lvType">Type</label><select id="lvType">${CONFIG.leaveTypes.map((x) => `<option>${x}</option>`).join('')}</select>
      <div class="grid2"><div><label class="field-l" for="lvFrom">From</label><input type="date" id="lvFrom" value="${todayStr()}" min="${todayStr()}"></div>
        <div><label class="field-l" for="lvTo">To</label><input type="date" id="lvTo" value="${todayStr()}" min="${todayStr()}"></div></div>
      <label class="field-l" for="lvReason">Reason</label><textarea id="lvReason" rows="3" placeholder="A short reason helps approval"></textarea>
      <p class="err" id="lvToErr" role="alert"></p>
      <button class="btn block" onclick="submitLeave()">${ic('send', 18)}Apply for leave</button>
    </section>
    <h2 class="section-title">My leave</h2>
    <div class="card list">${mine.length ? mine.map((l) => leaveItem(l, { withdraw: true })).join('') : empty('calx', 'No leave applied', 'Your applications and their status appear here.')}</div>`;
}
function leaveItem(l: Leave, o: { who?: boolean; decide?: boolean; withdraw?: boolean }): string {
  const tone = l.status === 'Approved' ? 'green' : l.status === 'Rejected' ? 'red' : l.status === 'Cancelled' ? 'neutral' : 'amber';
  const days = Math.round((parseD(l.to).getTime() - parseD(l.from).getTime()) / 86400000) + 1;
  return `<div class="row-item wrap-end">${o.who ? `<span class="avatar">${initials(l.teacher)}</span>` : `<span class="row-ic">${ic('calx', 18)}</span>`}
    <span class="row-main"><b>${o.who ? esc(l.teacher) + ' · ' : ''}${esc(l.type)} · ${fmtD(l.from)}${l.to !== l.from ? '–' + fmtD(l.to) : ''} <span class="muted">(${days} day${days > 1 ? 's' : ''})</span></b>
      <small>${l.reason ? esc(l.reason) : 'No reason given'}${o.who && l.mod ? ' · Coordinator ' + esc(l.mod) : ''}${l.decidedBy ? ` · ${esc(l.status.toLowerCase())} by ${esc(l.decidedBy)}` : ''}</small></span>
    <span class="row-end">${badge(l.status === 'Pending' ? 'Awaiting approval' : l.status, tone)}
      ${o.decide && l.status === 'Pending' ? `<button class="btn sm" onclick="decideLeave('${l.id}','Approved')">${ic('check', 16)}Approve</button><button class="btn ghost sm" onclick="decideLeave('${l.id}','Rejected')">${ic('x', 16)}Reject</button>` : ''}
      ${o.withdraw && l.status === 'Pending' ? `<button class="btn ghost sm" onclick="withdrawLeave('${l.id}')">Withdraw</button>` : ''}</span></div>`;
}
function submitLeave(): void {
  const u = SESSION.get()!; const from = $('lvFrom').value, to = $('lvTo').value;
  if (!from || !to || to < from) { setErr('lvToErr', 'The end date must be on or after the start date.'); return; }
  setErr('lvToErr', '');
  STORE.add('leaves', { teacher: u.name, mod: u.mod, type: $('lvType').value, from, to, reason: $('lvReason').value.trim(), status: 'Pending' });
  flash('ok', 'Leave applied — awaiting approval from Parth or Manish.'); render();
}
function withdrawLeave(id: string): void { STORE.update('leaves', id, { status: 'Cancelled' }); flash('ok', 'Leave request withdrawn.'); render(); }
function decideLeave(id: string, status: 'Approved' | 'Rejected'): void {
  const u = SESSION.get()!;
  if (!isTop(u)) { flash('err', 'Only Parth or Manish can approve leave.'); return; }
  STORE.update('leaves', id, { status, decidedBy: u.name, decidedAt: new Date().toISOString() });
  flash('ok', `Leave ${status.toLowerCase()}.`); render();
}

/* ---- component requests (teacher) ----
   Draft lives in RQ and is updated in place by the steppers, so typing a count never re-renders the page. */
let RQ: { project: string; counts: Record<string, number>; done: string | null } = { project: CONFIG.kits[0].id, counts: {}, done: null };
function rqPick(id: string): void { RQ = { project: id, counts: {}, done: null }; render(); }
function rqApply(i: number, n: number): void {
  const kit = kitOf(RQ.project)!; const comp = kit.items[i][0];
  n = Math.max(0, Math.min(999, Math.floor(n) || 0)); RQ.counts[comp] = n;
  const input = document.getElementById('q_' + i) as HTMLInputElement | null; if (input) input.value = String(n);
  document.getElementById('kr_' + i)?.classList.toggle('picked', n > 0);
  const lines = Object.values(RQ.counts).filter((x) => x > 0);
  const sum = document.getElementById('rqSum');
  if (sum) sum.textContent = lines.length ? `${lines.length} selected · ${lines.reduce((a, b) => a + b, 0)} pcs` : 'None selected';
  if (lines.length) setErr('rqErr', '');
}
function rqStep(i: number, d: number): void { rqApply(i, (RQ.counts[kitOf(RQ.project)!.items[i][0]] || 0) + d); }
function rqSet(el: HTMLInputElement, i: number): void { rqApply(i, parseInt(el.value, 10)); }
function rqReset(): void { RQ = { project: RQ.project, counts: {}, done: null }; render(); }
function submitReq(): void {
  const u = SESSION.get()!; const kit = kitOf(RQ.project)!;
  const lines = kit.items.map(([c]) => ({ component: c, qty: RQ.counts[c] || 0 })).filter((l) => l.qty > 0);
  if (!lines.length) { setErr('rqErr', 'Add a quantity for at least one component.'); flash('err', 'Add at least one component.'); return; }
  const ref = nextRef();
  STORE.add('requests', { ref, teacher: u.name, mod: u.mod, school: $('rqSchool').value, project: kit.id, lines, note: $('rqNote').value.trim(), status: 'Submitted', createdAt: new Date().toISOString() });
  RQ = { project: kit.id, counts: {}, done: ref };
  flash('ok', `Request ${ref} sent to ${u.mod}.`); render(); window.scrollTo(0, 0);
}
function tRequests(u: User): string {
  const t = STORE.teacher(u.name)!; const kit = kitOf(RQ.project)!;
  const mine = STORE.get('requests').filter((r) => r.teacher === u.name).sort((a, b) => (b.createdAt || b.id || '').localeCompare(a.createdAt || a.id || ''));
  const done = RQ.done ? mine.find((r) => r.ref === RQ.done) : undefined;
  const ack = done ? `<section class="card ack" role="status">
      <div class="ack-head"><span class="ack-ic">${ic('check', 22)}</span><div><b>Request raised · ${esc(done.ref)}</b><small>Sent to your coordinator ${esc(done.mod)}. Track its status below.</small></div></div>
      <ul class="ack-lines">${reqLines(done).map((l) => `<li><span>${esc(l.component)}</span><b>×${l.qty}</b></li>`).join('')}</ul>
      <button class="btn ghost block" onclick="rqReset()">${ic('plus', 18)}Raise another request</button></section>` : '';
  const counted = Object.values(RQ.counts).filter((x) => x > 0);
  return pageHead('Component requests', 'Pick a project, set the quantity you need, and send it to your coordinator.') + ack +
    `<section class="card">
      <span class="field-l" id="projL">Project</span>
      <div class="seg-grid" role="radiogroup" aria-labelledby="projL">${CONFIG.kits.map((k) => `<button role="radio" aria-checked="${k.id === RQ.project}" class="seg-card${k.id === RQ.project ? ' on' : ''}" onclick="rqPick('${k.id}')"><b>${esc(k.name)}</b><small>${k.id} · ${k.items.length} components</small></button>`).join('')}</div>
    </section>
    <section class="card">
      <div class="card-head"><b>${esc(kit.name)}</b><span class="muted" id="rqSum">${counted.length ? `${counted.length} selected · ${counted.reduce((a, b) => a + b, 0)} pcs` : 'None selected'}</span></div>
      <div class="kit-list">${kit.items.map(([c, q], i) => { const n = RQ.counts[c] || 0; return `<div class="kit-row${n ? ' picked' : ''}" id="kr_${i}">
        <span class="kit-name"><b>${esc(c)}</b><small>Kit qty: ${esc(q)}</small></span>
        <span class="stepper"><button aria-label="Decrease ${esc(c)}" onclick="rqStep(${i},-1)">${ic('minus', 18)}</button><input id="q_${i}" type="number" inputmode="numeric" min="0" max="999" value="${n}" aria-label="${esc(c)} quantity" onchange="rqSet(this,${i})"><button aria-label="Increase ${esc(c)}" onclick="rqStep(${i},1)">${ic('plus', 18)}</button></span></div>`; }).join('')}</div>
    </section>
    <section class="card">
      <label class="field-l" for="rqSchool">Deliver to</label><select id="rqSchool">${schoolsOfTeacher(t).map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
      <label class="field-l" for="rqNote">Note for coordinator</label><textarea id="rqNote" rows="2" placeholder="Optional — e.g. needed before Monday's class"></textarea>
      <p class="err" id="rqErr" role="alert"></p>
      <button class="btn block" onclick="submitReq()">${ic('send', 18)}Send request</button>
    </section>
    <h2 class="section-title">My requests</h2>
    <div class="card list">${mine.length ? mine.map((r) => reqItem(r)).join('') : empty('package', 'No requests yet', 'Requests you send appear here with their status.')}</div>`;
}
function reqTone(st: string): string { return st === 'Fulfilled' ? 'green' : st === 'Sent to Ops' ? 'blue' : 'amber'; }
function reqItem(r: Requisition): string {
  const lines = reqLines(r); const st = reqStatus(r);
  const summary = lines.slice(0, 3).map((l) => `${l.component} ×${l.qty}`).join(', ') + (lines.length > 3 ? ` +${lines.length - 3} more` : '');
  return `<div class="row-item"><span class="row-ic">${ic('package', 18)}</span><span class="row-main"><b>${esc(r.ref || 'Request')} · ${esc(kitOf(r.project)?.id || r.project)}</b>
    <small>${r.createdAt ? fmtD(r.createdAt) + ' · ' : ''}${esc(summary)}</small></span><span class="row-end">${badge(st, reqTone(st))}</span></div>`;
}
function libraryInner(u: User): string {
  const mats = STORE.get('materials').slice().reverse();
  const canAdd = u.role === 'mod' || u.role === 'ceo';
  return (canAdd ? `<section class="card"><h3 class="card-title">Add a resource</h3>
      <label class="field-l" for="mtTitle">Title</label><input id="mtTitle" placeholder="e.g. Teacher Handbook v2">
      <label class="field-l" for="mtLink">Link</label><input id="mtLink" type="url" inputmode="url" placeholder="https://… (Drive, website)">
      <label class="field-l" for="mtFile">Or upload a file</label><input id="mtFile" type="file"><p class="hint">Up to 20 MB.</p>
      <label class="field-l" for="mtNote">Note</label><input id="mtNote" placeholder="Optional">
      <p class="err" id="mtTitleErr" role="alert"></p>
      <button class="btn block" onclick="addMaterial()">${ic('upload', 18)}Publish</button></section>` : '') +
    `<div class="card list">${mats.length ? mats.map((m) => {
      const isFile = m.kind === 'file';
      const meta = isFile ? `${esc(m.fileName)} · ${((m.size || 0) / 1048576).toFixed(1)} MB` : esc(m.link);
      const action = isFile ? `<button class="btn ghost sm" onclick="openFile('${m.id}')">${ic('download', 16)}Download</button>`
        : `<a class="btn ghost sm" href="${esc(m.link)}" target="_blank" rel="noopener">${ic('link', 16)}Open</a>`;
      return `<div class="row-item"><span class="row-ic tile">${ic(isFile ? 'file' : 'link', 18)}</span><span class="row-main"><b>${esc(m.title)}</b><small>${m.note ? esc(m.note) + ' · ' : ''}${meta} · by ${esc(m.by)}</small></span><span class="row-end">${action}</span></div>`;
    }).join('') : empty('book', 'Nothing here yet', canAdd ? 'Publish the handbook or curriculum above.' : 'Resources from Robobox will appear here.')}</div>`;
}
async function addMaterial(): Promise<void> {
  const u = SESSION.get()!; const title = $('mtTitle').value.trim();
  if (!title) { setErr('mtTitleErr', 'Give the resource a title.'); return; }
  const fileInput = $('mtFile'); const file = fileInput.files && fileInput.files[0];
  if (file) {
    if (file.size > MAX_FILE) { setErr('mtTitleErr', `That file is ${(file.size / 1048576).toFixed(1)} MB — the limit is 20 MB.`); return; }
    const id = 'mat_file_' + Date.now();
    try { await fileSave(id, file); } catch (e) { flash('err', 'Could not store the file on this device.'); return; }
    STORE.add('materials', { id, title, note: $('mtNote').value, by: u.name, kind: 'file', fileName: file.name, size: file.size, mime: file.type });
  } else {
    STORE.add('materials', { title, note: $('mtNote').value, by: u.name, kind: 'link', link: $('mtLink').value || '#' });
  }
  flash('ok', 'Published to the library.'); render();
}
async function openFile(id: string): Promise<void> {
  const blob = await fileGet(id);
  if (!blob) { flash('err', 'File not found on this device.'); return; }
  triggerDownload(blob, STORE.get('materials').find((m) => m.id === id)?.fileName || STORE.get('notices').find((n) => n.fileId === id)?.fileName || 'file');
}

/* ================= UPDATES: official comms, holidays, school events, library ================= */
let UPD: 'official' | 'events' | 'library' = 'official';
let PENDING_DEL = ''; // two-tap delete — avoids native confirm(), which sandboxed previews block
const canComms = (u: User) => u.role === 'ceo' && !!leaderOf(u.name)?.comms;
function setUpd(k: 'official' | 'events' | 'library'): void { UPD = k; PENDING_DEL = ''; render(); }
function openOfficial(): void { UPD = 'official'; go('upd'); }
const seenKey = (u: User) => `robobox_seen_${u.role}_${u.name}`;
function unreadNotices(u: User): number {
  let seen = ''; try { seen = localStorage.getItem(seenKey(u)) || ''; } catch (e) { /* ignore */ }
  return STORE.get('notices').filter((n) => n.createdAt > seen && n.by !== u.name).length;
}
function markSeen(u: User): void { try { localStorage.setItem(seenKey(u), new Date().toISOString()); } catch (e) { /* ignore */ } }
function armDel(id: string): void { PENDING_DEL = id; render(); }
const twoTap = (id: string, fn: string, label: string) => PENDING_DEL === id
  ? `<button class="btn sm danger" onclick="${fn}">${ic('trash', 16)}Tap again to delete</button>`
  : `<button class="icon-btn sm" aria-label="${label}" onclick="armDel('${id}')">${ic('trash', 18)}</button>`;
const dateChip = (iso: string) => `<span class="date-chip" aria-hidden="true"><b>${parseD(iso).getDate()}</b><small>${parseD(iso).toLocaleDateString([], { month: 'short' })}</small></span>`;

function updatesView(u: User): string {
  if (UPD === 'official') markSeen(u);
  const seg = (k: 'official' | 'events' | 'library', label: string, icon: string) =>
    `<button role="tab" aria-selected="${UPD === k}" class="segtab${UPD === k ? ' on' : ''}" onclick="setUpd('${k}')">${ic(icon, 16)}${label}</button>`;
  return pageHead('Updates', 'Official communications, holidays, school events and resources.') +
    `<div class="segtabs" role="tablist" aria-label="Updates">${seg('official', 'Official', 'megaphone')}${seg('events', 'School events', 'flag')}${seg('library', 'Library', 'book')}</div>` +
    (UPD === 'official' ? officialInner(u) : UPD === 'events' ? eventsInner(u) : libraryInner(u));
}
function officialInner(u: User): string {
  const can = canComms(u); const today = todayStr(); const year = today.slice(0, 4);
  const notices = STORE.get('notices').slice().sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.createdAt.localeCompare(a.createdAt));
  const hols = STORE.get('holidays').filter((h) => h.date.slice(0, 4) >= year).sort((a, b) => a.date.localeCompare(b.date));
  const next = hols.find((h) => h.date >= today);
  return (can ? `<section class="card"><h3 class="card-title">Post an official update</h3>
      <label class="field-l" for="ntTitle">Title</label><input id="ntTitle" placeholder="e.g. Revised reporting time from 1 December">
      <label class="field-l" for="ntBody">Message</label><textarea id="ntBody" rows="4" placeholder="Goes to every teacher, coordinator and leadership member"></textarea>
      <label class="field-l" for="ntFile">Attachment</label><input id="ntFile" type="file"><p class="hint">Optional · circular, PDF or image, up to 20 MB.</p>
      <p class="err" id="ntFileErr" role="alert"></p>
      <label class="switch-row tight"><input type="checkbox" id="ntPin"><span><b>Pin to top</b><small>Keeps it above newer updates</small></span></label>
      <p class="err" id="ntTitleErr" role="alert"></p>
      <button class="btn block" onclick="postNotice()">${ic('megaphone', 18)}Publish to everyone</button></section>` : '') +
    `<h2 class="section-title">Official communications</h2>
    ${notices.length ? notices.map((n) => `<article class="card notice-card${n.pinned ? ' pinned' : ''}">
      <div class="nc-head"><span class="row-ic tile">${ic(n.pinned ? 'pinI' : 'megaphone', 18)}</span><span class="row-main"><b>${esc(n.title)}</b><small>${fmtD(n.createdAt)} · ${esc(n.by)}${n.pinned ? ' · Pinned' : ''}</small></span>
        ${can ? `<span class="row-end"><button class="icon-btn sm" aria-label="${n.pinned ? 'Unpin' : 'Pin to top'}" aria-pressed="${!!n.pinned}" onclick="pinNotice('${n.id}')">${ic('pinI', 18)}</button>${twoTap(n.id!, `delNotice('${n.id}')`, 'Delete update')}</span>` : ''}</div>
      ${n.body ? `<p class="nc-body">${esc(n.body)}</p>` : ''}
      ${n.fileId ? `<button class="btn ghost sm" onclick="openFile('${n.fileId}')">${ic('download', 16)}${esc(n.fileName)} · ${((n.fileSize || 0) / 1048576).toFixed(1)} MB</button>` : ''}
    </article>`).join('') : `<div class="card">${empty('megaphone', 'No official updates yet', can ? 'Publish the first one above.' : 'Communications from Robobox appear here.')}</div>`}
    <h2 class="section-title">Holidays ${year}</h2>
    ${next ? `<div class="notice brand">${ic('sun', 18)}<span>Next holiday: <b>${esc(next.name)}</b> · ${fmtLong(next.date)}</span></div>` : ''}
    ${can ? `<section class="card"><div class="grid2"><div><label class="field-l" for="hdDate">Date</label><input type="date" id="hdDate"></div>
        <div><label class="field-l" for="hdName">Holiday</label><input id="hdName" placeholder="e.g. Diwali"></div></div>
      <p class="err" id="hdNameErr" role="alert"></p>
      <button class="btn ghost block" onclick="addHoliday()">${ic('plus', 18)}Add holiday</button></section>` : ''}
    <div class="card list">${hols.length ? hols.map((h) => `<div class="row-item compact${h.date < today ? ' past' : ''}">${dateChip(h.date)}
      <span class="row-main"><b>${esc(h.name)}</b><small>${parseD(h.date).toLocaleDateString([], { weekday: 'long', year: h.date.slice(0, 4) !== year ? 'numeric' : undefined })}</small></span>
      ${can ? `<span class="row-end">${twoTap(h.id!, `delHoliday('${h.id}')`, 'Remove holiday')}</span>` : ''}</div>`).join('')
      : empty('sun', 'Holiday list not published yet', can ? 'Add each holiday above.' : 'Manish will publish the yearly holiday list here.')}</div>`;
}
async function postNotice(): Promise<void> {
  const u = SESSION.get()!; if (!canComms(u)) return;
  const title = $('ntTitle').value.trim();
  if (!title) { setErr('ntTitleErr', 'Add a title.'); return; }
  const fi = $('ntFile'); const file = fi.files && fi.files[0];
  const n: Notice = { title, body: $('ntBody').value.trim(), by: u.name, createdAt: new Date().toISOString(), pinned: $('ntPin').checked };
  if (file) {
    if (file.size > MAX_FILE) { setErr('ntFileErr', `That file is ${(file.size / 1048576).toFixed(1)} MB — the limit is 20 MB.`); return; }
    n.fileId = 'ntc_file_' + Date.now(); n.fileName = file.name; n.fileSize = file.size;
    try { await fileSave(n.fileId, file); } catch (e) { flash('err', 'Could not store the attachment on this device.'); return; }
  }
  STORE.add('notices', n); markSeen(u);
  flash('ok', 'Published to everyone.'); render();
}
function pinNotice(id: string): void { const n = STORE.get('notices').find((x) => x.id === id); if (n) STORE.update('notices', id, { pinned: !n.pinned }); render(); }
function delNotice(id: string): void { STORE.remove('notices', id); PENDING_DEL = ''; flash('ok', 'Update deleted.'); render(); }
function addHoliday(): void {
  const date = $('hdDate').value, name = $('hdName').value.trim();
  if (!date || !name) { setErr('hdNameErr', 'Add both the date and the holiday name.'); return; }
  STORE.add('holidays', { date, name }); flash('ok', `${name} added to the holiday list.`); render();
}
function delHoliday(id: string): void { STORE.remove('holidays', id); PENDING_DEL = ''; flash('ok', 'Holiday removed.'); render(); }

/* ---- school events (teachers post; their coordinator and leadership see them) ---- */
const evEnd = (e: SchoolEvent) => e.to || e.date;
const eventOn = (e: SchoolEvent, iso: string) => e.date <= iso && iso <= evEnd(e);
function eventsFor(u: User): SchoolEvent[] {
  const mine = u.role === 'teacher' ? STORE.teacher(u.name)!.schools : u.role === 'mod' ? schoolsOfMod(u.name).map((s) => s.id) : null; // null = all schools
  return STORE.get('events').filter((e) => !mine || mine.includes(e.school));
}
const evTone = (t: string) => t === 'Exams' ? 'amber' : t === 'PTA meeting' ? 'blue' : t === 'Exhibition' ? 'brand' : t === 'School holiday' ? 'green' : 'neutral';
function eventRow(u: User, e: SchoolEvent): string {
  const own = u.role === 'teacher' && e.teacher === u.name;
  return `<div class="row-item${own ? ' wrap-end' : ''}${evEnd(e) < todayStr() ? ' past' : ''}" data-q="${esc((e.title + ' ' + e.type + ' ' + schoolName(e.school)).toLowerCase())}">${dateChip(e.date)}
    <span class="row-main"><b>${esc(e.title || e.type)}</b><small>${esc(schoolName(e.school))} · ${fmtD(e.date)}${e.to && e.to !== e.date ? '–' + fmtD(e.to) : ''} · added by ${esc(e.teacher)}</small>${e.note ? `<small>${esc(e.note)}</small>` : ''}</span>
    <span class="row-end">${badge(e.type, evTone(e.type))}${own ? twoTap(e.id!, `delEvent('${e.id}')`, 'Delete event') : ''}</span></div>`;
}
function eventsInner(u: User): string {
  const today = todayStr(); const all = eventsFor(u);
  const upcoming = all.filter((e) => evEnd(e) >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = all.filter((e) => evEnd(e) < today).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  const t = u.role === 'teacher' ? STORE.teacher(u.name)! : null;
  return (t ? `<section class="card"><h3 class="card-title">Add a school event</h3>
      <div class="grid2"><div><label class="field-l" for="evSchool">School</label><select id="evSchool">${schoolsOfTeacher(t).map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
        <div><label class="field-l" for="evType">Type</label><select id="evType">${CONFIG.eventTypes.map((x) => `<option>${x}</option>`).join('')}</select></div></div>
      <label class="field-l" for="evTitle">Title</label><input id="evTitle" placeholder="e.g. Annual science exhibition">
      <div class="grid2"><div><label class="field-l" for="evDate">From</label><input type="date" id="evDate" value="${today}"></div>
        <div><label class="field-l" for="evTo">To</label><input type="date" id="evTo"></div></div>
      <p class="hint">Leave "To" empty for a one-day event.</p>
      <label class="field-l" for="evNote">Details</label><textarea id="evNote" rows="2" placeholder="Optional — timings, classes affected, anything needed from Robobox"></textarea>
      <p class="err" id="evToErr" role="alert"></p>
      <button class="btn block" onclick="addEvent()">${ic('plus', 18)}Add event</button></section>` : '') +
    `<h2 class="section-title">Upcoming${u.role === 'mod' ? ' at your schools' : t ? ` at your school${t.schools.length > 1 ? 's' : ''}` : ''}</h2>
    ${u.role === 'ceo' && upcoming.length > 5 ? searchBox('evList', 'Search school or event') : ''}
    <div class="card list" id="evList">${upcoming.length ? upcoming.map((e) => eventRow(u, e)).join('') : empty('flag', 'No upcoming school events', t ? 'Add exhibitions, PTAs, exams and other school dates above.' : 'Teachers add exhibitions, PTAs and exams here.')}</div>
    ${past.length ? `<h2 class="section-title">Past</h2><div class="card list">${past.map((e) => eventRow(u, e)).join('')}</div>` : ''}`;
}
function addEvent(): void {
  const u = SESSION.get()!; const date = $('evDate').value, to = $('evTo').value;
  if (!date) { setErr('evToErr', 'Pick the event date.'); return; }
  if (to && to < date) { setErr('evToErr', 'The end date must be on or after the start date.'); return; }
  const type = $('evType').value;
  STORE.add('events', { school: $('evSchool').value, teacher: u.name, type, title: $('evTitle').value.trim() || type, date, to: to || undefined, note: $('evNote').value.trim(), createdAt: new Date().toISOString() });
  flash('ok', 'Event added — your coordinator can see it.'); render();
}
function delEvent(id: string): void { STORE.remove('events', id); PENDING_DEL = ''; flash('ok', 'Event deleted.'); render(); }
// Teacher home: next company holiday + the next few events at their schools.
function comingUp(u: User): string {
  const today = todayStr();
  const hol = STORE.get('holidays').filter((h) => h.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const evs = eventsFor(u).filter((e) => evEnd(e) >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  if (!hol && !evs.length) return '';
  return `<h2 class="section-title">Coming up</h2><div class="card list">
    ${hol ? `<div class="row-item compact">${dateChip(hol.date)}<span class="row-main"><b>${esc(hol.name)}</b><small>Company holiday · ${parseD(hol.date).toLocaleDateString([], { weekday: 'long' })}</small></span><span class="row-end">${badge('Holiday', 'red')}</span></div>` : ''}
    ${evs.map((e) => eventRow(u, e)).join('')}</div>`;
}

/* ================= COORDINATOR ================= */
function mTeachers(u: User): string {
  const ts = teachersOfMod(u.name); const names = ts.map((t) => t.name); const today = todayStr();
  const away = STORE.get('leaves').filter((l) => names.includes(l.teacher) && l.status === 'Approved' && l.to >= today).sort((a, b) => a.from.localeCompare(b.from));
  const pending = STORE.get('leaves').filter((l) => names.includes(l.teacher) && l.status === 'Pending');
  const leaveCard = (away.length || pending.length) ? `<section class="card">
      <div class="card-head"><b>${ic('calx', 18)} Teachers on leave</b><span class="muted">${away.filter((l) => leaveCovers(l, today)).length} today</span></div>
      ${away.map((l) => `<div class="row-item compact"><span class="avatar">${initials(l.teacher)}</span><span class="row-main"><b>${esc(l.teacher)}</b><small>${esc(l.type)} · ${fmtD(l.from)}${l.to !== l.from ? '–' + fmtD(l.to) : ''}</small></span><span class="row-end">${leaveCovers(l, today) ? badge('On leave today', 'amber') : badge('Upcoming', 'neutral')}</span></div>`).join('')}
      ${pending.length ? `<p class="hint">${pending.length} awaiting approval from Parth or Manish: ${pending.map((l) => esc(l.teacher)).join(', ')}.</p>` : ''}
    </section>` : '';
  return pageHead('My teachers', `${ts.length} teachers · ${schoolsOfMod(u.name).length} schools`, `<button class="btn ghost sm" onclick="reportCoordTeachers('${esc(u.name)}')">${ic('download', 16)}Report</button>`) +
    leaveCard + searchBox('tList', 'Search teachers') +
    `<div class="card list" id="tList">${ts.map((t) => {
      const rag = teacherRag(t.name); const lv = leaveOn(t.name);
      return `<button class="row-item tap" data-q="${esc(t.name.toLowerCase())}" onclick="openTeacher('${esc(t.name)}')"><span class="avatar">${initials(t.name)}</span>
        <span class="row-main"><b>${esc(t.name)}</b><small>${esc(schoolsOfTeacher(t).map((s) => s.name).join(', '))} · avg delay ${avgLate(t.name)} min</small></span>
        <span class="row-end">${lv ? badge('On leave', 'amber') : ''}${rag.avg != null ? `<span class="score">${rag.avg.toFixed(1)}</span>` : ''}${ragPill(rag.key)}${ic('chevR', 18)}</span></button>`;
    }).join('')}</div>`;
}
// Performance block (KPIs + visit history with action plans). Coordinators and leadership only —
// teachers never see scores.
function perfInner(name: string): string {
  const fb = teacherFeedback(name).slice().reverse(); // oldest first
  const scored = fb.filter((f) => f.score != null) as (Feedback & { score: number })[];
  const first = scored[0]?.score; const last = scored[scored.length - 1]?.score;
  const trend = (first != null && last != null && scored.length > 1)
    ? (last > first + 0.1 ? `<span class="trend up">${ic('up', 16)}Improving</span>` : last < first - 0.1 ? `<span class="trend down">${ic('down', 16)}Declining</span>` : '<span class="trend">Steady</span>')
    : '<span class="trend">Needs 2+ visits</span>';
  let prev: number | null = null;
  const rows = fb.map((f) => {
    const s = f.score; const delta = (s != null && prev != null) ? s - prev : null; if (s != null) prev = s;
    const dstr = delta == null ? '' : delta > 0.05 ? `<span class="delta up">+${delta.toFixed(1)}</span>` : delta < -0.05 ? `<span class="delta down">−${Math.abs(delta).toFixed(1)}</span>` : '<span class="delta">±0</span>';
    return `<div class="visit">
      <div class="visit-top"><span class="row-main"><b>${fmtD(f.date)} · ${esc(schoolName(f.school))}</b><small>${esc(f.judgement.improvement)} · by ${esc(f.mod)}</small></span>
        <span class="row-end"><span class="score">${s != null ? s.toFixed(1) : '—'}</span>${dstr}${ragPill(f.rag)}</span></div>
      <div class="bar"><span style="width:${s != null ? Math.round((s / 5) * 100) : 0}%;background:var(--${f.rag})"></span></div>
      ${f.actionPlan ? `<div class="plan">${ic('target', 16)}<div><b>Action plan</b><p>${esc(f.actionPlan)}</p>${f.nextVisit ? `<small>Next visit: ${fmtLong(f.nextVisit)}</small>` : ''}</div></div>` : ''}
    </div>`;
  }).join('');
  return `<div class="kpis">
      <div class="stat"><div class="stat-top"><span class="stat-ic">${ic('chart', 16)}</span><span class="stat-l">Trend</span></div><div class="stat-n sm">${trend}</div></div>
      ${kpi('Avg score', scored.length ? (scored.reduce((a, b) => a + b.score, 0) / scored.length).toFixed(1) : '—', 'target')}
      ${kpi('Delay · week', avgLateWindow(name, 'week') + ' min', 'clock')}
      ${kpi('Delay · month', avgLateWindow(name, 'month') + ' min', 'calendar')}
    </div>
    <h2 class="section-title">Visit history</h2>
    <div class="card">${fb.length ? rows : empty('pin', 'No visits yet', 'Scores and action plans appear after a classroom visit.')}</div>`;
}
function teacherDetail(u: User, name: string): string {
  const t = STORE.teacher(name)!; const lv = leaveOn(name);
  const tasks = STORE.get('tasks').filter((x) => x.teacher === name).slice().reverse();
  return backLink(u.role === 'mod' ? 'My teachers' : 'All teachers', 'closeTeacher()') +
    pageHead(esc(name), esc(schoolsOfTeacher(t).map((s) => s.name).join(', ')) + (u.role === 'ceo' ? ` · Coordinator ${esc(t.mod)}` : '')) +
    (lv ? `<div class="notice info">${ic('calx', 18)}<span>On approved ${esc(lv.type.toLowerCase())} leave until ${fmtD(lv.to)}.</span></div>` : '') +
    perfInner(name) +
    (u.role === 'mod' ? `<h2 class="section-title">Tasks</h2>
      <section class="card"><label class="field-l" for="tkTitle">Assign a task</label><input id="tkTitle" placeholder="e.g. Submit Module 3 lesson plan">
        <div class="grid2"><div><label class="field-l" for="tkDue">Due</label><input id="tkDue" type="date" min="${todayStr()}"></div><div><label class="field-l" for="tkDetail">Detail</label><input id="tkDetail" placeholder="Optional"></div></div>
        <p class="err" id="tkTitleErr" role="alert"></p>
        <button class="btn block" onclick="addTask('${esc(name)}')">${ic('send', 18)}Send to ${esc(name)}</button></section>
      ${tasks.length ? `<div class="card list">${tasks.map((x) => taskRow(x, false)).join('')}</div>` : ''}` : '');
}
function addTask(teacher: string): void {
  const u = SESSION.get()!; const title = $('tkTitle').value.trim();
  if (!title) { setErr('tkTitleErr', 'Give the task a title.'); return; }
  STORE.add('tasks', { teacher, title, detail: $('tkDetail').value, due: $('tkDue').value, by: u.name, status: 'Assigned' });
  flash('ok', `Task sent to ${teacher}.`); render();
}

/* ---- visit + feedback form ---- */
let VISIT: Visit | null = null;
function mVisit(u: User): string {
  const schools = schoolsOfMod(u.name);
  const todays = STORE.get('plans').filter((p) => p.mod === u.name && p.status === 'Planned' && p.date === todayStr());
  const evToday = eventsFor(u).filter((e) => eventOn(e, todayStr()));
  return pageHead('Classroom visit', `Feedback unlocks only inside the school's ${CONFIG.geofenceMeters} m geofence.`) +
    (evToday.length ? `<div class="notice info">${ic('flag', 18)}<span>Today at your schools: ${evToday.map((e) => `<b>${esc(e.title || e.type)}</b> at ${esc(schoolName(e.school))}`).join(', ')}</span></div>` : '') +
    (todays.length ? `<div class="notice brand">${ic('calendar', 18)}<span>Planned today: <b>${todays.map((p) => esc(schoolName(p.school))).join(', ')}</b></span></div>` : '') +
    `<section class="card">
      <label class="field-l" for="vSchool">School</label>
      <select id="vSchool">${schools.map((s) => `<option value="${s.id}"${todays.some((p) => p.school === s.id) ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
      <button class="btn block" onclick="unlockVisit()">${ic('pin', 18)}Verify I'm at this school</button>
      <p class="hint">First visit to a school? You'll be asked to set its geofence to where you're standing.</p>
    </section>
    <h2 class="section-title">Recent visits</h2>
    <div class="card list">${STORE.get('feedback').filter((f) => f.mod === u.name).slice(-8).reverse().map(visitRow).join('') || empty('pin', 'No visits logged yet', 'Your submitted feedback appears here.')}</div>`;
}
function visitRow(f: Feedback): string {
  return `<button class="row-item tap" onclick="openTeacherTab('${esc(f.teacher)}')"><span class="avatar">${initials(f.teacher)}</span>
    <span class="row-main"><b>${esc(f.teacher)}</b><small>${esc(schoolName(f.school))} · ${fmtD(f.date)}${f.nextVisit ? ' · next ' + fmtD(f.nextVisit) : ''}</small></span>
    <span class="row-end"><span class="score">${f.score != null ? f.score.toFixed(1) : '—'}</span>${ragPill(f.rag)}</span></button>`;
}
function openTeacherTab(name: string): void { const u = SESSION.get()!; TAB[u.role] = 'teachers'; openTeacher(name); }
async function unlockVisit(): Promise<void> {
  const school = STORE.school($('vSchool').value)!;
  flash('warn', `Verifying your location at ${school.name}…`);
  try {
    const g = await atSchool(school);
    if (!g) { flash('warn', 'Cancelled.'); return; }
    if (!g.ok) { flash('err', `You are ${Math.round(g.dist)} m away — move within ${CONFIG.geofenceMeters} m to open the form.`); return; }
    VISIT = { school: school.id, teacher: null, ratings: {}, critical: {}, judgement: {}, step: 'pickTeacher' };
    flash('ok', 'Location verified.'); render(); window.scrollTo(0, 0);
  } catch (e) { flash('err', (e as Error).message); }
}
function mForm(): string {
  const v = VISIT!; const school = STORE.school(v.school)!;
  if (v.step === 'pickTeacher') {
    return backLink('Cancel visit', 'cancelVisit()') + pageHead(esc(school.name), 'Location verified — pick the teacher you observed.') +
      `<div class="card list">${teachersAtSchool(school.id).map((t) => `<button class="row-item tap" onclick="pickVisitTeacher('${esc(t.name)}')"><span class="avatar">${initials(t.name)}</span><span class="row-main"><b>${esc(t.name)}</b></span><span class="row-end">${leaveOn(t.name) ? badge('On leave', 'amber') : ''}${ic('chevR', 18)}</span></button>`).join('')}</div>`;
  }
  const rq = (id: string, label: string) => `<div class="q"><div class="qt">${esc(label)}</div>
    <div class="rate" role="group" aria-label="${esc(label)}">${CONFIG.ratingScale.map((r) => `<button title="${r.label}" aria-label="${r.v} — ${r.label}" onclick="setRate(this,'${id}',${r.v})">${r.v}</button>`).join('')}<button class="na" onclick="setRate(this,'${id}','na')">N/A</button></div></div>`;
  const cq = (id: string, label: string, opts: string[]) => `<div class="q"><div class="qt">${esc(label)}</div>
    <div class="rate" role="group" aria-label="${esc(label)}">${opts.map((o) => { const cls = o === 'Yes' ? 'yes' : o === 'No' ? 'no' : ''; return `<button class="${cls}${v.critical[id] === o ? ' on' : ''}" onclick="setCritical(this,'${id}','${o}')">${o}</button>`; }).join('')}</div></div>`;
  const today = todayStr();
  return backLink('Teachers', 'backToPickTeacher()') + pageHead('Visit feedback', `${esc(v.teacher)} · ${esc(school.name)} · ${fmtD(today)}`) +
    `<section class="card"><div class="grid3">
      <div><label class="field-l" for="vGrade">Grade / batch</label><select id="vGrade">${CONFIG.grades.map((g) => `<option>${g}</option>`).join('')}</select></div>
      <div><label class="field-l" for="vModule">Module</label><select id="vModule">${CONFIG.modules.map((m) => `<option>${m}</option>`).join('')}</select></div>
      <div><label class="field-l" for="vStudents">Students present</label><input id="vStudents" type="number" inputmode="numeric" min="0" value="0"></div></div></section>
    <div class="rag-sticky"><span><b>Auto status</b><small>Calculated from your ratings — not set manually</small></span><span id="ragLive">${ragLiveHtml(v)}</span></div>
    ${CONFIG.pillars.map((p) => `<h2 class="section-title">${p.id} · ${p.name}</h2><section class="card">${p.q.map((q) => rq(q[0], q[0] + '. ' + q[1])).join('')}</section>`).join('')}
    <h2 class="section-title">Critical standards</h2><section class="card">${CONFIG.critical.map((c) => cq(c[0], c[0] + '. ' + c[1], c[2])).join('')}</section>
    <h2 class="section-title">Coordinator judgement</h2><section class="card">
      <label class="field-l" for="jInd">Comfortable with this teacher handling the class independently?</label><select id="jInd">${CONFIG.judgement.independence.map((o) => `<option>${o}</option>`).join('')}</select>
      <label class="field-l" for="jImp">Main improvement area</label><select id="jImp">${CONFIG.judgement.improvement.map((o) => `<option>${o}</option>`).join('')}</select>
      <label class="field-l" for="jAct">Action required</label><select id="jAct">${CONFIG.judgement.action.map((o) => `<option>${o}</option>`).join('')}</select>
      <label class="field-l" for="jNote">Observation / evidence</label><textarea id="jNote" rows="2" placeholder="One short example, especially for a 1 or 2"></textarea></section>
    <h2 class="section-title">Action plan & next visit</h2><section class="card">
      <label class="field-l" for="jPlan">Action plan for ${esc(v.teacher)} <span class="req-tag">Required</span></label>
      <textarea id="jPlan" rows="4" placeholder="What will the teacher work on before your next visit, and what support will you give?"></textarea>
      <p class="err" id="jPlanErr" role="alert"></p>
      <label class="field-l" for="jNext">Next visit date <span class="req-tag">Required</span></label>
      <div class="chips">${([[7, '+1 week'], [14, '+2 weeks'], [30, '+1 month']] as [number, string][]).map(([n, l]) => `<button class="chip" onclick="setNext(${n})">${l}</button>`).join('')}</div>
      <input id="jNext" type="date" min="${addDays(today, 1)}">
      <p class="hint">Added to your calendar automatically.</p>
      <p class="err" id="jNextErr" role="alert"></p></section>
    <button class="btn block lg" onclick="submitVisit()">${ic('check', 18)}Submit feedback</button>`;
}
function ragLiveHtml(v: Visit): string {
  const hasInput = Object.values(v.ratings).some((x) => typeof x === 'number') || Object.values(v.critical).some((x) => x && x !== '');
  return hasInput ? ragPill(computeRag(v.ratings, v.critical)) : badge('Awaiting ratings');
}
function setNext(days: number): void { $('jNext').value = addDays(todayStr(), days); setErr('jNextErr', ''); }
function updateRagLive(): void { const el = document.getElementById('ragLive'); if (el && VISIT) el.innerHTML = ragLiveHtml(VISIT); }
function pickVisitTeacher(name: string): void { VISIT!.teacher = name; VISIT!.step = 'form'; render(); window.scrollTo(0, 0); }
function backToPickTeacher(): void { VISIT!.step = 'pickTeacher'; render(); }
function cancelVisit(): void { VISIT = null; render(); }
// Taps toggle in place (no re-render, so other fields aren't wiped) and refresh the live RAG.
function pickIn(btn: HTMLElement): void { btn.parentElement!.querySelectorAll('button').forEach((b) => b.classList.remove('on')); btn.classList.add('on'); }
function setCritical(btn: HTMLElement, id: string, value: string): void { VISIT!.critical[id] = value; pickIn(btn); updateRagLive(); }
function setRate(btn: HTMLElement, id: string, v: number | 'na'): void { VISIT!.ratings[id] = v; pickIn(btn); updateRagLive(); }
function submitVisit(): void {
  const u = SESSION.get()!; const v = VISIT!; const today = todayStr();
  const actionPlan = $('jPlan').value.trim(); const nextVisit = $('jNext').value;
  const planErr = actionPlan.length < 10 ? 'Write a short action plan — at least a sentence.' : '';
  const nextErr = !nextVisit ? 'Pick the next visit date.' : nextVisit <= today ? 'The next visit must be after today.' : '';
  setErr('jPlanErr', planErr); setErr('jNextErr', nextErr);
  if (planErr || nextErr) { $(planErr ? 'jPlan' : 'jNext').focus(); flash('err', 'Add the action plan and next visit date.'); return; }
  const ratings: Record<string, number> = {};
  Object.entries(v.ratings).forEach(([k, val]) => { if (typeof val === 'number') ratings[k] = val; });
  const safety = v.critical['N9'] === 'Yes';
  const fb: Feedback = {
    mod: u.name, teacher: v.teacher as string, school: v.school, date: today,
    grade: $('vGrade').value, module: $('vModule').value, students: +$('vStudents').value || 0,
    ratings, critical: v.critical,
    judgement: { independence: $('jInd').value, improvement: $('jImp').value, action: $('jAct').value },
    rag: computeRag(v.ratings, v.critical), note: $('jNote').value, safety, score: null, actionPlan, nextVisit,
  };
  fb.score = visitScore(fb);
  STORE.add('feedback', fb);
  // Close today's planned visit to this school, and put the follow-up on the calendar.
  const plan = STORE.get('plans').find((p) => p.mod === u.name && p.school === fb.school && p.date === today && p.status === 'Planned');
  if (plan) STORE.update('plans', plan.id!, { status: 'Done' });
  STORE.add('plans', { mod: u.name, school: fb.school, date: nextVisit, teacher: fb.teacher, note: `Follow-up: ${fb.teacher}`, status: 'Planned' });
  VISIT = null;
  flash(safety ? 'warn' : 'ok', `Feedback saved · next visit ${fmtD(nextVisit)} added to your calendar${safety ? ' · safety concern flagged' : ''}.`);
  render(); window.scrollTo(0, 0);
}

/* ---- calendar ---- */
let CAL = { offset: 0, day: '' };
function calNav(d: number): void { CAL.offset += d; render(); }
function calPick(iso: string): void { CAL.day = iso; render(); }
function mCalendar(u: User): string {
  const today = todayStr(); const day = CAL.day || today;
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + CAL.offset);
  const y = base.getFullYear(), m = base.getMonth(); const dim = new Date(y, m + 1, 0).getDate(); const lead = (base.getDay() + 6) % 7; // Monday first
  const plans = STORE.get('plans').filter((p) => p.mod === u.name);
  const visits = STORE.get('feedback').filter((f) => f.mod === u.name);
  const names = teachersOfMod(u.name).map((t) => t.name);
  const leaves = STORE.get('leaves').filter((l) => names.includes(l.teacher) && l.status === 'Approved');
  const events = eventsFor(u); const hols = STORE.get('holidays');
  const cells: string[] = [];
  for (let i = 0; i < lead; i++) cells.push('<span class="cal-pad"></span>');
  for (let d = 1; d <= dim; d++) {
    const iso = isoLocal(new Date(y, m, d));
    const p = plans.some((x) => x.date === iso && x.status === 'Planned'), v = visits.some((x) => x.date === iso), l = leaves.some((x) => leaveCovers(x, iso));
    const e = events.some((x) => eventOn(x, iso)), h = hols.some((x) => x.date === iso);
    cells.push(`<button class="cal-day${iso === today ? ' today' : ''}${iso === day ? ' sel' : ''}" onclick="calPick('${iso}')" aria-label="${fmtLong(iso)}${p ? ', visit planned' : ''}${v ? ', visited' : ''}${l ? ', teacher on leave' : ''}${e ? ', school event' : ''}${h ? ', holiday' : ''}" ${iso === day ? 'aria-pressed="true"' : ''}>
      <span>${d}</span><span class="cal-dots">${p ? '<i class="d-plan"></i>' : ''}${v ? '<i class="d-visit"></i>' : ''}${e ? '<i class="d-event"></i>' : ''}${h ? '<i class="d-hol"></i>' : ''}${l ? '<i class="d-leave"></i>' : ''}</span></button>`);
  }
  const dayPlans = plans.filter((p) => p.date === day);
  const dayVisits = visits.filter((f) => f.date === day);
  const dayLeaves = leaves.filter((l) => leaveCovers(l, day));
  const dayEvents = events.filter((e) => eventOn(e, day)); const dayHols = hols.filter((h) => h.date === day);
  const upcoming = plans.filter((p) => p.status === 'Planned' && p.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  const planRow = (p: VisitPlan, showDate: boolean) => `<div class="row-item"><span class="row-ic">${ic(p.teacher ? 'target' : 'pin', 18)}</span>
    <span class="row-main"><b>${esc(schoolName(p.school))}</b><small>${showDate ? fmtLong(p.date) + (p.note ? ' · ' : '') : ''}${p.note ? esc(p.note) : ''}</small></span>
    <span class="row-end">${p.status === 'Done' ? badge('Done', 'green') : p.date < today ? badge('Missed', 'red')
      : `<button class="btn ghost sm" onclick="donePlan('${p.id}')">${ic('check', 16)}Done</button><button class="icon-btn sm" aria-label="Remove plan" onclick="delPlan('${p.id}')">${ic('x', 18)}</button>`}</span></div>`;
  return pageHead('Calendar', 'Plan your visits for the month. Follow-ups from visit feedback are added here automatically.') +
    `<section class="card cal">
      <div class="cal-head"><button class="icon-btn" aria-label="Previous month" onclick="calNav(-1)">${ic('chevL')}</button>
        <b>${base.toLocaleDateString([], { month: 'long', year: 'numeric' })}</b>
        <button class="icon-btn" aria-label="Next month" onclick="calNav(1)">${ic('chevR')}</button></div>
      <div class="cal-grid cal-wk">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w) => `<span>${w}</span>`).join('')}</div>
      <div class="cal-grid">${cells.join('')}</div>
      <div class="cal-legend"><span><i class="d-plan"></i>Planned</span><span><i class="d-visit"></i>Visited</span><span><i class="d-event"></i>School event</span><span><i class="d-hol"></i>Holiday</span><span><i class="d-leave"></i>Teacher on leave</span></div>
    </section>
    <h2 class="section-title">${fmtLong(day)}</h2>
    <div class="card list">${dayHols.map((h) => `<div class="row-item"><span class="row-ic tile">${ic('sun', 18)}</span><span class="row-main"><b>${esc(h.name)}</b><small>Company holiday</small></span><span class="row-end">${badge('Holiday', 'red')}</span></div>`).join('')}
      ${dayEvents.map((e) => eventRow(u, e)).join('')}
      ${dayPlans.map((p) => planRow(p, false)).join('')}
      ${dayVisits.map(visitRow).join('')}
      ${dayLeaves.map((l) => `<div class="row-item"><span class="avatar">${initials(l.teacher)}</span><span class="row-main"><b>${esc(l.teacher)}</b><small>${esc(l.type)} leave · until ${fmtD(l.to)}</small></span><span class="row-end">${badge('On leave', 'amber')}</span></div>`).join('')}
      ${dayPlans.length + dayVisits.length + dayLeaves.length + dayEvents.length + dayHols.length ? '' : empty('calendar', 'Nothing on this day', day >= today ? 'Plan a visit below.' : '')}</div>
    <section class="card"><h3 class="card-title">Plan a visit</h3>
      <label class="field-l" for="plSchool">School</label><select id="plSchool">${schoolsOfMod(u.name).map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
      <div class="grid2"><div><label class="field-l" for="plDate">Date</label><input type="date" id="plDate" value="${day >= today ? day : today}" min="${today}"></div>
        <div><label class="field-l" for="plNote">Note</label><input id="plNote" placeholder="Optional"></div></div>
      <button class="btn block" onclick="addPlan()">${ic('plus', 18)}Add to calendar</button></section>
    <h2 class="section-title">Upcoming</h2>
    <div class="card list">${upcoming.length ? upcoming.map((p) => planRow(p, true)).join('') : empty('calendar', 'No upcoming visits', 'Add one above, or submit a visit to schedule its follow-up.')}</div>`;
}
function addPlan(): void {
  const u = SESSION.get()!; const date = $('plDate').value;
  if (!date) { flash('err', 'Pick a date.'); return; }
  STORE.add('plans', { mod: u.name, school: $('plSchool').value, date, note: $('plNote').value, status: 'Planned' });
  CAL.day = date; flash('ok', `Visit added for ${fmtD(date)}.`); render();
}
function donePlan(id: string): void { STORE.update('plans', id, { status: 'Done' }); render(); }
function delPlan(id: string): void { STORE.remove('plans', id); flash('ok', 'Plan removed.'); render(); }

/* ---- component requests (coordinator) ---- */
let RQF = 'Submitted';
function setRQF(k: string): void { RQF = k; render(); }
function mRequests(u: User): string {
  const all = STORE.get('requests').filter((r) => r.mod === u.name).sort((a, b) => (b.createdAt || b.id || '').localeCompare(a.createdAt || a.id || ''));
  const open = all.filter((r) => reqStatus(r) === 'Submitted');
  const list = RQF === 'All' ? all : all.filter((r) => reqStatus(r) === RQF);
  const chip = (k: string, label: string) => `<button class="chip${RQF === k ? ' on' : ''}" aria-pressed="${RQF === k}" onclick="setRQF('${k}')">${label} <span>${k === 'All' ? all.length : all.filter((r) => reqStatus(r) === k).length}</span></button>`;
  return pageHead('Component requests', 'From your teachers. Download for operations, then mark as sent.',
    `<button class="btn sm" onclick="dlRequests()">${ic('download', 16)}Excel (${open.length})</button><button class="btn ghost sm" onclick="emailOps()">${ic('mail', 16)}Email ops</button>`) +
    `<div class="chips">${chip('Submitted', 'New')}${chip('Sent to Ops', 'Sent to ops')}${chip('Fulfilled', 'Fulfilled')}${chip('All', 'All')}</div>
    ${RQF === 'Submitted' && open.length ? `<button class="link-btn" onclick="markAllSent()">${ic('check', 16)}Mark all ${open.length} as sent to operations</button>` : ''}
    ${list.length ? list.map((r) => {
      const st = reqStatus(r);
      return `<section class="card req">
        <div class="req-head"><span class="avatar">${initials(r.teacher)}</span><span class="row-main"><b>${esc(r.teacher)}</b><small>${esc(r.ref || 'Request')} · ${r.createdAt ? fmtD(r.createdAt) : ''}${r.school ? ' · ' + esc(schoolName(r.school)) : ''}</small></span>${badge(st, reqTone(st))}</div>
        <p class="req-proj">${ic('package', 16)}${esc(kitLabel(r.project))}</p>
        <table class="tbl lines"><thead><tr><th>Component</th><th class="num">Qty</th></tr></thead><tbody>${reqLines(r).map((l) => `<tr><td>${esc(l.component)}</td><td class="num">${l.qty}</td></tr>`).join('')}</tbody></table>
        ${r.note ? `<p class="req-note">“${esc(r.note)}”</p>` : ''}
        ${st === 'Submitted' ? `<button class="btn ghost block" onclick="markReq('${r.id}','Sent to Ops')">${ic('send', 16)}Mark sent to operations</button>`
          : st === 'Sent to Ops' ? `<button class="btn ghost block" onclick="markReq('${r.id}','Fulfilled')">${ic('check', 16)}Mark fulfilled</button>` : ''}
      </section>`;
    }).join('') : `<div class="card">${empty('package', RQF === 'Submitted' ? 'No new requests' : 'Nothing here', 'Teacher requests appear here as they come in.')}</div>`}`;
}
function openRequests(): Requisition[] { const u = SESSION.get()!; return STORE.get('requests').filter((r) => r.mod === u.name && reqStatus(r) === 'Submitted'); }
function dlRequests(): void {
  const u = SESSION.get()!; const reqs = openRequests();
  if (!reqs.length) { flash('warn', 'No new requests to download.'); return; }
  const rows: unknown[][] = [['Ref', 'Date', 'Teacher', 'School', 'Coordinator', 'Project', 'Component', 'Quantity', 'Note']];
  reqs.forEach((r) => reqLines(r).forEach((l) => rows.push([r.ref || '', r.createdAt ? r.createdAt.slice(0, 10) : '', r.teacher, schoolName(r.school), u.name, kitLabel(r.project), l.component, l.qty, r.note])));
  downloadXLSX(`robobox-component-requests-${u.name}-${todayStr()}.xlsx`, rows, 'Component requests');
  flash('ok', `Downloaded ${reqs.length} request${reqs.length > 1 ? 's' : ''}. Attach it to your email to operations.`);
}
function emailOps(): void {
  const u = SESSION.get()!; const reqs = openRequests();
  if (!reqs.length) { flash('warn', 'No new requests to email.'); return; }
  const body = [`Hi team,`, ``, `Component requests from ${u.name}'s teachers (Excel attached):`, ``,
    ...reqs.map((r) => `${r.ref || 'Request'} · ${r.teacher} · ${schoolName(r.school)} · ${kitLabel(r.project)}\n` + reqLines(r).map((l) => `   - ${l.component} x${l.qty}`).join('\n')),
    ``, `Thanks,`, u.name].join('\n').slice(0, 1800);
  const subject = `Component requests · ${u.name} · ${fmtD(todayStr())}`;
  window.location.href = `mailto:${encodeURIComponent(CONFIG.opsEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
function markReq(id: string, status: string): void { STORE.update('requests', id, { status }); flash('ok', `Marked ${status === 'Fulfilled' ? 'fulfilled' : 'sent to operations'}.`); render(); }
function markAllSent(): void { const n = openRequests().length; openRequests().forEach((r) => STORE.update('requests', r.id!, { status: 'Sent to Ops' })); flash('ok', `${n} request${n > 1 ? 's' : ''} marked sent to operations.`); render(); }

/* ================= LEADERSHIP (Parth, Manish, Outsight) ================= */
function ragCounts(teachers: Teacher[]): Record<RagOrNone, number> {
  const c: Record<RagOrNone, number> = { green: 0, amber: 0, red: 0, none: 0 };
  teachers.forEach((t) => { c[teacherRag(t.name).key]++; });
  return c;
}
function cOverview(u: User): string {
  const ts = STORE.get('teachers'); const c = ragCounts(ts); const n = ts.length || 1; const today = todayStr();
  const visits = STORE.get('feedback'); const safety = visits.filter((f) => f.safety);
  const month = visits.filter((f) => f.date.startsWith(today.slice(0, 7))).length;
  const attention = ts.map((t) => ({ t, fb: teacherFeedback(t.name)[0] })).filter((x) => x.fb && (x.fb.rag === 'red' || x.fb.rag === 'amber'))
    .sort((a, b) => (a.fb.rag === 'red' ? 0 : 1) - (b.fb.rag === 'red' ? 0 : 1));
  const leaves = STORE.get('leaves'); const onLeave = leaves.filter((l) => l.status === 'Approved' && leaveCovers(l, today)); const pending = leaves.filter((l) => l.status === 'Pending');
  const seg = (k: RagOrNone, label: string) => c[k] ? `<span class="seg-${k}" style="width:${(c[k] / n) * 100}%" title="${label}: ${c[k]}"></span>` : '';
  return pageHead('Network overview', `All schools · ${fmtLong(today)}`) +
    `<div class="kpis">${kpi('Teachers', ts.length, 'users')}${kpi('Schools', STORE.get('schools').length, 'home')}${kpi('Coordinators', STORE.get('moderators').length, 'briefcase')}${kpi('Visits · this month', month, 'pin')}</div>
    <h2 class="section-title">Teacher status</h2>
    <section class="card"><div class="stack" role="img" aria-label="Green ${c.green}, Amber ${c.amber}, Red ${c.red}, Not rated ${c.none}">${seg('green', 'Green')}${seg('amber', 'Amber')}${seg('red', 'Red')}${seg('none', 'Not rated')}</div>
      <div class="legend">${(['green', 'amber', 'red', 'none'] as RagOrNone[]).map((k) => `<span><i class="seg-${k}"></i><b>${c[k]}</b>${k === 'green' ? 'On track' : k === 'amber' ? 'Coaching needed' : k === 'red' ? 'Urgent' : 'Not rated'}</span>`).join('')}</div></section>
    ${safety.length ? `<div class="notice err">${ic('alert', 18)}<span><b>${safety.length} safety concern${safety.length > 1 ? 's' : ''} flagged</b> — escalate immediately.</span></div>` : ''}
    ${isTop(u) ? `<section class="card split"><div>${kpi('On leave today', onLeave.length, 'calx')}</div><div>${kpi('Leave awaiting you', pending.length, 'clock', pending.length ? 'amber' : '')}</div>
      ${pending.length ? `<button class="btn block" onclick="go('leave')">Review leave</button>` : ''}</section>` : ''}
    <h2 class="section-title">Needs attention</h2>
    <div class="card list">${attention.length ? attention.slice(0, 10).map(({ t, fb }) => `<button class="row-item tap" onclick="openTeacher('${esc(t.name)}')"><span class="avatar">${initials(t.name)}</span>
      <span class="row-main"><b>${esc(t.name)}</b><small>${esc(t.mod)} · ${esc(fb.judgement.action)} · ${fmtD(fb.date)}</small></span><span class="row-end">${ragPill(fb.rag)}${ic('chevR', 18)}</span></button>`).join('')
      : empty('check', 'No amber or red teachers', 'Teachers flagged in their latest visit appear here.')}</div>`;
}
function cTeachers(u: User): string {
  const order: Record<RagOrNone, number> = { red: 0, amber: 1, green: 2, none: 3 };
  const ts = STORE.get('teachers').map((t) => ({ t, rag: teacherRag(t.name) })).sort((a, b) => order[a.rag.key] - order[b.rag.key]);
  return pageHead('Teachers', 'Sorted by risk — red first. Tap a teacher for their trend.',
    `<button class="btn ghost sm" onclick="reportAllTeachers()">${ic('download', 16)}Teachers</button><button class="btn ghost sm" onclick="reportVisits()">${ic('download', 16)}Visit log</button>`) +
    searchBox('tTable', 'Search teacher or coordinator') +
    `<div class="card flush"><div class="table-wrap"><table class="tbl clickable"><thead><tr><th>Teacher</th><th>Coordinator</th><th class="num">Visits</th><th class="num">Score</th><th class="num">Growth</th><th>Status</th></tr></thead><tbody id="tTable">
    ${ts.map(({ t, rag }) => { const g = teacherGrowth(t.name); return `<tr tabindex="0" data-q="${esc((t.name + ' ' + t.mod).toLowerCase())}" onclick="openTeacher('${esc(t.name)}')" onkeydown="if(event.key==='Enter')openTeacher('${esc(t.name)}')">
      <td><b>${esc(t.name)}</b></td><td>${esc(t.mod)}</td><td class="num">${rag.visits}</td><td class="num">${rag.avg != null ? rag.avg.toFixed(1) : '—'}</td>
      <td class="num">${g == null ? '—' : `<span class="delta ${g > 0.05 ? 'up' : g < -0.05 ? 'down' : ''}">${g > 0 ? '+' : ''}${g.toFixed(1)}</span>`}</td><td>${ragPill(rag.key)}</td></tr>`; }).join('')}
    </tbody></table></div></div>`;
}
function cCoords(u: User): string {
  if (!isTop(u)) return empty('shield', 'Not available', 'Coordinator scores are visible to Parth and Manish only.');
  const month = todayStr().slice(0, 7);
  return pageHead('Coordinators', "Score = average of their teachers' scores.", `<button class="btn ghost sm" onclick="reportCoords()">${ic('download', 16)}Coordinators</button>`) +
    `<div class="coord-grid">${STORE.get('moderators').map((m) => {
      const sc = coordScore(m); const vs = STORE.get('feedback').filter((f) => f.mod === m); const c = ragCounts(teachersOfMod(m));
      const upcoming = STORE.get('plans').filter((p) => p.mod === m && p.status === 'Planned' && p.date >= todayStr()).length;
      return `<section class="card coord"><div class="coord-head"><span class="avatar lg">${initials(m)}</span><span class="row-main"><b>${esc(m)}</b><small>${teachersOfMod(m).length} teachers · ${schoolsOfMod(m).length} schools</small></span>
        <span class="coord-score"><b>${sc != null ? sc.toFixed(1) : '—'}</b><small>score</small></span></div>
        <div class="mini-stats"><span><b>${vs.length}</b>visits</span><span><b>${vs.filter((f) => f.date.startsWith(month)).length}</b>this month</span><span><b>${upcoming}</b>planned</span></div>
        <div class="legend tight">${(['green', 'amber', 'red'] as RagOrNone[]).map((k) => `<span><i class="seg-${k}"></i><b>${c[k]}</b>${cap(k)}</span>`).join('')}</div></section>`;
    }).join('')}</div>`;
}
let LVF = 'Pending';
function setLVF(k: string): void { LVF = k; render(); }
function cLeave(u: User): string {
  if (!isTop(u)) return empty('shield', 'Not available', 'Leave is approved by Parth and Manish only.');
  const all = STORE.get('leaves').slice().sort((a, b) => (a.status === 'Pending' ? 0 : 1) - (b.status === 'Pending' ? 0 : 1) || b.from.localeCompare(a.from));
  const list = LVF === 'All' ? all : all.filter((l) => l.status === LVF);
  const chip = (k: string, label: string) => `<button class="chip${LVF === k ? ' on' : ''}" aria-pressed="${LVF === k}" onclick="setLVF('${k}')">${label} <span>${k === 'All' ? all.length : all.filter((l) => l.status === k).length}</span></button>`;
  return pageHead('Leave approvals', 'Approved leave is shown to the teacher\'s coordinator.') +
    `<div class="chips">${chip('Pending', 'Awaiting')}${chip('Approved', 'Approved')}${chip('Rejected', 'Rejected')}${chip('All', 'All')}</div>
    <div class="card list">${list.length ? list.map((l) => leaveItem(l, { who: true, decide: true })).join('') : empty('calx', LVF === 'Pending' ? 'No leave awaiting approval' : 'Nothing here')}</div>`;
}

/* ================= report downloads (.xlsx) ================= */
function reportCoordTeachers(mod: string): void {
  const rows: unknown[][] = [['Teacher', 'Schools', 'Visits', 'Avg score', 'Latest RAG', 'Growth', 'Avg delay (min)', 'Latest action plan', 'Next visit']];
  teachersOfMod(mod).forEach((t) => {
    const r = teacherRag(t.name); const g = teacherGrowth(t.name); const last = teacherFeedback(t.name)[0];
    rows.push([t.name, schoolsOfTeacher(t).map((s) => s.name).join('; '), r.visits, r.avg != null ? r.avg.toFixed(2) : '', r.key === 'none' ? 'Unrated' : r.key, g != null ? g.toFixed(2) : '', avgLate(t.name), last?.actionPlan || '', last?.nextVisit || '']);
  });
  downloadXLSX(`robobox-${mod}-teachers-${todayStr()}.xlsx`, rows, 'Teachers');
}
function reportAllTeachers(): void {
  const rows: unknown[][] = [['Teacher', 'Coordinator', 'Schools', 'Visits', 'Avg score', 'Latest RAG', 'Growth', 'Avg delay (min)']];
  STORE.get('teachers').forEach((t) => {
    const r = teacherRag(t.name); const g = teacherGrowth(t.name);
    rows.push([t.name, t.mod, schoolsOfTeacher(t).map((s) => s.name).join('; '), r.visits, r.avg != null ? r.avg.toFixed(2) : '', r.key === 'none' ? 'Unrated' : r.key, g != null ? g.toFixed(2) : '', avgLate(t.name)]);
  });
  downloadXLSX(`robobox-all-teachers-${todayStr()}.xlsx`, rows, 'Teachers');
}
function reportCoords(): void {
  if (!isTop(SESSION.get()!)) return;
  const rows: unknown[][] = [['Coordinator', 'Teachers', 'Schools', 'Visits', 'Coordinator score', 'Green', 'Amber', 'Red']];
  STORE.get('moderators').forEach((m) => {
    const sc = coordScore(m); const c = ragCounts(teachersOfMod(m));
    rows.push([m, teachersOfMod(m).length, schoolsOfMod(m).length, STORE.get('feedback').filter((f) => f.mod === m).length, sc != null ? sc.toFixed(2) : '', c.green, c.amber, c.red]);
  });
  downloadXLSX(`robobox-coordinators-${todayStr()}.xlsx`, rows, 'Coordinators');
}
function reportVisits(): void { // every visit, dated — pivot in Excel for growth/degrowth over time
  const rows: unknown[][] = [['Date', 'Coordinator', 'Teacher', 'School', 'Grade', 'Module', 'Students', 'Score', 'RAG', 'Improvement', 'Action', 'Action plan', 'Next visit']];
  STORE.get('feedback').slice().sort((a, b) => a.date.localeCompare(b.date)).forEach((f) => {
    rows.push([f.date, f.mod, f.teacher, schoolName(f.school), f.grade, f.module, f.students, f.score != null ? f.score.toFixed(2) : '', f.rag, f.judgement.improvement, f.judgement.action, f.actionPlan || '', f.nextVisit || '']);
  });
  downloadXLSX(`robobox-visits-${todayStr()}.xlsx`, rows, 'Visits');
}

/* ================= views ================= */
// Keyed by role:tab. A tab only renders if tabsFor(u) offers it, so permission-gated
// tabs (coords, leave) are unreachable for Outsight; the views also re-check.
const VIEWS: Record<string, (u: User) => string> = {
  'teacher:home': tHome, 'teacher:att': tAttendance, 'teacher:leave': tLeave, 'teacher:req': tRequests, 'teacher:upd': updatesView,
  'mod:teachers': (u) => SEL ? teacherDetail(u, SEL) : mTeachers(u), 'mod:visit': (u) => VISIT ? mForm() : mVisit(u),
  'mod:cal': mCalendar, 'mod:req': mRequests, 'mod:upd': updatesView,
  'ceo:overview': cOverview, 'ceo:teachers': (u) => SEL ? teacherDetail(u, SEL) : cTeachers(u),
  'ceo:coords': cCoords, 'ceo:leave': cLeave, 'ceo:upd': updatesView,
};

render();
