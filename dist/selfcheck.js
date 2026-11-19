"use strict";
// Runnable check for the two non-trivial bits: haversine geofence + RAG averaging.
// Build + run:  npm run check   (or: tsc && node dist/selfcheck.js)
// Wrapped in an IIFE so its helpers don't collide with the app's global scripts.
(() => {
    const ok = (cond, msg) => { if (!cond)
        throw new Error('FAIL: ' + msg); };
    const hav = (a, b) => {
        const R = 6371000, toR = (d) => d * Math.PI / 180;
        const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
        const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(s));
    };
    const vscore = (ratings) => {
        const vals = Object.values(ratings).filter((v) => typeof v === 'number'); // 'na' excluded
        if (!vals.length)
            return null;
        return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    // geofence: ~150 m north is inside 200 m, ~300 m is outside.
    const school = { lat: 19.0760, lng: 72.8777 };
    const near = { lat: 19.0760 + 150 / 111320, lng: 72.8777 };
    const far = { lat: 19.0760 + 300 / 111320, lng: 72.8777 };
    ok(hav(school, near) <= 200, 'near point inside 200 m');
    ok(hav(school, far) > 200, 'far point outside 200 m');
    ok(hav(school, school) < 1, 'same point ~0 m');
    // RAG averaging: N/A excluded, not counted as zero.
    ok(vscore({ A1: 4, A2: 2, A3: 'na' }) === 3, 'N/A excluded from average');
    ok(vscore({ A1: 'na' }) === null, 'all-NA => no score');
    ok(vscore({ A1: 5, A2: 5 }) === 5, 'plain average');
    // Auto-RAG rule (kept in sync with app.ts computeRag).
    const rag = (ratings, critical) => {
        if (critical['N9'] === 'Yes')
            return 'red';
        const v = Object.values(ratings).filter((x) => typeof x === 'number');
        const avg = v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
        const fails = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8'].filter((k) => critical[k] === 'No').length;
        let key = avg == null ? 'amber' : avg >= 4 ? 'green' : avg >= 3 ? 'amber' : 'red';
        if (fails >= 2)
            key = 'red';
        else if (fails === 1 && key === 'green')
            key = 'amber';
        return key;
    };
    ok(rag({ A1: 5, A2: 4 }, {}) === 'green', 'high avg → green');
    ok(rag({ A1: 3, A2: 4 }, {}) === 'amber', 'mid avg → amber');
    ok(rag({ A1: 2, A2: 2 }, {}) === 'red', 'low avg → red');
    ok(rag({ A1: 5 }, { N9: 'Yes' }) === 'red', 'safety overrides to red');
    ok(rag({ A1: 5 }, { N1: 'No' }) === 'amber', 'one critical fail downgrades green→amber');
    ok(rag({ A1: 5 }, { N1: 'No', N2: 'No' }) === 'red', 'two critical fails → red');
    // .xlsx writer pieces (kept in sync with app.ts crc32 / colName).
    const T = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++)
            c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        T[n] = c >>> 0;
    }
    const crc = (b) => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++)
        c = T[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
    ok(crc(new TextEncoder().encode('123456789')) === 0xCBF43926, 'CRC-32 check value');
    const col = (i) => { let s = ''; for (i++; i; i = Math.floor((i - 1) / 26))
        s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
    ok(col(0) === 'A' && col(25) === 'Z' && col(26) === 'AA' && col(27) === 'AB', 'Excel column letters');
    // Leave coverage (kept in sync with app.ts leaveCovers): inclusive on both ends.
    const covers = (from, to, d) => from <= d && d <= to;
    ok(covers('2026-11-03', '2026-11-05', '2026-11-03'), 'leave covers first day');
    ok(covers('2026-11-03', '2026-11-05', '2026-11-05'), 'leave covers last day');
    ok(!covers('2026-11-03', '2026-11-05', '2026-11-06'), 'leave ends after last day');
    // Local-date formatting (kept in sync with app.ts isoLocal): no UTC day shift.
    const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    ok(isoLocal(new Date(2026, 9, 29, 0, 30)) === '2026-10-29', 'just after local midnight stays the same day');
    // Lesson-plan week parsing (kept in sync with app.ts parseWeek; ayStart = Monday 2026-06-15).
    const P = (d) => new Date(d + 'T00:00');
    const L = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const add = (iso, n) => { const d = P(iso); d.setDate(d.getDate() + n); return L(d); };
    const weekOf = (iso) => { const d = P(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return L(d); };
    const parseWeek = (raw) => {
        const s = raw.trim();
        let m;
        let iso = '';
        if ((m = s.match(/^(?:week\s*)?(\d{1,2})$/i)))
            return add(weekOf('2026-06-15'), (Number(m[1]) - 1) * 7);
        if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)))
            iso = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
        else if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/)))
            iso = `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
        else {
            const t = Date.parse(s.replace(/-/g, ' '));
            if (!isNaN(t))
                iso = L(new Date(t));
        }
        if (!iso)
            return null;
        const [y, mo, d] = iso.split('-').map(Number);
        const dt = new Date(y, mo - 1, d);
        return dt.getMonth() === mo - 1 && dt.getDate() === d ? weekOf(iso) : null;
    };
    ok(parseWeek('Week 1') === '2026-06-15' && parseWeek('3') === '2026-06-29', 'week numbers count from AY start');
    ok(parseWeek('2026-11-19') === '2026-11-16', 'ISO date → its Monday');
    ok(parseWeek('19/11/2026') === '2026-11-16', 'dd/mm/yyyy is day-first');
    ok(parseWeek('17 Nov 2026') === '2026-11-16' && parseWeek('17-Nov-2026') === '2026-11-16', 'month-name dates');
    ok(parseWeek('31/02/2026') === null && parseWeek('Topic') === null, 'invalid dates rejected');
    // Operations KPI: turnaround days and share within the SLA (kept in sync with app.ts opsKpi).
    const sla = 3, days = (a, b) => Math.round((P(b).getTime() - P(a).getTime()) / 86400000);
    const done = [['2026-11-02', '2026-11-04'], ['2026-11-02', '2026-11-09'], ['2026-11-10', '2026-11-13']].map(([a, b]) => days(a, b));
    ok(done.join() === '2,7,3', 'turnaround days');
    ok(Math.round((100 * done.filter((d) => d <= sla).length) / done.length) === 67, 'share fulfilled within SLA');
    // Birthdays (kept in sync with app.ts nextBirthday): next occurrence on/after today; 29 Feb → 28 Feb in non-leap years.
    const nextB = (bday, from) => {
        const m = Number(bday.slice(5, 7)), d = Number(bday.slice(8, 10));
        const on = (y) => L(new Date(y, m - 1, m === 2 && d === 29 && new Date(y, 1, 29).getMonth() !== 1 ? 28 : d));
        const y = Number(from.slice(0, 4));
        return on(y) >= from ? on(y) : on(y + 1);
    };
    ok(nextB('1995-11-25', '2026-11-19') === '2026-11-25', 'birthday later this year');
    ok(nextB('1995-11-19', '2026-11-19') === '2026-11-19', 'birthday today counts as today');
    ok(nextB('1995-01-03', '2026-11-19') === '2027-01-03', 'birthday already passed → next year');
    ok(nextB('2000-02-29', '2026-11-19') === '2027-02-28' && nextB('2000-02-29', '2027-03-01') === '2028-02-29', '29 Feb birthdays');
    // Uploaded .xlsx cells (kept in sync with app.ts colIndex / excelDate).
    const colIdx = (ref) => (ref.match(/^[A-Z]+/) || ['A'])[0].split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
    ok([0, 25, 26, 27, 701, 702].every((i) => colIdx(col(i) + '7') === i), 'cell ref → column index round-trips colName');
    const xDate = (n) => new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000).toISOString().slice(0, 10);
    ok(xDate(46345) === '2026-11-19' && xDate(45658) === '2025-01-01', 'Excel date serials');
    console.log('selfcheck OK');
})();
