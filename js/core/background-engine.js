// js/core/background-engine.js
export class VideoEngine {
    constructor() {
        this.container = document.querySelector('.hero-bg-slides');
        this.videos = [];
        this.currentIndex = 0;
        this.timer = null;
        this.visibilityObserver = null;
        this.isHeroVisible = true;
        this.hasVisibilityListener = false;
    }

    async load() {
        try {
            const response = await fetch('./projects/backgrounds.json');
            if (!response.ok) throw new Error('backgrounds.json not found');

            const data = await response.json();
            if (!this.container) return false;

            this.container.innerHTML = '';
            this.videos = [];

            let sources = [];
            if (data.projects && data.projects.length) {
                sources = data.projects.map((project) => ({
                    src: project.playerSrc || project.previewSrc || project.src,
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

            this.syncPriority();

            console.log(`[engine] hero backgrounds attached: ${this.videos.length}`);
            return true;
        } catch (error) {
            console.error('[engine] load failed:', error);
            return false;
        }
    }

    resolveSource(src) {
        if (!src) return '';
        if (/^https?:\/\//i.test(src)) return src;
        return `./projects/${src}`;
    }

    isVideoFile(src) {
        return /\.(webm|mp4|ogg)([?#].*)?$/i.test(src || '');
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
        video.controls = false;
        video.muted = true;
        video.defaultMuted = true;
        video.loop = true;
        video.playsInline = true;
        video.autoplay = true;
        video.preload = 'none';
        video.dataset.src = resolvedSrc;
        video.disablePictureInPicture = true;
        video.setAttribute('muted', '');
        video.setAttribute('loop', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('autoplay', '');
        video.setAttribute('disableremoteplayback', '');
        video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback nofullscreen');
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
        this.syncPlayback();
    }

    hydrateVideo(media, preload = 'metadata') {
        if (!media) return;

        if (!media.getAttribute('src') && media.dataset.src) {
            media.src = media.dataset.src;
            if (media.tagName === 'VIDEO') {
                media.load();
            }
        }

        if (media.tagName === 'VIDEO' && media.preload !== preload) {
            media.preload = preload;
            if (media.readyState === 0) {
                media.load();
            }
        }
    }

    syncPriority() {
        this.videos.forEach((video, index) => {
            if (video.tagName !== 'VIDEO' && index !== this.currentIndex) {
                video.removeAttribute('src');
                return;
            }

            if (index === this.currentIndex) {
                this.hydrateVideo(video, 'auto');
            } else if (video.tagName === 'VIDEO' && index === (this.currentIndex + 1) % this.videos.length) {
                this.hydrateVideo(video, 'metadata');
            } else if (video.tagName === 'VIDEO') {
                video.preload = 'none';
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
        const shouldPlay = this.isHeroVisible && !document.hidden;
        this.syncPriority();

        this.videos.forEach((video, index) => {
            if (video.tagName !== 'VIDEO') return;

            if (index === this.currentIndex && shouldPlay) {
                video.controls = false;
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
            this.visibilityObserver = new IntersectionObserver((entries) => {
                const entry = entries[0];
                this.isHeroVisible = Boolean(entry?.isIntersecting);
                this.syncPlayback();
            }, { threshold: 0.35 });
            this.visibilityObserver.observe(hero);
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
    }
}
