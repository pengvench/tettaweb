// js/scroll-stack.js
export function initScrollStack() {
    if (window.innerWidth <= 768) return;

    const cards = Array.from(document.querySelectorAll('.stack-wrapper > .stack-card'));
    if (cards.length < 2) return;

    const SCALE_MIN   = 0.88;
    const ROTATE_MAX  = -2.0;
    const SCALE_START = 0.08;
    const OFFSET_Y    = -28;

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
            // ── Hero (i=0): никогда не трогаем ──────────────────
            if (i === 0) { resetCard(card); return; }

            // ── Последняя карта: не сжимается ───────────────────
            if (i === cards.length - 1) return;

            const next     = cards[i + 1];
            const nRect    = next.getBoundingClientRect();
            const progress = Math.min(1, Math.max(0, (vh - nRect.top) / vh));

            // ── Studio-intro (i=1): brightness+blur ВМЕСТО scale ─
            // Spatial transform → hero виден насквозь (дыра).
            // Filter работает в рамках своего слоя → дыры нет никогда.
            if (i === 1) {
                if (progress <= 0.04) { resetCard(card); return; }
                const t    = Math.min(1, (progress - 0.04) / 0.65);
                const ease = easeOutQuart(t);
                card.style.transform       = '';
                card.style.transformOrigin = '';
                card.style.filter  = `brightness(${1 - ease * 0.65}) blur(${(ease * 5).toFixed(1)}px)`;
                card.style.opacity = String((1 - ease * 0.4).toFixed(3));
                return;
            }

            // ── Все остальные: классический scale+rotate ─────────
            if (progress <= SCALE_START) { resetCard(card); return; }

            const t      = (progress - SCALE_START) / (1 - SCALE_START);
            const ease   = easeOutQuart(t);
            const scale  = 1 - (1 - SCALE_MIN) * ease;
            const rotate = ROTATE_MAX * ease;
            const ty     = OFFSET_Y * ease;

            card.style.filter          = '';
            card.style.opacity         = '';
            card.style.transform       = `scale(${scale}) translateY(${ty}px) rotate(${rotate}deg)`;
            card.style.transformOrigin = 'top center';
        });
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
}