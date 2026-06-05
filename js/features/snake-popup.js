const API_URL = '/api/snake.php';
const IDLE_OPEN_DELAY_MS = 5 * 60 * 1000;
const AUTO_SEEN_KEY = 'tetta_snake_idle_seen_v3';
const BEST_SCORE_KEY = 'tetta_snake_best';
const LEADERBOARD_SEASON = '20260605-clean-1';
const LOCAL_LEADERBOARD_KEY = `tetta_snake_leaderboard_local_${LEADERBOARD_SEASON}`;
const SECRET_SEQUENCE = ['w', 'a', 's', 'd'];
const SECRET_TAP_TARGET = 3;
const SECRET_TAP_WINDOW_MS = 900;
const CYRILLIC_CONTROLS_HINT = 'wasd / \u0446\u0444\u044b\u0432';
const FIT_BASE_FONT_PX = 16;
const FIT_MIN_FONT_PX = 11;
const RUN_MAX_TICKS = 10000;
const REPLAY_MAX_MOVES = 2500;
const DEFAULT_PLAYER_NAME = 'ANON';

let initialized = false;

export function initSnakePopup() {
    if (initialized) return;
    initialized = true;

    const popup = createPopup();
    const screen = popup.querySelector('[data-snake-screen]');
    const screenWrap = popup.querySelector('.snake-popup__screen-wrap');
    const gameOverOverlay = popup.querySelector('[data-snake-overlay]');
    const closeButton = popup.querySelector('[data-snake-close]');
    const restartButtons = popup.querySelectorAll('[data-snake-restart]');
    const scoreValue = popup.querySelector('[data-snake-score]');
    const bestValue = popup.querySelector('[data-snake-best]');
    const attemptValue = popup.querySelector('[data-snake-attempt]');
    const statusValue = popup.querySelector('[data-snake-status]');
    const leaderboardList = popup.querySelector('[data-snake-leaderboard]');
    const saveForm = popup.querySelector('[data-snake-save-form]');
    const nameInput = popup.querySelector('[data-snake-name]');
    const saveButton = popup.querySelector('[data-snake-save]');
    const saveStatus = popup.querySelector('[data-snake-save-status]');
    const mobileStatusTrigger = document.getElementById('mobileStatusText')
        || document.querySelector('.logo')
        || document.querySelector('.code');

    let board = createBoardConfig();
    let loopId = null;
    let idleTimerId = null;
    let previousBodyOverflow = '';
    let secretIndex = 0;
    let touchStart = null;
    let secretTapCount = 0;
    let secretTapResetId = null;
    let popupOpen = false;
    let bestScore = readBestScore();
    let pageSessionId = '';
    let apiAvailable = true;
    let resetToken = 0;
    let localAttempt = 0;

    const state = {
        snake: [],
        direction: 'right',
        nextDirection: 'right',
        food: { x: 0, y: 0 },
        obstacles: [],
        obstacleKey: '',
        score: 0,
        tick: 0,
        over: false,
        tickMs: 120,
        pendingDirections: [],
        replay: [],
        seed: 0,
        rng: createRng(1),
        runId: '',
        attempt: 0,
        verifiedRun: false,
        savePending: false,
        saved: false
    };

    bestValue.textContent = formatValue(bestScore);
    attemptValue.textContent = formatValue(0);
    renderLeaderboard([]);
    renderPlaceholder();
    loadLeaderboard();
    bindEvents();
    resetIdleTimer();

    function bindEvents() {
        window.addEventListener('keydown', handleKeydown);
        window.addEventListener('resize', handleResize, { passive: true });
        [
            'pointerdown',
            'pointermove',
            'wheel',
            'scroll',
            'touchstart'
        ].forEach((eventName) => {
            window.addEventListener(eventName, handleGlobalActivity, {
                passive: true,
                capture: true
            });
        });

        document.addEventListener('visibilitychange', handleVisibilityChange);

        closeButton.addEventListener('click', closePopup);
        restartButtons.forEach((button) => {
            button.addEventListener('click', () => {
                restartGame();
                if (!popupOpen) openPopup('restart');
            });
        });

        saveForm.addEventListener('submit', handleSaveSubmit);

        popup.addEventListener('click', (event) => {
            if (event.target === popup) closePopup();
        });

        screen.addEventListener('touchstart', handleTouchStart, { passive: true });
        screen.addEventListener('touchmove', handleTouchMove, { passive: false });
        screen.addEventListener('touchend', handleTouchEnd, { passive: true });
        screen.addEventListener('touchcancel', clearTouchState, { passive: true });

        if (mobileStatusTrigger) {
            mobileStatusTrigger.addEventListener('click', handleSecretTap);
        }
    }

    function createBoardConfig() {
        if (window.innerWidth <= 480) {
            return { cols: 18, rows: 15 };
        }
        if (window.innerWidth <= 768) {
            return { cols: 18, rows: 16 };
        }
        return { cols: 28, rows: 18 };
    }

    function resetIdleTimer() {
        if (idleTimerId) {
            clearTimeout(idleTimerId);
            idleTimerId = null;
        }

        if (popupOpen || document.hidden || sessionStorage.getItem(AUTO_SEEN_KEY) === '1') return;

        idleTimerId = window.setTimeout(() => {
            idleTimerId = null;
            if (popupOpen || document.hidden || sessionStorage.getItem(AUTO_SEEN_KEY) === '1') return;

            sessionStorage.setItem(AUTO_SEEN_KEY, '1');
            openPopup('idle');
        }, IDLE_OPEN_DELAY_MS);
    }

    function stopIdleTimer() {
        if (idleTimerId) {
            clearTimeout(idleTimerId);
            idleTimerId = null;
        }
    }

    function handleGlobalActivity() {
        if (popupOpen) return;
        resetIdleTimer();
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            stopIdleTimer();
            return;
        }

        resetIdleTimer();
    }

    function openPopup(reason = 'manual') {
        stopIdleTimer();
        if (reason !== 'idle') {
            sessionStorage.setItem(AUTO_SEEN_KEY, '1');
        }

        popupOpen = true;
        popup.classList.add('is-open');
        popup.setAttribute('aria-hidden', 'false');
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        if (reason !== 'resume') {
            restartGame(reason);
        } else {
            startLoop();
            render();
        }

        window.requestAnimationFrame(() => {
            fitScreenToArea();
            screen.focus({ preventScroll: true });
        });
    }

    function closePopup() {
        popupOpen = false;
        popup.classList.remove('is-open');
        popup.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = previousBodyOverflow;
        stopLoop();
        clearTouchState();
        clearSecretTapState();
        resetIdleTimer();
    }

    async function restartGame(reason = 'restart') {
        const token = resetToken + 1;
        resetToken = token;
        stopLoop();
        toggleGameOverOverlay(false);
        setSaveUi('idle');
        renderPlaceholder('sync leaderboard...');
        statusValue.textContent = 'sync run // server seed';

        board = createBoardConfig();
        const run = await createRun(board);
        if (token !== resetToken) return;

        resetGameWithRun(run, reason);
    }

    function resetGameWithRun(run, reason) {
        state.score = 0;
        state.tick = 0;
        state.over = false;
        state.tickMs = 120;
        state.pendingDirections = [];
        state.replay = [];
        state.obstacles = [];
        state.obstacleKey = '';
        state.seed = run.seed >>> 0;
        state.rng = createRng(state.seed || 1);
        state.runId = run.runId || '';
        state.attempt = run.attempt || 1;
        state.verifiedRun = Boolean(run.verifiedRun && run.runId);
        state.savePending = false;
        state.saved = false;

        const midX = Math.floor(board.cols / 2);
        const midY = Math.floor(board.rows / 2);

        state.snake = [
            { x: midX - 1, y: midY },
            { x: midX, y: midY },
            { x: midX + 1, y: midY }
        ];
        state.direction = 'right';
        state.nextDirection = 'right';
        spawnFood();
        render();
        window.requestAnimationFrame(fitScreenToArea);

        statusValue.textContent = state.verifiedRun
            ? getStatusText(reason)
            : 'offline run // local save';
        attemptValue.textContent = formatValue(state.attempt);

        if (popupOpen) {
            startLoop();
        }
    }

    function startLoop() {
        stopLoop();
        if (state.over) return;
        loopId = window.setInterval(step, state.tickMs);
    }

    function stopLoop() {
        if (loopId) {
            clearInterval(loopId);
            loopId = null;
        }
    }

    function step() {
        if (state.over) return;

        if (state.tick > RUN_MAX_TICKS) {
            handleGameOver('tick limit');
            return;
        }

        if (state.pendingDirections.length) {
            state.nextDirection = state.pendingDirections.shift();
        }

        state.direction = state.nextDirection;
        const head = state.snake[state.snake.length - 1];
        const nextHead = moveHead(head, state.direction);
        state.tick += 1;

        if (hitsWall(nextHead) || hitsSnake(nextHead) || hitsObstacle(nextHead)) {
            handleGameOver('collision');
            return;
        }

        state.snake.push(nextHead);

        if (nextHead.x === state.food.x && nextHead.y === state.food.y) {
            state.score += 1;
            if (state.score > bestScore) {
                bestScore = state.score;
                localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
            }
            bestValue.textContent = formatValue(bestScore);
            updateObstacles();
            spawnFood();
            state.tickMs = Math.max(72, state.tickMs - 4);
            startLoop();
            statusValue.textContent = getDifficultyText();
        } else {
            state.snake.shift();
        }

        render();
    }

    function moveHead(head, direction) {
        const next = { x: head.x, y: head.y };
        if (direction === 'up') next.y -= 1;
        if (direction === 'down') next.y += 1;
        if (direction === 'left') next.x -= 1;
        if (direction === 'right') next.x += 1;
        return next;
    }

    function hitsWall(point) {
        return point.x < 0 || point.x >= board.cols || point.y < 0 || point.y >= board.rows;
    }

    function hitsSnake(point) {
        return state.snake.some(segment => samePoint(segment, point));
    }

    function hitsObstacle(point) {
        return state.obstacles.some(obstacle => samePoint(obstacle, point));
    }

    function handleGameOver(reason = 'game over') {
        state.over = true;
        stopLoop();
        state.pendingDirections = [];
        statusValue.textContent = `${reason} // save verified run`;
        toggleGameOverOverlay(true);
        setSaveUi(state.verifiedRun ? 'ready' : 'offline');
        render();
    }

    function spawnFood() {
        let nextFood = null;
        let attempts = 0;

        while (!nextFood && attempts < board.cols * board.rows * 3) {
            attempts += 1;
            const candidate = {
                x: state.rng.int(board.cols),
                y: state.rng.int(board.rows)
            };

            if (isOccupied(candidate, { includeFood: false })) continue;
            nextFood = candidate;
        }

        state.food = nextFood || { x: 0, y: 0 };
    }

    function updateObstacles() {
        const config = getObstacleConfig(state.score);
        if (!config.count) {
            state.obstacles = [];
            state.obstacleKey = '';
            return;
        }

        const nextKey = `${config.count}:${config.bucket}`;
        if (nextKey === state.obstacleKey) return;

        state.obstacles = generateObstacles(
            state.seed,
            board,
            config.count,
            config.bucket,
            state.snake,
            state.food
        );
        state.obstacleKey = nextKey;
    }

    function getObstacleConfig(score) {
        if (score < 5) return { count: 0, bucket: 0 };
        if (score < 10) return { count: 2, bucket: 5 };
        return { count: 4, bucket: Math.floor(score / 2) };
    }

    function isOccupied(point, options = {}) {
        const includeFood = options.includeFood !== false;
        if (state.snake.some(segment => samePoint(segment, point))) return true;
        if (state.obstacles.some(obstacle => samePoint(obstacle, point))) return true;
        if (includeFood && samePoint(state.food, point)) return true;
        return false;
    }

    function samePoint(a, b) {
        return Boolean(a && b && a.x === b.x && a.y === b.y);
    }

    function renderPlaceholder(text = 'snake.exe standby') {
        screen.textContent = text;
        scoreValue.textContent = formatValue(state.score || 0);
        window.requestAnimationFrame(fitScreenToArea);
    }

    function render() {
        const cells = Array.from({ length: board.rows }, () => Array(board.cols).fill({ type: 'empty', char: '.' }));

        state.obstacles.forEach((obstacle) => {
            if (!isInsideBoard(obstacle, board)) return;
            cells[obstacle.y][obstacle.x] = { type: 'obstacle', char: 'x' };
        });

        state.snake.forEach((segment, index) => {
            if (!isInsideBoard(segment, board)) return;
            const isHead = index === state.snake.length - 1;
            cells[segment.y][segment.x] = { type: isHead ? 'head' : 'snake', char: isHead ? '@' : '#' };
        });

        if (isInsideBoard(state.food, board)) {
            cells[state.food.y][state.food.x] = { type: 'food', char: '*' };
        }

        const horizontal = Array.from({ length: board.cols }, () => cellHtml('wall', '-')).join('');
        const rows = cells.map(row => `${cellHtml('wall', '|')}${row.map(cell => cellHtml(cell.type, cell.char)).join('')}${cellHtml('wall', '|')}`);

        screen.innerHTML = [
            `${cellHtml('wall', '+')}${horizontal}${cellHtml('wall', '+')}`,
            ...rows,
            `${cellHtml('wall', '+')}${horizontal}${cellHtml('wall', '+')}`
        ].join('\n');

        scoreValue.textContent = formatValue(state.score);
        toggleGameOverOverlay(state.over);
    }

    function handleKeydown(event) {
        const key = normalizeInputKey(event.key);

        if (popupOpen) {
            if (key === 'escape') {
                event.preventDefault();
                closePopup();
                return;
            }

            if (isRestartKey(key) && (key === 'tab' || !isTextInputFocused(event.target))) {
                event.preventDefault();
                restartGame('restart');
                return;
            }

            const direction = getDirectionFromKey(key);
            if (!direction || state.over || isTextInputFocused(event.target)) return;

            event.preventDefault();
            setDirection(direction);
            return;
        }

        resetIdleTimer();

        if (isTouchDevice()) return;
        if (event.altKey || event.ctrlKey || event.metaKey) return;

        if (key === SECRET_SEQUENCE[secretIndex]) {
            secretIndex += 1;
            if (secretIndex === SECRET_SEQUENCE.length) {
                secretIndex = 0;
                openPopup('secret');
            }
            return;
        }

        secretIndex = key === SECRET_SEQUENCE[0] ? 1 : 0;
    }

    function getDirectionFromKey(key) {
        if (key === 'w' || key === 'arrowup') return 'up';
        if (key === 's' || key === 'arrowdown') return 'down';
        if (key === 'a' || key === 'arrowleft') return 'left';
        if (key === 'd' || key === 'arrowright') return 'right';
        return '';
    }

    function setDirection(direction) {
        const current = state.pendingDirections.length
            ? state.pendingDirections[state.pendingDirections.length - 1]
            : (state.nextDirection || state.direction);

        if (direction === current || isOpposite(direction, current)) return;

        if (state.pendingDirections.length >= 2) {
            state.pendingDirections[state.pendingDirections.length - 1] = direction;
        } else {
            state.pendingDirections.push(direction);
        }

        state.nextDirection = state.pendingDirections[0] || direction;

        if (state.replay.length < REPLAY_MAX_MOVES) {
            state.replay.push({ tick: state.tick, direction });
        }

        statusValue.textContent = `dir // ${direction}`;
    }

    function isOpposite(next, current) {
        return (
            (next === 'up' && current === 'down') ||
            (next === 'down' && current === 'up') ||
            (next === 'left' && current === 'right') ||
            (next === 'right' && current === 'left')
        );
    }

    function handleResize() {
        if (!popupOpen) return;
        restartGame('resize');
    }

    function handleTouchStart(event) {
        if (!popupOpen || state.over) return;
        const touch = event.changedTouches[0];
        touchStart = { x: touch.clientX, y: touch.clientY };
    }

    function handleTouchMove(event) {
        if (popupOpen) event.preventDefault();
    }

    function handleTouchEnd(event) {
        if (!popupOpen || !touchStart || state.over) return;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - touchStart.x;
        const dy = touch.clientY - touchStart.y;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (Math.max(absX, absY) < 24) {
            clearTouchState();
            return;
        }

        if (absX > absY) {
            setDirection(dx > 0 ? 'right' : 'left');
        } else {
            setDirection(dy > 0 ? 'down' : 'up');
        }

        clearTouchState();
    }

    function clearTouchState() {
        touchStart = null;
    }

    function handleSecretTap() {
        if (!isTouchDevice()) return;

        secretTapCount += 1;

        if (secretTapCount >= SECRET_TAP_TARGET) {
            clearSecretTapState();
            openPopup('secret');
            return;
        }

        if (secretTapResetId) {
            clearTimeout(secretTapResetId);
        }

        secretTapResetId = window.setTimeout(() => {
            clearSecretTapState();
        }, SECRET_TAP_WINDOW_MS);
    }

    function clearSecretTapState() {
        secretTapCount = 0;
        if (!secretTapResetId) return;
        clearTimeout(secretTapResetId);
        secretTapResetId = null;
    }

    async function handleSaveSubmit(event) {
        event.preventDefault();
        if (state.savePending || state.saved) return;

        const name = sanitizeName(nameInput.value) || DEFAULT_PLAYER_NAME;
        nameInput.value = name;

        if (!state.verifiedRun || !pageSessionId || !state.runId) {
            const entry = saveLocalRun(name);
            state.saved = true;
            renderLeaderboard(readLocalLeaderboard());
            setSaveUi('saved-local', entry);
            return;
        }

        state.savePending = true;
        setSaveUi('saving');

        try {
            const response = await postApi('save-run', {
                pageSessionId,
                runId: state.runId,
                name,
                ticks: state.tick,
                moves: state.replay
            });

            if (!response?.ok) throw new Error(response?.error || 'save failed');

            state.saved = true;
            state.score = Number(response.entry?.score ?? state.score);
            if (state.score > bestScore) {
                bestScore = state.score;
                localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
                bestValue.textContent = formatValue(bestScore);
            }
            scoreValue.textContent = formatValue(state.score);
            renderLeaderboard(response.leaderboard || []);
            setSaveUi('saved', response.entry);
        } catch (error) {
            console.warn('[snake] save failed:', error.message);
            const entry = saveLocalRun(name);
            state.saved = true;
            renderLeaderboard(readLocalLeaderboard());
            setSaveUi('saved-local', entry);
        } finally {
            state.savePending = false;
        }
    }

    function setSaveUi(mode, entry = null) {
        const inputDisabled = mode === 'saving' || mode === 'saved' || mode === 'saved-local';
        nameInput.disabled = inputDisabled;
        saveButton.disabled = inputDisabled;

        if (mode === 'idle') {
            nameInput.value = '';
            saveStatus.textContent = 'score saved only after game over';
            saveButton.textContent = 'save';
            return;
        }

        if (mode === 'ready') {
            nameInput.disabled = false;
            saveButton.disabled = false;
            saveStatus.textContent = '\u0432\u044b \u043a\u0442\u043e? // max 15';
            saveButton.textContent = 'save';
            window.setTimeout(() => nameInput.focus({ preventScroll: true }), 80);
            return;
        }

        if (mode === 'saving') {
            saveStatus.textContent = 'verifying replay...';
            saveButton.textContent = 'wait';
            return;
        }

        if (mode === 'saved') {
            saveStatus.textContent = `saved // ${formatValue(entry?.score ?? state.score)} pts`;
            saveButton.textContent = 'saved';
            return;
        }

        if (mode === 'saved-local') {
            saveStatus.textContent = `local saved // ${formatValue(entry?.score ?? state.score)} pts`;
            saveButton.textContent = 'local';
            return;
        }

        if (mode === 'offline') {
            nameInput.disabled = false;
            saveButton.disabled = false;
            saveStatus.textContent = 'server offline // local save';
            saveButton.textContent = 'save local';
            window.setTimeout(() => nameInput.focus({ preventScroll: true }), 80);
            return;
        }

        saveStatus.textContent = 'save error // try later';
        saveButton.textContent = 'retry';
        nameInput.disabled = false;
        saveButton.disabled = false;
    }

    async function loadLeaderboard() {
        try {
            const response = await getApi('leaderboard');
            if (!response?.ok) throw new Error(response?.error || 'leaderboard failed');
            renderLeaderboard(response.leaderboard || []);
        } catch (error) {
            console.warn('[snake] leaderboard unavailable:', error.message);
            renderLeaderboard(readLocalLeaderboard());
        }
    }

    async function ensurePageSession() {
        if (pageSessionId) return pageSessionId;
        if (!apiAvailable) return '';

        try {
            const response = await postApi('start-session', {
                page: window.location.pathname || '/'
            });

            if (!response?.ok || !response.pageSessionId) {
                throw new Error(response?.error || 'session failed');
            }

            pageSessionId = response.pageSessionId;
            return pageSessionId;
        } catch (error) {
            apiAvailable = false;
            console.warn('[snake] session unavailable:', error.message);
            return '';
        }
    }

    async function createRun(nextBoard) {
        const fallback = () => {
            localAttempt += 1;
            return {
                runId: '',
                seed: createLocalSeed(),
                attempt: localAttempt,
                verifiedRun: false
            };
        };

        const sessionId = await ensurePageSession();
        if (!sessionId) return fallback();

        try {
            const response = await postApi('start-run', {
                pageSessionId: sessionId,
                board: nextBoard
            });

            if (!response?.ok || !response.runId || !Number.isFinite(Number(response.seed))) {
                throw new Error(response?.error || 'run failed');
            }

            return {
                runId: response.runId,
                seed: Number(response.seed) >>> 0,
                attempt: Number(response.attempt || 1),
                verifiedRun: true
            };
        } catch (error) {
            apiAvailable = false;
            console.warn('[snake] run unavailable:', error.message);
            return fallback();
        }
    }

    async function getApi(action) {
        const url = `${API_URL}?action=${encodeURIComponent(action)}`;
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
        });
        return parseApiResponse(response);
    }

    async function postApi(action, body) {
        const url = `${API_URL}?action=${encodeURIComponent(action)}`;
        const response = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body || {})
        });
        return parseApiResponse(response);
    }

    async function parseApiResponse(response) {
        const text = await response.text();
        let data = null;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (error) {
            throw new Error('invalid json');
        }

        if (!response.ok) {
            throw new Error(data?.error || `HTTP ${response.status}`);
        }

        return data;
    }

    function renderLeaderboard(items) {
        leaderboardList.textContent = '';

        const safeItems = Array.isArray(items) ? items.slice(0, 5) : [];
        if (!safeItems.length) {
            const empty = document.createElement('li');
            empty.className = 'snake-popup__leaderboard-empty';
            empty.textContent = 'no verified runs yet';
            leaderboardList.appendChild(empty);
            return;
        }

        safeItems.forEach((item, index) => {
            const row = document.createElement('li');
            const name = document.createElement('span');
            const score = document.createElement('strong');
            const attempt = document.createElement('em');

            name.textContent = `[${String(index + 1).padStart(2, '0')}] ${sanitizeName(item.name) || DEFAULT_PLAYER_NAME}`;
            score.textContent = formatValue(Number(item.score || 0));
            attempt.textContent = `try ${formatValue(Number(item.attempt || item.attempts || 1))}`;

            row.append(name, score, attempt);
            leaderboardList.appendChild(row);
        });
    }

    function saveLocalRun(name) {
        const entry = {
            name: sanitizeName(name) || DEFAULT_PLAYER_NAME,
            score: Math.max(0, Number.parseInt(state.score, 10) || 0),
            attempt: Math.max(1, Number.parseInt(state.attempt, 10) || 1),
            createdAt: Date.now()
        };

        const items = readLocalLeaderboard();
        upsertLocalLeaderboardEntry(items, entry);
        sortLeaderboardItems(items);
        const nextItems = items.slice(0, 100);
        localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(nextItems));
        return entry;
    }

    function readLocalLeaderboard() {
        try {
            const raw = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
            const items = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(items)) return [];

            const normalized = items.map((item) => ({
                name: sanitizeName(item?.name) || DEFAULT_PLAYER_NAME,
                score: Math.max(0, Number.parseInt(item?.score, 10) || 0),
                attempt: Math.max(1, Number.parseInt(item?.attempt || item?.attempts, 10) || 1),
                createdAt: Number.parseInt(item?.createdAt, 10) || Date.now()
            }));

            sortLeaderboardItems(normalized);
            return normalized.slice(0, 100);
        } catch (error) {
            console.warn('[snake] local leaderboard failed:', error.message);
            return [];
        }
    }

    function sortLeaderboardItems(items) {
        items.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (a.attempt !== b.attempt) return a.attempt - b.attempt;
            return a.createdAt - b.createdAt;
        });
    }

    function upsertLocalLeaderboardEntry(items, entry) {
        const nameKey = leaderboardNameKey(entry.name);
        const existingIndex = items.findIndex((item) => leaderboardNameKey(item.name) === nameKey);

        if (existingIndex === -1) {
            items.push(entry);
            return;
        }

        if (isBetterLeaderboardEntry(entry, items[existingIndex])) {
            items[existingIndex] = entry;
        }
    }

    function isBetterLeaderboardEntry(candidate, existing) {
        if (candidate.score !== existing.score) return candidate.score > existing.score;
        if (candidate.attempt !== existing.attempt) return candidate.attempt < existing.attempt;
        return candidate.createdAt < existing.createdAt;
    }

    function leaderboardNameKey(name) {
        return (sanitizeName(name) || DEFAULT_PLAYER_NAME).toLocaleLowerCase('ru-RU');
    }

    function getStatusText(reason) {
        if (reason === 'idle') return 'idle detected // side quest unlocked';
        if (reason === 'secret') return 'secret found // run snake.exe';
        if (reason === 'resize') return 'screen changed // new run';
        if (reason === 'restart') return `${CYRILLIC_CONTROLS_HINT} // tab/r/\u043a restart`;
        return `ready // ${CYRILLIC_CONTROLS_HINT} // swipe on mobile`;
    }

    function getDifficultyText() {
        const config = getObstacleConfig(state.score);
        const speed = Math.round(1000 / state.tickMs);
        if (!config.count) return `food +1 // speed ${speed}hz`;
        return `food +1 // ${config.count} walls // speed ${speed}hz`;
    }

    function formatValue(value) {
        const number = Number.parseInt(value, 10);
        return String(Number.isFinite(number) ? Math.max(0, number) : 0).padStart(3, '0');
    }

    function readBestScore() {
        const raw = Number.parseInt(localStorage.getItem(BEST_SCORE_KEY) || '0', 10);
        return Number.isFinite(raw) ? raw : 0;
    }

    function toggleGameOverOverlay(show) {
        if (!gameOverOverlay) return;
        gameOverOverlay.classList.toggle('is-visible', show);
        gameOverOverlay.setAttribute('aria-hidden', show ? 'false' : 'true');
    }

    function fitScreenToArea() {
        if (!screenWrap) return;

        const wrapWidth = screenWrap.clientWidth;
        const wrapHeight = screenWrap.clientHeight;
        if (!wrapWidth || !wrapHeight) return;

        const wrapStyle = window.getComputedStyle(screenWrap);
        const paddingX = parseFloat(wrapStyle.paddingLeft) + parseFloat(wrapStyle.paddingRight);
        const paddingY = parseFloat(wrapStyle.paddingTop) + parseFloat(wrapStyle.paddingBottom);

        screen.style.fontSize = `${FIT_BASE_FONT_PX}px`;

        const availableWidth = wrapWidth - paddingX - 2;
        const availableHeight = wrapHeight - paddingY - 2;
        const contentWidth = screen.scrollWidth;
        const contentHeight = screen.scrollHeight;

        if (!contentWidth || !contentHeight) return;

        const scale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);
        const maxFontPx = window.innerWidth <= 480 ? 23 : window.innerWidth <= 768 ? 24 : 26;
        const nextFontPx = Math.max(
            FIT_MIN_FONT_PX,
            Math.min(maxFontPx, Math.floor(FIT_BASE_FONT_PX * scale * 100) / 100)
        );

        screen.style.fontSize = `${nextFontPx}px`;
    }
}

function createPopup() {
    const existing = document.getElementById('snakePopup');
    if (existing) return existing;

    const popup = document.createElement('div');
    popup.className = 'snake-popup';
    popup.id = 'snakePopup';
    popup.setAttribute('aria-hidden', 'true');

    popup.innerHTML = `
        <div class="snake-popup__panel" role="dialog" aria-modal="true" aria-labelledby="snakePopupTitle">
            <span class="snake-popup__corner snake-popup__corner--tl"></span>
            <span class="snake-popup__corner snake-popup__corner--tr"></span>
            <span class="snake-popup__corner snake-popup__corner--bl"></span>
            <span class="snake-popup__corner snake-popup__corner--br"></span>

            <div class="snake-popup__label snake-popup__label--top">tetta side quest</div>
            <div class="snake-popup__label snake-popup__label--bottom">tap status x3 / enter wasd</div>

            <button class="snake-popup__close" type="button" aria-label="Close game" data-snake-close>x</button>

            <div class="snake-popup__layout">
                <div class="snake-popup__copy">
                    <div class="snake-popup__hud">
                        <div class="snake-popup__meta">
                            <span>overscan</span>
                            <span>[ascii]</span>
                            <span>v2.0</span>
                        </div>
                        <div class="snake-popup__stats">
                            <span>score <strong data-snake-score>000</strong></span>
                            <span>best <strong data-snake-best>000</strong></span>
                            <span>try <strong data-snake-attempt>000</strong></span>
                        </div>
                    </div>

                    <div class="snake-popup__intro">
                        <h2 class="snake-popup__title" id="snakePopupTitle">snake.exe</h2>
                        <p class="snake-popup__subtitle">verified terminal run // no fake points</p>
                        <div class="snake-popup__status" data-snake-status>ready // ${CYRILLIC_CONTROLS_HINT} // swipe on mobile</div>
                    </div>

                    <div class="snake-popup__leaderboard">
                        <div class="snake-popup__leaderboard-title">leaderboard / top 5</div>
                        <ol data-snake-leaderboard></ol>
                    </div>

                    <div class="snake-popup__footer">
                        <button class="snake-popup__restart" type="button" data-snake-restart>restart</button>
                        <div class="snake-popup__legend">
                            <span><strong>${CYRILLIC_CONTROLS_HINT}</strong></span>
                            <span>/</span>
                            <span><strong>tab/r/\u043a</strong></span>
                            <span>/</span>
                            <span>esc = close</span>
                        </div>
                    </div>
                </div>

                <div class="snake-popup__screen-wrap">
                    <pre class="snake-popup__screen" tabindex="0" data-snake-screen></pre>
                    <div class="snake-popup__overlay" data-snake-overlay aria-hidden="true">
                        <div class="snake-popup__overlay-box">
                            <div class="snake-popup__overlay-title">game over</div>
                            <div class="snake-popup__overlay-subtitle">save verified score</div>
                            <form class="snake-popup__save-form" data-snake-save-form>
                                <label>
                                    <span>\u0432\u044b \u043a\u0442\u043e?</span>
                                    <input type="text" maxlength="15" autocomplete="off" spellcheck="false" data-snake-name>
                                </label>
                                <button class="snake-popup__restart snake-popup__save-button" type="submit" data-snake-save>save</button>
                                <small data-snake-save-status>score saved only after game over</small>
                            </form>
                            <button class="snake-popup__restart snake-popup__restart--overlay" type="button" data-snake-restart>restart</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(popup);
    return popup;
}

function createRng(seed) {
    let state = (Number(seed) >>> 0) || 1;

    return {
        next() {
            state = (Math.imul(1664525, state) + 1013904223) >>> 0;
            return state / 4294967296;
        },
        int(max) {
            return Math.floor(this.next() * Math.max(1, max));
        }
    };
}

function generateObstacles(seed, board, count, bucket, snake, food) {
    const obstacleSeed = (
        (seed >>> 0) +
        bucket * 1013904223 +
        count * 1664525 +
        board.cols * 4099 +
        board.rows * 257
    ) >>> 0;
    const rng = createRng(obstacleSeed || 1);
    const obstacles = [];
    const startZone = createStartZone(board);
    let attempts = 0;

    while (obstacles.length < count && attempts < board.cols * board.rows * 4) {
        attempts += 1;
        const candidate = {
            x: rng.int(board.cols),
            y: rng.int(board.rows)
        };

        if (startZone.has(pointKey(candidate))) continue;
        if (snake.some(segment => segment.x === candidate.x && segment.y === candidate.y)) continue;
        if (food && food.x === candidate.x && food.y === candidate.y) continue;
        if (obstacles.some(obstacle => obstacle.x === candidate.x && obstacle.y === candidate.y)) continue;

        obstacles.push(candidate);
    }

    return obstacles;
}

function createStartZone(board) {
    const result = new Set();
    const midX = Math.floor(board.cols / 2);
    const midY = Math.floor(board.rows / 2);

    for (let y = midY - 2; y <= midY + 2; y += 1) {
        for (let x = midX - 4; x <= midX + 4; x += 1) {
            if (x >= 0 && x < board.cols && y >= 0 && y < board.rows) {
                result.add(`${x}:${y}`);
            }
        }
    }

    return result;
}

function pointKey(point) {
    return `${point.x}:${point.y}`;
}

function isInsideBoard(point, board) {
    return Boolean(point && point.x >= 0 && point.x < board.cols && point.y >= 0 && point.y < board.rows);
}

function cellHtml(type, char) {
    return `<span class="snake-cell snake-cell--${type}">${char}</span>`;
}

function isTouchDevice() {
    return window.matchMedia('(hover: none), (pointer: coarse)').matches;
}

function normalizeInputKey(rawKey) {
    const key = String(rawKey || '').toLowerCase();
    const aliasMap = {
        ['\u0446']: 'w',
        ['\u0444']: 'a',
        ['\u044b']: 's',
        ['\u0432']: 'd',
        ['\u043a']: 'r'
    };

    return aliasMap[key] || key;
}

function isRestartKey(key) {
    return key === 'tab' || key === 'r';
}

function isTextInputFocused(target) {
    if (!target) return false;
    const tagName = String(target.tagName || '').toLowerCase();
    return (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target.isContentEditable
    );
}

function createLocalSeed() {
    if (window.crypto?.getRandomValues) {
        const data = new Uint32Array(1);
        window.crypto.getRandomValues(data);
        return data[0] || Date.now();
    }

    return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

function sanitizeName(value) {
    return String(value || '')
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .trim()
        .slice(0, 15);
}
