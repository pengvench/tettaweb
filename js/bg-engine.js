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
            // 1. Стучимся в папку projects за конфигом
            const response = await fetch('./projects/backgrounds.json'); 
            if (!response.ok) throw new Error('backgrounds.json не найден в /projects/');
            
            const data = await response.json();
            if (!this.container) return;
            
            this.container.innerHTML = '';

            // 2. Видосы лежат там же, где и сам JSON
            data.backgrounds.forEach((filename, i) => {
                const v = document.createElement('video');
                v.className = `hero-bg-slide ${i === 0 ? 'active' : ''}`;
                v.muted = true;
                v.playsInline = true;
                v.preload = 'auto';
                
                // Путь: корень -> папка projects -> файл
                v.src = `./projects/${filename}`; 
                
                this.container.appendChild(v);
                this.videos.push(v);
            });
            
            console.log(`🎥 Движок: подцеплено ${this.videos.length} видео из /projects/`);
            return true;
        } catch (e) {
            console.error('❌ Ошибка движка (проверь папку projects):', e);
            return false;
        }
    }

    start() {
        if (this.videos.length > 0) this.play(this.videos[0]);
    }

    play(video) {
        if (!video) return;
        video.play().catch(() => console.warn('Автоплей ждет клика'));
        
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