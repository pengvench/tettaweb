// js/scroll-stack.js
export function initScrollStack() {
    if (window.innerWidth <= 768) return;

    const cards = Array.from(document.querySelectorAll('.stack-wrapper > .stack-card'));
    if (cards.length < 2) return;

    // Параметры сжатия — как на thelinestudio.com референсе
    const SCALE_MIN   = 0.88;
    const ROTATE_MAX  = -2.5;
    const OFFSET_Y    = -24;
    const SCALE_START = 0.06;

    function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }

    function resetCard(card) {
        card.style.transform       = '';
        card.style.transformOrigin = '';
        card.style.filter          = '';
        card.style.opacity         = '';
    }

    function update() {
        const vh = window.innerHeight;

        cards.forEach((card, i) => {
            // Hero (i=0): никогда не трогаем
            if (i === 0) { resetCard(card); return; }

            // Последняя карта: не сжимается
            if (i === cards.length - 1) return;

            const next     = cards[i + 1];
            const nRect    = next.getBoundingClientRect();
            const progress = Math.min(1, Math.max(0, (vh - nRect.top) / vh));

            if (progress <= SCALE_START) { resetCard(card); return; }

            const t     = (progress - SCALE_START) / (1 - SCALE_START);
            const ease  = easeOutQuart(t);

            // studio-intro (i=1): сжимаем через scale+translateY БЕЗ rotate.
            // rotate создаёт видимые диагональные щели на стыке с project-block.
            // isolation: isolate на .stack-card предотвращает дыры.
            if (i === 1) {
                const scale = 1 - (1 - SCALE_MIN) * ease;
                const ty    = OFFSET_Y * ease;
                card.style.filter          = '';
                card.style.opacity         = '';
                card.style.transform       = `scale(${scale.toFixed(4)}) translateY(${ty.toFixed(1)}px)`;
                card.style.transformOrigin = 'top center';
                return;
            }

            // Все остальные карточки: классический scale + rotate + translateY
            const scale  = 1 - (1 - SCALE_MIN) * ease;
            const rotate = ROTATE_MAX * ease;
            const ty     = OFFSET_Y * ease;

            card.style.filter          = '';
            card.style.opacity         = '';
            card.style.transform       = `scale(${scale.toFixed(4)}) translateY(${ty.toFixed(1)}px) rotate(${rotate.toFixed(2)}deg)`;
            card.style.transformOrigin = 'top center';
        });
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
}