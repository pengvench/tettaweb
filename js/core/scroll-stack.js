export function initScrollStack() {
    const cards = Array.from(document.querySelectorAll('.stack-wrapper > .stack-card'));
    if (cards.length < 2) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const surfaces = cards.map((card) => card.querySelector(':scope > .stack-card__surface') || card);

    let scrollRafId = 0;
    let lastScrollY = window.scrollY || window.pageYOffset || 0;
    let cardMetrics = [];

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const lerp = (start, end, progress) => start + (end - start) * progress;
    const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

    function clearSurface(surface) {
        surface.style.position = '';
        surface.style.top = '';
        surface.style.left = '';
        surface.style.right = '';
        surface.style.width = '';
        surface.style.height = '';
        surface.style.minHeight = '';
        surface.style.zIndex = '';
        surface.style.pointerEvents = '';
        surface.style.transformOrigin = '';
        surface.style.transform = '';
        surface.style.opacity = '';
        surface.style.filter = '';
        surface.style.borderRadius = '';
        surface.style.clipPath = '';
        surface.style.overflow = '';
        surface.style.backgroundColor = '';
        surface.style.boxShadow = '';
    }

    function resetAll() {
        surfaces.forEach(clearSurface);
    }

    function measureCards() {
        let top = 0;
        cardMetrics = cards.map((card) => {
            const height = card.offsetHeight;
            const metric = { top, height };
            top += height;
            return metric;
        });
    }

    function getConfig() {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            return {
                isMobile,
                start: 1.04,
                end: -0.08,
                currentScaleMin: 0.988,
                currentShiftYMax: 18,
                currentRotateXMax: 4.4,
                currentRotateZMax: 1.05,
                currentOpacityMin: 1,
                currentBlurMax: 0,
                nextShiftYStart: 36,
                nextScaleStart: 1,
                nextRotateXStart: 0,
                nextRotateZStart: 0,
                cornerRadiusMax: 18,
                nextClipTopStart: 46
            };
        }

        return {
            isMobile,
            start: 1.02,
            end: -0.08,
            currentScaleMin: 0.989,
            currentShiftYMax: 18,
            currentRotateXMax: 4.4,
            currentRotateZMax: 1.1,
            currentOpacityMin: 1,
            currentBlurMax: 0,
            nextShiftYStart: 46,
            nextScaleStart: 1,
            nextRotateXStart: 0,
            nextRotateZStart: 0,
            cornerRadiusMax: 22,
            nextClipTopStart: 58
        };
    }

    function findActiveTransition(viewportHeight, config, scrollY) {
        let bestState = null;

        for (let index = 0; index < cards.length - 1; index += 1) {
            const current = cards[index];
            const next = cards[index + 1];
            const nextMetric = cardMetrics[index + 1];
            const nextTop = nextMetric.top - scrollY;
            const nextBottom = nextTop + nextMetric.height;

            const startTop = viewportHeight * config.start;
            const endTop = viewportHeight * config.end;
            const progress = clamp((startTop - nextTop) / (startTop - endTop), 0, 1);

            if (progress <= 0.001 || progress >= 0.999) continue;
            if (nextTop > startTop || nextBottom < endTop) continue;

            const centerBias = 1 - Math.min(Math.abs(nextTop - viewportHeight * 0.42) / viewportHeight, 1);
            const score = progress + centerBias * 0.22 + index * 0.08;

            if (!bestState || score > bestState.score) {
                bestState = { score, current, next, index, progress };
            }
        }

        return bestState;
    }

    function applyTransition(state, config, direction) {
        resetAll();
        if (!state) return;

        const tiltDir = -1;
        const isMobileFinalPair = config.isMobile && state.index >= cards.length - 3;
        const eased = easeOutCubic(state.progress);
        const currentSurface = surfaces[state.index];
        const nextSurface = surfaces[state.index + 1];

        const currentShiftMax = isMobileFinalPair ? 10 : config.currentShiftYMax;
        const currentRotateXMax = isMobileFinalPair ? 1.1 : config.currentRotateXMax;
        const currentRotateZMax = isMobileFinalPair ? 0.18 : config.currentRotateZMax;
        const nextShiftStart = isMobileFinalPair ? 16 : config.nextShiftYStart;
        const nextRotateXStart = isMobileFinalPair ? 0 : config.nextRotateXStart;
        const nextRotateZStart = isMobileFinalPair ? 0 : config.nextRotateZStart;
        const nextClipStart = isMobileFinalPair ? 0 : (config.nextClipTopStart ?? 0);
        const cornerRadius = lerp(0, isMobileFinalPair ? Math.min(config.cornerRadiusMax, 10) : config.cornerRadiusMax, eased);

        const currentScale = lerp(1, config.currentScaleMin, eased);
        const currentShiftY = lerp(0, currentShiftMax, eased);
        const currentRotateX = lerp(0, currentRotateXMax, eased);
        const currentRotateZ = tiltDir * lerp(0, currentRotateZMax, eased);
        const currentOpacity = lerp(1, config.currentOpacityMin, eased);
        const currentBlur = lerp(0, config.currentBlurMax, eased);

        currentSurface.style.transformOrigin = 'top center';
        currentSurface.style.borderRadius = `${cornerRadius.toFixed(2)}px ${cornerRadius.toFixed(2)}px 0 0`;
        currentSurface.style.transform = [
            `translate3d(0, ${currentShiftY.toFixed(2)}px, 0)`,
            `rotateX(${currentRotateX.toFixed(2)}deg)`,
            `rotateZ(${currentRotateZ.toFixed(2)}deg)`,
            `scale(${currentScale.toFixed(4)})`
        ].join(' ');
        currentSurface.style.opacity = currentOpacity.toFixed(3);
        currentSurface.style.filter = currentBlur > 0.01 ? `blur(${currentBlur.toFixed(2)}px)` : '';

        const nextEased = Math.pow(eased, 1.1);
        const nextShiftY = lerp(nextShiftStart, 0, nextEased);
        const nextScale = lerp(config.nextScaleStart, 1, nextEased);
        const nextRotateX = lerp(nextRotateXStart, 0, nextEased);
        const nextRotateZ = tiltDir * lerp(nextRotateZStart, 0, nextEased);
        const nextClipTop = lerp(nextClipStart, 0, Math.pow(nextEased, 1.9));

        nextSurface.style.transformOrigin = 'top center';
        nextSurface.style.borderRadius = `${cornerRadius.toFixed(2)}px ${cornerRadius.toFixed(2)}px 0 0`;
        nextSurface.style.clipPath = nextClipTop > 0.01
            ? `inset(${nextClipTop.toFixed(2)}px 0 0 0 round ${cornerRadius.toFixed(2)}px ${cornerRadius.toFixed(2)}px 0 0)`
            : '';
        nextSurface.style.transform = [
            `translate3d(0, ${nextShiftY.toFixed(2)}px, 0)`,
            `rotateX(${nextRotateX.toFixed(2)}deg)`,
            `rotateZ(${nextRotateZ.toFixed(2)}deg)`,
            `scale(${nextScale.toFixed(4)})`
        ].join(' ');
    }

    function update() {
        if (prefersReducedMotion.matches) {
            resetAll();
            return;
        }

        const scrollY = window.scrollY || window.pageYOffset || 0;
        const direction = scrollY >= lastScrollY ? 1 : -1;
        lastScrollY = scrollY;

        const viewportHeight = window.innerHeight;
        measureCards();
        const config = getConfig();
        const state = findActiveTransition(viewportHeight, config, scrollY);

        applyTransition(state, config, direction);
    }

    function requestUpdate() {
        if (scrollRafId) return;
        scrollRafId = window.requestAnimationFrame(() => {
            scrollRafId = 0;
            update();
        });
    }

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    prefersReducedMotion.addEventListener?.('change', requestUpdate);

    requestUpdate();
}
