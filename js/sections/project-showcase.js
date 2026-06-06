// js/sections/project-showcase.js
import {
    closeModalVideo,
    configureInlineVideo,
    hydrateVideoElement,
    isVideoFile,
    loadProjectManifest,
    openModalVideo,
    resolveVideoSource
} from '../core/video-cache.js?v=20260606-6';

let projects = [];
let current = 0;
let isAnimating = false;
let queuedDir = 0;
let animationId = 0;
let isBlockNear = false;
let isBlockVisible = false;
let visibilityObserver = null;
let nearObserver = null;
let hasPageVisibilityListener = false;
let previousBodyOverflow = '';
let ignoreProjectOpenUntil = 0;

const SLIDE_ANIMATION_MS = 760;

function resolveProjectSource(src) {
    return resolveVideoSource(src, './projects/');
}

function createProjectMedia(project, index) {
    const rawSrc = project.playerSrc || project.previewSrc || project.src;
    const src = resolveProjectSource(rawSrc);
    const className = 'project-video' + (index === 0 ? ' is-active' : '');

    if (/^https?:\/\//i.test(src) && !isVideoFile(src)) {
        const iframe = document.createElement('iframe');
        iframe.className = `${className} is-cover-frame`;
        iframe.dataset.src = src;
        iframe.title = project.title || 'TETTA Production project video';
        applyCoverAspect(iframe, project.aspectRatio);
        iframe.loading = 'lazy';
        iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media; screen-wake-lock';
        iframe.allowFullscreen = true;
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('aria-label', project.title || 'Project video');
        return iframe;
    }

    const video = document.createElement('video');
    video.className = className;
    video.dataset.src = src;
    video.preload = 'none';
    configureInlineVideo(video, project.title || 'Project video');
    return video;
}

function applyCoverAspect(element, aspectRatio = '16 / 9') {
    const [rawWidth, rawHeight] = String(aspectRatio).split('/').map((part) => Number(part.trim()));
    const width = rawWidth > 0 ? rawWidth : 16;
    const height = rawHeight > 0 ? rawHeight : 9;

    element.style.setProperty('--cover-width-from-height', `${(width / height) * 100}cqh`);
    element.style.setProperty('--cover-height-from-width', `${(height / width) * 100}cqw`);
    element.style.aspectRatio = `${width} / ${height}`;
}

function hydrateProjectVideo(media, preload = 'metadata') {
    hydrateVideoElement(media, preload);
}

function syncProjectVideoPriority(videos) {
    if (!videos.length) return;

    const total = videos.length;
    const nextIndex = total > 1 ? (current + 1) % total : -1;
    const prevIndex = total > 2 ? (current - 1 + total) % total : -1;

    videos.forEach((video, index) => {
        if (video.tagName !== 'VIDEO' && index !== current) {
            video.removeAttribute('src');
            return;
        }

        if (!isBlockNear && !isBlockVisible) {
            if (video.tagName === 'VIDEO') video.preload = 'none';
            return;
        }

        if (index === current) {
            hydrateProjectVideo(video, isBlockVisible ? 'auto' : 'metadata');
            return;
        }

        const shouldPrimeNext = index === nextIndex;
        const shouldPrimePrev = isBlockVisible && index === prevIndex;

        if (shouldPrimeNext || shouldPrimePrev) {
            hydrateProjectVideo(video, 'metadata');
            return;
        }

        if (video.tagName === 'VIDEO') {
            video.preload = 'none';
        }
    });
}

function syncProjectPlayback(videos = Array.from(document.querySelectorAll('.project-slider__videos .project-video'))) {
    if (!videos.length) return;

    videos.forEach((video, index) => {
        if (video.tagName !== 'VIDEO') return;

        if (index === current && isBlockVisible && !document.hidden) {
            configureInlineVideo(video);
            video.play().catch(() => {});
        } else {
            video.pause();
        }
    });
}

function getProjectOpenSource(project) {
    const rawSrc = project?.src || project?.previewSrc || project?.playerSrc;
    return resolveProjectSource(rawSrc);
}

function isWideProject(project) {
    const [rawWidth, rawHeight] = String(project?.aspectRatio || '16 / 9')
        .split('/')
        .map((part) => Number(part.trim()));

    const width = rawWidth > 0 ? rawWidth : 16;
    const height = rawHeight > 0 ? rawHeight : 9;

    return width >= height;
}

function openCurrentProject() {
    const project = projects[current];
    const src = getProjectOpenSource(project);
    const modal = document.getElementById('showreelModal');
    const modalVideo = modal?.querySelector('[data-showreel-modal-player], .showreel-modal__video') || null;
    const modalDialog = modal?.querySelector('[data-showreel-dialog], .showreel-modal__dialog') || null;

    if (!src || !modal || !modalVideo) return;

    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalDialog?.classList.toggle('is-wide', isWideProject(project));
    modal.hidden = false;
    openModalVideo(modalVideo, src);
}

function closeProjectModalIfOpen() {
    const modal = document.getElementById('showreelModal');
    const modalVideo = modal?.querySelector('[data-showreel-modal-player], .showreel-modal__video') || null;
    const modalDialog = modal?.querySelector('[data-showreel-dialog], .showreel-modal__dialog') || null;

    if (!modal || !modalVideo || modal.hidden || !modalDialog?.classList.contains('is-wide')) return;

    closeModalVideo(modalVideo);
    modalDialog.classList.remove('is-wide');
    modal.hidden = true;
    document.body.style.overflow = previousBodyOverflow;
}

export async function initProjectVideos() {
    try {
        const data = await loadProjectManifest('./projects/backgrounds.json', './projects/');

        if (data.projects && data.projects.length) {
            projects = data.projects;
        } else if (data.backgrounds && data.backgrounds.length) {
            projects = data.backgrounds.map((src, i) => ({
                src,
                title: `Project ${i + 1}`,
                desc: 'Video project'
            }));
        }

        if (!projects.length) return;

        const container = document.querySelector('.project-slider__videos');
        if (!container) return;

        container.innerHTML = '';

        projects.forEach((p, i) => {
            container.appendChild(createProjectMedia(p, i));
        });

        const videos = Array.from(container.querySelectorAll('.project-video'));
        syncProjectVideoPriority(videos);
        syncProjectPlayback(videos);

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

        const block = document.querySelector('.project-block');
        if (nearObserver) {
            nearObserver.disconnect();
            nearObserver = null;
        }
        if (visibilityObserver) {
            visibilityObserver.disconnect();
            visibilityObserver = null;
        }
        if (block && 'IntersectionObserver' in window) {
            nearObserver = new IntersectionObserver((entries) => {
                isBlockNear = Boolean(entries[0]?.isIntersecting);
                syncProjectVideoPriority(videos);
                if (!isBlockNear) syncProjectPlayback(videos);
            }, {
                rootMargin: '180% 0px',
                threshold: 0
            });
            nearObserver.observe(block);

            visibilityObserver = new IntersectionObserver((entries) => {
                const entry = entries[0];
                isBlockVisible = Boolean(entry?.isIntersecting);
                syncProjectVideoPriority(videos);
                syncProjectPlayback(videos);
            }, { threshold: 0.35 });
            visibilityObserver.observe(block);
        } else {
            isBlockNear = true;
            isBlockVisible = true;
        }

        if (!hasPageVisibilityListener) {
            document.addEventListener('visibilitychange', () => syncProjectPlayback(), { passive: true });
            hasPageVisibilityListener = true;
        }

        initSwipe();
        initProjectOpen();

    } catch (e) {
        console.warn('[project-block] JSON failed to load:', e.message);
    }
}

function initProjectOpen() {
    const media = document.querySelector('.project-media');
    if (!media) return;
    if (media.dataset.projectOpenReady === 'true') return;
    media.dataset.projectOpenReady = 'true';

    media.setAttribute('role', 'button');
    media.setAttribute('tabindex', '0');
    media.setAttribute('aria-label', 'Открыть текущий проект');

    media.addEventListener('click', (event) => {
        if (event.target.closest('.project-nav-btn')) return;
        if (Date.now() < ignoreProjectOpenUntil) return;
        openCurrentProject();
    });

    media.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openCurrentProject();
    });

    document.querySelectorAll('[data-showreel-close]').forEach((node) => {
        node.addEventListener('click', closeProjectModalIfOpen);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeProjectModalIfOpen();
    });
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

    const runId = animationId;
    const videos = Array.from(document.querySelectorAll('.project-slider__videos .project-video'));
    if (videos.length < 2) {
        isAnimating = false;
        return;
    }

    const prevIdx = current;
    current = (current + dir + projects.length) % projects.length;

    const prev = videos[prevIdx];
    const next = videos[current];
    if (!prev || !next || prev === next) {
        isAnimating = false;
        return;
    }

    const leaveClass = dir > 0 ? 'is-leaving--left' : 'is-leaving--right';
    const enterClass = dir > 0 ? 'is-entering--left' : 'is-entering--right';

    videos.forEach((video) => {
        video.classList.remove(
            'is-leaving--left',
            'is-leaving--right',
            'is-entering--left',
            'is-entering--right'
        );
    });

    hydrateProjectVideo(next, 'auto');
    prev.classList.remove('is-active');
    prev.classList.add(leaveClass);
    next.classList.add(enterClass);
    if (next.tagName === 'VIDEO' && isBlockVisible && !document.hidden) {
        next.play().catch(() => {});
    }

    requestAnimationFrame(() => requestAnimationFrame(() => {
        next.classList.add('is-active');
    }));

    const finalize = () => {
        if (runId !== animationId) return;

        prev.classList.remove(leaveClass);
        next.classList.remove(enterClass);
        syncProjectVideoPriority(videos);
        syncProjectPlayback(videos);
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
    const p = projects[idx] || {};
    const titleEl = document.querySelector('.project-slider__title');
    const descEl = document.querySelector('.project-slider__desc');
    const counter = document.querySelector('.project-slider__counter');

    if (titleEl) titleEl.textContent = p.title || '';
    if (descEl) descEl.textContent = p.desc || '';
    if (counter) counter.textContent =
        `${String(idx + 1).padStart(2, '0')} / ${String(projects.length).padStart(2, '0')}`;
}

function initSwipe() {
    const media = document.querySelector('.project-media');
    if (!media) return;
    let startX = 0;
    media.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    media.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 50) {
            ignoreProjectOpenUntil = Date.now() + 350;
            navigate(dx < 0 ? 1 : -1);
        }
    }, { passive: true });
}

export function initProjectAnimations() {
    const block = document.querySelector('.project-block');
    if (!block) return;

    const title = block.querySelector('.project-label__title');
    const desc = block.querySelector('.project-info__desc');

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
