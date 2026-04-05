// js/bg-engine.js
export class VideoEngine {
    constructor() {
        this.container = document.querySelector('.hero-bg-slides');
        this.videos = [];
        this.currentIndex = 0;
        this.timer = null;
    }

    async load() {
        try {
            const response = await fetch('./projects/backgrounds.json');
            if (!response.ok) throw new Error('backgrounds.json не найден');

            const data = await response.json();
            if (!this.container) return;

            this.container.innerHTML = '';

            // Поддержка обоих форматов: { projects:[...] } и { backgrounds:[...] }
            let sources = [];
            if (data.projects && data.projects.length) {
                sources = data.projects.map(p => p.src);
            } else if (data.backgrounds && data.backgrounds.length) {
                sources = data.backgrounds;
            }

            if (!sources.length) throw new Error('нет источников видео');

            sources.forEach((filename, i) => {
                const v = document.createElement('video');
                v.className  = `hero-bg-slide${i === 0 ? ' active' : ''}`;
                v.muted      = true;
                v.playsInline = true;
                v.preload    = 'auto';
                v.src        = `./projects/${filename}`;
                this.container.appendChild(v);
                this.videos.push(v);
            });

            console.log(`🎥 Движок: подцеплено ${this.videos.length} видео`);
            return true;
        } catch(e) {
            console.error('❌ Ошибка движка:', e);
            return false;
        }
    }

    start() {
        if (this.videos.length > 0) this.play(this.videos[0]);
    }

    play(video) {
        if (!video) return;
        video.play().catch(() => console.warn('Автоплей ждёт клика'));
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => this.next(), 15000);
    }

    next() {
        if (this.videos.length < 2) return;
        const current = this.videos[this.currentIndex];
        if (current) current.classList.remove('active');
        this.currentIndex = (this.currentIndex + 1) % this.videos.length;
        const next = this.videos[this.currentIndex];
        if (next) {
            next.classList.add('active');
            this.play(next);
        }
    }
}