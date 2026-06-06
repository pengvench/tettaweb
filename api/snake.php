<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

define('SNAKE_DATA_DIR', dirname(__DIR__) . DIRECTORY_SEPARATOR . 'snake-data');
define('SNAKE_STORE_FILE', SNAKE_DATA_DIR . DIRECTORY_SEPARATOR . 'snake-store.json');
define('SNAKE_LOCK_FILE', SNAKE_DATA_DIR . DIRECTORY_SEPARATOR . 'snake-store.lock');
define('SNAKE_JOURNAL_FILE', SNAKE_DATA_DIR . DIRECTORY_SEPARATOR . 'snake-runs.ndjson');
define('SNAKE_SESSION_TTL', 21600);
define('SNAKE_RUN_TTL', 7200);
define('SNAKE_MAX_TICKS', 10000);
define('SNAKE_MAX_MOVES', 2500);
define('SNAKE_LEADERBOARD_LIMIT', 100);
define('SNAKE_LEADERBOARD_SEASON', '20260605-clean-1');

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($method === 'GET' && $action === 'health') {
        send_json(snake_health());
    }

    if ($method === 'GET' && $action === 'leaderboard') {
        $corrupted = false;
        $store = load_store($corrupted);
        if ($corrupted) {
            send_json([
                'ok' => false,
                'error' => 'store_corrupted',
                'leaderboard' => [],
            ]);
        }

        send_json([
            'ok' => true,
            'leaderboard' => public_leaderboard($store),
        ]);
    }

    if ($method !== 'POST') {
        send_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    }

    $body = read_json_body();

    if ($action === 'start-session') {
        $page = safe_text($body['page'] ?? '');

        $result = mutate_store(function (array &$store) use ($page): array {
            cleanup_store($store);

            $sessionId = token('ps_');
            $store['sessions'][$sessionId] = [
                'createdAt' => time(),
                'attempts' => 0,
                'page' => $page,
                'runs' => [],
            ];

            return [
                'ok' => true,
                'pageSessionId' => $sessionId,
            ];
        });

        send_json($result);
    }

    if ($action === 'start-run') {
        $sessionId = safe_text($body['pageSessionId'] ?? '');
        $board = sanitize_board($body['board'] ?? []);

        $result = mutate_store(function (array &$store) use ($sessionId, $board): array {
            cleanup_store($store);

            if (!$sessionId || !isset($store['sessions'][$sessionId])) {
                return ['ok' => false, 'error' => 'invalid_session'];
            }

            $attempt = (int)($store['sessions'][$sessionId]['attempts'] ?? 0) + 1;
            $runId = token('run_');
            $seed = random_seed();

            $store['sessions'][$sessionId]['attempts'] = $attempt;
            $store['sessions'][$sessionId]['runs'][$runId] = [
                'seed' => $seed,
                'board' => $board,
                'attempt' => $attempt,
                'createdAt' => time(),
                'expiresAt' => time() + SNAKE_RUN_TTL,
                'saved' => false,
            ];

            return [
                'ok' => true,
                'runId' => $runId,
                'seed' => $seed,
                'attempt' => $attempt,
            ];
        });

        send_json($result, empty($result['ok']) ? 400 : 200);
    }

    if ($action === 'save-run') {
        $sessionId = safe_text($body['pageSessionId'] ?? '');
        $runId = safe_text($body['runId'] ?? '');
        $name = sanitize_name($body['name'] ?? '');
        $ticks = (int)($body['ticks'] ?? 0);
        $moves = sanitize_moves($body['moves'] ?? [], $ticks);

        if (!$sessionId || !$runId || !$ticks || $ticks > SNAKE_MAX_TICKS || $moves === null) {
            send_json(['ok' => false, 'error' => 'bad_replay'], 422);
        }

        $result = mutate_store(function (array &$store) use ($sessionId, $runId, $name, $ticks, $moves): array {
            cleanup_store($store);

            if (!isset($store['sessions'][$sessionId]['runs'][$runId])) {
                return ['ok' => false, 'error' => 'invalid_run'];
            }

            $run = $store['sessions'][$sessionId]['runs'][$runId];
            if (!empty($run['saved'])) {
                return ['ok' => false, 'error' => 'already_saved'];
            }

            if ((int)($run['expiresAt'] ?? 0) < time()) {
                return ['ok' => false, 'error' => 'run_expired'];
            }

            $simulation = simulate_run((int)$run['seed'], $run['board'], $moves, $ticks);
            if (empty($simulation['dead'])) {
                return ['ok' => false, 'error' => 'run_not_finished'];
            }

            $entry = [
                'id' => leaderboard_id($runId),
                'season' => SNAKE_LEADERBOARD_SEASON,
                'name' => $name ?: 'ANON',
                'score' => (int)$simulation['score'],
                'attempt' => (int)$run['attempt'],
                'createdAt' => time(),
            ];

            append_run_journal($entry, [
                'pageSessionId' => $sessionId,
                'runId' => $runId,
                'seed' => (int)$run['seed'],
                'board' => $run['board'],
                'ticks' => $ticks,
                'moves' => $moves,
            ]);

            $store['sessions'][$sessionId]['runs'][$runId]['saved'] = true;
            upsert_leaderboard_entry($store['leaderboard'], $entry);
            sort_leaderboard($store['leaderboard']);
            $store['leaderboard'] = array_slice($store['leaderboard'], 0, SNAKE_LEADERBOARD_LIMIT);

            return [
                'ok' => true,
                'entry' => public_entry($entry),
                'leaderboard' => public_leaderboard($store),
            ];
        });

        send_json($result, empty($result['ok']) ? 422 : 200);
    }

    send_json(['ok' => false, 'error' => 'unknown_action'], 404);
} catch (Throwable $error) {
    error_log('[snake] ' . $error->getMessage());
    send_json(['ok' => false, 'error' => 'server_error'], 500);
}

function send_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') return [];

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function ensure_data_dir(): void
{
    if (!is_dir(SNAKE_DATA_DIR)) {
        if (!@mkdir(SNAKE_DATA_DIR, 0755, true) && !is_dir(SNAKE_DATA_DIR)) {
            throw new RuntimeException('data_dir_create_failed');
        }
    }

    if (!is_writable(SNAKE_DATA_DIR)) {
        throw new RuntimeException('data_dir_not_writable');
    }
}

function snake_health(): array
{
    $storageError = null;

    try {
        ensure_data_dir();
    } catch (Throwable $error) {
        $storageError = $error->getMessage();
    }

    $dataDirExists = is_dir(SNAKE_DATA_DIR);
    $dataDirWritable = $dataDirExists && is_writable(SNAKE_DATA_DIR);
    $storeWritable = is_file(SNAKE_STORE_FILE) ? is_writable(SNAKE_STORE_FILE) : $dataDirWritable;
    $lockWritable = is_file(SNAKE_LOCK_FILE) ? is_writable(SNAKE_LOCK_FILE) : $dataDirWritable;
    $journalWritable = is_file(SNAKE_JOURNAL_FILE) ? is_writable(SNAKE_JOURNAL_FILE) : $dataDirWritable;
    $phpSupported = version_compare(PHP_VERSION, '7.1.0', '>=');

    return [
        'ok' => $phpSupported && $dataDirWritable && $storeWritable && $lockWritable && $journalWritable,
        'phpVersion' => PHP_VERSION,
        'phpSupported' => $phpSupported,
        'phpRecommended' => version_compare(PHP_VERSION, '8.1.0', '>='),
        'season' => SNAKE_LEADERBOARD_SEASON,
        'storage' => [
            'dataDir' => basename(SNAKE_DATA_DIR),
            'dataDirExists' => $dataDirExists,
            'dataDirWritable' => $dataDirWritable,
            'storeFileExists' => is_file(SNAKE_STORE_FILE),
            'storeFileWritable' => $storeWritable,
            'lockFileWritable' => $lockWritable,
            'journalFileWritable' => $journalWritable,
            'error' => $storageError,
        ],
    ];
}

function default_store(): array
{
    return [
        'sessions' => [],
        'leaderboard' => [],
    ];
}

function load_store(bool &$corrupted = false): array
{
    $corrupted = false;
    ensure_data_dir();

    if (!is_file(SNAKE_STORE_FILE)) {
        return default_store();
    }

    $raw = file_get_contents(SNAKE_STORE_FILE);
    if ($raw === false || trim($raw) === '') {
        return default_store();
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        $corrupted = true;
        return default_store();
    }

    if (!isset($decoded['sessions']) || !is_array($decoded['sessions'])) {
        $decoded['sessions'] = [];
    }
    if (!isset($decoded['leaderboard']) || !is_array($decoded['leaderboard'])) {
        $decoded['leaderboard'] = [];
    }

    return $decoded;
}

function save_store(array $store): void
{
    ensure_data_dir();
    $tmp = SNAKE_STORE_FILE . '.tmp';
    $json = json_encode($store, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        throw new RuntimeException('json_encode_failed');
    }

    if (file_put_contents($tmp, $json, LOCK_EX) === false) {
        throw new RuntimeException('store_tmp_write_failed');
    }

    if (!@rename($tmp, SNAKE_STORE_FILE)) {
        @unlink($tmp);
        throw new RuntimeException('store_rename_failed');
    }
}

function mutate_store(callable $callback): array
{
    ensure_data_dir();
    $lock = fopen(SNAKE_LOCK_FILE, 'c');
    if (!$lock) {
        throw new RuntimeException('lock_open_failed');
    }

    if (!flock($lock, LOCK_EX)) {
        fclose($lock);
        throw new RuntimeException('lock_acquire_failed');
    }
    $corrupted = false;
    $store = load_store($corrupted);
    if ($corrupted && is_file(SNAKE_STORE_FILE)) {
        @rename(SNAKE_STORE_FILE, SNAKE_STORE_FILE . '.corrupt-' . time());
        $store = default_store();
    }

    $result = $callback($store);
    save_store($store);

    flock($lock, LOCK_UN);
    fclose($lock);

    return $result;
}

function cleanup_store(array &$store): void
{
    $now = time();
    prune_leaderboard_season($store);

    foreach ($store['sessions'] as $sessionId => $session) {
        if ((int)($session['createdAt'] ?? 0) < $now - SNAKE_SESSION_TTL) {
            unset($store['sessions'][$sessionId]);
            continue;
        }

        if (!isset($store['sessions'][$sessionId]['runs']) || !is_array($store['sessions'][$sessionId]['runs'])) {
            $store['sessions'][$sessionId]['runs'] = [];
            continue;
        }

        foreach ($store['sessions'][$sessionId]['runs'] as $runId => $run) {
            if ((int)($run['expiresAt'] ?? 0) < $now) {
                unset($store['sessions'][$sessionId]['runs'][$runId]);
            }
        }
    }
}

function prune_leaderboard_season(array &$store): void
{
    if (!isset($store['leaderboard']) || !is_array($store['leaderboard'])) {
        $store['leaderboard'] = [];
        return;
    }

    $store['leaderboard'] = array_values(array_filter($store['leaderboard'], function ($entry): bool {
        return is_array($entry) && ($entry['season'] ?? '') === SNAKE_LEADERBOARD_SEASON;
    }));
}

function token(string $prefix): string
{
    return $prefix . bin2hex(random_bytes(16));
}

function leaderboard_id(string $runId): string
{
    return 'lb_' . substr(hash('sha256', $runId), 0, 24);
}

function random_seed(): int
{
    $parts = unpack('N', random_bytes(4));
    $seed = (int)($parts[1] ?? 1);
    return $seed > 0 ? $seed : 1;
}

function safe_text($value): string
{
    return trim(preg_replace('/[\x00-\x1F\x7F]/u', '', (string)$value) ?? '');
}

function sanitize_name($value): string
{
    $name = safe_text($value);
    if (function_exists('mb_substr')) {
        return mb_substr($name, 0, 15, 'UTF-8');
    }

    return substr($name, 0, 15);
}

function sanitize_board($board): array
{
    $cols = is_array($board) ? (int)($board['cols'] ?? 28) : 28;
    $rows = is_array($board) ? (int)($board['rows'] ?? 18) : 18;
    $allowed = [
        [18, 15],
        [18, 16],
        [28, 18],
    ];

    foreach ($allowed as $item) {
        if ($cols === $item[0] && $rows === $item[1]) {
            return ['cols' => $cols, 'rows' => $rows];
        }
    }

    return ['cols' => 28, 'rows' => 18];
}

function sanitize_moves($moves, int $ticks): ?array
{
    if (!is_array($moves) || count($moves) > SNAKE_MAX_MOVES) {
        return null;
    }

    $result = [];
    $lastTick = -1;
    $allowed = ['up' => true, 'down' => true, 'left' => true, 'right' => true];

    foreach ($moves as $move) {
        if (!is_array($move)) return null;

        $tick = (int)($move['tick'] ?? -1);
        $direction = (string)($move['direction'] ?? '');
        if ($tick < 0 || $tick > $ticks || $tick < $lastTick || !isset($allowed[$direction])) {
            return null;
        }

        $lastTick = $tick;
        $result[] = [
            'tick' => $tick,
            'direction' => $direction,
        ];
    }

    return $result;
}

function public_leaderboard(array $store): array
{
    $items = $store['leaderboard'] ?? [];
    if (!is_array($items)) return [];

    $items = array_values(array_filter($items, function ($entry): bool {
        return is_array($entry) && ($entry['season'] ?? '') === SNAKE_LEADERBOARD_SEASON;
    }));

    sort_leaderboard($items);
    return array_map('public_entry', array_slice($items, 0, 5));
}

function public_entry(array $entry): array
{
    return [
        'name' => sanitize_name($entry['name'] ?? 'ANON') ?: 'ANON',
        'score' => (int)($entry['score'] ?? 0),
        'attempt' => (int)($entry['attempt'] ?? 1),
        'createdAt' => (int)($entry['createdAt'] ?? 0),
    ];
}

function upsert_leaderboard_entry(array &$leaderboard, array $entry): void
{
    $nameKey = leaderboard_name_key($entry['name'] ?? 'ANON');

    foreach ($leaderboard as $index => $existing) {
        if (leaderboard_name_key($existing['name'] ?? 'ANON') !== $nameKey) {
            continue;
        }

        if (is_better_entry($entry, $existing)) {
            $leaderboard[$index] = $entry;
        }

        return;
    }

    $leaderboard[] = $entry;
}

function is_better_entry(array $candidate, array $existing): bool
{
    $candidateScore = (int)($candidate['score'] ?? 0);
    $existingScore = (int)($existing['score'] ?? 0);
    if ($candidateScore !== $existingScore) {
        return $candidateScore > $existingScore;
    }

    $candidateAttempt = (int)($candidate['attempt'] ?? 999999);
    $existingAttempt = (int)($existing['attempt'] ?? 999999);
    if ($candidateAttempt !== $existingAttempt) {
        return $candidateAttempt < $existingAttempt;
    }

    return (int)($candidate['createdAt'] ?? 0) < (int)($existing['createdAt'] ?? 0);
}

function leaderboard_name_key($name): string
{
    $safeName = sanitize_name($name) ?: 'ANON';
    if (function_exists('mb_strtolower')) {
        return mb_strtolower($safeName, 'UTF-8');
    }

    return strtolower($safeName);
}

function sort_leaderboard(array &$leaderboard): void
{
    usort($leaderboard, function (array $a, array $b): int {
        $scoreCompare = ((int)($b['score'] ?? 0)) <=> ((int)($a['score'] ?? 0));
        if ($scoreCompare !== 0) return $scoreCompare;

        $attemptCompare = ((int)($a['attempt'] ?? 999999)) <=> ((int)($b['attempt'] ?? 999999));
        if ($attemptCompare !== 0) return $attemptCompare;

        return ((int)($a['createdAt'] ?? 0)) <=> ((int)($b['createdAt'] ?? 0));
    });
}

function append_run_journal(array $entry, array $context): void
{
    ensure_data_dir();

    $journalEntry = public_entry($entry);
    $journalEntry['id'] = safe_text($entry['id'] ?? '');
    $journalEntry['season'] = safe_text($entry['season'] ?? SNAKE_LEADERBOARD_SEASON);

    $line = [
        'type' => 'snake_verified_run',
        'schema' => 1,
        'writtenAt' => time(),
        'entry' => $journalEntry,
        'context' => [
            'pageSessionId' => safe_text($context['pageSessionId'] ?? ''),
            'runId' => safe_text($context['runId'] ?? ''),
            'seed' => (int)($context['seed'] ?? 0),
            'board' => sanitize_board($context['board'] ?? []),
            'ticks' => (int)($context['ticks'] ?? 0),
            'moves' => is_array($context['moves'] ?? null) ? $context['moves'] : [],
        ],
    ];

    $json = json_encode($line, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        throw new RuntimeException('journal_encode_failed');
    }

    $result = file_put_contents(SNAKE_JOURNAL_FILE, $json . PHP_EOL, FILE_APPEND | LOCK_EX);
    if ($result === false) {
        throw new RuntimeException('journal_write_failed');
    }
}

function simulate_run(int $seed, array $board, array $moves, int $ticks): array
{
    $cols = (int)($board['cols'] ?? 28);
    $rows = (int)($board['rows'] ?? 18);
    $rng = new SnakeRng($seed);
    $midX = intdiv($cols, 2);
    $midY = intdiv($rows, 2);
    $snake = [
        ['x' => $midX - 1, 'y' => $midY],
        ['x' => $midX, 'y' => $midY],
        ['x' => $midX + 1, 'y' => $midY],
    ];
    $direction = 'right';
    $nextDirection = 'right';
    $pending = [];
    $score = 0;
    $obstacles = [];
    $obstacleKey = '';
    $food = spawn_food($rng, $board, $snake, $obstacles);
    $moveIndex = 0;
    $moveCount = count($moves);

    for ($tick = 0; $tick < $ticks; $tick++) {
        while ($moveIndex < $moveCount && (int)$moves[$moveIndex]['tick'] <= $tick) {
            set_direction($pending, $nextDirection, $direction, $moves[$moveIndex]['direction']);
            $moveIndex++;
        }

        if ($pending) {
            $nextDirection = array_shift($pending);
        }

        $direction = $nextDirection;
        $head = $snake[count($snake) - 1];
        $nextHead = move_head($head, $direction);

        if (hits_wall($nextHead, $board) || point_in_list($nextHead, $snake) || point_in_list($nextHead, $obstacles)) {
            return [
                'dead' => true,
                'score' => $score,
            ];
        }

        $snake[] = $nextHead;

        if (same_point($nextHead, $food)) {
            $score++;
            $config = obstacle_config($score);

            if ($config['count'] === 0) {
                $obstacles = [];
                $obstacleKey = '';
            } else {
                $nextKey = $config['count'] . ':' . $config['bucket'];
                if ($nextKey !== $obstacleKey) {
                    $obstacles = generate_obstacles($seed, $board, $config['count'], $config['bucket'], $snake, $food);
                    $obstacleKey = $nextKey;
                }
            }

            $food = spawn_food($rng, $board, $snake, $obstacles);
        } else {
            array_shift($snake);
        }
    }

    return [
        'dead' => false,
        'score' => $score,
    ];
}

class SnakeRng
{
    private $state;

    public function __construct(int $seed)
    {
        $this->state = u32($seed);
        if ($this->state === 0) {
            $this->state = 1;
        }
    }

    public function nextFloat(): float
    {
        $this->state = u32($this->state * 1664525 + 1013904223);
        return $this->state / 4294967296.0;
    }

    public function int(int $max): int
    {
        return (int)floor($this->nextFloat() * max(1, $max));
    }
}

function u32($value): int
{
    $mod = fmod((float)$value, 4294967296.0);
    if ($mod < 0) {
        $mod += 4294967296.0;
    }
    return (int)$mod;
}

function spawn_food(SnakeRng $rng, array $board, array $snake, array $obstacles): array
{
    $cols = (int)$board['cols'];
    $rows = (int)$board['rows'];
    $limit = $cols * $rows * 3;

    for ($i = 0; $i < $limit; $i++) {
        $candidate = [
            'x' => $rng->int($cols),
            'y' => $rng->int($rows),
        ];

        if (point_in_list($candidate, $snake) || point_in_list($candidate, $obstacles)) {
            continue;
        }

        return $candidate;
    }

    return ['x' => 0, 'y' => 0];
}

function obstacle_config(int $score): array
{
    if ($score < 5) return ['count' => 0, 'bucket' => 0];
    if ($score < 10) return ['count' => 2, 'bucket' => 5];
    return ['count' => 4, 'bucket' => intdiv($score, 2)];
}

function generate_obstacles(int $seed, array $board, int $count, int $bucket, array $snake, array $food): array
{
    $cols = (int)$board['cols'];
    $rows = (int)$board['rows'];
    $obstacleSeed = u32($seed + $bucket * 1013904223 + $count * 1664525 + $cols * 4099 + $rows * 257);
    $rng = new SnakeRng($obstacleSeed ?: 1);
    $obstacles = [];
    $startZone = start_zone($board);
    $limit = $cols * $rows * 4;

    for ($i = 0; count($obstacles) < $count && $i < $limit; $i++) {
        $candidate = [
            'x' => $rng->int($cols),
            'y' => $rng->int($rows),
        ];

        if (isset($startZone[point_key($candidate)])) continue;
        if (point_in_list($candidate, $snake)) continue;
        if (same_point($candidate, $food)) continue;
        if (point_in_list($candidate, $obstacles)) continue;

        $obstacles[] = $candidate;
    }

    return $obstacles;
}

function start_zone(array $board): array
{
    $cols = (int)$board['cols'];
    $rows = (int)$board['rows'];
    $midX = intdiv($cols, 2);
    $midY = intdiv($rows, 2);
    $zone = [];

    for ($y = $midY - 2; $y <= $midY + 2; $y++) {
        for ($x = $midX - 4; $x <= $midX + 4; $x++) {
            if ($x >= 0 && $x < $cols && $y >= 0 && $y < $rows) {
                $zone[$x . ':' . $y] = true;
            }
        }
    }

    return $zone;
}

function set_direction(array &$pending, string &$nextDirection, string $direction, string $next): void
{
    $current = $pending ? $pending[count($pending) - 1] : ($nextDirection ?: $direction);
    if ($next === $current || is_opposite($next, $current)) {
        return;
    }

    if (count($pending) >= 2) {
        $pending[count($pending) - 1] = $next;
    } else {
        $pending[] = $next;
    }

    $nextDirection = $pending[0] ?? $next;
}

function is_opposite(string $next, string $current): bool
{
    return (
        ($next === 'up' && $current === 'down') ||
        ($next === 'down' && $current === 'up') ||
        ($next === 'left' && $current === 'right') ||
        ($next === 'right' && $current === 'left')
    );
}

function move_head(array $head, string $direction): array
{
    $next = $head;
    if ($direction === 'up') $next['y']--;
    if ($direction === 'down') $next['y']++;
    if ($direction === 'left') $next['x']--;
    if ($direction === 'right') $next['x']++;
    return $next;
}

function hits_wall(array $point, array $board): bool
{
    return $point['x'] < 0 || $point['x'] >= (int)$board['cols'] || $point['y'] < 0 || $point['y'] >= (int)$board['rows'];
}

function point_in_list(array $point, array $list): bool
{
    foreach ($list as $item) {
        if (same_point($point, $item)) return true;
    }
    return false;
}

function same_point(array $a, array $b): bool
{
    return (int)$a['x'] === (int)$b['x'] && (int)$a['y'] === (int)$b['y'];
}

function point_key(array $point): string
{
    return (int)$point['x'] . ':' . (int)$point['y'];
}
