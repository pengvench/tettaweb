// js/scroll-stack.js
// Референс: thelinestudio.com
// Hero и studio-intro не скейлятся — hero видео не светит сквозь
// Начиная с project-block (i=2) — лёгкий scale при заходе следующей карты
export function initScrollStack() {
    if (window.innerWidth <= 768) return;

    const cards = Array.from(document.querySelectorAll('.stack-wrapper > .stack-card'));
    if (cards.length < 2) return;

    const SCALE_MIN   = 0.94;
    const SCALE_START = 0.04;

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function update() {
        const vh = window.innerHeight;

        cards.forEach((card, i) => {
            // hero (i=0) и studio-intro (i=1): без трансформа
            // studio-intro имеет тот же тёмный фон что и wrapper —
            // при sticky прижатии снизу project-block'ом дыра не видна
            if (i <= 1) {
                card.style.transform       = '';
                card.style.transformOrigin = '';
                return;
            }

            // Последняя карта — не сжимается
            if (i === cards.length - 1) {
                card.style.transform = '';
                return;
            }

            const next     = cards[i + 1];
            const nRect    = next.getBoundingClientRect();
            const progress = Math.min(1, Math.max(0, (vh - nRect.top) / vh));

            if (progress <= SCALE_START) {
                card.style.transform       = '';
                card.style.transformOrigin = '';
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