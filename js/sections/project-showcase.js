// js/sections/project-showcase.js

let projects     = [];
let current      = 0;
let isAnimating  = false;
let queuedDir    = 0;
let animationId  = 0;

const SLIDE_ANIMATION_MS = 760;

export async function initProjectVideos() {
    try {
        const res  = await fetch('./projects/backgrounds.json');
        const data = await res.json();

        if (data.projects && data.projects.length) {
            projects = data.projects;
        } else if (data.backgrounds && data.backgrounds.length) {
            projects = data.backgrounds.map((src, i) => ({
                src,
                title: `Проект ${i + 1}`,
                desc:  'Рекламный ролик / Музыкальный клип'
            }));
        }

        if (!projects.length) return;

        const container = document.querySelector('.project-slider__videos');
        if (!container) return;

        container.innerHTML = '';

        projects.forEach((p, i) => {
            const video        = document.createElement('video');
            video.className    = 'project-video' + (i === 0 ? ' is-active' : '');
            video.src          = `./projects/${p.src}`;
            video.muted        = true;
            video.loop         = true;
            video.playsInline  = true;
            video.preload      = 'auto';
            container.appendChild(video);
        });

        const first = container.querySelector('.project-video.is-active');
        if (first) first.play().catch(() => {});

        updateOverlay(0);

        const btnPrev = document.querySelector('.project-nav-btn--prev');
        const btnNext = document.querySelector('.project-nav-btn--next');
        if (btnPrev) {
            btnPrev.addEventListener('click', (event) => {
                event.preventDefault();
                pressBtn(btnPrev);
                navigate(-1);
            });
        }
        if (btnNext) {
            btnNext.addEventListener('click', (event) => {
                event.preventDefault();
                pressBtn(btnNext);
                navigate(1);
            });
        }

        initSwipe();

    } catch(e) {
        console.warn('[project-block] JSON не загружен:', e.message);
    }
}

function pressBtn(btn) {
    clearTimeout(btn._pressTimeoutId);
    btn.classList.add('is-pressed');
    btn._pressTimeoutId = setTimeout(() => btn.classList.remove('is-pressed'), 180);
}

function navigate(dir) {
    if (projects.length < 2) return;

    if (isAnimating) {
        queuedDir = dir;
        return;
    }

    isAnimating = true;
    queuedDir = 0;
    animationId += 1;

    const runId    = animationId;
    const videos   = Array.from(document.querySelectorAll('.project-slider__videos .project-video'));
    if (videos.length < 2) {
        isAnimating = false;
        return;
    }

    const prevIdx  = current;
    current        = (current + dir + projects.length) % projects.length;

    const prev = videos[prevIdx];
    const next = videos[current];
    if (!prev || !next || prev === next) {
        isAnimating = false;
        return;
    }

    const leaveClass = dir > 0 ? 'is-leaving--left'  : 'is-leaving--right';
    const enterClass = dir > 0 ? 'is-entering--left' : 'is-entering--right';

    videos.forEach(video => {
        video.classList.remove(
            'is-leaving--left',
            'is-leaving--right',
            'is-entering--left',
            'is-entering--right'
        );
    });

    prev.classList.remove('is-active');
    prev.classList.add(leaveClass);
    next.classList.add(enterClass);
    next.play().catch(() => {});

    requestAnimationFrame(() => requestAnimationFrame(() => {
        next.classList.add('is-active');
    }));

    const finalize = () => {
        if (runId !== animationId) return;

        prev.classList.remove(leaveClass);
        next.classList.remove(enterClass);
        prev.pause();
        isAnimating = false;

        if (queuedDir) {
            const nextDir = queuedDir;
            queuedDir = 0;
            requestAnimationFrame(() => navigate(nextDir));
        }
    };

    const onAnimationEnd = (event) => {
        if (event.target !== next) return;
        next.removeEventListener('animationend', onAnimationEnd);
        finalize();
    };

    next.addEventListener('animationend', onAnimationEnd);
    setTimeout(() => {
        next.removeEventListener('animationend', onAnimationEnd);
        finalize();
    }, SLIDE_ANIMATION_MS);

    updateOverlay(current);
}

function updateOverlay(idx) {
    const p       = projects[idx] || {};
    const titleEl = document.querySelector('.project-slider__title');
    const descEl  = document.querySelector('.project-slider__desc');
    const counter = document.querySelector('.project-slider__counter');

    if (titleEl) titleEl.textContent = p.title || '';
    if (descEl)  descEl.textContent  = p.desc  || '';
    if (counter) counter.textContent =
        `${String(idx + 1).padStart(2, '0')} / ${String(projects.length).padStart(2, '0')}`;
}

function initSwipe() {
    const media = document.querySelector('.project-media');
    if (!media) return;
    let startX = 0;
    media.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    media.addEventListener('touchend',   e => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 50) navigate(dx < 0 ? 1 : -1);
    }, { passive: true });
}

export function initProjectAnimations() {
    const block = document.querySelector('.project-block');
    if (!block) return;

    const title = block.querySelector('.project-label__title');
    const desc  = block.querySelector('.project-info__desc');
    // media — больше не анимируем вход, она сразу видна

    if (title) {
        title.querySelectorAll('.p-letter').forEach((l, i) => {
            l.style.animationDelay = `${0.04 + i * 0.045}s`;
        });
    }

    const mo = new MutationObserver(() => {
        if (!block.classList.contains('card-entered')) return;
        mo.disconnect();
        if (title) title.classList.add('p-animate');
        setTimeout(() => { if (desc) desc.classList.add('p-animate'); }, 200);
    });

    mo.observe(block, { attributes: true, attributeFilter: ['class'] });
}
