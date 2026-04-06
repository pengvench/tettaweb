// js/scroll-stack.js
// Референс: thelinestudio.com
// Карты не масштабируются — только небольшое сжатие у hero когда следующая
// карта заезжает. Studio-intro и project-block переходят чисто через sticky.
export function initScrollStack() {
    if (window.innerWidth <= 768) return;

    const cards = Array.from(document.querySelectorAll('.stack-wrapper > .stack-card'));
    if (cards.length < 2) return;

    // Минимальные параметры — только лёгкий scale на героe
    const SCALE_MIN   = 0.92;
    const SCALE_START = 0.05;

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function update() {
        const vh = window.innerHeight;

        cards.forEach((card, i) => {
            // Сбрасываем все трансформы
            card.style.transform       = '';
            card.style.transformOrigin = '';
            card.style.filter          = '';
            card.style.opacity         = '';

            // Только hero (i=0) слегка сжимается когда следующая карта едет
            if (i !== 0) return;

            const next     = cards[1];
            if (!next) return;
            const nRect    = next.getBoundingClientRect();
            const progress = Math.min(1, Math.max(0, (vh - nRect.top) / vh));

            if (progress <= SCALE_START) return;

            const t     = (progress - SCALE_START) / (1 - SCALE_START);
            const ease  = easeOut(t);
            const scale = 1 - (1 - SCALE_MIN) * ease;

            card.style.transform       = `scale(${scale.toFixed(4)})`;
            card.style.transformOrigin = 'top center';
        });
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
}