// js/scroll-stack.js
// Одинаковая анимация для всех карт — как thelinestudio.com
// Только scale, без rotate и translateY чтобы не было дыр
export function initScrollStack() {
    if (window.innerWidth <= 768) return;

    const cards = Array.from(document.querySelectorAll('.stack-wrapper > .stack-card'));
    if (cards.length < 2) return;

    const SCALE_MIN   = 0.94;   // почти незаметно, но даёт ощущение глубины
    const SCALE_START = 0.04;   // начинаем когда следующая карта уже 4% показалась

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function update() {
        const vh = window.innerHeight;

        cards.forEach((card, i) => {
            // Последняя карта — не сжимается никогда
            if (i === cards.length - 1) {
                card.style.transform = '';
                return;
            }

            const next     = cards[i + 1];
            const nRect    = next.getBoundingClientRect();
            // progress: 0 когда следующая карта ещё за экраном, 1 когда полностью на экране
            const progress = Math.min(1, Math.max(0, (vh - nRect.top) / vh));

            if (progress <= SCALE_START) {
                card.style.transform = '';
                return;
            }

            const t     = (progress - SCALE_START) / (1 - SCALE_START);
            const ease  = easeOutCubic(t);
            const scale = 1 - (1 - SCALE_MIN) * ease;

            card.style.transform       = `scale(${scale.toFixed(4)})`;
            card.style.transformOrigin = 'top center';
        });
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
}