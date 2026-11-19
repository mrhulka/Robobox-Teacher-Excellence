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
const dayDiff = (a: string, b: string) => Math.round((parseD(b).getTime() - parseD(a).getTime()) / 86400000);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

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
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
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
  if (school.lat == null && SESSION.get()?.role === 'teacher' && !DEMO.on) throw new Error(`${school.name}'s location isn't set yet — ask your coordinator to set it from Google Maps.`);
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
// Submitted → In progress (operations confirmed an expected date) → Fulfilled. Older Open/Approved/Sent to Ops records map in.
function reqStatus(r: Requisition): string {
  if (r.status === 'Fulfilled' || r.fulfilledAt) return 'Fulfilled';
  return r.eta || ['Approved', 'Sent to Ops', 'In progress'].includes(r.status) ? 'In progress' : 'Submitted';
}
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
const segTabs = (label: string, cur: string, fn: string, items: [string, string, string][]) =>
  `<div class="segtabs" role="tablist" aria-label="${label}">${items.map(([k, l, i]) => `<button role="tab" aria-selected="${cur === k}" class="segtab${cur === k ? ' on' : ''}" onclick="${fn}('${k}')">${ic(i, 16)}${l}</button>`).join('')}</div>`;
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
    { id: 'home', label: 'Home', icon: 'home' }, { id: 'lessons', label: 'Lessons', icon: 'book' },
    { id: 'att', label: 'Attendance', icon: 'clock', short: 'Attend', at: 'xs' }, { id: 'req', label: 'Requests', icon: 'package' },
    { id: 'upd', label: 'Updates', icon: 'megaphone' },
  ];
  if (u.role === 'mod') return [
    { id: 'teachers', label: 'Teachers', icon: 'users' }, { id: 'visit', label: 'Visit', icon: 'pin' },
    { id: 'cal', label: 'Calendar', icon: 'calendar' }, { id: 'leave', label: 'Leave', icon: 'calx' },
    { id: 'upd', label: 'Updates', icon: 'megaphone' },
  ];
  if (u.role === 'ops') return [{ id: 'req', label: 'Requests', icon: 'package' }, { id: 'upd', label: 'Updates', icon: 'megaphone' }];
  if (u.role === 'hr') return [{ id: 'upd', label: 'Updates', icon: 'megaphone' }];
  const t: Tab[] = [{ id: 'overview', label: 'Overview', icon: 'chart' }, { id: 'teachers', label: 'Teachers', icon: 'users' }];
  if (isTop(u)) t.push({ id: 'coords', label: 'Coordinators', icon: 'briefcase', short: 'Coords', at: 'sm' }, { id: 'leave', label: 'Leave', icon: 'calx' });
  t.push({ id: 'upd', label: 'Updates', icon: 'megaphone' });
  return t;
}
const TAB: Partial<Record<Role, string>> = {};
let SEL: string | null = null; // teacher detail opened by a coordinator or leadership
function go(tab: string): void {
  const u = SESSION.get()!; TAB[u.role] = tab; SEL = null; PROF = false; render(); entered();
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
  // Teachers and coordinators must complete My profile before anything else.
  const gate = mustProfile(u) && !profileOf(u.role, u.name)?.selfie;
  const tabs = gate ? [] : tabsFor(u);
  const active = gate ? '' : tabs.some((t) => t.id === TAB[u.role]) ? TAB[u.role]! : tabs[0].id;
  // Count bubble on Updates for new HR posts and library items; cleared once Updates is opened.
  const unread = active === 'upd' ? 0 : unreadUpdates(u);
  const dot = (t: Tab) => t.id === 'upd' && unread ? `<span class="tab-badge" aria-hidden="true">${unread > 9 ? '9+' : unread}</span><span class="sr-only">, ${unread} new</span>` : '';
  const roleLabel = ({ mod: 'Coordinator', teacher: 'Teacher', ops: 'Operations team', hr: 'Human resources' } as Record<string, string>)[u.role] || leaderOf(u.name)?.title || 'Leadership';
  app.innerHTML = `
    <header class="topbar">
      <img class="logo-img" src="assets/logo-mark.webp" width="75" height="28" alt="The Robobox">
      <nav class="topnav" aria-label="Main">${tabs.map((t) => `<button class="${t.id === active ? 'on' : ''}" ${t.id === active ? 'aria-current="page"' : ''} onclick="go('${t.id}')">${ic(t.icon, 18)}<span>${t.label}</span>${dot(t)}</button>`).join('')}</nav>
      <button class="user-chip" onclick="openProfile()" ${gate ? 'disabled' : ''} aria-label="My profile — ${esc(u.name)}, ${esc(roleLabel)}">${face(u.role, u.name, 'avatar sm')}<span class="who"><b>${esc(u.name)}</b><small>${esc(roleLabel)}</small></span></button>
      <button class="icon-btn" onclick="logout()" aria-label="Sign out" title="Sign out">${ic('logout')}</button>
    </header>
    <main class="wrap" id="main">${gate || PROF ? profileView(u, gate) : VIEWS[u.role + ':' + active](u)}</main>
    ${gate ? '' : `<nav class="tabbar" aria-label="Main">${tabs.map((t) => `<button class="tab${t.id === active ? ' on' : ''}${t.short ? ' s-' + t.at : ''}" ${t.short ? `aria-label="${t.label}"` : ''} ${t.id === active ? 'aria-current="page"' : ''} onclick="go('${t.id}')">${ic(t.icon, 22)}<span class="lbl">${t.label}</span>${t.short ? `<span class="lbl-s" aria-hidden="true">${t.short}</span>` : ''}${dot(t)}</button>`).join('')}</nav>`}`;
}
function logout(): void { SESSION.clear(); (Object.keys(TAB) as Role[]).forEach((k) => delete TAB[k]); SEL = null; PROF = false; PF_SELFIE = ''; VISIT = null; UPD = 'official'; LW = 0; LPD = {}; ATS = 'status'; ATM = 0; CTS = 'teachers'; const t = document.getElementById('toast'); if (t) t.innerHTML = ''; render(); }

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
        ${roleCard('teacher', 'cap', 'Teacher', 'Check in, lesson plans, leave, requests')}
        ${roleCard('mod', 'pin', 'Coordinator', 'Visits, action plans, teacher progress')}
        ${roleCard('ceo', 'shield', 'Leadership', 'Parth · Manish · Outsight')}
        ${roleCard('ops', 'package', 'Operations', 'Component requests and fulfilment')}
        ${roleCard('hr', 'megaphone', 'HR', 'Company updates, handbook, holidays')}
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
function pickRole(r: Role): void {
  if (r === 'ops' || r === 'hr') { SESSION.set({ role: r, name: r === 'ops' ? 'Operations' : 'HR' }); LOGIN = { role: null }; render(); return; } // one shared login each
  LOGIN = { role: r }; render();
}
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
    (unreadUpdates(u) ? `<button class="notice brand as-btn" onclick="openOfficial()">${ic('megaphone', 18)}<span><b>${plural(unreadUpdates(u), 'new update')}</b> from Robobox — tap to read</span></button>` : '') +
    (overdueWeeks(u.name).length ? `<button class="notice err as-btn" onclick="goWeek('${overdueWeeks(u.name)[0]}')">${ic('alert', 18)}<span><b>Lesson plan update overdue</b> — week of ${fmtD(overdueWeeks(u.name)[0])}. Tap to update.</span></button>` : '') +
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
      ${schools.some((s) => s.lat != null) ? `<details class="loc"><summary class="link-sum">${ic('pin', 16)}School on the map</summary>${schools.filter((s) => s.lat != null).map((s) => `<p class="hint"><b>${esc(s.name)}</b> · <a href="${mapsHref(s)}" target="_blank" rel="noopener">Directions</a></p>${mapEmbed(s)}`).join('')}</details>` : ''}
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

let ATS = 'status'; let ATM = 0; // attendance section + month offset
function setAts(k: string): void { ATS = k; render(); }
function atNav(d: number): void { ATM += d; render(); }
type DayState = 'present' | 'late' | 'absent' | 'leave' | 'holiday' | 'off' | 'none';
const DAY_LABEL: Record<DayState, string> = { present: 'Present', late: 'Late', absent: 'Absent', leave: 'On leave', holiday: 'Holiday', off: 'Weekly off', none: '' };
function dayState(name: string, iso: string, first: string): DayState {
  const rec = STORE.get('attendance').find((a) => a.teacher === name && a.date === iso && a.inTime);
  if (rec) return rec.inLate ? 'late' : 'present';
  if (STORE.get('holidays').some((h) => h.date === iso)) return 'holiday';
  if (leaveOn(name, iso)) return 'leave';
  if (!CONFIG.workDays.includes(parseD(iso).getDay())) return 'off';
  // ponytail: absences count only from the teacher's first check-in in the app (not before rollout), never for today.
  return first && iso >= first && iso < todayStr() ? 'absent' : 'none';
}
function tAttendance(u: User): string {
  return pageHead('Attendance', `Reporting time ${CONFIG.expectedStart} · check in within ${CONFIG.geofenceMeters} m of school.`) +
    segTabs('Attendance', ATS, 'setAts', [['status', 'My attendance', 'calendar'], ['leave', 'Leave', 'calx']]) +
    (ATS === 'leave' ? leaveSection(u) : attStatus(u));
}
function attStatus(u: User): string {
  const recs = teacherAtt(u.name); const first = recs.length ? recs[recs.length - 1].date : ''; const today = todayStr();
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + ATM);
  const y = base.getFullYear(), m = base.getMonth(); const dim = new Date(y, m + 1, 0).getDate(); const lead = (base.getDay() + 6) % 7;
  const counts: Record<string, number> = {}; const cells: string[] = [];
  for (let i = 0; i < lead; i++) cells.push('<span class="cal-pad"></span>');
  for (let d = 1; d <= dim; d++) {
    const iso = isoLocal(new Date(y, m, d)); const st: DayState = iso > today ? 'none' : dayState(u.name, iso, first);
    counts[st] = (counts[st] || 0) + 1;
    cells.push(`<span class="att-day ${st}${iso === today ? ' today' : ''}" role="img" aria-label="${fmtLong(iso)}${DAY_LABEL[st] ? ': ' + DAY_LABEL[st] : ''}">${d}</span>`);
  }
  const prefix = `${y}-${String(m + 1).padStart(2, '0')}`; const monthRecs = recs.filter((a) => a.date.startsWith(prefix));
  return `<section class="card cal">
      <div class="cal-head"><button class="icon-btn" aria-label="Previous month" onclick="atNav(-1)">${ic('chevL')}</button>
        <b>${base.toLocaleDateString([], { month: 'long', year: 'numeric' })}</b>
        <button class="icon-btn" aria-label="Next month" onclick="atNav(1)"${ATM >= 0 ? ' disabled' : ''}>${ic('chevR')}</button></div>
      <div class="cal-grid cal-wk">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w) => `<span>${w}</span>`).join('')}</div>
      <div class="cal-grid">${cells.join('')}</div>
      <div class="att-legend">${(['present', 'late', 'absent', 'leave', 'holiday'] as DayState[]).map((st) => `<span><i class="att-day ${st}"></i><b>${counts[st] || 0}</b>${DAY_LABEL[st]}</span>`).join('')}</div>
    </section>
    <div class="kpis three">
      ${kpi('Avg delay · this week', avgLateWindow(u.name, 'week') + ' min', 'clock')}
      ${kpi('Avg delay · this month', avgLateWindow(u.name, 'month') + ' min', 'calendar')}
      ${kpi('Avg delay · all time', avgLate(u.name) + ' min', 'chart')}
    </div>
    <h2 class="section-title">Check-ins</h2>
    <div class="card flush">${monthRecs.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Date</th><th>In</th><th>Out</th><th>Delay</th><th>School</th></tr></thead><tbody>
      ${monthRecs.map((a) => `<tr><td>${fmtD(a.date)}</td><td class="num">${fmtT(a.inTime)}</td><td class="num">${fmtT(a.outTime)}</td><td class="num">${a.inLate ? a.inLate + ' min' : badge('On time', 'green')}</td>
        <td>${esc(schoolName(a.inSchool))}${a.outSchool && a.outSchool !== a.inSchool ? ' → ' + esc(schoolName(a.outSchool)) : ''}</td></tr>`).join('')}</tbody></table></div>`
      : empty('clock', 'No check-ins this month', 'Check in from Home when you reach school.')}</div>`;
}
// Leave form + own history. Used by teachers (inside Attendance) and coordinators (Leave tab).
function leaveSection(u: User): string {
  const mine = STORE.get('leaves').filter((l) => l.teacher === u.name).sort((a, b) => b.from.localeCompare(a.from));
  return `<p class="hint" style="margin:0 0 12px">Leave is approved by Parth (CEO) or Manish.</p>
    <section class="card">
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
function mLeave(u: User): string {
  const names = teachersOfMod(u.name).map((t) => t.name);
  const theirs = STORE.get('leaves').filter((l) => names.includes(l.teacher))
    .sort((a, b) => (a.status === 'Pending' ? 0 : 1) - (b.status === 'Pending' ? 0 : 1) || b.from.localeCompare(a.from));
  return pageHead('Leave', "Apply for your own leave and see your teachers' leave.") + leaveSection(u) +
    `<h2 class="section-title">Your teachers' leave</h2>
    <div class="card list">${theirs.length ? theirs.slice(0, 40).map((l) => leaveItem(l, { who: true })).join('') : empty('calx', 'No leave from your teachers', 'Their applications and approvals appear here — view only.')}</div>`;
}
function leaveItem(l: Leave, o: { who?: boolean; decide?: boolean; withdraw?: boolean }): string {
  const tone = l.status === 'Approved' ? 'green' : l.status === 'Rejected' ? 'red' : l.status === 'Cancelled' ? 'neutral' : 'amber';
  const days = Math.round((parseD(l.to).getTime() - parseD(l.from).getTime()) / 86400000) + 1;
  return `<div class="row-item wrap-end">${o.who ? `<span class="avatar">${initials(l.teacher)}</span>` : `<span class="row-ic">${ic('calx', 18)}</span>`}
    <span class="row-main"><b>${o.who ? esc(l.teacher) + (l.applicant === 'mod' ? ' (coordinator)' : '') + ' · ' : ''}${esc(l.type)} · ${fmtD(l.from)}${l.to !== l.from ? '–' + fmtD(l.to) : ''} <span class="muted">(${days} day${days > 1 ? 's' : ''})</span></b>
      <small>${l.reason ? esc(l.reason) : 'No reason given'}${o.who && l.mod && l.applicant !== 'mod' ? ' · Coordinator ' + esc(l.mod) : ''}${l.decidedBy ? ` · ${esc(l.status.toLowerCase())} by ${esc(l.decidedBy)}` : ''}</small></span>
    <span class="row-end">${badge(l.status === 'Pending' ? 'Awaiting approval' : l.status, tone)}
      ${o.decide && l.status === 'Pending' ? `<button class="btn sm" onclick="decideLeave('${l.id}','Approved')">${ic('check', 16)}Approve</button><button class="btn ghost sm" onclick="decideLeave('${l.id}','Rejected')">${ic('x', 16)}Reject</button>` : ''}
      ${o.withdraw && l.status === 'Pending' ? `<button class="btn ghost sm" onclick="withdrawLeave('${l.id}')">Withdraw</button>` : ''}</span></div>`;
}
function submitLeave(): void {
  const u = SESSION.get()!; const from = $('lvFrom').value, to = $('lvTo').value;
  if (!from || !to || to < from) { setErr('lvToErr', 'The end date must be on or after the start date.'); return; }
  setErr('lvToErr', '');
  const isMod = u.role === 'mod';
  STORE.add('leaves', { teacher: u.name, mod: isMod ? u.name : u.mod, applicant: isMod ? 'mod' : undefined, type: $('lvType').value, from, to, reason: $('lvReason').value.trim(), status: 'Pending' });
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
  flash('ok', `Request ${ref} sent to the operations team.`); render(); window.scrollTo(0, 0);
}
function tRequests(u: User): string {
  const t = STORE.teacher(u.name)!; const kit = kitOf(RQ.project)!;
  const mine = STORE.get('requests').filter((r) => r.teacher === u.name).sort((a, b) => (b.createdAt || b.id || '').localeCompare(a.createdAt || a.id || ''));
  const done = RQ.done ? mine.find((r) => r.ref === RQ.done) : undefined;
  const ack = done ? `<section class="card ack" role="status">
      <div class="ack-head"><span class="ack-ic">${ic('check', 22)}</span><div><b>Request raised · ${esc(done.ref)}</b><small>Sent to the operations team. You'll see their expected date below once they confirm it.</small></div></div>
      <ul class="ack-lines">${reqLines(done).map((l) => `<li><span>${esc(l.component)}</span><b>×${l.qty}</b></li>`).join('')}</ul>
      <button class="btn ghost block" onclick="rqReset()">${ic('plus', 18)}Raise another request</button></section>` : '';
  const counted = Object.values(RQ.counts).filter((x) => x > 0);
  return pageHead('Component requests', 'Pick a project, set the quantity you need, and send it to the operations team.') + ack +
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
      <label class="field-l" for="rqNote">Note for operations</label><textarea id="rqNote" rows="2" placeholder="Optional — e.g. needed before Monday's class"></textarea>
      <p class="err" id="rqErr" role="alert"></p>
      <button class="btn block" onclick="submitReq()">${ic('send', 18)}Send request</button>
    </section>
    <h2 class="section-title">My requests</h2>
    <div class="card list">${mine.length ? mine.map((r) => reqItem(r)).join('') : empty('package', 'No requests yet', 'Requests you send appear here with their status.')}</div>`;
}
function reqTone(st: string): string { return st === 'Fulfilled' ? 'green' : st === 'In progress' ? 'blue' : 'amber'; }
function reqItem(r: Requisition): string {
  const lines = reqLines(r); const st = reqStatus(r);
  const summary = lines.slice(0, 3).map((l) => `${l.component} ×${l.qty}`).join(', ') + (lines.length > 3 ? ` +${lines.length - 3} more` : '');
  const placed = r.createdAt ? r.createdAt.slice(0, 10) : '';
  const track = r.fulfilledAt ? `Fulfilled ${fmtD(r.fulfilledAt)}${placed ? ' · ' + plural(dayDiff(placed, r.fulfilledAt.slice(0, 10)), 'day') : ''}`
    : r.eta ? `Expected by ${fmtD(r.eta)}${r.eta < todayStr() ? ' · running late' : ''}` : 'Waiting for an expected date from operations';
  return `<div class="row-item"><span class="row-ic">${ic('package', 18)}</span><span class="row-main"><b>${esc(r.ref || 'Request')} · ${esc(kitOf(r.project)?.id || r.project)}</b>
    <small>${placed ? 'Placed ' + fmtD(placed) + ' · ' : ''}${esc(summary)}</small>
    <small class="track">${ic(r.fulfilledAt ? 'check' : 'clock', 14)}${esc(track)}</small>${r.opsNote ? `<small>Operations: ${esc(r.opsNote)}</small>` : ''}</span>
    <span class="row-end">${badge(st, reqTone(st))}</span></div>`;
}
function libraryInner(u: User): string {
  const mats = STORE.get('materials').slice().reverse();
  const canAdd = canComms(u);
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
    STORE.add('materials', { id, title, note: $('mtNote').value, by: u.name, kind: 'file', fileName: file.name, size: file.size, mime: file.type, createdAt: new Date().toISOString() });
  } else {
    STORE.add('materials', { title, note: $('mtNote').value, by: u.name, kind: 'link', link: $('mtLink').value || '#', createdAt: new Date().toISOString() });
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
const canComms = (u: User) => u.role === 'hr'; // HR publishes official updates, holidays and the library
function setUpd(k: string): void { UPD = k as typeof UPD; PENDING_DEL = ''; render(); }
function openOfficial(): void { UPD = 'official'; go('upd'); }
const seenKey = (u: User) => `robobox_seen_${u.role}_${u.name}`;
function unreadUpdates(u: User): number {
  let seen = ''; try { seen = localStorage.getItem(seenKey(u)) || ''; } catch (e) { /* ignore */ }
  return STORE.get('notices').filter((n) => n.createdAt > seen && n.by !== u.name).length
    + STORE.get('materials').filter((m) => (m.createdAt || '') > seen && m.by !== u.name).length;
}
function markSeen(u: User): void { try { localStorage.setItem(seenKey(u), new Date().toISOString()); } catch (e) { /* ignore */ } }
function armDel(id: string): void { PENDING_DEL = id; render(); }
const twoTap = (id: string, fn: string, label: string) => PENDING_DEL === id
  ? `<button class="btn sm danger" onclick="${fn}">${ic('trash', 16)}Tap again to delete</button>`
  : `<button class="icon-btn sm" aria-label="${label}" onclick="armDel('${id}')">${ic('trash', 18)}</button>`;
const dateChip = (iso: string) => `<span class="date-chip" aria-hidden="true"><b>${parseD(iso).getDate()}</b><small>${parseD(iso).toLocaleDateString([], { month: 'short' })}</small></span>`;

function updatesView(u: User): string {
  markSeen(u);
  return pageHead('Updates', 'Company communications, holidays, school events and the handbook.') +
    segTabs('Updates', UPD, 'setUpd', [['official', 'Official', 'megaphone'], ['events', 'School events', 'flag'], ['library', 'Library', 'book']]) +
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
      : empty('sun', 'Holiday list not published yet', can ? 'Add each holiday above.' : 'HR will publish the yearly holiday list here.')}</div>`;
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

/* ================= LESSON PLANS ================= */
// Plans are per grade per week (week = its Monday). Each week a teacher marks every grade's plan
// Done / Partly done / Not done / Not my class. A reason is required for anything not done, and
// for an update made after that week's Saturday.
const PLAN_STATES = ['Done', 'Partly done', 'Not done', 'Not my class'];
const weekOf = (iso: string) => { const d = parseD(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoLocal(d); };
const weekDue = (wk: string) => addDays(wk, 5); // Saturday
const gradeNum = (g: string) => parseInt((g.match(/\d+/) || ['999'])[0], 10);
const byGrade = (a: LessonPlan, b: LessonPlan) => gradeNum(a.grade) - gradeNum(b.grade) || a.grade.localeCompare(b.grade);
// A "Week" cell is a week number ("Week 3", "3") counted from CONFIG.ayStart, or any date in that week:
// yyyy-mm-dd, dd/mm/yyyy (day first, as written in India) or "17 Nov 2026". Returns that week's Monday.
function parseWeek(raw: string): string | null {
  const m = raw.trim().match(/^(?:week\s*)?(\d{1,2})$/i);
  if (m) return addDays(weekOf(CONFIG.ayStart), (Number(m[1]) - 1) * 7);
  const day = parseDay(raw); return day && weekOf(day);
}
function parseDay(raw: string): string | null {
  const s = raw.trim(); let m: RegExpMatchArray | null; let iso = '';
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) iso = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  else if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/))) iso = `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  else { const t = Date.parse(s.replace(/-/g, ' ')); if (!isNaN(t)) iso = isoLocal(new Date(t)); }
  if (!iso) return null;
  const [y, mo, d] = iso.split('-').map(Number); const dt = new Date(y, mo - 1, d);
  return dt.getMonth() === mo - 1 && dt.getDate() === d ? iso : null; // rejects 31/02, month 13
}
// Rows pasted from Excel arrive tab-separated: Week · Grade · Topic · Activity. A header row is skipped.
function parsePlans(text: string): { plans: LessonPlan[]; errors: string[] } {
  const plans: LessonPlan[] = [], errors: string[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const c = (line.includes('\t') ? line.split('\t') : line.split(',')).map((x) => x.trim());
    const week = parseWeek(c[0] || '');
    if (!week) { if (!(i === 0 && /week/i.test(c[0] || ''))) errors.push(`Row ${i + 1}: "${c[0]}" is not a week number or date`); return; }
    if (!c[1] || !c[2]) { errors.push(`Row ${i + 1}: grade and topic are required`); return; }
    plans.push({ week, date: parseDay(c[0]) || undefined, grade: c[1], topic: c[2], activity: c.slice(3).join(', ').replace(/^,\s*|,\s*$/g, '') });
  });
  return { plans, errors };
}
// Plans that apply to a teacher: their batch's sessions, plus any plan for everyone (no `teachers`).
function plansFor(name: string): LessonPlan[] { const n = name.toLowerCase(); return STORE.get('lessons').filter((p) => !p.teachers || p.teachers.some((t) => t.toLowerCase() === n)); }
function planUpdatesOf(name: string, wk: string): PlanUpdate[] { return STORE.get('planUpdates').filter((x) => x.teacher === name && x.week === wk); }
// A week is tracked only if its plan was published before that week's Saturday — loading a past
// week's plan later doesn't make everyone retroactively overdue.
function planStatus(name: string, wk: string): 'none' | 'updated' | 'late' | 'due' | 'overdue' {
  const ps = plansFor(name).filter((p) => p.week === wk);
  if (!ps.length || ps.every((p) => (p.addedAt || '').slice(0, 10) > weekDue(wk))) return 'none';
  const ups = planUpdatesOf(name, wk);
  if (ups.length) return ups.some((x) => x.late) ? 'late' : 'updated';
  return todayStr() > weekDue(wk) ? 'overdue' : 'due';
}
function overdueWeeks(name: string): string[] {
  return [...new Set(plansFor(name).map((p) => p.week))].sort().filter((wk) => planStatus(name, wk) === 'overdue');
}
const planBadge = (st: string) => st === 'updated' ? badge('Updated', 'green') : st === 'late' ? badge('Updated late', 'amber')
  : st === 'overdue' ? badge('Not updated', 'red') : st === 'due' ? badge('Due Saturday', 'neutral') : '';

let LW = 0; // week offset from this week
let LPD: Record<string, string> = {}; // draft status per grade, updated in place by taps
let LWK = ''; let LPLANS: LessonPlan[] = []; // the week + plans currently on screen
function setLW(n: number): void { LW = n; LPD = {}; render(); }
function goWeek(wk: string): void { LW = Math.round(dayDiff(weekOf(todayStr()), wk) / 7); LPD = {}; TAB.teacher = 'lessons'; render(); entered(); }
function setPlanState(btn: HTMLElement, i: number, st: string): void {
  LPD[LPLANS[i].grade] = st; pickIn(btn); setErr('lpReasonErr', '');
  const req = Object.values(LPD).some((x) => x === 'Partly done' || x === 'Not done');
  document.getElementById('lpReasonReq')?.toggleAttribute('hidden', !req);
}
function tLessons(u: User): string {
  const cur = weekOf(todayStr()); const wk = addDays(cur, LW * 7);
  const plans = plansFor(u.name).filter((p) => p.week === wk).sort(byGrade);
  LWK = wk; LPLANS = plans;
  const ups = planUpdatesOf(u.name, wk);
  ups.forEach((x) => { if (!(x.grade in LPD)) LPD[x.grade] = x.status; });
  const overdue = overdueWeeks(u.name).filter((w) => w !== wk);
  const late = todayStr() > weekDue(wk);
  const reasonReq = Object.values(LPD).some((x) => x === 'Partly done' || x === 'Not done');
  const when = LW === 0 ? 'This week' : LW === -1 ? 'Last week' : LW === 1 ? 'Next week' : `Week of ${fmtD(wk)}`;
  return pageHead('Lesson plans', 'Your weekly plan from Robobox. Update your progress by Saturday.') +
    (overdue.length ? `<button class="notice err as-btn" onclick="goWeek('${overdue[0]}')">${ic('alert', 18)}<span><b>${plural(overdue.length, 'week')} not updated</b> — week of ${fmtD(overdue[0])}. Tap to update.</span></button>` : '') +
    `<section class="card week-nav"><button class="icon-btn" aria-label="Previous week" onclick="setLW(${LW - 1})">${ic('chevL')}</button>
      <div><b>${when}</b><small>${fmtD(wk)} – ${fmtD(weekDue(wk))}</small></div>
      <button class="icon-btn" aria-label="Next week" onclick="setLW(${LW + 1})">${ic('chevR')}</button></section>
    ${progressCard([u.name], LW === 0 ? todayStr() : wk, 'Your progress')}
    ${plans.length ? plans.map((p) => { const up = ups.find((x) => x.grade === p.grade); return `<article class="card lesson">
        <div class="lesson-head"><span class="grade-chip">${esc(p.grade)}</span>${up ? badge(up.status, up.status === 'Done' ? 'green' : up.status === 'Not my class' ? 'neutral' : 'amber') : ''}</div>
        <h3>${esc(p.topic)}</h3>${p.activity ? `<p>${esc(p.activity)}</p>` : ''}
        ${p.date || p.trainer ? `<p class="lesson-meta">${ic('calendar', 15)}${p.date ? fmtLong(p.date) : ''}${p.date && p.trainer ? ' · ' : ''}${p.trainer ? 'Trainer ' + esc(p.trainer) : ''}</p>` : ''}</article>`; }).join('')
      : `<div class="card">${empty('book', 'No session this week', plansFor(u.name).length ? 'Your schedule below shows every session.' : "You're not in a training batch yet — Parth or Manish can add you.")}</div>`}
    ${plans.length && wk <= cur ? `<h2 class="section-title">Weekly progress ${planBadge(planStatus(u.name, wk))}</h2>
      <section class="card">
        ${plans.map((p, i) => `<div class="q"><div class="qt"><b>${esc(p.grade)}</b> · ${esc(p.topic)}</div>
          <div class="rate opts" role="group" aria-label="${esc(p.grade)} progress">${PLAN_STATES.filter((st) => !(p.teachers && st === 'Not my class')).map((st) => `<button class="${st === 'Done' ? 'yes' : st === 'Not done' ? 'no' : ''}${LPD[p.grade] === st ? ' on' : ''}" onclick="setPlanState(this,${i},'${st}')">${st}</button>`).join('')}</div></div>`).join('')}
        <label class="field-l" for="lpReason">Reason <span class="req-tag" id="lpReasonReq"${reasonReq ? '' : ' hidden'}>Required</span></label>
        <textarea id="lpReason" rows="3" placeholder="Only needed if something was partly done or not done">${esc(ups[0]?.reason || '')}</textarea>
        <p class="err" id="lpReasonErr" role="alert"></p>
        <button class="btn block" onclick="submitPlanUpdate()">${ic('check', 18)}${ups.length ? 'Update progress' : 'Submit weekly update'}</button>
        <p class="hint">${ups.length ? `Last updated ${fmtD(ups[0].at)}${ups[0].late ? ' — after the deadline' : ''}.` : `Due ${fmtLong(weekDue(wk))}.`}</p>
      </section>` : plans.length ? `<p class="hint">Progress for this week opens on ${fmtLong(wk)}.</p>` : ''}
    ${scheduleList(u, wk)}`;
}
// Every session for this teacher, grouped by month; tap one to open its week.
function scheduleList(u: User, current: string): string {
  const ps = plansFor(u.name).slice().sort((a, b) => (a.date || a.week).localeCompare(b.date || b.week));
  if (!ps.length) return '';
  let month = '';
  return `<h2 class="section-title">Your schedule</h2><div class="card list">${ps.map((p) => {
    const d = p.date || p.week; const m = parseD(d).toLocaleDateString([], { month: 'long', year: 'numeric' });
    const head = m !== month ? `<p class="list-group">${m}</p>` : ''; month = m;
    const st = planStatus(u.name, p.week); const up = planUpdatesOf(u.name, p.week).find((x) => x.grade === p.grade);
    return head + `<button class="row-item tap${p.week === current ? ' current' : ''}" onclick="goWeek('${p.week}')">${dateChip(d)}
      <span class="row-main"><b>${esc(p.topic)}</b><small>${esc(p.grade)}${p.trainer ? ' · ' + esc(p.trainer) : ''}</small></span>
      <span class="row-end">${up ? badge(up.status, up.status === 'Done' ? 'green' : 'amber') : planBadge(st)}${ic('chevR', 18)}</span></button>`;
  }).join('')}</div>`;
}
function submitPlanUpdate(): void {
  const u = SESSION.get()!; const wk = LWK;
  const missing = LPLANS.filter((p) => !LPD[p.grade]);
  if (missing.length) { setErr('lpReasonErr', `Choose a status for ${missing.map((p) => p.grade).join(', ')}.`); return; }
  const prev = planUpdatesOf(u.name, wk);
  const late = !prev.some((x) => !x.late) && todayStr() > weekDue(wk); // editing an on-time update stays on time
  const reason = $('lpReason').value.trim();
  if (LPLANS.some((p) => LPD[p.grade] === 'Partly done' || LPD[p.grade] === 'Not done') && reason.length < 5) {
    setErr('lpReasonErr', 'Add a reason for what was partly done or not done.'); $('lpReason').focus(); return;
  }
  prev.forEach((x) => STORE.remove('planUpdates', x.id!));
  const at = new Date().toISOString();
  LPLANS.forEach((p) => STORE.add('planUpdates', { teacher: u.name, week: wk, grade: p.grade, status: LPD[p.grade] as PlanUpdate['status'], reason, at, late }));
  flash('ok', 'Weekly progress saved — your coordinator can see it.'); render();
}
// Last finished week with a plan (or this week if none) — who updated, who didn't.
function complianceCard(names: string[]): string {
  const cur = weekOf(todayStr()); const last = addDays(cur, -7);
  const wk = names.some((n) => planStatus(n, last) !== 'none') ? last : cur;
  const rows = names.map((n) => ({ n, st: planStatus(n, wk) })).filter((x) => x.st !== 'none');
  if (!rows.length) return '';
  const cnt = (k: string) => rows.filter((x) => x.st === k).length;
  const missing = rows.filter((x) => x.st === 'overdue' || x.st === 'due');
  return `<section class="card"><div class="card-head"><b>${ic('book', 18)} Lesson plan updates</b><span class="muted">Week of ${fmtD(wk)}</span></div>
    <div class="mini-stats"><span><b>${cnt('updated')}</b>on time</span><span><b>${cnt('late')}</b>late</span><span><b>${missing.length}</b>${wk === cur ? 'pending' : 'not updated'}</span></div>
    ${missing.length ? `<p class="hint">${wk === cur ? 'Pending' : 'Not updated'}: ${missing.map((x) => esc(x.n)).join(', ')}</p>` : ''}</section>`;
}
function planHistory(name: string): string {
  const cur = weekOf(todayStr());
  const weeks = [...new Set(plansFor(name).map((p) => p.week))].filter((w) => w <= cur && planStatus(name, w) !== 'none').sort().reverse().slice(0, 6);
  if (!weeks.length) return '';
  return `<h2 class="section-title">Lesson plan updates</h2><div class="card list">${weeks.map((w) => { const ups = planUpdatesOf(name, w); return `<div class="row-item"><span class="row-ic">${ic('book', 18)}</span>
    <span class="row-main"><b>Week of ${fmtD(w)}</b><small>${ups.length ? ups.map((x) => `${esc(x.grade)}: ${esc(x.status)}`).join(' · ') : 'No update yet'}</small>${ups[0]?.reason ? `<small>Reason: ${esc(ups[0].reason)}</small>` : ''}</span>
    <span class="row-end">${planBadge(planStatus(name, w))}</span></div>`; }).join('')}</div>`;
}
let CTS = 'teachers'; // leadership Teachers tab section
function setCts(k: string): void { CTS = k; PENDING_DEL = ''; render(); }
function plansAdmin(u: User): string {
  const cur = weekOf(todayStr()); const weeks = [...new Set(STORE.get('lessons').map((p) => p.week))].sort().reverse();
  const all = STORE.get('teachers').map((t) => t.name);
  return complianceCard(all) + progressCard(all, todayStr(), 'Lesson plan progress · all teachers') +
    STORE.get('moderators').map((m) => progressCard(teachersOfMod(m).map((t) => t.name), todayStr(), `${esc(m)}'s teachers`)).join('') +
    (isTop(u) ? `<section class="card"><h3 class="card-title">Load lesson plans</h3>
      <p class="hint" style="margin-top:0">Download the blank template (or the current plans), fill it in Excel and upload it — or copy the rows <b>Date or week · Batch or grade · Topic · Activity</b> and paste them below. Week is a number (Week 1 = ${fmtD(weekOf(CONFIG.ayStart))}) or any date in that week — a date becomes the session date. Use a batch name (e.g. <b>Batch 01</b>) to schedule that batch's teachers, or a grade for everyone. A plan for the same week and group is replaced.</p>
      <div class="btn-row"><button class="btn ghost sm" onclick="planTemplate()">${ic('download', 16)}Blank template</button><button class="btn ghost sm" onclick="exportPlans()">${ic('download', 16)}Current plans</button>
        <button class="btn sm" onclick="$('lpFile').click()">${ic('upload', 16)}Upload Excel</button></div>
      <input type="file" id="lpFile" accept=".xlsx,.csv" hidden onchange="uploadPlans(this)">
      <label class="field-l" for="lpPaste">Paste rows</label><textarea id="lpPaste" class="paste" rows="7" placeholder="Week 24&#9;Grade 5&#9;Line follower robot&#9;Build and test with IR sensors"></textarea>
      <p class="err" id="lpPasteErr" role="alert"></p>
      <button class="btn block" onclick="loadPlans()">${ic('upload', 18)}Load plans</button></section>` : '') +
    `<h2 class="section-title">Published weeks</h2><div class="card list">${weeks.length ? weeks.map((w) => { const ps = STORE.get('lessons').filter((p) => p.week === w).sort(byGrade);
      return `<div class="row-item${isTop(u) ? ' wrap-end' : ''}">${dateChip(w)}<span class="row-main"><b>Week of ${fmtD(w)}${w === cur ? ' · this week' : ''}</b><small>${[...new Set(ps.map((p) => p.topic))].map((t) => `${esc(t)} — ${plural(ps.filter((p) => p.topic === t).length, 'group')}`).join(' · ')}</small></span>${isTop(u) ? `<span class="row-end">${twoTap('wk' + w, `delPlanWeek('${w}')`, 'Remove week')}</span>` : ''}</div>`; }).join('')
      : empty('book', 'No lesson plans yet', isTop(u) ? 'Paste rows from Excel above.' : 'Plans loaded by Parth or Manish appear here.')}</div>`;
}
function loadPlans(): void { applyPlans($('lpPaste').value, 'Paste at least one row.'); }
// Pasted text and uploaded files both end up here as tab-separated rows.
function applyPlans(text: string, none: string): void {
  if (!isTop(SESSION.get()!)) return;
  const { plans, errors } = parsePlans(text);
  if (errors.length) { setErr('lpPasteErr', errors.slice(0, 3).join(' · ') + (errors.length > 3 ? ` · +${errors.length - 3} more` : '')); return; }
  if (!plans.length) { setErr('lpPasteErr', none); return; }
  setErr('lpPasteErr', '');
  const addedAt = new Date().toISOString();
  // A known batch name inherits that batch's teachers and trainer (looked up before anything is replaced).
  const batches: Record<string, LessonPlan> = {};
  STORE.get('lessons').forEach((x) => { if (x.teachers) batches[x.grade.toLowerCase()] = x; });
  plans.forEach((p) => {
    STORE.get('lessons').filter((x) => x.week === p.week && x.grade === p.grade).forEach((x) => STORE.remove('lessons', x.id!));
    const batch = batches[p.grade.toLowerCase()];
    STORE.add('lessons', { ...p, addedAt, teachers: batch?.teachers, trainer: batch?.trainer, date: p.date });
  });
  const weeks = new Set(plans.map((p) => p.week)).size;
  flash('ok', `Loaded ${plural(plans.length, 'plan')} across ${plural(weeks, 'week')}.`); render();
}
function delPlanWeek(wk: string): void { STORE.get('lessons').filter((p) => p.week === wk).forEach((p) => STORE.remove('lessons', p.id!)); PENDING_DEL = ''; flash('ok', `Week of ${fmtD(wk)} removed.`); render(); }
const PLAN_HEAD = ['Date or week', 'Batch or grade', 'Topic', 'Activity / objective'];
function planTemplate(): void { downloadXLSX('robobox-lesson-plan-template.xlsx', [PLAN_HEAD], 'Lesson plans'); }
// Same columns as the template, so Parth can edit this file and upload it back.
function exportPlans(): void {
  const rows = STORE.get('lessons').slice().sort((a, b) => (a.date || a.week).localeCompare(b.date || b.week) || byGrade(a, b))
    .map((p) => [p.date || p.week, p.grade, p.topic, p.activity]);
  downloadXLSX(`robobox-lesson-plans-${todayStr()}.xlsx`, [PLAN_HEAD, ...rows], 'Lesson plans');
}
async function uploadPlans(input: HTMLInputElement): Promise<void> {
  const f = input.files?.[0]; input.value = ''; if (!f) return;
  try {
    const rows = /\.xlsx$/i.test(f.name) ? xlsxRows(await unzipXml(await f.arrayBuffer())) : (await f.text()).split(/\r?\n/).map((l) => l.split(l.includes('\t') ? '\t' : ','));
    // Typed dates arrive as Excel day serials; small numbers stay week numbers.
    const cell = (c: string, i: number) => i === 0 && /^\d{5}(\.\d+)?$/.test(c.trim()) ? excelDate(Number(c)) : c.replace(/[\t\r\n]+/g, ' ');
    applyPlans(rows.map((r) => r.map(cell).join('\t')).join('\n'), `${f.name} has no plan rows under the header.`);
  } catch (e) { setErr('lpPasteErr', `Couldn't read ${f.name} — save it as .xlsx and try again.`); }
}

/* ================= MY PROFILE + BIRTHDAYS ================= */
const mustProfile = (u: User) => u.role === 'teacher' || u.role === 'mod'; // can't use the app until saved
const canSeeProfiles = (u: User) => u.role === 'ceo' && !!leaderOf(u.name)?.profiles; // Parth
const profileOf = (role: Role, name: string) => STORE.get('profiles').find((p) => p.role === role && p.name.toLowerCase() === name.toLowerCase());
// Profile photo where there is one, initials otherwise.
const face = (role: Role, name: string, cls = 'avatar') => { const p = profileOf(role, name);
  return `<span class="${cls}" aria-hidden="true">${p?.selfie ? `<img src="${p.selfie}" alt="">` : initials(name)}</span>`; };
const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
let PROF = false; let PF_SELFIE = ''; // selfie picked but not yet saved
function openProfile(): void { PROF = true; PF_SELFIE = ''; render(); entered(); }
function closeProfile(): void { PROF = false; PF_SELFIE = ''; render(); entered(); }
// Square-crops and shrinks the photo on the device (~20 KB) so it fits in storage.
// ponytail: stored inline in the profile; move to object storage with the backend.
async function pickSelfie(input: HTMLInputElement): Promise<void> {
  const f = input.files?.[0]; input.value = ''; if (!f) return;
  try {
    const img = await createImageBitmap(f); const side = Math.min(img.width, img.height), S = 320;
    const c = document.createElement('canvas'); c.width = c.height = S;
    c.getContext('2d')!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
    PF_SELFIE = c.toDataURL('image/jpeg', 0.8);
    document.getElementById('pfPreview')!.innerHTML = `<img src="${PF_SELFIE}" alt="Your selfie">`; setErr('pfPhotoErr', '');
  } catch (e) { setErr('pfPhotoErr', 'Couldn’t read that photo — try again.'); }
}
function profileView(u: User, gate: boolean): string {
  const p = profileOf(u.role, u.name); const h = (u.role === 'teacher' && SEED.profileHints[u.name]) || {};
  if (!PF_SELFIE) PF_SELFIE = p?.selfie || '';
  const field = (id: string, label: string, val: string, extra: string) =>
    `<label class="field-l" for="${id}">${label}</label><input id="${id}" value="${esc(val)}" ${extra}><p class="err" id="${id}Err" role="alert"></p>`;
  return (gate ? '' : backLink('Back', 'closeProfile()')) +
    pageHead('My profile', gate ? `Welcome, ${esc(titleCase(u.name))}. Complete your profile to start using the portal — it takes a minute.` : 'Keep your details up to date.') +
    `<section class="card">
      <span class="field-l">Selfie</span>
      <div class="selfie"><span class="selfie-pv" id="pfPreview">${PF_SELFIE ? `<img src="${PF_SELFIE}" alt="Your selfie">` : ic('camera', 32)}</span>
        <div><button class="btn ghost sm" onclick="$('pfPhoto').click()">${ic('camera', 16)}${PF_SELFIE ? 'Retake selfie' : 'Take a selfie'}</button>
          <p class="hint">A clear photo of your face, for your coordinator and Robobox.</p></div></div>
      <input type="file" id="pfPhoto" accept="image/*" capture="user" hidden onchange="pickSelfie(this)"><p class="err" id="pfPhotoErr" role="alert"></p>
      ${field('pfName', 'Full name', p?.fullName || titleCase(u.name), 'autocomplete="name" placeholder="First and last name"')}
      ${field('pfEdu', 'Education', p?.education || h.education || '', 'placeholder="e.g. B.Tech, Electronics"')}
      ${field('pfBday', 'Birthday', p?.birthday || '', `type="date" max="${todayStr()}"`)}
      ${field('pfLoc', 'Location', p?.location || h.location || '', 'autocomplete="address-level2" placeholder="Area, city — e.g. Dombivli, Thane"')}
      <button class="btn block" onclick="saveProfile()">${ic('check', 18)}${gate ? 'Save and continue' : 'Save profile'}</button>
      ${p ? `<p class="hint">Last updated ${fmtD(p.updatedAt.slice(0, 10))}.</p>` : ''}
    </section>`;
}
function saveProfile(): void {
  const u = SESSION.get()!; const val = (id: string) => $(id).value.trim().replace(/\s+/g, ' ');
  const f = { fullName: val('pfName'), education: val('pfEdu'), birthday: $('pfBday').value, location: val('pfLoc'), selfie: PF_SELFIE };
  const age = f.birthday ? dayDiff(f.birthday, todayStr()) / 365.25 : 0;
  const errs: [string, string][] = [
    ['pfPhoto', f.selfie ? '' : 'Take a selfie — it’s required.'],
    ['pfName', f.fullName.length >= 2 ? '' : 'Enter your full name.'],
    ['pfEdu', f.education ? '' : 'Enter your highest qualification.'],
    ['pfBday', !f.birthday ? 'Enter your date of birth.' : age < 16 || age > 80 ? 'Check the year — that date gives an age outside 16–80.' : ''],
    ['pfLoc', f.location ? '' : 'Enter where you live (area, city).'],
  ];
  errs.forEach(([id, m]) => setErr(id + 'Err', m));
  const bad = errs.find(([, m]) => m); if (bad) { $(bad[0]).focus(); return; }
  const p = profileOf(u.role, u.name); const rec = { ...f, updatedAt: new Date().toISOString() };
  if (p) STORE.update('profiles', p.id!, rec); else STORE.add('profiles', { role: u.role, name: u.name, ...rec });
  PROF = false; PF_SELFIE = ''; flash('ok', p?.selfie ? 'Profile updated.' : 'Profile saved — welcome!'); render(); entered();
}
// Next occurrence on or after `from`. 29 Feb birthdays fall on 28 Feb in non-leap years.
function nextBirthday(bday: string, from: string): string {
  const m = Number(bday.slice(5, 7)), d = Number(bday.slice(8, 10));
  const on = (y: number) => isoLocal(new Date(y, m - 1, m === 2 && d === 29 && new Date(y, 1, 29).getMonth() !== 1 ? 28 : d));
  const y = Number(from.slice(0, 4)); return on(y) >= from ? on(y) : on(y + 1);
}
// Coordinators: their own teachers. Parth: every teacher and coordinator.
function birthdaysFor(u: User, from = todayStr()): { p: Profile; next: string; age: number }[] {
  const mine = u.role === 'mod' ? teachersOfMod(u.name).map((t) => t.name.toLowerCase()) : null;
  return STORE.get('profiles').filter((p) => p.birthday && (mine ? p.role === 'teacher' && mine.includes(p.name.toLowerCase()) : mustProfile(p)))
    .map((p) => { const next = nextBirthday(p.birthday, from); return { p, next, age: Number(next.slice(0, 4)) - Number(p.birthday.slice(0, 4)) }; })
    .sort((a, b) => a.next.localeCompare(b.next));
}
const whoLine = (p: Profile) => p.role === 'mod' ? 'Coordinator' : `Teacher · ${esc(STORE.teacher(p.name)?.mod || '')}`;
function bdayRow(b: { p: Profile; next: string; age: number }): string {
  const today = todayStr(); const days = dayDiff(today, b.next);
  return `<div class="row-item">${dateChip(b.next)}<span class="row-main"><b>${esc(b.p.fullName)}</b><small>${whoLine(b.p)} · turns ${b.age}</small></span>
    <span class="row-end">${days === 0 ? badge('Today', 'brand') : days === 1 ? badge('Tomorrow', 'blue') : `<span class="muted">in ${days} days</span>`}</span></div>`;
}
function birthdayCard(u: User, days: number): string {
  const until = addDays(todayStr(), days); const bs = birthdaysFor(u).filter((b) => b.next <= until);
  return `<h2 class="section-title">Birthdays · next ${days} days</h2><div class="card list">${bs.length ? bs.slice(0, 8).map(bdayRow).join('')
    : empty('gift', 'No birthdays coming up', 'Birthdays appear once teachers complete their profile.')}</div>`;
}
function profileBlock(name: string): string {
  const p = profileOf('teacher', name);
  return `<h2 class="section-title">Profile</h2><section class="card">${p ? `${p.selfie ? `<img class="selfie-lg" src="${p.selfie}" alt="Selfie of ${esc(p.fullName)}">` : ''}<dl class="kv">
      <dt>Full name</dt><dd>${esc(p.fullName)}</dd><dt>Education</dt><dd>${esc(p.education)}</dd>
      <dt>Birthday</dt><dd>${parseD(p.birthday).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}</dd><dt>Location</dt><dd>${esc(p.location)}</dd></dl>`
    : `<p class="hint" style="margin:0">Profile not completed yet — ${esc(name)} will be asked to fill it in at their next sign-in.</p>`}</section>`;
}
// Parth: the profile repository (teachers + coordinators) and the birthday calendar for the year ahead.
function profilesAdmin(): string {
  const people: [Role, string][] = [...STORE.get('moderators').map((m): [Role, string] => ['mod', m]), ...STORE.get('teachers').map((t): [Role, string] => ['teacher', t.name])];
  people.sort(([r1, n1], [r2, n2]) => Number(!profileOf(r1, n1)) - Number(!profileOf(r2, n2))); // missing last
  const done = people.filter(([r, n]) => profileOf(r, n)).length;
  const all = birthdaysFor(SESSION.get()!); let month = '';
  const cal = all.map((b) => { const mo = parseD(b.next).toLocaleDateString([], { month: 'long', year: 'numeric' }); const head = mo !== month ? `<p class="list-group">${mo}</p>` : ''; month = mo; return head + bdayRow(b); }).join('');
  return `<div class="kpis">${kpi('Profiles complete', `${done}/${people.length}`, 'users')}${kpi('Missing', people.length - done, 'alert', people.length - done ? 'amber' : '')}</div>
    <h2 class="section-title">Birthday calendar</h2><div class="card list">${cal || empty('gift', 'No birthdays yet', 'They fill in as profiles are completed.')}</div>
    <h2 class="section-title">Profile repository</h2>${searchBox('pfList', 'Search name, education or location')}
    <div class="card list" id="pfList">${people.map(([r, n]) => { const p = profileOf(r, n);
      return `<div class="row-item" data-q="${esc([n, p?.fullName, p?.education, p?.location].join(' ').toLowerCase())}">${face(r, n)}
        <span class="row-main"><b>${esc(p?.fullName || n)}</b><small>${r === 'mod' ? 'Coordinator' : 'Teacher · ' + esc(STORE.teacher(n)?.mod || '')}${p ? ` · ${esc(p.education)} · ${esc(p.location)} · born ${fmtD(p.birthday)}` : ''}</small></span>
        <span class="row-end">${p ? '' : badge('Missing', 'red')}</span></div>`; }).join('')}</div>`;
}
function reportProfiles(): void {
  if (!canSeeProfiles(SESSION.get()!)) return;
  const rows: unknown[][] = [['Login name', 'Full name', 'Role', 'Coordinator', 'Schools', 'Education', 'Birthday', 'Next birthday', 'Location', 'Profile updated']];
  const add = (r: Role, n: string, coord: string, schools: string) => { const p = profileOf(r, n);
    rows.push([n, p?.fullName || '', r === 'mod' ? 'Coordinator' : 'Teacher', coord, schools, p?.education || '', p?.birthday || '', p ? nextBirthday(p.birthday, todayStr()) : '', p?.location || '', p ? p.updatedAt.slice(0, 10) : 'MISSING']); };
  STORE.get('moderators').forEach((m) => add('mod', m, '', schoolsOfMod(m).map((s) => s.name).join('; ')));
  STORE.get('teachers').forEach((t) => add('teacher', t.name, t.mod, schoolsOfTeacher(t).map((s) => s.name).join('; ')));
  downloadXLSX(`robobox-profiles-${todayStr()}.xlsx`, rows, 'Profiles');
}

/* ================= READING AN UPLOADED .xlsx (no library) ================= */
// Unzips just the workbook parts we need; deflated entries go through the browser's DecompressionStream.
async function unzipXml(buf: ArrayBuffer): Promise<Record<string, string>> {
  const v = new DataView(buf), u8 = new Uint8Array(buf), out: Record<string, string> = {}, td = new TextDecoder();
  let e = buf.byteLength - 22; while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('Not an .xlsx file');
  for (let i = 0, p = v.getUint32(e + 16, true); i < v.getUint16(e + 10, true); i++) {
    const method = v.getUint16(p + 10, true), size = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), off = v.getUint32(p + 42, true);
    const name = td.decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
    if (!/^xl\/(sharedStrings|worksheets\/sheet\d+)\.xml$/.test(name)) continue;
    const start = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true); const raw = u8.slice(start, start + size);
    out[name] = td.decode(method === 0 ? raw : await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  }
  return out;
}
const colIndex = (ref: string) => (ref.match(/^[A-Z]+/) || ['A'])[0].split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
// Excel stores dates as day serials (1 = 1900-01-01, with the 1900 leap-year bug → epoch 1899-12-30).
const excelDate = (n: number) => new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000).toISOString().slice(0, 10);
function xlsxRows(files: Record<string, string>): string[][] { // ponytail: first sheet only
  const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml');
  const text = (el: Element) => Array.from(el.getElementsByTagName('t')).map((t) => t.textContent || '').join('');
  const ss = files['xl/sharedStrings.xml'] ? Array.from(xml(files['xl/sharedStrings.xml']).getElementsByTagName('si')).map(text) : [];
  const sheet = Object.keys(files).filter((k) => k.includes('worksheets')).sort((a, b) => parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10))[0];
  if (!sheet) throw new Error('No worksheet found');
  return Array.from(xml(files[sheet]).getElementsByTagName('row')).map((r) => {
    const row: string[] = [];
    Array.from(r.getElementsByTagName('c')).forEach((c, i) => {
      const t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0]?.textContent || '';
      row[c.getAttribute('r') ? colIndex(c.getAttribute('r')!) : i] = t === 's' ? ss[Number(v)] || '' : t === 'inlineStr' ? text(c) : v;
    });
    return Array.from(row, (x) => x || '');
  });
}

/* ================= SCHOOL LOCATIONS (Google Maps → geofence centre) ================= */
// Coordinates from a full Google Maps link or a plain "lat, lng". The place pin (!3d…!4d…) wins over the map centre (@lat,lng).
function parseLatLng(raw: string): LatLng | null {
  let s = raw.trim(); try { s = decodeURIComponent(s); } catch (e) { /* keep raw */ }
  const n = '(-?\\d{1,3}\\.\\d+)';
  const m = s.match(new RegExp(`!3d${n}!4d${n}`)) || s.match(new RegExp(`[?&](?:q|query|ll|destination|center)=${n},\\s*${n}`))
    || s.match(new RegExp(`@${n},${n}`)) || s.match(new RegExp(`^${n}\\s*,\\s*${n}$`));
  if (!m) return null; const lat = Number(m[1]), lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}
// Google Maps embed needs no API key. Inside a closed <details>, loading="lazy" means it loads only when opened.
const mapEmbed = (s: School) => `<iframe class="map" loading="lazy" title="Map of ${esc(s.name)}" src="https://maps.google.com/maps?q=${s.lat},${s.lng}&z=17&output=embed"></iframe>`;
const mapsHref = (s: School) => `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;
function schoolLocations(schools: School[]): string {
  return `<div class="card list">${schools.map((s) => `<details class="loc"><summary class="row-item tap"><span class="row-ic">${ic('pin', 18)}</span>
      <span class="row-main"><b>${esc(s.name)}</b><small>${s.lat != null ? `${s.lat.toFixed(5)}, ${s.lng!.toFixed(5)}` : 'Geofence not set — teachers cannot check in'}</small></span>
      <span class="row-end">${s.lat != null ? badge('Set', 'green') : badge('Not set', 'red')}</span></summary>
      <div class="loc-body">${s.lat != null ? mapEmbed(s) + `<a class="btn ghost sm" href="${mapsHref(s)}" target="_blank" rel="noopener">${ic('link', 16)}Open in Google Maps</a>` : ''}
        ${s.mapLink ? `<p class="hint">Link from the school sheet: <a href="${esc(s.mapLink)}" target="_blank" rel="noopener">open it</a>, then copy the full address-bar link (or long-press the pin to copy its coordinates) and paste below.</p>` : ''}
        <label class="field-l" for="loc_${s.id}">Google Maps link or coordinates</label><input id="loc_${s.id}" placeholder="https://www.google.com/maps/place/… or 19.0760, 72.8777">
        <p class="err" id="loc_${s.id}Err" role="alert"></p>
        <div class="btn-row"><button class="btn sm" onclick="setSchoolLink('${s.id}')">${ic('check', 16)}Save location</button>
          <button class="btn ghost sm" onclick="setSchoolHere('${s.id}')">${ic('pin', 16)}Use my current location</button></div></div></details>`).join('')}</div>`;
}
function setSchoolLink(id: string): void {
  const v = $('loc_' + id).value; const p = parseLatLng(v);
  if (!p) { setErr(`loc_${id}Err`, /goo\.gl|maps\.app/.test(v) ? 'Short links can’t be read here — open it in Google Maps and copy the full link from the address bar.' : 'Paste a Google Maps link with a pin, or coordinates like 19.0760, 72.8777.'); return; }
  STORE.setSchoolLoc(id, p.lat, p.lng); flash('ok', `${schoolName(id)}: geofence set (${CONFIG.geofenceMeters} m).`); render();
}
async function setSchoolHere(id: string): Promise<void> {
  try { const p = await getPos(); STORE.setSchoolLoc(id, p.lat, p.lng); flash('ok', `${schoolName(id)}: geofence set to where you are (±${Math.round(p.acc)} m).`); render(); }
  catch (e) { flash('err', (e as Error).message); }
}

/* ================= LESSON PLAN PROGRESS ================= */
interface Prog { done: number; partly: number; not: number; pending: number; }
// Sessions for these teachers in [from, to] (by session date, or week Monday), by their latest status.
function planProgress(names: string[], from: string, to: string): Prog {
  const r: Prog = { done: 0, partly: 0, not: 0, pending: 0 };
  names.forEach((n) => plansFor(n).forEach((p) => {
    const d = p.date || p.week; if (d < from || d > to) return;
    const st = planUpdatesOf(n, p.week).find((x) => x.grade === p.grade)?.status;
    if (st === 'Not my class') return;
    r[st === 'Done' ? 'done' : st === 'Partly done' ? 'partly' : st === 'Not done' ? 'not' : 'pending']++;
  }));
  return r;
}
function progBar(label: string, p: Prog): string {
  const t = p.done + p.partly + p.not + p.pending; if (!t) return '';
  const seg = (k: string, v: number, l: string) => v ? `<span class="seg-${k}" style="width:${(v / t) * 100}%" title="${l}: ${v}"></span>` : '';
  return `<div class="prog"><div class="prog-top"><b>${label}</b><span>${Math.round((p.done / t) * 100)}% done</span></div>
    <div class="stack" role="img" aria-label="${label}: ${p.done} done, ${p.partly} partly done, ${p.not} not done, ${p.pending} not updated">${seg('green', p.done, 'Done')}${seg('amber', p.partly, 'Partly done')}${seg('red', p.not, 'Not done')}${seg('none', p.pending, 'Not updated')}</div>
    <div class="legend tight"><span><i class="seg-green"></i><b>${p.done}</b>Done</span><span><i class="seg-amber"></i><b>${p.partly}</b>Partly</span><span><i class="seg-red"></i><b>${p.not}</b>Not done</span><span><i class="seg-none"></i><b>${p.pending}</b>Not updated</span></div></div>`;
}
// Week bar + calendar-month bar around `day` (defaults to today). Empty when there are no sessions.
function progressCard(names: string[], day = todayStr(), title = 'Lesson plan progress'): string {
  const wk = weekOf(day);
  // No sessions this month yet (e.g. a gap in the schedule) → show the latest month that had any.
  const dates = names.flatMap((n) => plansFor(n).map((p) => p.date || p.week)).sort();
  const mday = dates.some((d) => d.slice(0, 7) === day.slice(0, 7)) ? day : dates.filter((d) => d <= day).pop() || day;
  const m0 = mday.slice(0, 8) + '01'; const m1 = isoLocal(new Date(Number(mday.slice(0, 4)), Number(mday.slice(5, 7)), 0));
  const bars = progBar(`Week of ${fmtD(wk)}`, planProgress(names, wk, addDays(wk, 6))) + progBar(parseD(mday).toLocaleDateString([], { month: 'long', year: 'numeric' }), planProgress(names, m0, m1));
  return bars ? `<section class="card"><h3 class="card-title">${title}</h3>${bars}</section>` : '';
}

/* ================= OPERATIONS: component request fulfilment ================= */
// Fulfilment KPI. ponytail: SLA = CONFIG.opsSlaDays calendar days from request to fulfilment; tune with Robobox.
function opsKpi(rs: Requisition[]): { avgDays: number | null; slaPct: number | null; etaPct: number | null; open: number; overdue: number } {
  const today = todayStr(); const placed = (r: Requisition) => (r.createdAt || '').slice(0, 10);
  const done = rs.filter((r) => r.fulfilledAt && r.createdAt);
  const turn = done.map((r) => dayDiff(placed(r), r.fulfilledAt!.slice(0, 10)));
  const withEta = done.filter((r) => r.eta);
  const open = rs.filter((r) => reqStatus(r) !== 'Fulfilled' && r.createdAt);
  const pct = (a: number, b: number) => b ? Math.round((100 * a) / b) : null;
  return {
    avgDays: turn.length ? turn.reduce((a, b) => a + b, 0) / turn.length : null,
    slaPct: pct(turn.filter((d) => d <= CONFIG.opsSlaDays).length, turn.length),
    etaPct: pct(withEta.filter((r) => r.fulfilledAt!.slice(0, 10) <= r.eta!).length, withEta.length),
    open: open.length,
    overdue: open.filter((r) => (r.eta || addDays(placed(r), CONFIG.opsSlaDays)) < today).length,
  };
}
function opsKpiCards(): string {
  const k = opsKpi(STORE.get('requests'));
  return `<div class="kpis">${kpi('Avg time to fulfil', k.avgDays == null ? '—' : k.avgDays.toFixed(1) + ' days', 'clock')}
    ${kpi(`Within ${CONFIG.opsSlaDays}-day target`, k.slaPct == null ? '—' : k.slaPct + '%', 'target', k.slaPct != null && k.slaPct < 80 ? 'amber' : '')}
    ${kpi('Expected dates kept', k.etaPct == null ? '—' : k.etaPct + '%', 'check')}
    ${kpi('Open · overdue', `${k.open} · ${k.overdue}`, 'package', k.overdue ? 'amber' : '')}</div>`;
}
let OPF = 'Submitted';
function setOPF(k: string): void { OPF = k; render(); }
function opsRequests(u: User): string {
  const all = STORE.get('requests').slice().sort((a, b) => (b.createdAt || b.id || '').localeCompare(a.createdAt || a.id || ''));
  const open = all.filter((r) => reqStatus(r) !== 'Fulfilled').length; const today = todayStr();
  const list = OPF === 'All' ? all : all.filter((r) => reqStatus(r) === OPF);
  const chip = (k: string, label: string) => `<button class="chip${OPF === k ? ' on' : ''}" aria-pressed="${OPF === k}" onclick="setOPF('${k}')">${label} <span>${k === 'All' ? all.length : all.filter((r) => reqStatus(r) === k).length}</span></button>`;
  return pageHead('Component requests', 'From every teacher. Confirm an expected date — the teacher sees it — then mark it fulfilled.',
    `<button class="btn sm" onclick="dlRequests()">${ic('download', 16)}Excel (${open})</button>`) +
    `<h2 class="section-title">Your fulfilment KPI</h2>${opsKpiCards()}
    <div class="chips">${chip('Submitted', 'New')}${chip('In progress', 'In progress')}${chip('Fulfilled', 'Fulfilled')}${chip('All', 'All')}</div>
    ${list.length ? list.map((r) => {
      const st = reqStatus(r); const placed = (r.createdAt || '').slice(0, 10);
      const due = r.eta || (placed ? addDays(placed, CONFIG.opsSlaDays) : '');
      const teacher = STORE.teacher(r.teacher);
      return `<section class="card req">
        <div class="req-head"><span class="avatar">${initials(r.teacher)}</span><span class="row-main"><b>${esc(r.teacher)}</b><small>${esc(r.ref || 'Request')}${placed ? ' · placed ' + fmtD(placed) : ''}${r.school ? ' · ' + esc(schoolName(r.school)) : ''}${teacher ? ' · ' + esc(teacher.mod) : ''}</small></span>${badge(st, reqTone(st))}</div>
        <p class="req-proj">${ic('package', 16)}${esc(kitLabel(r.project))}</p>
        <table class="tbl lines"><thead><tr><th>Component</th><th class="num">Qty</th></tr></thead><tbody>${reqLines(r).map((l) => `<tr><td>${esc(l.component)}</td><td class="num">${l.qty}</td></tr>`).join('')}</tbody></table>
        ${r.note ? `<p class="req-note">“${esc(r.note)}”</p>` : ''}
        ${st === 'Fulfilled' ? `<p class="req-note">${ic('check', 16)} Fulfilled ${fmtD(r.fulfilledAt)}${placed && r.fulfilledAt ? ' · ' + plural(dayDiff(placed, r.fulfilledAt.slice(0, 10)), 'day') + ' after it was placed' : ''}${r.eta && r.fulfilledAt ? (r.fulfilledAt.slice(0, 10) <= r.eta ? ' · on the promised date' : ' · after the promised date') : ''}</p>`
          : `${due && due < today ? `<p class="err">Overdue — ${r.eta ? 'expected ' + fmtD(r.eta) : `${CONFIG.opsSlaDays}-day target passed`}</p>` : ''}
        <div class="grid2"><div><label class="field-l" for="eta_${r.id}">Expected by</label><input type="date" id="eta_${r.id}" value="${r.eta || ''}" min="${placed || today}"></div>
          <div><label class="field-l" for="on_${r.id}">Note to teacher</label><input id="on_${r.id}" value="${esc(r.opsNote || '')}" placeholder="Optional"></div></div>
        <p class="err" id="eta_${r.id}Err" role="alert"></p>
        <div class="btn-row"><button class="btn ghost" onclick="setEta('${r.id}')">${ic('calendar', 16)}${r.eta ? 'Update date' : 'Confirm date'}</button><button class="btn" onclick="fulfil('${r.id}')">${ic('check', 16)}Mark fulfilled</button></div>`}
      </section>`;
    }).join('') : `<div class="card">${empty('package', OPF === 'Submitted' ? 'No new requests' : 'Nothing here', 'Teacher requests appear here as they come in.')}</div>`}`;
}
function setEta(id: string): void {
  const eta = $('eta_' + id).value;
  if (!eta) { setErr('eta_' + id + 'Err', 'Pick the expected date.'); return; }
  STORE.update('requests', id, { eta, opsNote: $('on_' + id).value.trim(), status: 'In progress' });
  flash('ok', `Expected date ${fmtD(eta)} shared with the teacher.`); render();
}
function fulfil(id: string): void { STORE.update('requests', id, { fulfilledAt: new Date().toISOString(), status: 'Fulfilled' }); flash('ok', 'Marked fulfilled — the teacher can see it.'); render(); }
function dlRequests(): void {
  const reqs = STORE.get('requests').filter((r) => reqStatus(r) !== 'Fulfilled');
  if (!reqs.length) { flash('warn', 'No open requests to download.'); return; }
  const rows: unknown[][] = [['Ref', 'Placed', 'Teacher', 'School', 'Coordinator', 'Project', 'Component', 'Quantity', 'Expected by', 'Note']];
  reqs.forEach((r) => reqLines(r).forEach((l) => rows.push([r.ref || '', (r.createdAt || '').slice(0, 10), r.teacher, schoolName(r.school), STORE.teacher(r.teacher)?.mod || '', kitLabel(r.project), l.component, l.qty, r.eta || '', r.note])));
  downloadXLSX(`robobox-component-requests-open-${todayStr()}.xlsx`, rows, 'Open requests');
}
// School events in the next two weeks, for the coordinator's and leadership's main screens.
function eventsCard(u: User, title: string): string {
  const today = todayStr(), until = addDays(today, 14);
  const evs = eventsFor(u).filter((e) => evEnd(e) >= today && e.date <= until).sort((a, b) => a.date.localeCompare(b.date));
  return evs.length ? `<h2 class="section-title">${title}</h2><div class="card list">${evs.slice(0, 6).map((e) => eventRow(u, e)).join('')}</div>` : '';
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
    leaveCard + complianceCard(names) + progressCard(names) + eventsCard(u, 'School events · next 2 weeks') + birthdayCard(u, 30) + searchBox('tList', 'Search teachers') +
    `<div class="card list" id="tList">${ts.map((t) => {
      const rag = teacherRag(t.name); const lv = leaveOn(t.name);
      return `<button class="row-item tap" data-q="${esc(t.name.toLowerCase())}" onclick="openTeacher('${esc(t.name)}')">${face('teacher', t.name)}
        <span class="row-main"><b>${esc(t.name)}</b><small>${esc(schoolsOfTeacher(t).map((s) => s.name).join(', '))} · avg delay ${avgLate(t.name)} min</small></span>
        <span class="row-end">${lv ? badge('On leave', 'amber') : ''}${overdueWeeks(t.name).length ? badge('Plan not updated', 'red') : ''}${rag.avg != null ? `<span class="score">${rag.avg.toFixed(1)}</span>` : ''}${ragPill(rag.key)}${ic('chevR', 18)}</span></button>`;
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
    perfInner(name) + (u.role === 'mod' || canSeeProfiles(u) ? profileBlock(name) : '') + progressCard([name]) + planHistory(name) +
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
    </section>
    <h2 class="section-title">School locations · ${schools.filter((s) => s.lat != null).length}/${schools.length} set</h2>
    <p class="hint">Teachers check in only within ${CONFIG.geofenceMeters} m of these points. Paste the school's Google Maps link, or stand at the gate and use your location.</p>
    ${schoolLocations(schools)}
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
  const events = eventsFor(u); const hols = STORE.get('holidays'); const bdays = birthdaysFor(u);
  const cells: string[] = [];
  for (let i = 0; i < lead; i++) cells.push('<span class="cal-pad"></span>');
  for (let d = 1; d <= dim; d++) {
    const iso = isoLocal(new Date(y, m, d));
    const p = plans.some((x) => x.date === iso && x.status === 'Planned'), v = visits.some((x) => x.date === iso), l = leaves.some((x) => leaveCovers(x, iso));
    const e = events.some((x) => eventOn(x, iso)), h = hols.some((x) => x.date === iso), b = bdays.some((x) => nextBirthday(x.p.birthday, iso) === iso);
    cells.push(`<button class="cal-day${iso === today ? ' today' : ''}${iso === day ? ' sel' : ''}" onclick="calPick('${iso}')" aria-label="${fmtLong(iso)}${p ? ', visit planned' : ''}${v ? ', visited' : ''}${l ? ', teacher on leave' : ''}${e ? ', school event' : ''}${h ? ', holiday' : ''}${b ? ', birthday' : ''}" ${iso === day ? 'aria-pressed="true"' : ''}>
      <span>${d}</span><span class="cal-dots">${p ? '<i class="d-plan"></i>' : ''}${v ? '<i class="d-visit"></i>' : ''}${e ? '<i class="d-event"></i>' : ''}${h ? '<i class="d-hol"></i>' : ''}${l ? '<i class="d-leave"></i>' : ''}${b ? '<i class="d-bday"></i>' : ''}</span></button>`);
  }
  const dayPlans = plans.filter((p) => p.date === day);
  const dayVisits = visits.filter((f) => f.date === day);
  const dayLeaves = leaves.filter((l) => leaveCovers(l, day));
  const dayEvents = events.filter((e) => eventOn(e, day)); const dayHols = hols.filter((h) => h.date === day);
  const dayBdays = birthdaysFor(u, day).filter((x) => x.next === day);
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
      <div class="cal-legend"><span><i class="d-plan"></i>Planned</span><span><i class="d-visit"></i>Visited</span><span><i class="d-event"></i>School event</span><span><i class="d-hol"></i>Holiday</span><span><i class="d-leave"></i>Teacher on leave</span><span><i class="d-bday"></i>Birthday</span></div>
    </section>
    <h2 class="section-title">${fmtLong(day)}</h2>
    <div class="card list">${dayHols.map((h) => `<div class="row-item"><span class="row-ic tile">${ic('sun', 18)}</span><span class="row-main"><b>${esc(h.name)}</b><small>Company holiday</small></span><span class="row-end">${badge('Holiday', 'red')}</span></div>`).join('')}
      ${dayBdays.map(bdayRow).join('')}
      ${dayEvents.map((e) => eventRow(u, e)).join('')}
      ${dayPlans.map((p) => planRow(p, false)).join('')}
      ${dayVisits.map(visitRow).join('')}
      ${dayLeaves.map((l) => `<div class="row-item"><span class="avatar">${initials(l.teacher)}</span><span class="row-main"><b>${esc(l.teacher)}</b><small>${esc(l.type)} leave · until ${fmtD(l.to)}</small></span><span class="row-end">${badge('On leave', 'amber')}</span></div>`).join('')}
      ${dayPlans.length + dayVisits.length + dayLeaves.length + dayEvents.length + dayHols.length + dayBdays.length ? '' : empty('calendar', 'Nothing on this day', day >= today ? 'Plan a visit below.' : '')}</div>
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
    <h2 class="section-title">Operations · component requests</h2>${opsKpiCards()}
    ${eventsCard(u, 'School events · next 2 weeks')}
    ${canSeeProfiles(u) ? birthdayCard(u, 14) : ''}
    <h2 class="section-title">Needs attention</h2>
    <div class="card list">${attention.length ? attention.slice(0, 10).map(({ t, fb }) => `<button class="row-item tap" onclick="openTeacher('${esc(t.name)}')"><span class="avatar">${initials(t.name)}</span>
      <span class="row-main"><b>${esc(t.name)}</b><small>${esc(t.mod)} · ${esc(fb.judgement.action)} · ${fmtD(fb.date)}</small></span><span class="row-end">${ragPill(fb.rag)}${ic('chevR', 18)}</span></button>`).join('')
      : empty('check', 'No amber or red teachers', 'Teachers flagged in their latest visit appear here.')}</div>`;
}
function cTeachers(u: User): string {
  const order: Record<RagOrNone, number> = { red: 0, amber: 1, green: 2, none: 3 };
  const ts = STORE.get('teachers').map((t) => ({ t, rag: teacherRag(t.name) })).sort((a, b) => order[a.rag.key] - order[b.rag.key]);
  const tabs = segTabs('Teachers', CTS, 'setCts', [['teachers', 'Performance', 'chart'], ['plans', 'Lesson plans', 'book'], ...(canSeeProfiles(u) ? [['profiles', 'Profiles', 'users'] as [string, string, string]] : [])]);
  if (CTS === 'profiles' && canSeeProfiles(u)) return pageHead('Teachers', 'Profiles of every teacher and coordinator, and upcoming birthdays.', `<button class="btn ghost sm" onclick="reportProfiles()">${ic('download', 16)}Profiles</button>`) + tabs + profilesAdmin();
  if (CTS === 'plans') return pageHead('Teachers', 'Weekly lesson plans and who has updated their progress.') + tabs + plansAdmin(u);
  return pageHead('Teachers', 'Sorted by risk — red first. Tap a teacher for their trend.',
    `<button class="btn ghost sm" onclick="reportAllTeachers()">${ic('download', 16)}Teachers</button><button class="btn ghost sm" onclick="reportVisits()">${ic('download', 16)}Visit log</button>`) +
    tabs + searchBox('tTable', 'Search teacher or coordinator') +
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
    }).join('')}</div>
    <h2 class="section-title">School locations · ${STORE.get('schools').filter((s) => s.lat != null).length}/${STORE.get('schools').length} set</h2>${schoolLocations(STORE.get('schools'))}`;
}
let LVF = 'Pending';
function setLVF(k: string): void { LVF = k; render(); }
function cLeave(u: User): string {
  if (!isTop(u)) return empty('shield', 'Not available', 'Leave is approved by Parth and Manish only.');
  const all = STORE.get('leaves').slice().sort((a, b) => (a.status === 'Pending' ? 0 : 1) - (b.status === 'Pending' ? 0 : 1) || b.from.localeCompare(a.from));
  const list = LVF === 'All' ? all : all.filter((l) => l.status === LVF);
  const chip = (k: string, label: string) => `<button class="chip${LVF === k ? ' on' : ''}" aria-pressed="${LVF === k}" onclick="setLVF('${k}')">${label} <span>${k === 'All' ? all.length : all.filter((l) => l.status === k).length}</span></button>`;
  return pageHead('Leave approvals', 'Teachers and coordinators. Approved teacher leave is shown to their coordinator.') +
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
  'teacher:home': tHome, 'teacher:lessons': tLessons, 'teacher:att': tAttendance, 'teacher:req': tRequests, 'teacher:upd': updatesView,
  'mod:teachers': (u) => SEL ? teacherDetail(u, SEL) : mTeachers(u), 'mod:visit': (u) => VISIT ? mForm() : mVisit(u),
  'mod:cal': mCalendar, 'mod:leave': mLeave, 'mod:upd': updatesView,
  'ceo:overview': cOverview, 'ceo:teachers': (u) => SEL ? teacherDetail(u, SEL) : cTeachers(u),
  'ceo:coords': cCoords, 'ceo:leave': cLeave, 'ceo:upd': updatesView,
  'ops:req': opsRequests, 'ops:upd': updatesView, 'hr:upd': updatesView,
};

render();
