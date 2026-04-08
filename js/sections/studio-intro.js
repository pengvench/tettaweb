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

    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        initDesktopTagMagnet(section, tags);
        return;
    }

    initMobileTagMagnet(section, tags);
}

function initDesktopTagMagnet(section, tags) {
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
}

function initMobileTagMagnet(section, tags) {
    if (!window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const field = section.querySelector('.si-tags') || section;
    const PUSH_MAX = 26;
    const HOVER_SCALE = 1.16;
    const INFLUENCE_RADIUS = 116;
    const HIGHLIGHT_RADIUS = 34;

    let rafId = null;
    let isActive = false;
    let phaseOffset = Math.random() * Math.PI * 2;

    const io = new IntersectionObserver((entries) => {
        const visible = entries.some(entry => entry.isIntersecting);
        if (visible) {
            isActive = true;
            if (!rafId) rafId = requestAnimationFrame(tick);
            return;
        }

        isActive = false;
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        tags.forEach(resetTag);
    }, { threshold: 0.18 });

    io.observe(section);

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            isActive = false;
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            tags.forEach(resetTag);
            return;
        }

        phaseOffset = Math.random() * Math.PI * 2;
        if (!isActive) return;
        if (!rafId) rafId = requestAnimationFrame(tick);
    });

    function tick(now) {
        rafId = null;
        if (!isActive) return;

        const rect = field.getBoundingClientRect();
        const t = now / 1000;
        const pulseX = rect.left + rect.width * (0.5 + Math.sin(t * 0.75 + phaseOffset) * 0.34);
        const pulseY = rect.top + rect.height * (0.5 + Math.cos(t * 0.92 + phaseOffset * 0.7) * 0.24);

        tags.forEach(tag => {
            const tagRect = tag.getBoundingClientRect();
            const nearX = Math.max(tagRect.left, Math.min(pulseX, tagRect.right));
            const nearY = Math.max(tagRect.top, Math.min(pulseY, tagRect.bottom));
            const dx = pulseX - nearX;
            const dy = pulseY - nearY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < HIGHLIGHT_RADIUS) {
                const highlightForce = 1 - dist / HIGHLIGHT_RADIUS;
                tag.style.transform = `translate(0, ${(-3.5 * highlightForce).toFixed(2)}px) scale(${(HOVER_SCALE + highlightForce * 0.04).toFixed(3)})`;
                tag.style.color = 'rgba(255,255,255,0.98)';
                tag.style.borderColor = 'rgba(0,185,255,0.88)';
                tag.style.boxShadow = '0 0 26px rgba(0,170,255,0.34), inset 0 0 14px rgba(0,120,255,0.12)';
                tag.style.textShadow = '0 0 18px rgba(0,205,255,0.58)';
                tag.style.zIndex = '8';
                return;
            }

            if (dist < INFLUENCE_RADIUS) {
                const force = 1 - dist / INFLUENCE_RADIUS;
                const cx = tagRect.left + tagRect.width / 2;
                const cy = tagRect.top + tagRect.height / 2;
                const vx = cx - pulseX;
                const vy = cy - pulseY;
                const vlen = Math.sqrt(vx * vx + vy * vy) || 1;
                const pushX = (vx / vlen) * PUSH_MAX * force * 0.55;
                const pushY = (vy / vlen) * PUSH_MAX * force * 0.32;

                tag.style.transform = `translate(${pushX.toFixed(2)}px, ${pushY.toFixed(2)}px) scale(${(1 + force * 0.06).toFixed(3)})`;
                tag.style.color = `rgba(255,255,255,${(0.56 + force * 0.34).toFixed(3)})`;
                tag.style.borderColor = `rgba(120,220,255,${(0.24 + force * 0.36).toFixed(3)})`;
                tag.style.boxShadow = `0 0 ${Math.round(10 + force * 12)}px rgba(0,160,255,${(0.08 + force * 0.18).toFixed(3)})`;
                tag.style.textShadow = `0 0 ${Math.round(8 + force * 10)}px rgba(0,205,255,${(0.08 + force * 0.18).toFixed(3)})`;
                tag.style.zIndex = '3';
                return;
            }

            resetTag(tag);
        });

        rafId = requestAnimationFrame(tick);
    }
}

function resetTag(tag) {
    tag.style.transform   = '';
    tag.style.color       = '';
    tag.style.borderColor = '';
    tag.style.boxShadow   = '';
    tag.style.textShadow  = '';
    tag.style.zIndex      = '';
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
