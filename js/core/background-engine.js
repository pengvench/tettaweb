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
            if (!response.ok) throw new Error('backgrounds.json не найден');

            const data = await response.json();
            if (!this.container) return false;

            this.container.innerHTML = '';
            this.videos = [];

            let sources = [];
            if (data.projects && data.projects.length) {
                sources = data.projects.map((project) => project.previewSrc || project.src);
            } else if (data.backgrounds && data.backgrounds.length) {
                sources = data.backgrounds;
            }

            if (!sources.length) throw new Error('нет источников видео');

            sources.forEach((filename, index) => {
                const video = document.createElement('video');
                video.className = `hero-bg-slide${index === 0 ? ' active' : ''}`;
                video.muted = true;
                video.loop = true;
                video.playsInline = true;
                video.preload = 'none';
                video.dataset.src = `./projects/${filename}`;
                this.container.appendChild(video);
                this.videos.push(video);
            });

            this.syncPriority();

            console.log(`[engine] hero backgrounds attached: ${this.videos.length}`);
            return true;
        } catch (error) {
            console.error('[engine] load failed:', error);
            return false;
        }
    }

    start() {
        if (!this.videos.length) return;
        this.initVisibility();
        this.syncPlayback();
    }

    hydrateVideo(video, preload = 'metadata') {
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
    }

    syncPriority() {
        const nextIndex = this.videos.length > 1
            ? (this.currentIndex + 1) % this.videos.length
            : -1;

        this.videos.forEach((video, index) => {
            if (index === this.currentIndex) {
                this.hydrateVideo(video, 'auto');
            } else if (index === nextIndex) {
                this.hydrateVideo(video, 'metadata');
            } else {
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
            if (index === this.currentIndex && shouldPlay) {
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
            current.pause();
        }

        this.currentIndex = (this.currentIndex + 1) % this.videos.length;

        const next = this.videos[this.currentIndex];
        if (next) {
            next.classList.add('active');
        }

        this.syncPlayback();
    }
}
