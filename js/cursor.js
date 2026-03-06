// js/cursor.js
export class CustomCursor {
    constructor() {
        this.cursor = document.querySelector('.cursor');
        this.follower = document.querySelector('.cursor-follower');
        
        if (this.cursor && this.follower) {
            this.init();
        }
    }
    
    init() {
        // Отслеживание мыши
        document.addEventListener('mousemove', (e) => {
            const { clientX: x, clientY: y } = e;
            
            this.cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            this.follower.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        });
        
        // Ховер-эффект для ссылок
        document.querySelectorAll('a, button, .project-frame').forEach(link => {
            link.addEventListener('mouseenter', () => {
                this.cursor.classList.add('hover');
                this.follower.classList.add('hover');
            });
            link.addEventListener('mouseleave', () => {
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
export const cursor = new CustomCursor();