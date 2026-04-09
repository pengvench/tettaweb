const AUTO_OPEN_DELAY_MS = 5 * 60 * 1000;
const AUTO_SEEN_KEY = 'tetta_snake_seen';
const BEST_SCORE_KEY = 'tetta_snake_best';
const SECRET_SEQUENCE = ['w', 'a', 's', 'd'];
const SECRET_TAP_TARGET = 3;
const SECRET_TAP_WINDOW_MS = 900;
const CYRILLIC_CONTROLS_HINT = 'wasd / \u0446\u0444\u044b\u0432';
const FIT_BASE_FONT_PX = 16;
const FIT_MIN_FONT_PX = 11;

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
    const statusValue = popup.querySelector('[data-snake-status]');
    const mobileStatusTrigger = document.getElementById('mobileStatusText');

    let board = createBoardConfig();
    let loopId = null;
    let autoTimerId = null;
    let previousBodyOverflow = '';
    let secretIndex = 0;
    let touchStart = null;
    let secretTapCount = 0;
    let secretTapResetId = null;
    let popupOpen = false;
    let bestScore = readBestScore();

    const state = {
        snake: [],
        direction: 'right',
        nextDirection: 'right',
        food: { x: 0, y: 0 },
        score: 0,
        over: false,
        tickMs: 120,
        pendingDirections: []
    };

    bestValue.textContent = formatValue(bestScore);
    resetGame();
    scheduleAutoOpen();
    bindEvents();

    function bindEvents() {
        window.addEventListener('keydown', handleKeydown);
        window.addEventListener('resize', handleResize, { passive: true });

        closeButton.addEventListener('click', closePopup);
        restartButtons.forEach((button) => {
            button.addEventListener('click', () => {
                resetGame();
                if (!popupOpen) openPopup('restart');
            });
        });

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

    function scheduleAutoOpen() {
        if (sessionStorage.getItem(AUTO_SEEN_KEY) === '1') return;

        autoTimerId = window.setTimeout(() => {
            sessionStorage.setItem(AUTO_SEEN_KEY, '1');
            openPopup('timer');
        }, AUTO_OPEN_DELAY_MS);
    }

    function cancelAutoOpen() {
        if (autoTimerId) {
            clearTimeout(autoTimerId);
            autoTimerId = null;
        }
        sessionStorage.setItem(AUTO_SEEN_KEY, '1');
    }

    function openPopup(reason = 'manual') {
        cancelAutoOpen();
        popupOpen = true;
        popup.classList.add('is-open');
        popup.setAttribute('aria-hidden', 'false');
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        if (reason !== 'resume') {
            resetGame();
        } else {
            startLoop();
            render();
        }

        statusValue.textContent = getStatusText(reason);
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
    }

    function resetGame() {
        stopLoop();

        board = createBoardConfig();
        state.score = 0;
        state.over = false;
        state.tickMs = 120;
        state.pendingDirections = [];

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

        if (popupOpen) {
            statusValue.textContent = getStatusText('restart');
            startLoop();
        }
    }

    function startLoop() {
        stopLoop();
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

        if (state.pendingDirections.length) {
            state.nextDirection = state.pendingDirections.shift();
        }

        state.direction = state.nextDirection;
        const head = state.snake[state.snake.length - 1];
        const nextHead = moveHead(head, state.direction);

        if (hitsWall(nextHead) || hitsSnake(nextHead)) {
            handleGameOver();
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
            spawnFood();
            state.tickMs = Math.max(72, state.tickMs - 4);
            startLoop();
            statusValue.textContent = `food +1 // speed ${Math.round(1000 / state.tickMs)}hz`;
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
        return state.snake.some(segment => segment.x === point.x && segment.y === point.y);
    }

    function handleGameOver() {
        state.over = true;
        stopLoop();
        state.pendingDirections = [];
        statusValue.textContent = 'game over // hit restart';
        toggleGameOverOverlay(true);
        render();
    }

    function spawnFood() {
        let nextFood = null;

        while (!nextFood) {
            const candidate = {
                x: Math.floor(Math.random() * board.cols),
                y: Math.floor(Math.random() * board.rows)
            };

            const occupied = state.snake.some(segment => segment.x === candidate.x && segment.y === candidate.y);
            if (!occupied) nextFood = candidate;
        }

        state.food = nextFood;
    }

    function render() {
        const cells = Array.from({ length: board.rows }, () => Array(board.cols).fill('.'));

        state.snake.forEach((segment, index) => {
            const isHead = index === state.snake.length - 1;
            cells[segment.y][segment.x] = isHead ? '@' : '#';
        });

        cells[state.food.y][state.food.x] = '*';

        const horizontal = '-'.repeat(board.cols);
        const rows = cells.map(row => `|${row.join('')}|`);

        screen.textContent = [
            `+${horizontal}+`,
            ...rows,
            `+${horizontal}+`
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

            const direction = getDirectionFromKey(key);
            if (!direction) return;

            event.preventDefault();
            setDirection(direction);
            return;
        }

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
        resetGame();
    }

    function handleTouchStart(event) {
        if (!popupOpen) return;
        const touch = event.changedTouches[0];
        touchStart = { x: touch.clientX, y: touch.clientY };
    }

    function handleTouchMove(event) {
        if (popupOpen) event.preventDefault();
    }

    function handleTouchEnd(event) {
        if (!popupOpen || !touchStart) return;
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

    function getStatusText(reason) {
        if (reason === 'timer') return '5 min on site // side quest unlocked';
        if (reason === 'secret') return 'secret found // run snake.exe';
        if (reason === 'restart') return `${CYRILLIC_CONTROLS_HINT} // swipe on mobile`;
        return `ready // ${CYRILLIC_CONTROLS_HINT} // swipe on mobile`;
    }

    function formatValue(value) {
        return String(value).padStart(3, '0');
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
                            <span>v1.0</span>
                        </div>
                        <div class="snake-popup__stats">
                            <span>score <strong data-snake-score>000</strong></span>
                            <span>best <strong data-snake-best>000</strong></span>
                        </div>
                    </div>

                    <h2 class="snake-popup__title" id="snakePopupTitle">snake.exe</h2>
                    <p class="snake-popup__subtitle">hidden terminal game // keep the run alive</p>
                    <div class="snake-popup__status" data-snake-status>ready // ${CYRILLIC_CONTROLS_HINT} // swipe on mobile</div>

                    <div class="snake-popup__footer">
                        <button class="snake-popup__restart" type="button" data-snake-restart>restart</button>
                        <div class="snake-popup__legend">
                            <span><strong>${CYRILLIC_CONTROLS_HINT}</strong></span>
                            <span>/</span>
                            <span><strong>swipe</strong></span>
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
                            <div class="snake-popup__overlay-subtitle">your run is over</div>
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

function isTouchDevice() {
    return window.matchMedia('(hover: none), (pointer: coarse)').matches;
}

function normalizeInputKey(rawKey) {
    const key = String(rawKey || '').toLowerCase();
    const aliasMap = {
        ['\u0446']: 'w',
        ['\u0444']: 'a',
        ['\u044b']: 's',
        ['\u0432']: 'd'
    };

    return aliasMap[key] || key;
}
