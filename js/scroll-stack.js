// js/scroll-stack.js
export function initScrollStack() {
    if (window.innerWidth <= 768) return;

    const cards = Array.from(document.querySelectorAll('.stack-wrapper > .stack-card'));
    if (cards.length < 2) return;

    const SCALE_MIN   = 0.88;
    const ROTATE_MAX  = -2.5;
    const SCALE_START = 0.08;
    const OFFSET_Y    = -30;

    function easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    function update() {
        const vh = window.innerHeight;

        cards.forEach((card, i) => {
            // Hero (i=0) — никогда не трогаем
            if (i === 0) {
                card.style.transform       = '';
                card.style.transformOrigin = '';
                return;
            }
            // Последняя карта — не сжимается
            if (i === cards.length - 1) return;

            const next     = cards[i + 1];
            const nRect    = next.getBoundingClientRect();
            const progress = Math.min(1, Math.max(0, (vh - nRect.top) / vh));

            if (progress <= SCALE_START) {
                card.style.transform       = '';
                card.style.transformOrigin = '';
                return;
            }

            const t      = (progress - SCALE_START) / (1 - SCALE_START);
            const ease   = easeOutQuart(t);
            const scale  = 1 - (1 - SCALE_MIN) * ease;
            const rotate = ROTATE_MAX * ease;
            const ty     = OFFSET_Y * ease;

            card.style.transform       = `scale(${scale}) translateY(${ty}px) rotate(${rotate}deg)`;
            card.style.transformOrigin = 'top center';
        });
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
}