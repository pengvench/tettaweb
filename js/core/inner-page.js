import { VideoEngine } from './background-engine.js?v=20260606-6';
import { initScrollStack } from './scroll-stack.js?v=20260605-7';
import { initPreloader } from './preloader.js?v=20260606-6';
import { initPriceCalculator } from '../sections/price-calculator.js?v=20260606-6';
import { initShowcaseStack } from '../sections/showcase-stack.js?v=20260606-6';
import { initSnakePopup } from '../features/snake-popup.js?v=20260605-9';
import {
    closeModalVideo,
    hydrateVideoElement,
    loadSiteMediaManifest,
    openModalVideo,
    preloadImageAsset,
    setImageElementSource
} from './video-cache.js?v=20260606-6';

const ASSET_VERSION = '20260606-6';

function updateWorkStatus() {
    const statusText = document.getElementById('statusText');
    const mobileStatus = document.getElementById('mobileStatusText');
    if (!statusText) return;

    const tomskTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tomsk' }));
    const isOpen = tomskTime.getHours() >= 10 && tomskTime.getHours() < 21;
    const text = isOpen ? 'ОТКРЫТО (10:00 – 21:00)' : 'ЗАКРЫТО (10:00 – 21:00)';
    const color = isOpen ? '#bafe00' : '#ff0407';

    statusText.textContent = text;
    statusText.style.color = color;
    statusText.classList.toggle('open', isOpen);
    statusText.classList.toggle('closed', !isOpen);

    if (mobileStatus) {
        mobileStatus.textContent = text;
        mobileStatus.style.color = color;
    }
}

function initBurger() {
    const burger = document.getElementById('navBurger');
    const popup = document.getElementById('navPopup');
    if (!burger || !popup) return;

    burger.addEventListener('click', () => {
        const isOpen = popup.classList.toggle('open');
        burger.classList.toggle('open', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    popup.querySelectorAll('[data-close]').forEach((link) => {
        link.addEventListener('click', () => {
            popup.classList.remove('open');
            burger.classList.remove('open');
            document.body.style.overflow = '';
        });
    });
}

function initAnchorScroll() {
    const cards = Array.from(document.querySelectorAll('.stack-wrapper > .stack-card'));
    if (!cards.length) return;

    const getStackLandingOffset = (target) => {
        const index = cards.indexOf(target);
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if (isMobile && target.matches('.price-calculator, .filming-showreel')) return 0;
        return index > 0 ? Math.round(window.innerHeight * 0.34) : 0;
    };

    const getStackCardTop = (target) => {
        let top = 0;
        for (const card of cards) {
            if (card === target) return top + getStackLandingOffset(card);
            top += card.offsetHeight;
        }
        return target.offsetTop;
    };

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener('click', (event) => {
            const target = document.querySelector(link.getAttribute('href'));
            if (!target) return;
            event.preventDefault();
            window.scrollTo({ top: getStackCardTop(target), behavior: 'smooth' });
        });
    });
}

async function initHeroBackground() {
    if (!document.querySelector('.hero-bg-slides')) return;

    const engine = new VideoEngine({
        projectsUrl: '../projects/backgrounds.json',
        projectBase: '../projects/'
    });

    if (await engine.load()) engine.start();
}

let mediaManifestPromise = null;

async function getMediaManifest() {
    if (!mediaManifestPromise) {
        mediaManifestPromise = (async () => {
            try {
                const manifestUrl = new URL(`../../media.json?v=${ASSET_VERSION}`, import.meta.url);
                return await loadSiteMediaManifest(manifestUrl.href, new URL('../../', import.meta.url).href, ASSET_VERSION);
            } catch (error) {
                console.warn('[inner-page] media manifest unavailable:', error.message);
                return {};
            }
        })();
    }

    return mediaManifestPromise;
}

function pickMedia(items, blocked = new Set()) {
    if (!items.length) return '';
    if (items.length === 1) return items[0];

    const pool = items.filter((src) => !blocked.has(src));
    const available = pool.length ? pool : items;
    return available[Math.floor(Math.random() * available.length)];
}

function collectSources(registry) {
    const result = new Set();
    registry.forEach((items) => {
        items.forEach((src) => {
            if (src) result.add(src);
        });
    });
    return result;
}

function observeMediaGroup(nodes) {
    if (!nodes.length || !('IntersectionObserver' in window)) return () => true;

    let visible = true;
    const root = nodes[0].closest('.stack-card') || nodes[0];
    const observer = new IntersectionObserver((entries) => {
        visible = Boolean(entries[0]?.isIntersecting);
    }, {
        rootMargin: '180px 0px',
        threshold: 0.01
    });

    observer.observe(root);
    return () => visible;
}

async function initSectionAssets() {
    const nodes = Array.from(document.querySelectorAll('[data-inner-asset]'));
    if (!nodes.length) return;

    try {
        const manifest = await getMediaManifest();
        const assets = manifest.assets || [];
        if (!assets.length) return;

        nodes.forEach((node, index) => {
            let current = index % assets.length;
            setImageElementSource(node, assets[current]);

            window.setInterval(() => {
                current = (current + 1 + index) % assets.length;
                node.classList.add('is-changing');
                window.setTimeout(() => {
                    setImageElementSource(node, assets[current]);
                    node.classList.remove('is-changing');
                }, 420);
            }, 4200 + index * 640);
        });
    } catch (error) {
        console.warn('[inner-page] assets unavailable:', error.message);
    }
}

async function initContactMedia() {
    const cards = Array.from(document.querySelectorAll('[data-photo-card]'));
    if (!cards.length) return;

    try {
        const manifest = await getMediaManifest();
        const photos = manifest.photo || [];
        const icons = manifest.icon || [];
        if (!photos.length) return;

        const isVisible = observeMediaGroup(cards);
        const visiblePhotos = new Map();

        const findIcon = (channel) => {
            const normalized = channel.toLowerCase();

            return icons.find((src) => {
                const file = decodeURIComponent(src).toLowerCase();
                if (normalized === 'telegram') return file.includes('telegram') || file.includes('tg');
                if (normalized === 'email') return file.includes('email') || file.includes('mail') || file.includes('@') || file.includes('at-');
                return file.includes(normalized);
            }) || '';
        };

        cards.forEach((card, index) => {
            const channel = card.getAttribute('data-contact-channel') || '';
            const icon = card.querySelector('[data-contact-icon]');
            const photoNodes = Array.from(card.querySelectorAll('.contact-card__photo'));

            if (icon) {
                const iconSrc = findIcon(channel);
                if (iconSrc) setImageElementSource(icon, iconSrc);
            }

            if (photoNodes.length < 2) return;

            let activeIndex = 0;
            let currentSrc = pickMedia(photos, collectSources(visiblePhotos));
            visiblePhotos.set(card, new Set([currentSrc]));
            setImageElementSource(photoNodes[activeIndex], currentSrc);
            photoNodes[activeIndex].classList.add('is-active');

            window.setInterval(() => {
                if (!isVisible()) return;

                const nextIndex = activeIndex === 0 ? 1 : 0;
                const nextSrc = pickMedia(photos, collectSources(visiblePhotos));
                if (!nextSrc) return;

                setImageElementSource(photoNodes[nextIndex], nextSrc);
                visiblePhotos.set(card, new Set([currentSrc, nextSrc]));
                photoNodes[nextIndex].classList.add('is-active');
                photoNodes[activeIndex].classList.remove('is-active');

                window.setTimeout(() => {
                    visiblePhotos.set(card, new Set([nextSrc]));
                }, 1300);

                activeIndex = nextIndex;
                currentSrc = nextSrc;
            }, 3000 + index * 520);
        });
    } catch (error) {
        console.warn('[inner-page] contact media unavailable:', error.message);
    }
}

async function initCornerAssets() {
    const nodes = Array.from(document.querySelectorAll('[data-asset-sprite]'));
    if (!nodes.length) return;

    try {
        const manifest = await getMediaManifest();
        const assets = manifest.assets || [];
        if (!assets.length) return;

        const visibleAssets = new Map();
        const visibleBySection = new Map();

        nodes.forEach((node, index) => {
            const root = node.closest('.stack-card') || node;
            if (!visibleBySection.has(root)) {
                visibleBySection.set(root, observeMediaGroup([node]));
            }

            let currentSrc = pickMedia(assets, collectSources(visibleAssets));
            visibleAssets.set(node, new Set([currentSrc]));
            if (currentSrc) setImageElementSource(node, currentSrc);

            window.setInterval(() => {
                const isSectionVisible = visibleBySection.get(root);
                if (isSectionVisible && !isSectionVisible()) return;

                const nextSrc = pickMedia(assets, collectSources(visibleAssets));
                if (!nextSrc) return;

                node.classList.add('is-changing');
                visibleAssets.set(node, new Set([currentSrc, nextSrc]));
                window.setTimeout(() => {
                    setImageElementSource(node, nextSrc);
                    currentSrc = nextSrc;
                    visibleAssets.set(node, new Set([currentSrc]));
                    node.classList.remove('is-changing');
                }, 520);
            }, 3800 + index * 680);
        });
    } catch (error) {
        console.warn('[inner-page] corner assets unavailable:', error.message);
    }
}

function initFilmingExamples() {
    const cards = Array.from(document.querySelectorAll('[data-filming-example]'));
    const modal = document.getElementById('filmingModal');
    const modalVideo = modal?.querySelector('.filming-modal__video');
    if (!cards.length || !modal || !modalVideo) return;

    const hydrate = (video) => {
        hydrateVideoElement(video, 'metadata');
    };

    const syncPlayback = (play) => {
        cards.forEach((card) => {
            const video = card.querySelector('video');
            hydrate(video);
            if (play && !document.hidden) video?.play().catch(() => {});
            else video?.pause();
        });
    };

    const open = (card) => {
        const src = card.dataset.src;
        if (!src) return;
        document.body.style.overflow = 'hidden';
        modal.hidden = false;
        openModalVideo(modalVideo, src);
    };

    const close = () => {
        if (modal.hidden) return;
        closeModalVideo(modalVideo);
        modal.hidden = true;
        document.body.style.overflow = '';
    };

    cards.forEach((card) => card.addEventListener('click', () => open(card)));
    modal.querySelectorAll('[data-filming-modal-close]').forEach((node) => node.addEventListener('click', close));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close();
    });

    const section = document.querySelector('.filming-examples');
    if ('IntersectionObserver' in window && section) {
        const observer = new IntersectionObserver((entries) => {
            syncPlayback(Boolean(entries[0]?.isIntersecting));
        }, {
            rootMargin: '50% 0px',
            threshold: 0.05
        });
        observer.observe(section);
    } else {
        syncPlayback(true);
    }
}

async function initGraffitiOverlay() {
    const overlay = document.getElementById('graffitiOverlay');
    if (!overlay) return;

    try {
        const manifest = await getMediaManifest();
        const frames = manifest.graffiti || [];
        if (!frames.length) return;
        const isMobile = window.matchMedia('(max-width: 768px)').matches;

        frames.forEach((src) => preloadImageAsset(src));

        let currentFrame = 0;
        let rafTick = 0;
        let latestScrollY = window.scrollY || window.pageYOffset || 0;
        let scrollIdleTimer = 0;
        let motionRafId = 0;
        let isScrolling = false;

        setImageElementSource(overlay, frames[currentFrame]);

        const render = () => {
            latestScrollY = window.scrollY || window.pageYOffset || latestScrollY;
            const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
            const progress = Math.min(1, Math.max(0, latestScrollY / maxScroll));

            const x = isMobile
                ? 50 + Math.sin(progress * Math.PI * 4.6) * 24
                : 52 + Math.sin(progress * Math.PI * 4.6) * 28;
            const y = isMobile
                ? 36 + Math.cos(progress * Math.PI * 3.2) * 14
                : 20 + Math.cos(progress * Math.PI * 3.2) * 18;

            overlay.style.setProperty('--graffiti-x', `${x}vw`);
            overlay.style.setProperty('--graffiti-y', `${y}vh`);
            overlay.style.setProperty('--graffiti-rotate', `${-16 + progress * 42}deg`);
            overlay.style.setProperty('--graffiti-scale', `${0.82 + Math.sin(progress * Math.PI * 2) * 0.18}`);
            if (!isMobile) overlay.style.setProperty('--graffiti-hue', `${progress * 280}deg`);

            rafTick += 1;
            if (rafTick % 3 === 0) {
                currentFrame = (currentFrame + 1) % frames.length;
                setImageElementSource(overlay, frames[currentFrame]);
            }
        };

        const stopMotion = () => {
            isScrolling = false;
            overlay.classList.remove('is-visible');
        };

        const tickMotion = () => {
            if (!isScrolling) {
                motionRafId = 0;
                return;
            }

            render();
            motionRafId = window.requestAnimationFrame(tickMotion);
        };

        const startMotion = () => {
            if (!motionRafId) motionRafId = window.requestAnimationFrame(tickMotion);
        };

        const syncFromScroll = () => {
            latestScrollY = window.scrollY || window.pageYOffset || 0;
            const shouldShow = latestScrollY > window.innerHeight * 0.28;

            isScrolling = shouldShow;
            overlay.classList.toggle('is-visible', shouldShow);
            if (shouldShow) {
                startMotion();
            } else {
                render();
            }

            if (scrollIdleTimer) window.clearTimeout(scrollIdleTimer);
            scrollIdleTimer = window.setTimeout(stopMotion, 220);
        };

        window.addEventListener('scroll', syncFromScroll, { passive: true });
        window.addEventListener('resize', syncFromScroll);
        syncFromScroll();
    } catch (error) {
        console.warn('[inner-page] graffiti overlay unavailable:', error.message);
    }
}

function initFilmingHeroIntro() {
    const hero = document.querySelector('.filming-hero');
    const lead = hero?.querySelector('.filming-hero__lead');
    if (!hero || !lead) return;

    const originalText = lead.textContent.replace(/\s+/g, ' ').trim();
    if (!originalText) return;

    hero.classList.add('is-typing');
    lead.textContent = '';

    let index = 0;
    const typeNext = () => {
        index += 1;
        lead.textContent = originalText.slice(0, index);

        if (index < originalText.length) {
            window.setTimeout(typeNext, index % 7 === 0 ? 22 : 13);
            return;
        }

        hero.classList.add('is-ready');
    };

    window.setTimeout(typeNext, 280);
}

function scrollToInitialSection() {
    const initialSection = window.location.hash.slice(1);
    if (!initialSection) return;

    window.requestAnimationFrame(() => {
        const target = document.getElementById(decodeURIComponent(initialSection));
        if (!target) return;

        const cards = Array.from(document.querySelectorAll('.stack-wrapper > .stack-card'));
        const stackCard = target.classList.contains('stack-card')
            ? target
            : target.closest?.('.stack-wrapper > .stack-card');

        if (stackCard && cards.length) {
            let top = 0;
            for (const card of cards) {
                if (card === stackCard) break;
                top += card.offsetHeight;
            }
            const index = cards.indexOf(stackCard);
            const isMobile = window.matchMedia('(max-width: 768px)').matches;
            const landingOffset = isMobile && stackCard.matches('.price-calculator, .filming-showreel')
                ? 0
                : index > 0
                    ? Math.round(window.innerHeight * 0.34)
                    : 0;
            window.scrollTo(0, top + landingOffset);
            return;
        }

        target.scrollIntoView({ block: 'start' });
    });
}

async function withTimeout(promise, timeoutMs, label) {
    let timeoutId = 0;

    const timeoutPromise = new Promise((resolve) => {
        timeoutId = window.setTimeout(() => {
            console.warn(`[inner-page] ${label} timeout after ${timeoutMs}ms`);
            resolve(null);
        }, timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeoutId) window.clearTimeout(timeoutId);
    }
}

async function bootInnerPage() {
    document.querySelectorAll('.nav-reveal').forEach((node) => node.classList.add('revealed'));
    updateWorkStatus();
    window.setInterval(updateWorkStatus, 60000);
    initBurger();
    initAnchorScroll();

    await withTimeout(initHeroBackground(), 2200, 'hero-background');

    initScrollStack();
    initPriceCalculator();
    initShowcaseStack();
    initSnakePopup();
    initGraffitiOverlay();
    initSectionAssets();
    initContactMedia();
    initCornerAssets();
    initFilmingExamples();
    initFilmingHeroIntro();
    scrollToInitialSection();
}

updateWorkStatus();
initPreloader(bootInnerPage);
