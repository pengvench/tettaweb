// js/studio-intro.js

export function initStudioIntro() {
    const section = document.querySelector('.studio-intro');
    if (!section) return;

    const tags = Array.from(section.querySelectorAll('.si-tag'));
    if (!tags.length) return;

    // Радиус влияния курсора в px
    const RADIUS      = 180;
    // Макс. смещение соседних тегов
    const MAX_PUSH    = 48;
    // Увеличение хованного тега
    const HOVER_SCALE = 1.22;

    let mouseX = -9999;
    let mouseY = -9999;
    let rafId  = null;

    section.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!rafId) rafId = requestAnimationFrame(updateTags);
    }, { passive: true });

    section.addEventListener('mouseleave', () => {
        mouseX = -9999;
        mouseY = -9999;
        if (!rafId) rafId = requestAnimationFrame(updateTags);
    }, { passive: true });

    function updateTags() {
        rafId = null;
        tags.forEach(tag => {
            const rect = tag.getBoundingClientRect();
            const cx   = rect.left + rect.width  / 2;
            const cy   = rect.top  + rect.height / 2;
            const dx   = cx - mouseX;
            const dy   = cy - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < RADIUS && dist > 0) {
                const force = (1 - dist / RADIUS);
                const pushX = (dx / dist) * MAX_PUSH * force;
                const pushY = (dy / dist) * MAX_PUSH * force * 0.6;

                // Тег прямо под курсором — увеличиваем
                const isHovered = dist < 60;
                const scale = isHovered ? HOVER_SCALE : 1 + force * 0.06;

                tag.style.transform  = `translate(${pushX}px, ${pushY}px) scale(${scale})`;
                tag.style.color      = isHovered
                    ? 'rgba(255,255,255,1)'
                    : `rgba(255,255,255,${0.35 + force * 0.45})`;
                tag.style.borderColor = isHovered
                    ? 'rgba(0,150,255,0.9)'
                    : `rgba(255,255,255,${0.12 + force * 0.25})`;
                tag.style.textShadow  = isHovered
                    ? '0 0 20px rgba(0,180,255,0.7)'
                    : 'none';
                tag.style.zIndex      = isHovered ? '10' : '1';
            } else {
                // Возврат в исходное
                tag.style.transform   = 'translate(0,0) scale(1)';
                tag.style.color       = 'rgba(255,255,255,0.35)';
                tag.style.borderColor = 'rgba(255,255,255,0.1)';
                tag.style.textShadow  = 'none';
                tag.style.zIndex      = '1';
            }
        });

        // Если курсор ещё в зоне — продолжаем
        if (mouseX !== -9999) {
            rafId = requestAnimationFrame(updateTags);
        }
    }
}