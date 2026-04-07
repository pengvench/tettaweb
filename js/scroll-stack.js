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
                scaleMin: 0.94,
                rotateXMax: 14,
                rotateZMax: -2.5,
                shiftYMax: 10,
                start: 0.06
            };
        }

        return {
            perspective: 1600,
            scaleMin: 0.88,
            rotateXMax: 25,
            rotateZMax: -5.5,
            shiftYMax: 22,
            start: 0.035
        };
    }

    function getCardConfig(card, baseConfig) {
        if (!card.classList.contains('studio-intro')) {
            return baseConfig;
        }

        if (window.innerWidth <= 768) {
            return {
                ...baseConfig,
                scaleMin: 0.955,
                rotateXMax: 8,
                rotateZMax: -1.4,
                shiftYMax: 30
            };
        }

        return {
            ...baseConfig,
            scaleMin: 0.93,
            rotateXMax: 14,
            rotateZMax: -2.2,
            shiftYMax: 54
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

            surface.style.transform =
                `perspective(${cardConfig.perspective}px) translate3d(0, ${shiftY.toFixed(2)}px, 0) scale(${scale.toFixed(4)}) rotateX(${rotateX.toFixed(2)}deg) rotateZ(${rotateZ.toFixed(2)}deg)`;
        });
    }

    function handleResize() {
        update();
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    update();
}
