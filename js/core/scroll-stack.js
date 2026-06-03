export function initScrollStack() {
    const cards = Array.from(document.querySelectorAll('.stack-wrapper > .stack-card'));
    if (cards.length < 2) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const surfaces = cards.map((card) => card.querySelector(':scope > .stack-card__surface') || card);

    let scrollRafId = 0;
    let cardMetrics = [];
    let mobileMetricsReady = false;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
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

    function clearMobileInteractivity() {
        cards.forEach((card) => card.classList.remove('is-stack-interactive'));
    }

    function updateMobileInteractivity() {
        const scrollY = window.scrollY || window.pageYOffset || 0;
        let activeIndex = 0;

        cardMetrics.forEach((metric, index) => {
            if (scrollY + 2 >= metric.top) activeIndex = index;
        });

        cards.forEach((card, index) => {
            card.classList.toggle('is-stack-interactive', index === activeIndex);
        });
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

    function applyTransition(state) {
        resetAll();
        if (!state) return;

        const nextSurface = surfaces[state.index + 1];
        nextSurface.style.boxShadow = '0 -18px 54px rgba(0, 0, 0, 0.32)';
    }

    function update() {
        if (prefersReducedMotion.matches) {
            resetAll();
            return;
        }

        if (window.innerWidth <= 768) {
            if (!mobileMetricsReady) {
                resetAll();
                measureCards();
                mobileMetricsReady = true;
            }
            updateMobileInteractivity();
            return;
        }

        mobileMetricsReady = false;
        clearMobileInteractivity();

        const scrollY = window.scrollY || window.pageYOffset || 0;

        const viewportHeight = window.innerHeight;
        measureCards();
        const config = getConfig();
        const state = findActiveTransition(viewportHeight, config, scrollY);

        applyTransition(state);
    }

    function requestUpdate() {
        if (window.innerWidth <= 768) {
            update();
            return;
        }

        if (scrollRafId) return;
        scrollRafId = window.requestAnimationFrame(() => {
            scrollRafId = 0;
            update();
        });
    }

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', () => {
        mobileMetricsReady = false;
        requestUpdate();
    }, { passive: true });
    prefersReducedMotion.addEventListener?.('change', requestUpdate);

    requestUpdate();
}
