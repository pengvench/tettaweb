// js/core/background-engine.js
import {
    configureInlineVideo,
    hydrateVideoElement,
    isVideoFile,
    loadProjectManifest,
    resolveVideoSource,
    waitForVideoData,
    watchStackCardVisibility
} from './video-cache.js?v=20260922-1';

export class VideoEngine {
    constructor(options = {}) {
        this.container = document.querySelector('.hero-bg-slides');
        this.projectsUrl = options.projectsUrl || './projects/backgrounds.json?v=20260923-1';
        this.projectBase = options.projectBase || './projects/';
        this.deferInitialHydration = Boolean(options.deferInitialHydration);
        this.videos = [];
        this.currentIndex = 0;
        this.timer = null;
        this.visibilityObserver = null;
        this.isHeroVisible = true;
        this.isHeroCovered = false;
        this.occlusionUnsubscribe = null;
        this.hasVisibilityListener = false;
        // Мобильный затвор: до первого взаимодействия качаем только metadata,
        // постер уже закрывает чёрный кадр (см. setupMobilePreloadGate).
        this.isMobileStrategy = window.matchMedia('(max-width: 768px), (hover: none), (pointer: coarse)').matches;
        this.mobilePreloadArmed = !this.isMobileStrategy;
        this.mobileGateEvents = ['touchstart', 'scroll', 'wheel', 'keydown'];
    }

    async load() {
        try {
            const data = await loadProjectManifest(this.projectsUrl, this.projectBase);
            if (!this.container) return false;

            this.container.innerHTML = '';
            this.videos = [];

            let sources = [];
            if (data.projects && data.projects.length) {
                sources = data.projects.map((project) => ({
                    src: project.playerSrc || project.previewSrc || project.src,
                    poster: project.poster || '',
                    title: project.title,
                    aspectRatio: project.aspectRatio
                }));
            } else if (data.backgrounds && data.backgrounds.length) {
                sources = data.backgrounds.map((src) => ({ src }));
            }

            if (!sources.length) throw new Error('no video sources');

            sources.forEach((source, index) => {
                const media = this.createMedia(source, index);
                this.container.appendChild(media);
                this.videos.push(media);
            });

            if (!this.deferInitialHydration) {
                this.syncPriority();
            }

            console.log(`[engine] hero backgrounds attached: ${this.videos.length}`);
            return true;
        } catch (error) {
            console.error('[engine] load failed:', error);
            return false;
        }
    }

    resolveSource(src) {
        return resolveVideoSource(src, this.projectBase);
    }

    isVideoFile(src) {
        return isVideoFile(src);
    }

    createMedia(source, index) {
        const src = typeof source === 'string' ? source : source.src;
        const resolvedSrc = this.resolveSource(src);
        const className = `hero-bg-slide${index === 0 ? ' active' : ''}`;

        if (/^https?:\/\//i.test(resolvedSrc) && !this.isVideoFile(resolvedSrc)) {
            const iframe = document.createElement('iframe');
            iframe.className = `${className} is-cover-frame`;
            iframe.dataset.src = resolvedSrc;
            iframe.title = source?.title || 'TETTA Production video background';
            this.applyCoverAspect(iframe, source?.aspectRatio);
            iframe.loading = 'lazy';
            iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media; screen-wake-lock';
            iframe.allowFullscreen = true;
            iframe.setAttribute('frameborder', '0');
            return iframe;
        }

        const video = document.createElement('video');
        video.className = className;
        video.preload = 'none';
        video.dataset.src = resolvedSrc;
        // Постер закрывает чёрный кадр до первого кадра видео: LCP
        // рисует jpeg 12-100КБ, а не кадр из 26МБ webm.
        if (typeof source === 'object' && source.poster) {
            video.poster = this.resolveSource(source.poster);
        }
        configureInlineVideo(video, source?.title || 'TETTA Production video background');
        return video;
    }

    applyCoverAspect(element, aspectRatio = '16 / 9') {
        const [rawWidth, rawHeight] = String(aspectRatio).split('/').map((part) => Number(part.trim()));
        const width = rawWidth > 0 ? rawWidth : 16;
        const height = rawHeight > 0 ? rawHeight : 9;

        element.style.setProperty('--cover-width-from-height', `${(width / height) * 100}cqh`);
        element.style.setProperty('--cover-height-from-width', `${(height / width) * 100}cqw`);
        element.style.aspectRatio = `${width} / ${height}`;
    }

    start() {
        if (!this.videos.length) return;
        this.initVisibility();
        this.setupMobilePreloadGate();
        this.syncPlayback();
        this.preloadAhead();
    }

    // Мобильная стратегия: не качать hero-видео, пока пользователь не
    // interacted (touch/scroll/wheel/keydown) или страница не ушла в idle
    // после window.load. На холодном старте это минус ~8МБ трафика из
    // трейса — постер уже держит визуал, видео догонит после взвода.
    setupMobilePreloadGate() {
        if (!this.isMobileStrategy || this.mobilePreloadArmed) return;

        const arm = () => this.armMobilePreload();
        this.mobileGateEvents.forEach((type) => {
            window.addEventListener(type, arm, { once: true, passive: true });
        });

        if (document.readyState === 'complete') {
            this.scheduleIdleArm();
        } else {
            window.addEventListener('load', () => this.scheduleIdleArm(), { once: true });
        }
    }

    scheduleIdleArm() {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => this.armMobilePreload(), { timeout: 4500 });
        } else {
            window.setTimeout(() => this.armMobilePreload(), 2800);
        }
    }

    armMobilePreload() {
        if (this.mobilePreloadArmed) return;
        this.mobilePreloadArmed = true;

        // Активный слайд апгрейдим до auto и играем, хвост подтянем.
        this.syncPlayback();
        this.preloadAhead();
    }

    hydrateVideo(media, preload = 'metadata') {
        if (!media) return;

        hydrateVideoElement(media, preload);
    }

    syncPriority() {
        const gated = this.isMobileStrategy && !this.mobilePreloadArmed;
        this.videos.forEach((video, index) => {
            if (video.tagName !== 'VIDEO' && index !== this.currentIndex) {
                video.removeAttribute('src');
                return;
            }

            if (index === this.currentIndex) {
                // До взвода затвора на мобиле — только metadata: постер
                // нарисован, 26МБ видео не качается вхолостую.
                this.hydrateVideo(video, gated ? 'metadata' : 'auto');
            } else if (video.tagName === 'VIDEO' && index === (this.currentIndex + 1) % this.videos.length) {
                // Не понижаем preload: раньше каждый syncPlayback сбрасывал
                // подгрузку следующего слайда обратно до 'metadata', и к
                // ротации он успевал подгрузиться только наполовину.
                if (video.preload !== 'auto') this.hydrateVideo(video, gated ? 'none' : 'metadata');
            } else if (video.tagName === 'VIDEO') {
                video.preload = 'none';
            }
        });
    }

    // «Подгрузить и паузить»: следующий слайд догружаем целиком, когда
    // текущий уже готов. Ротация каждые 15 с проходит без черных провалов,
    // при этом одновременно грузится не больше двух видео.
    preloadAhead() {
        if (this.isMobileStrategy && !this.mobilePreloadArmed) return;

        const active = this.videos[this.currentIndex];
        if (!active || active.tagName !== 'VIDEO') return;

        // На мобиле следующий слайд догоняем только до metadata: полный
        // auto здесь стоит лишних мегабайт трафика, а metadata хватает,
        // чтобы к ротации не ловить чёрный кадр.
        const nextPreload = this.isMobileStrategy ? 'metadata' : 'auto';
        waitForVideoData(active, 8000).then(() => {
            if (!this.videos.length) return;
            const next = this.videos[(this.currentIndex + 1) % this.videos.length];
            if (next && next.tagName === 'VIDEO') {
                this.hydrateVideo(next, nextPreload);
            }
        });
    }

    startRotation() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => this.next(), 15000);
    }

    stopRotation() {
        if (!this.timer) return;
        clearTimeout(this.timer);
        this.timer = null;
    }

    syncPlayback() {
        const shouldPlay = this.isHeroVisible && !this.isHeroCovered
            && !document.hidden && this.mobilePreloadArmed;
        this.syncPriority();

        this.videos.forEach((video, index) => {
            if (video.tagName !== 'VIDEO') return;

            if (index === this.currentIndex && shouldPlay) {
                configureInlineVideo(video);
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });

        if (shouldPlay) {
            this.startRotation();
        } else {
            this.stopRotation();
        }
    }

    initVisibility() {
        const hero = document.getElementById('hero');

        if (this.visibilityObserver) {
            this.visibilityObserver.disconnect();
            this.visibilityObserver = null;
        }

        if (hero && 'IntersectionObserver' in window) {
            // Пауза hero-фона, когда секция ушла из видимой зоны:
            // играем, пока видно >= 10% высоты секции, гасим воспроизведение
            // при меньшей доле. Порог [0, 0.1] гарантирует срабатывание
            // на обеих границах, ratio убирает неоднозначность isIntersecting.
            this.visibilityObserver = new IntersectionObserver((entries) => {
                const entry = entries[entries.length - 1];
                const ratio = entry ? entry.intersectionRatio : 0;
                this.isHeroVisible = Boolean(entry?.isIntersecting) && ratio >= 0.1;
                this.syncPlayback();
            }, { threshold: [0, 0.1] });
            this.visibilityObserver.observe(hero);
        }

        // Стек-карточки (sticky) закрывают hero, оставаясь «видимыми» для
        // IntersectionObserver (ratio ~ 1). Реальное перекрытие отслеживает
        // watchStackCardVisibility: когда следующая карточка стека доехала
        // до верха экрана, hero закрыт на ~90% — гасим воспроизведение.
        if (hero) {
            this.occlusionUnsubscribe?.();
            this.occlusionUnsubscribe = watchStackCardVisibility(hero, (covered) => {
                this.isHeroCovered = covered;
                this.syncPlayback();
            });
        }

        if (!this.hasVisibilityListener) {
            document.addEventListener('visibilitychange', () => this.syncPlayback(), { passive: true });
            this.hasVisibilityListener = true;
        }
    }

    next() {
        if (this.videos.length < 2) return;

        const current = this.videos[this.currentIndex];
        if (current) {
            current.classList.remove('active');
            if (current.tagName === 'VIDEO') current.pause();
        }

        this.currentIndex = (this.currentIndex + 1) % this.videos.length;

        const next = this.videos[this.currentIndex];
        if (next) {
            next.classList.add('active');
        }

        this.syncPlayback();
        this.preloadAhead();
    }
}
