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
                start: 1.12,
                end: -0.12,
                currentShiftYMax: 18,
                currentRotateZMax: 0.8,
                currentBlurMax: 0,
                nextShiftYStart: 34,
                nextRotateZStart: 0.7,
                cornerRadiusMax: 18,
                nextClipTopStart: 46
            };
        }

        return {
            isMobile,
            start: 1.34,
            end: -0.10,
            currentShiftYMax: 34,
            currentRotateZMax: 1.7,
            currentBlurMax: 0,
            nextShiftYStart: 96,
            nextRotateZStart: 3.4,
            cornerRadiusMax: 0,
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

    function applyTransition(state, config) {
        resetAll();
        if (!state) return;

        const progress = clamp(state.progress, 0, 1);
        const inverse = 1 - progress;
        const direction = state.index % 2 === 0 ? 1 : -1;
        const currentSurface = surfaces[state.index];
        const nextSurface = surfaces[state.index + 1];

        currentSurface.style.transformOrigin = '50% 0%';
        currentSurface.style.zIndex = '1';
        currentSurface.style.opacity = '1';
        currentSurface.style.borderRadius = '0';
        currentSurface.style.transform = [
            `translate3d(0, ${-config.currentShiftYMax * progress}px, 0)`,
            `rotateZ(${direction * config.currentRotateZMax * progress}deg)`
        ].join(' ');

        nextSurface.style.transformOrigin = '50% 0%';
        nextSurface.style.zIndex = '2';
        nextSurface.style.opacity = '1';
        nextSurface.style.borderRadius = '0';
        nextSurface.style.boxShadow = 'none';
        nextSurface.style.transform = [
            `translate3d(0, ${config.nextShiftYStart * inverse}px, 0)`,
            `rotateZ(${-direction * config.nextRotateZStart * inverse}deg)`
        ].join(' ');
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

        applyTransition(state, config);
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
