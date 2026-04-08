// js/scroll-stack.js
// Карточка остается sticky, а анимируется ее внутренняя поверхность.
// Так предыдущий блок остается на месте, а следующий действительно "накрывает" его сверху.
export function initScrollStack() {
    const cards = Array.from(document.querySelectorAll('.stack-wrapper > .stack-card'));
    if (cards.length < 3) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function getSurface(card) {
        return card.querySelector(':scope > .stack-card__surface') || card;
    }

    function getConfig() {
        if (window.innerWidth <= 768) {
            return {
                perspective: 1100,
                scaleMin: 0.93,
                rotateXMax: 15,
                rotateZMax: -3.2,
                shiftYMax: 14,
                depthMax: 34,
                start: 0.05
            };
        }

        return {
            perspective: 1600,
            scaleMin: 0.85,
            rotateXMax: 27,
            rotateZMax: -6.5,
            shiftYMax: 30,
            depthMax: 96,
            start: 0.08
        };
    }

    function getCardConfig(card, baseConfig) {
        if (!card.classList.contains('studio-intro')) {
            return baseConfig;
        }

        if (window.innerWidth <= 768) {
            return {
                ...baseConfig,
                scaleMin: 0.95,
                rotateXMax: 9,
                rotateZMax: -1.8,
                shiftYMax: 28,
                depthMax: 28
            };
        }

        return {
            ...baseConfig,
            scaleMin: 0.91,
            rotateXMax: 15,
            rotateZMax: -2.6,
            shiftYMax: 48,
            depthMax: 72
        };
    }

    function resetCard(card) {
        const surface = getSurface(card);
        surface.style.transform = '';
    }

    function update() {
        if (prefersReducedMotion.matches) {
            cards.forEach(resetCard);
            return;
        }

        const vh = window.innerHeight;
        const config = getConfig();

        cards.forEach((card, index) => {
            const surface = getSurface(card);
            const cardConfig = getCardConfig(card, config);

            // Первый и последний блоки остаются статичными.
            if (index === 0 || index === cards.length - 1) {
                surface.style.transform = '';
                return;
            }

            const nextCard = cards[index + 1];
            if (!nextCard) {
                surface.style.transform = '';
                return;
            }

            const nextRect = nextCard.getBoundingClientRect();
            const progress = clamp((vh - nextRect.top) / vh, 0, 1);

            if (progress <= cardConfig.start) {
                surface.style.transform = '';
                return;
            }

            const t = (progress - cardConfig.start) / (1 - cardConfig.start);
            const eased = easeOutCubic(clamp(t, 0, 1));

            const scale = 1 - (1 - cardConfig.scaleMin) * eased;
            const rotateX = cardConfig.rotateXMax * eased;
            const rotateZ = cardConfig.rotateZMax * eased;
            const shiftY = cardConfig.shiftYMax * eased;
            const depth = cardConfig.depthMax * eased;

            surface.style.transform =
                `perspective(${cardConfig.perspective}px) translate3d(0, ${shiftY.toFixed(2)}px, ${(-depth).toFixed(2)}px) scale(${scale.toFixed(4)}) rotateX(${rotateX.toFixed(2)}deg) rotateZ(${rotateZ.toFixed(2)}deg)`;
        });
    }

    function handleResize() {
        update();
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    update();
}
