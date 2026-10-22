// Runnable check for the two non-trivial bits: haversine geofence + RAG averaging.
// Build + run:  npm run check   (or: tsc && node dist/selfcheck.js)
// Wrapped in an IIFE so its helpers don't collide with the app's global scripts.
(() => {
  const ok = (cond: boolean, msg: string) => { if (!cond) throw new Error('FAIL: ' + msg); };

  const hav = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
    const R = 6371000, toR = (d: number) => d * Math.PI / 180;
    const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };
  const vscore = (ratings: Record<string, unknown>): number | null => {
    const vals = Object.values(ratings).filter((v): v is number => typeof v === 'number'); // 'na' excluded
    if (!vals.length) return null;
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

  console.log('selfcheck OK');
})();
