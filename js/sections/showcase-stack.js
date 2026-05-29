export function initShowcaseStack() {
    initShowreelCarousel();
}

function initShowreelCarousel() {
    const root = document.querySelector('[data-showreel-slider]');
    if (!root) return;

    const stage = root.querySelector('[data-showreel-stage]');
    const slides = Array.from(root.querySelectorAll('[data-showreel-slide]'));
    const prevBtn = root.querySelector('[data-showreel-prev]');
    const nextBtn = root.querySelector('[data-showreel-next]');
    const counter = document.querySelector('[data-showreel-counter]');
    const progress = document.querySelector('[data-showreel-progress]');
    const dots = Array.from(document.querySelectorAll('[data-showreel-dot]'));
    const modal = document.getElementById('showreelModal');
    const modalVideo = modal?.querySelector('[data-showreel-modal-player], .showreel-modal__video') || null;
    const modalClosers = Array.from(document.querySelectorAll('[data-showreel-close]'));

    if (!stage || !slides.length) return;

    let currentIndex = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));
    let lockNavigation = false;
    let touchStart = null;
    let previousOverflow = '';
    let ignoreOpenUntil = 0;
    let isCarouselVisible = false;
    let isCarouselNear = false;
    let autoplayTimer = 0;
    let isUserInteracting = false;

    const total = slides.length;
    const AUTOPLAY_DELAY = 4600;
    const USER_IDLE_DELAY = 20000;
    const observedSection = root.closest('.more-projects') || root;

    if (progress) {
        progress.style.width = `${100 / total}%`;
    }

    const getRelativeOffset = (index) => {
        let offset = index - currentIndex;
        const half = Math.floor(total / 2);

        if (offset > half) offset -= total;
        if (offset < -half) offset += total;

        return offset;
    };

    const hydrateInlineVideo = (video, preload = 'metadata') => {
        if (!video) return;

        if (!video.getAttribute('src') && video.dataset.src) {
            video.src = video.dataset.src;
            if (video.tagName === 'VIDEO') {
                video.load();
            }
        }

        if (video.tagName === 'VIDEO' && video.preload !== preload) {
            video.preload = preload;
            if (video.readyState === 0) {
                video.load();
            }
        }
    };

    const syncVideoPriority = () => {
        if (!isCarouselNear && !isCarouselVisible) {
            slides.forEach((slide) => {
                const video = slide.querySelector('[data-showreel-player], video');
                if (video?.tagName === 'VIDEO') video.preload = 'none';
            });
            return;
        }

        slides.forEach((slide, index) => {
            const video = slide.querySelector('[data-showreel-player], video');
            if (!video) return;

            const distance = Math.abs(getRelativeOffset(index));
            if (video.tagName !== 'VIDEO' && distance !== 0) {
                video.removeAttribute('src');
                return;
            }

            const shouldPrime = distance === 0 || distance === 1 || (isCarouselVisible && distance === 2);

            if (distance === 0) {
                hydrateInlineVideo(video, 'auto');
            } else if (shouldPrime) {
                hydrateInlineVideo(video, 'metadata');
            } else {
                if (video.tagName === 'VIDEO') video.preload = 'none';
            }
        });
    };

    const syncVideos = () => {
        slides.forEach((slide, index) => {
            const video = slide.querySelector('[data-showreel-player], video');
            if (!video) return;
            if (video.tagName !== 'VIDEO') return;

            if (index === currentIndex && isCarouselVisible && !document.hidden) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    };

    const render = () => {
        slides.forEach((slide, index) => {
            slide.classList.remove('is-active', 'is-prev', 'is-next', 'is-hidden-left', 'is-hidden-right');

            const offset = getRelativeOffset(index);
            let stateClass = 'is-hidden-right';

            if (offset === 0) stateClass = 'is-active';
            else if (offset === -1) stateClass = 'is-prev';
            else if (offset === 1) stateClass = 'is-next';
            else if (offset < 0) stateClass = 'is-hidden-left';

            slide.classList.add(stateClass);
            slide.setAttribute('aria-hidden', offset === 0 ? 'false' : 'true');
        });

        if (counter) {
            counter.textContent = `${String(currentIndex + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
        }

        if (progress) {
            progress.style.transform = `translateX(${currentIndex * 100}%)`;
        }

        dots.forEach((dot, index) => {
            dot.classList.toggle('is-active', index === currentIndex);
        });

        syncVideoPriority();
        syncVideos();
    };

    const goTo = (nextIndex) => {
        currentIndex = (nextIndex + total) % total;
        render();
    };

    const navigate = (direction) => {
        if (lockNavigation || total < 2) return;

        lockNavigation = true;
        goTo(currentIndex + direction);

        window.setTimeout(() => {
            lockNavigation = false;
        }, 420);
    };

    const clearAutoplay = () => {
        if (autoplayTimer) {
            window.clearTimeout(autoplayTimer);
            autoplayTimer = 0;
        }
    };

    const canAutoplay = () => (
        total > 1 &&
        isCarouselVisible &&
        !document.hidden &&
        !isUserInteracting &&
        (!modal || modal.hidden)
    );

    const scheduleAutoplay = (delay = AUTOPLAY_DELAY) => {
        clearAutoplay();
        if (!canAutoplay()) return;

        autoplayTimer = window.setTimeout(() => {
            if (!canAutoplay()) return;
            navigate(1);
            scheduleAutoplay();
        }, delay);
    };

    const pauseAutoplayForUser = () => {
        isUserInteracting = true;
        clearAutoplay();

        window.clearTimeout(pauseAutoplayForUser.resumeTimer);
        pauseAutoplayForUser.resumeTimer = window.setTimeout(() => {
            isUserInteracting = false;
            scheduleAutoplay(700);
        }, USER_IDLE_DELAY);
    };
    pauseAutoplayForUser.resumeTimer = 0;

    const openModal = (slide) => {
        if (!modal || !modalVideo) return;
        if (Date.now() < ignoreOpenUntil) return;

        const src = slide.dataset.showreelSrc;
        if (!src) return;

        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        pauseAutoplayForUser();
        modal.hidden = false;
        modalVideo.src = src;
        if (modalVideo.tagName === 'VIDEO') {
            modalVideo.currentTime = 0;
            modalVideo.play().catch(() => {});
        }
    };

    const closeModal = () => {
        if (!modal || !modalVideo || modal.hidden) return;

        if (modalVideo.tagName === 'VIDEO') modalVideo.pause();
        modalVideo.removeAttribute('src');
        if (modalVideo.tagName === 'VIDEO') modalVideo.load();
        modal.hidden = true;
        document.body.style.overflow = previousOverflow;
        scheduleAutoplay(USER_IDLE_DELAY);
    };

    prevBtn?.addEventListener('click', () => {
        pauseAutoplayForUser();
        navigate(-1);
    });
    nextBtn?.addEventListener('click', () => {
        pauseAutoplayForUser();
        navigate(1);
    });

    dots.forEach((dot) => {
        dot.addEventListener('click', () => {
            pauseAutoplayForUser();
            const nextIndex = Number(dot.dataset.showreelDot);
            if (Number.isNaN(nextIndex)) return;
            goTo(nextIndex);
        });
    });

    slides.forEach((slide) => {
        const openBtn = slide.querySelector('[data-showreel-open]');
        const media = slide.querySelector('.showreel-card__media');

        openBtn?.addEventListener('click', () => {
            pauseAutoplayForUser();
            openModal(slide);
        });
        media?.addEventListener('click', () => {
            if (slide.classList.contains('is-active')) {
                pauseAutoplayForUser();
                openModal(slide);
            }
        });
    });

    stage.addEventListener('touchstart', (event) => {
        pauseAutoplayForUser();
        const touch = event.touches[0];
        touchStart = { x: touch.clientX, y: touch.clientY };
    }, { passive: true });

    stage.addEventListener('touchend', (event) => {
        if (!touchStart) return;

        const touch = event.changedTouches[0];
        const dx = touch.clientX - touchStart.x;
        const dy = touch.clientY - touchStart.y;

        touchStart = null;

        if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy)) return;
        ignoreOpenUntil = Date.now() + 350;
        navigate(dx < 0 ? 1 : -1);
    }, { passive: true });

    root.addEventListener('mouseenter', pauseAutoplayForUser, { passive: true });
    root.addEventListener('focusin', pauseAutoplayForUser);

    root.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            pauseAutoplayForUser();
            navigate(-1);
        }
        if (event.key === 'ArrowRight') {
            pauseAutoplayForUser();
            navigate(1);
        }
    });

    if ('IntersectionObserver' in window && observedSection) {
        const nearObserver = new IntersectionObserver((entries) => {
            isCarouselNear = Boolean(entries[0]?.isIntersecting);
            syncVideoPriority();
            if (!isCarouselNear) syncVideos();
            scheduleAutoplay();
        }, {
            rootMargin: '110% 0px',
            threshold: 0
        });

        const visibilityObserver = new IntersectionObserver((entries) => {
            const entry = entries[0];
            isCarouselVisible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.35);
            syncVideoPriority();
            syncVideos();
            scheduleAutoplay();
        }, {
            threshold: [0, 0.35, 0.6]
        });

        nearObserver.observe(observedSection);
        visibilityObserver.observe(observedSection);
    } else {
        isCarouselVisible = true;
        isCarouselNear = true;
    }

    document.addEventListener('visibilitychange', () => {
        syncVideoPriority();
        syncVideos();
        scheduleAutoplay();
    }, { passive: true });

    modalClosers.forEach((node) => node.addEventListener('click', closeModal));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeModal();
    });

    render();
    scheduleAutoplay();
}
