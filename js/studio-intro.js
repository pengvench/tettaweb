// js/studio-intro.js

export function initStudioIntro() {
    initTagMagnet();
    initTypewriter();
}

/* ============================================
   МАГНИТНЫЕ ТЕГИ
============================================ */
function initTagMagnet() {
    const section = document.querySelector('.studio-intro');
    if (!section) return;

    const tags = Array.from(section.querySelectorAll('.si-tag'));
    if (!tags.length) return;

    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const PUSH_MAX         = 52;
    const HOVER_SCALE      = 1.22;
    const INFLUENCE_RADIUS = 130;

    let mouseX = -9999, mouseY = -9999;
    let rafId  = null;
    let active = false;

    section.addEventListener('mouseenter', () => { active = true; });
    section.addEventListener('mouseleave', () => {
        active = false;
        mouseX = -9999; mouseY = -9999;
        tags.forEach(resetTag);
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

            // Дистанция до ближайшего края прямоугольника (не до центра)
            const nearX = Math.max(rect.left, Math.min(mouseX, rect.right));
            const nearY = Math.max(rect.top,  Math.min(mouseY, rect.bottom));
            const dx    = mouseX - nearX;
            const dy    = mouseY - nearY;
            const dist  = Math.sqrt(dx * dx + dy * dy);

            const isInside = mouseX >= rect.left && mouseX <= rect.right
                          && mouseY >= rect.top  && mouseY <= rect.bottom;

            if (isInside) {
                tag.style.transform   = `scale(${HOVER_SCALE})`;
                tag.style.color       = 'rgba(255,255,255,1)';
                tag.style.borderColor = 'rgba(0,150,255,0.9)';
                tag.style.boxShadow   = '0 0 24px rgba(0,150,255,0.35), inset 0 0 12px rgba(0,120,255,0.08)';
                tag.style.textShadow  = '0 0 16px rgba(0,190,255,0.6)';
                tag.style.zIndex      = '10';
                return;
            }

            if (dist < INFLUENCE_RADIUS) {
                const force = 1 - dist / INFLUENCE_RADIUS;
                const cx    = rect.left + rect.width  / 2;
                const cy    = rect.top  + rect.height / 2;
                const vx    = cx - mouseX;
                const vy    = cy - mouseY;
                const vlen  = Math.sqrt(vx * vx + vy * vy) || 1;
                const pushX = (vx / vlen) * PUSH_MAX * force;
                const pushY = (vy / vlen) * PUSH_MAX * force * 0.55;

                tag.style.transform   = `translate(${pushX}px, ${pushY}px) scale(${1 + force * 0.05})`;
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

/* ============================================
   TYPEWRITER для si-block__text
============================================ */
function initTypewriter() {
    // Мобиль пропускаем — CSS отключает анимацию
    if (window.innerWidth <= 768) return;

    const blocks = Array.from(document.querySelectorAll('.si-block__text'));
    if (!blocks.length) return;

    // Скорость: ~40мс на символ, минимум 0.8s
    const CHAR_SPEED_MS = 42;

    // Очередь — каждый следующий стартует после предыдущего
    let cumulativeDelay = 600; // первый с небольшой задержкой

    blocks.forEach((el, idx) => {
        const text     = el.textContent.trim();
        const charCount = text.length;
        const duration = Math.max(0.8, charCount * CHAR_SPEED_MS / 1000);

        // CSS-переменные для анимации
        el.style.setProperty('--tw-duration', `${duration}s`);
        el.style.setProperty('--tw-steps', charCount);

        // Запускаем с задержкой через IntersectionObserver
        const delay = cumulativeDelay;
        cumulativeDelay += duration * 1000 + 400; // следующий после паузы

        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                io.disconnect();

                setTimeout(() => {
                    el.classList.add('tw-animate');

                    // По завершении — убираем border-right и разрешаем перенос
                    setTimeout(() => {
                        el.classList.remove('tw-animate');
                        el.classList.add('tw-done');
                    }, duration * 1000 + 200);
                }, delay);
            });
        }, { threshold: 0.3 });

        io.observe(el);
    });
}