// js/scroll-stack.js
export function initScrollStack() {
    const cards = Array.from(document.querySelectorAll('.stack-card'));
    if (cards.length < 2) return;

    const SCALE_MIN   = 0.9;    // минимальный масштаб
    const ROTATE_MAX  = -2.5;   // градусы наклона (отрицательный = влево)
    const SCALE_START = 0.1;    // с какого прогресса начинать
    const OFFSET_Y    = -30;    // px вверх при сжатии

    function easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    function update() {
        const vh = window.innerHeight;

        cards.forEach((card, i) => {
            if (i === cards.length - 1) return;

            const next  = cards[i + 1];
            const nRect = next.getBoundingClientRect();

            const progress = Math.min(1, Math.max(0, (vh - nRect.top) / vh));

            if (progress <= SCALE_START) {
                card.style.transform = '';
                return;
            }

            const t      = (progress - SCALE_START) / (1 - SCALE_START);
            const ease   = easeInOut(t);
            const scale  = 1 - (1 - SCALE_MIN) * ease;
            const rotate = ROTATE_MAX * ease;
            const ty     = OFFSET_Y * ease;

            card.style.transform        = `scale(${scale}) translateY(${ty}px) rotate(${rotate}deg)`;
            card.style.transformOrigin  = 'top center';
        });
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();

    console.log('[scroll-stack] init, cards:', cards.length);
}