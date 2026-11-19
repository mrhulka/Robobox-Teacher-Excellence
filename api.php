<?php
// Robobox Teacher Excellence — the shared data store every phone syncs with.
//
// One small PHP file, no database server: records live in a JSON file outside the web root, guarded by a
// file lock. Each record carries the version (`_v`) of the change that last wrote it, so a phone asks
// "what changed since version N?" and gets only that. Deletes are kept as tombstones so they sync too.
// ponytail: one JSON file + global lock — fine for a few hundred people; move to MySQL when it outgrows it.
//
//   POST ?a=login     {role,name,password}  → {token}         default password = the person's name
//   GET  ?a=pull&since=N  (token)           → {v, changes:{coll:[rec…]}}
//   POST ?a=push      {ops:[{coll,op:put|patch|del,id,rec}]} (token) → {v}
//   POST ?a=password  {current,next}  (token)
//   POST ?a=file&id=… raw body (token) · GET ?a=file&id=…&token=… → the file
//   GET  ?a=ping → {ok:true}   (the app uses this to know a server is there)
//
// ponytail: any signed-in person may write any collection; the per-role rules (teachers can't see scores,
// coordinators see their own teachers) are enforced in the app, not here yet.

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

// Outside the web root: a deploy never touches it and a browser can never fetch it.
$DATA = getenv('ROBOBOX_DATA') ?: dirname(__DIR__) . '/robobox-data';
const MAX_FILE = 20 * 1024 * 1024;
const COLLS = ['schools', 'attendance', 'feedback', 'leaves', 'requests', 'tasks', 'materials', 'plans',
  'notices', 'holidays', 'events', 'lessons', 'planUpdates', 'profiles', 'members', 'visitReasons', 'modCheckins'];
const ROLES = ['teacher', 'mod', 'ceo', 'ops', 'hr'];
// Leadership sign-ins — keep in step with CONFIG.leaders in src/config.ts.
const LEADERS = ['Parth', 'Manish', 'Sajesh', 'Yash'];

function out(int $code, $body): void { http_response_code($code); echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function body(): array { $j = json_decode(file_get_contents('php://input') ?: '', true); return is_array($j) ? $j : []; }
function readJson(string $f, $default) { if (!is_file($f)) return $default; $j = json_decode((string) file_get_contents($f), true); return $j === null ? $default : $j; }
function writeJson(string $f, $v): void { $tmp = $f . '.tmp'; file_put_contents($tmp, json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)); rename($tmp, $f); }

if (!is_dir($DATA) && !mkdir($DATA, 0700, true)) out(500, ['error' => 'storage']);
if (!is_dir("$DATA/files")) mkdir("$DATA/files", 0700, true);
$secretFile = "$DATA/secret.key";
if (!is_file($secretFile)) file_put_contents($secretFile, bin2hex(random_bytes(32)));
$SECRET = trim((string) file_get_contents($secretFile));

// Every write happens under this lock, so two phones saving at once can't lose each other's change.
$lock = fopen("$DATA/.lock", 'c');
function locked(callable $fn) { global $lock; flock($lock, LOCK_EX); try { return $fn(); } finally { flock($lock, LOCK_UN); } }

// --- tokens: role|name|expiry, signed with the server secret (30 days) ---
function b64u(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function token(string $role, string $name): string {
  global $SECRET; $p = b64u(json_encode(['r' => $role, 'n' => $name, 'x' => time() + 30 * 86400]));
  return $p . '.' . b64u(hash_hmac('sha256', $p, $SECRET, true));
}
function who(): array {
  global $SECRET;
  $t = $_GET['token'] ?? '';
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
  if (preg_match('/^Bearer\s+(\S+)$/', $h, $m)) $t = $m[1];
  $parts = explode('.', $t);
  if (count($parts) !== 2 || !hash_equals(b64u(hash_hmac('sha256', $parts[0], $SECRET, true)), $parts[1])) out(401, ['error' => 'signin']);
  $c = json_decode(base64_decode(strtr($parts[0], '-_', '+/')), true);
  if (!$c || ($c['x'] ?? 0) < time()) out(401, ['error' => 'signin']);
  return $c;
}
$pwKey = fn(string $role, string $name): string => $role . ':' . mb_strtolower($name);
function pwOk(string $key, string $name, string $pw): bool {
  global $DATA; $pws = readJson("$DATA/passwords.json", []);
  if (!isset($pws[$key])) return mb_strtolower(trim($pw)) === mb_strtolower($name); // default: their name, any case
  return password_verify($pw, $pws[$key]);
}

// Only real people may sign in: the staff shipped in dist/seed.js, people added in the app, leadership, Operations, HR.
function known(string $role, string $name): bool {
  global $DATA; $n = mb_strtolower($name); $low = fn(array $xs) => array_map('mb_strtolower', $xs);
  if ($role === 'ops') return $n === 'operations';
  if ($role === 'hr') return $n === 'hr';
  if ($role === 'ceo') return in_array($n, $low(LEADERS), true);
  $src = (string) @file_get_contents(__DIR__ . '/dist/seed.js'); $i = strpos($src, '{'); $j = strrpos($src, '}');
  $seed = ($i !== false && $j !== false) ? json_decode(substr($src, $i, $j - $i + 1), true) : null;
  $names = $role === 'teacher' ? array_column($seed['teachers'] ?? [], 'name') : ($seed['moderators'] ?? []);
  if (in_array($n, $low($names), true)) return true;
  foreach (readJson("$DATA/state.json", ['data' => []])['data']['members'] ?? [] as $m)
    if (empty($m['_del']) && ($m['role'] ?? '') === $role && mb_strtolower((string) ($m['name'] ?? '')) === $n) return true;
  return false;
}

$a = $_GET['a'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($a === 'ping') out(200, ['ok' => true]);

// Before signing in, a new phone needs the people added in the app for the name suggestions (name, role, schools only).
if ($a === 'people') {
  $ms = []; foreach (readJson("$DATA/state.json", ['data' => []])['data']['members'] ?? [] as $m)
    if (empty($m['_del'])) $ms[] = ['id' => $m['id'], 'role' => $m['role'] ?? '', 'name' => $m['name'] ?? '', 'schools' => $m['schools'] ?? [], 'grades' => [], 'addedBy' => '', 'createdAt' => ''];
  out(200, ['members' => $ms]);
}

if ($a === 'login' && $method === 'POST') {
  $b = body(); $role = (string) ($b['role'] ?? ''); $name = trim((string) ($b['name'] ?? '')); $pw = (string) ($b['password'] ?? '');
  if (!in_array($role, ROLES, true) || $name === '' || mb_strlen($name) > 80) out(400, ['error' => 'bad']);
  // Slow down guessing: a failed attempt costs a second. Unknown people get the same answer as a wrong password.
  if (!known($role, $name) || !pwOk($pwKey($role, $name), $name, $pw)) { sleep(1); out(401, ['error' => 'password']); }
  out(200, ['token' => token($role, $name)]);
}

$me = who(); // everything below needs a signed-in person

if ($a === 'password' && $method === 'POST') {
  $b = body(); $next = (string) ($b['next'] ?? ''); $key = $pwKey($me['r'], $me['n']);
  if (!pwOk($key, $me['n'], (string) ($b['current'] ?? ''))) out(403, ['error' => 'current']);
  if (mb_strlen($next) < 6 || mb_strtolower($next) === mb_strtolower($me['n'])) out(400, ['error' => 'weak']);
  locked(function () use ($key, $next) { global $DATA; $pws = readJson("$DATA/passwords.json", []); $pws[$key] = password_hash($next, PASSWORD_DEFAULT); writeJson("$DATA/passwords.json", $pws); });
  out(200, ['ok' => true]);
}

if ($a === 'pull' && $method === 'GET') {
  $since = max(0, (int) ($_GET['since'] ?? 0));
  $st = readJson("$DATA/state.json", ['v' => 0, 'data' => []]);
  $changes = [];
  foreach ($st['data'] as $coll => $recs) foreach ($recs as $rec) if (($rec['_v'] ?? 0) > $since) $changes[$coll][] = $rec;
  out(200, ['v' => $st['v'], 'changes' => (object) $changes]);
}

if ($a === 'push' && $method === 'POST') {
  $ops = body()['ops'] ?? [];
  if (!is_array($ops) || count($ops) > 500) out(400, ['error' => 'bad']);
  $v = locked(function () use ($ops) {
    global $DATA; $st = readJson("$DATA/state.json", ['v' => 0, 'data' => []]);
    foreach ($ops as $op) {
      $coll = $op['coll'] ?? ''; $id = (string) ($op['id'] ?? ''); $kind = $op['op'] ?? '';
      if (!in_array($coll, COLLS, true) || $id === '' || strlen($id) > 120) continue;
      $st['v']++;
      $cur = $st['data'][$coll][$id] ?? null;
      if ($kind === 'del') $rec = ['id' => $id, '_del' => true];
      elseif ($kind === 'patch') $rec = array_merge(is_array($cur) && empty($cur['_del']) ? $cur : ['id' => $id], is_array($op['rec'] ?? null) ? $op['rec'] : []);
      elseif ($kind === 'put' && is_array($op['rec'] ?? null)) $rec = $op['rec'];
      else continue;
      $rec['id'] = $id; $rec['_v'] = $st['v'];
      $st['data'][$coll][$id] = $rec;
    }
    writeJson("$DATA/state.json", $st);
    return $st['v'];
  });
  out(200, ['v' => $v]);
}

if ($a === 'file') {
  $id = preg_replace('/[^A-Za-z0-9_\-]/', '', (string) ($_GET['id'] ?? ''));
  if ($id === '') out(400, ['error' => 'bad']);
  $f = "$DATA/files/$id";
  if ($method === 'POST') {
    $len = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($len <= 0 || $len > MAX_FILE) out(413, ['error' => 'size']);
    $in = fopen('php://input', 'rb'); $dst = fopen("$f.tmp", 'wb'); $n = stream_copy_to_stream($in, $dst, MAX_FILE + 1); fclose($dst);
    if ($n > MAX_FILE) { unlink("$f.tmp"); out(413, ['error' => 'size']); }
    rename("$f.tmp", $f);
    writeJson("$f.json", ['type' => substr((string) ($_SERVER['CONTENT_TYPE'] ?? 'application/octet-stream'), 0, 100)]);
    out(200, ['ok' => true]);
  }
  if (!is_file($f)) out(404, ['error' => 'missing']);
  $meta = readJson("$f.json", []);
  header('Content-Type: ' . ($meta['type'] ?? 'application/octet-stream'));
  header('Content-Length: ' . filesize($f));
  header('Content-Disposition: attachment');
  readfile($f); exit;
}

out(404, ['error' => 'unknown']);
