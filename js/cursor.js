export class Cursor {
    constructor() {
        this.cursor = document.querySelector('.cursor');
        this.follower = document.querySelector('.cursor-follower');
        
        this.mouseX = 0;
        this.mouseY = 0;
        this.cursorX = 0;
        this.cursorY = 0;
        this.followerX = 0;
        this.followerY = 0;
        
        this.hoverElements = document.querySelectorAll('a, button, .project-frame, .hero-link, .view-project, .studio-link, .tag, .nav-link');
        
        if (this.cursor && this.follower) {
            this.init();
        }
    }
    
    init() {
        // Отслеживание мыши
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        
        // Запуск анимации
        this.animate();
        
        // Ховер-эффекты
        this.setupHoverEffects();
    }
    
    animate() {
        // Плавное следование курсора
        this.cursorX += (this.mouseX - this.cursorX) * 0.5;
        this.cursorY += (this.mouseY - this.cursorY) * 0.5;
        this.followerX += (this.mouseX - this.followerX) * 0.1;
        this.followerY += (this.mouseY - this.followerY) * 0.1;
        
        this.cursor.style.transform = `translate3d(${this.cursorX}px, ${this.cursorY}px, 0)`;
        this.follower.style.transform = `translate3d(${this.followerX}px, ${this.followerY}px, 0)`;
        
        requestAnimationFrame(() => this.animate());
    }
    
    setupHoverEffects() {
        this.hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                this.cursor.classList.add('hover');
                this.follower.classList.add('hover');
            });
            
            el.addEventListener('mouseleave', () => {
                this.cursor.classList.remove('hover');
                this.follower.classList.remove('hover');
            });
        });
    }
    
    // Метод для отключения курсора (например, на мобильных)
    destroy() {
        if (this.cursor) this.cursor.style.display = 'none';
        if (this.follower) this.follower.style.display = 'none';
    }
    
    // Метод для включения курсора
    enable() {
        if (this.cursor) this.cursor.style.display = 'block';
        if (this.follower) this.follower.style.display = 'block';
    }
}

// Экспорт экземпляра для удобства
export const cursor = new Cursor();