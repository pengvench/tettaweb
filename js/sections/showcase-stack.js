export function initShowcaseStack() {
    initShowreelCarousel();
    initOrderForm();
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
    const modalVideo = modal?.querySelector('.showreel-modal__video') || null;
    const modalClosers = Array.from(document.querySelectorAll('[data-showreel-close]'));

    if (!stage || !slides.length) return;

    let currentIndex = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));
    let lockNavigation = false;
    let touchStart = null;
    let previousOverflow = '';
    let ignoreOpenUntil = 0;
    let isCarouselVisible = false;
    let isCarouselNear = false;

    const total = slides.length;
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
            video.load();
        }

        if (video.preload !== preload) {
            video.preload = preload;
            if (video.readyState === 0) {
                video.load();
            }
        }
    };

    const syncVideoPriority = () => {
        if (!isCarouselNear && !isCarouselVisible) {
            slides.forEach((slide) => {
                const video = slide.querySelector('video');
                if (video) video.preload = 'none';
            });
            return;
        }

        slides.forEach((slide, index) => {
            const video = slide.querySelector('video');
            if (!video) return;

            const distance = Math.abs(getRelativeOffset(index));
            const shouldPrime = distance === 0 || distance === 1 || (isCarouselVisible && distance === 2);

            if (distance === 0) {
                hydrateInlineVideo(video, 'auto');
            } else if (shouldPrime) {
                hydrateInlineVideo(video, 'metadata');
            } else {
                video.preload = 'none';
            }
        });
    };

    const syncVideos = () => {
        slides.forEach((slide, index) => {
            const video = slide.querySelector('video');
            if (!video) return;

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

    const openModal = (slide) => {
        if (!modal || !modalVideo) return;
        if (Date.now() < ignoreOpenUntil) return;

        const src = slide.dataset.showreelSrc;
        if (!src) return;

        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        modal.hidden = false;
        modalVideo.src = src;
        modalVideo.currentTime = 0;
        modalVideo.play().catch(() => {});
    };

    const closeModal = () => {
        if (!modal || !modalVideo || modal.hidden) return;

        modalVideo.pause();
        modalVideo.removeAttribute('src');
        modalVideo.load();
        modal.hidden = true;
        document.body.style.overflow = previousOverflow;
    };

    prevBtn?.addEventListener('click', () => navigate(-1));
    nextBtn?.addEventListener('click', () => navigate(1));

    dots.forEach((dot) => {
        dot.addEventListener('click', () => {
            const nextIndex = Number(dot.dataset.showreelDot);
            if (Number.isNaN(nextIndex)) return;
            goTo(nextIndex);
        });
    });

    slides.forEach((slide) => {
        const openBtn = slide.querySelector('[data-showreel-open]');
        const media = slide.querySelector('.showreel-card__media');

        openBtn?.addEventListener('click', () => openModal(slide));
        media?.addEventListener('click', () => {
            if (slide.classList.contains('is-active')) {
                openModal(slide);
            }
        });
    });

    stage.addEventListener('touchstart', (event) => {
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

    root.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') navigate(-1);
        if (event.key === 'ArrowRight') navigate(1);
    });

    if ('IntersectionObserver' in window && observedSection) {
        const nearObserver = new IntersectionObserver((entries) => {
            isCarouselNear = Boolean(entries[0]?.isIntersecting);
            syncVideoPriority();
            if (!isCarouselNear) syncVideos();
        }, {
            rootMargin: '110% 0px',
            threshold: 0
        });

        const visibilityObserver = new IntersectionObserver((entries) => {
            const entry = entries[0];
            isCarouselVisible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.35);
            syncVideoPriority();
            syncVideos();
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
    }, { passive: true });

    modalClosers.forEach((node) => node.addEventListener('click', closeModal));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeModal();
    });

    render();
}

function initOrderForm() {
    const form = document.getElementById('tettaOrderForm');
    if (!form) return;

    const nameInput = document.getElementById('order-name');
    const contactInput = document.getElementById('order-contact');
    const emailInput = document.getElementById('order-email');
    const deadlineInput = document.getElementById('order-deadline');
    const detailsInput = document.getElementById('order-details');
    const consentInput = document.getElementById('order-consent');
    const consentWrap = document.getElementById('orderConsentWrap');
    const submitBtn = document.getElementById('order-submit');
    const statusEl = document.getElementById('orderFormStatus');

    if (!contactInput || !emailInput || !detailsInput || !consentInput || !consentWrap || !submitBtn || !statusEl) {
        return;
    }

    const fieldWrappers = new Map(
        [nameInput, contactInput, emailInput, deadlineInput, detailsInput]
            .filter(Boolean)
            .map((input) => [input, input.closest('.order-field')])
    );

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const setStatus = (message, type = '') => {
        statusEl.textContent = message;
        statusEl.className = `contact-request__status${type ? ` is-${type}` : ''}`;
    };

    const markInvalid = (input, invalid) => {
        const wrapper = fieldWrappers.get(input);
        if (wrapper) wrapper.classList.toggle('is-invalid', invalid);
    };

    const clearValidation = () => {
        fieldWrappers.forEach((wrapper) => wrapper?.classList.remove('is-invalid'));
        consentWrap.classList.remove('is-invalid');
    };

    [contactInput, emailInput, detailsInput].forEach((input) => {
        input.addEventListener('input', () => markInvalid(input, false));
    });

    consentInput.addEventListener('change', () => {
        consentWrap.classList.remove('is-invalid');
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearValidation();

        const name = nameInput?.value.trim() || '';
        const contact = contactInput.value.trim();
        const email = emailInput.value.trim();
        const deadline = deadlineInput?.value.trim() || '';
        const details = detailsInput.value.trim();

        let hasErrors = false;

        if (!contact && !email) {
            markInvalid(contactInput, true);
            markInvalid(emailInput, true);
            hasErrors = true;
        }

        if (email && !emailPattern.test(email)) {
            markInvalid(emailInput, true);
            hasErrors = true;
        }

        if (details.length < 10) {
            markInvalid(detailsInput, true);
            hasErrors = true;
        }

        if (!consentInput.checked) {
            consentWrap.classList.add('is-invalid');
            hasErrors = true;
        }

        if (hasErrors) {
            setStatus('Добавьте TG/VK или почту, опишите задачу и подтвердите согласие.', 'error');
            return;
        }

        const payload = {
            type: 'order',
            source: 'tetta-site',
            name,
            contact,
            telegram: contact,
            email,
            deadline,
            details,
            createdAt: new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Tomsk' })
        };

        const originalButtonHtml = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Отправка...</span>';
        setStatus('Проверяем способ отправки заявки.', 'info');

        try {
            const response = await fetch('telegram.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }

            form.reset();
            setStatus('Заявка отправлена. Вернемся к вам в ближайшее рабочее окно.', 'success');
        } catch (error) {
            const subject = encodeURIComponent('Заявка с сайта ТЕТТА');
            const body = encodeURIComponent([
                'Новая заявка с сайта ТЕТТА',
                '',
                `Имя: ${name || '-'}`,
                `TG / VK: ${contact || '-'}`,
                `E-mail: ${email || '-'}`,
                `Дедлайн: ${deadline || '-'}`,
                '',
                'Задача:',
                details
            ].join('\n'));

            window.location.href = `mailto:hello@tetta.ru?subject=${subject}&body=${body}`;
            setStatus('Открываем письмо на hello@tetta.ru. Если клиент не открылся, адрес можно использовать вручную.', 'info');
            console.warn('[showcase-stack] telegram.php unavailable, fallback to mailto:', error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalButtonHtml;
        }
    });
}
