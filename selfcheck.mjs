// Runnable check for the two non-trivial bits: haversine geofence + RAG averaging.
// Run: node selfcheck.mjs
import assert from 'node:assert';

function haversine(a, b) {
  const R = 6371000, toR = (d) => d * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function visitScore(ratings) {
  const vals = Object.values(ratings).filter((v) => typeof v === 'number'); // 'na' excluded
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// geofence: a point ~150m north is inside 200m, ~300m is outside.
const school = { lat: 19.0760, lng: 72.8777 };
const near = { lat: 19.0760 + 150 / 111320, lng: 72.8777 };   // ~150 m
const far = { lat: 19.0760 + 300 / 111320, lng: 72.8777 };    // ~300 m
assert(haversine(school, near) <= 200, 'near point must be inside 200m');
assert(haversine(school, far) > 200, 'far point must be outside 200m');
assert(haversine(school, school) < 1, 'same point ~0m');

// RAG averaging: N/A excluded, not counted as zero.
assert.strictEqual(visitScore({ A1: 4, A2: 2, A3: 'na' }), 3, 'N/A excluded from average');
assert.strictEqual(visitScore({ A1: 'na' }), null, 'all-NA => no score');
assert.strictEqual(visitScore({ A1: 5, A2: 5 }), 5);

console.log('selfcheck OK');
