// js/studio-intro.js

export function initStudioIntro() {
    const section = document.querySelector('.studio-intro');
    if (!section) return;

    const tags = Array.from(section.querySelectorAll('.si-tag'));
    if (!tags.length) return;

    // Мобиль — только touch, без mousemove логики
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const PUSH_MAX    = 52;   // макс смещение соседей
    const HOVER_SCALE = 1.22; // масштаб тега прямо под мышью
    // Радиус влияния ОТ КРАЯ элемента (не от центра)
    const INFLUENCE_RADIUS = 120;

    let mouseX = -9999;
    let mouseY = -9999;
    let rafId  = null;
    let active = false;

    section.addEventListener('mouseenter', () => { active = true; });
    section.addEventListener('mouseleave', () => {
        active  = false;
        mouseX  = -9999;
        mouseY  = -9999;
        // Сбрасываем все теги
        tags.forEach(tag => resetTag(tag));
    });

    section.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!rafId) rafId = requestAnimationFrame(tick);
    }, { passive: true });

    function tick() {
        rafId = null;
        if (!active) return;

        tags.forEach(tag => {
            const rect = tag.getBoundingClientRect();

            // Ближайшая точка на прямоугольнике тега к курсору
            const nearX = Math.max(rect.left, Math.min(mouseX, rect.right));
            const nearY = Math.max(rect.top,  Math.min(mouseY, rect.bottom));

            // Дистанция от курсора до ближайшего края
            const dx   = mouseX - nearX;
            const dy   = mouseY - nearY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Курсор ВНУТРИ тега
            const isInside = mouseX >= rect.left && mouseX <= rect.right
                          && mouseY >= rect.top  && mouseY <= rect.bottom;

            if (isInside) {
                // Тег под мышью — увеличиваем
                tag.style.transform   = `scale(${HOVER_SCALE})`;
                tag.style.color       = 'rgba(255,255,255,1)';
                tag.style.borderColor = 'rgba(0,150,255,0.9)';
                tag.style.boxShadow   = '0 0 24px rgba(0,150,255,0.35), inset 0 0 12px rgba(0,120,255,0.08)';
                tag.style.textShadow  = '0 0 16px rgba(0,190,255,0.6)';
                tag.style.zIndex      = '10';
                return;
            }

            if (dist < INFLUENCE_RADIUS) {
                // Тег рядом — отталкиваем от курсора
                const force = 1 - dist / INFLUENCE_RADIUS;

                // Вектор отталкивания (от курсора к центру тега)
                const cx   = rect.left + rect.width  / 2;
                const cy   = rect.top  + rect.height / 2;
                const vx   = cx - mouseX;
                const vy   = cy - mouseY;
                const vlen = Math.sqrt(vx * vx + vy * vy) || 1;

                const pushX = (vx / vlen) * PUSH_MAX * force;
                const pushY = (vy / vlen) * PUSH_MAX * force * 0.55;
                const scale = 1 + force * 0.05;

                tag.style.transform   = `translate(${pushX}px, ${pushY}px) scale(${scale})`;
                tag.style.color       = `rgba(255,255,255,${0.3 + force * 0.4})`;
                tag.style.borderColor = `rgba(255,255,255,${0.1 + force * 0.2})`;
                tag.style.boxShadow   = 'none';
                tag.style.textShadow  = 'none';
                tag.style.zIndex      = '2';
            } else {
                resetTag(tag);
            }
        });

        if (active) rafId = requestAnimationFrame(tick);
    }

    function resetTag(tag) {
        tag.style.transform   = '';
        tag.style.color       = '';
        tag.style.borderColor = '';
        tag.style.boxShadow   = '';
        tag.style.textShadow  = '';
        tag.style.zIndex      = '';
    }
}