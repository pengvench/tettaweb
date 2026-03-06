import { initPreloader } from './loading.js';
import { VideoEngine } from './bg-engine.js';

/**
 * ГЛАВНЫЙ СКРИПТ ТЕТТА
 * Структура: Скрипты в /js/, Конфиг и Видео в /projects/
 */
document.addEventListener('DOMContentLoaded', async () => {
    const engine = new VideoEngine();

    // ============================================
    // 1. СТАТУС РАБОТЫ (ТОЧНОЕ ВРЕМЯ ТОМСКА)
    // ============================================
    const updateWorkStatus = () => {
        const statusText = document.getElementById('statusText');
        if (!statusText) return;

        // Получаем время именно в Томске (UTC+7)
        const now = new Date();
        const tomskTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tomsk' }));
        const hours = tomskTime.getHours();
        
        // Режим работы: 10:00 - 21:00
        const isOpen = hours >= 10 && hours < 21;
        
        statusText.textContent = isOpen ? 'ОТКРЫТО (10:00 – 21:00)' : 'ЗАКРЫТО (10:00 – 21:00)';
        
        // Цвета: Зеленый (#00ff41) или Красный (#ff0000)
        if (isOpen) {
            statusText.style.color = '#00ff41';
            statusText.classList.add('open');
            statusText.classList.remove('closed');
        } else {
            statusText.style.color = '#ff0000';
            statusText.classList.add('closed');
            statusText.classList.remove('open');
        }
    };

    updateWorkStatus();
    setInterval(updateWorkStatus, 60000);

    // ============================================
    // 2. АНИМАЦИЯ СИМВОЛА П (PI-SHAKE)
    // ============================================
    const piSymbol = document.querySelector('.pi-symbol');
    if (piSymbol) {
        setInterval(() => {
            const rotate = Math.random() * 10 - 5; // от -5 до 5 градусов
            const scale = 0.92 + Math.random() * 0.16; // легкое пульсирование
            piSymbol.style.transform = `rotate(${rotate}deg) scale(${scale})`;
        }, 100);
    }

    // ============================================
    // 3. ЗАГРУЗКА И ЗАПУСК
    // ============================================
    
    // Сначала грузим конфиг из /projects/backgrounds.json
    const isVideoReady = await engine.load();

    // Запускаем прелоадер (внутри него FPS-глитч и логи консоли)
    initPreloader(() => {
        // Когда прогресс 100%, запускаем видео-движок
        if (isVideoReady) {
            engine.start();
        }
        console.log('%c Т Е Т Т А — СИСТЕМА ЗАПУЩЕНА ', 'background: #000; color: #00ff41; font-weight: bold;');
    });

    // ============================================
    // 4. КАСТОМНЫЙ КУРСОР
    // ============================================
    const cursor = document.querySelector('.cursor');
    const follower = document.querySelector('.cursor-follower');
    
    if (cursor && follower) {
        document.addEventListener('mousemove', (e) => {
            const { clientX: x, clientY: y } = e;
            
            cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            follower.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        });

        // Ховер-эффект для ссылок
        document.querySelectorAll('a, button, .project-frame').forEach(link => {
            link.addEventListener('mouseenter', () => {
                cursor.classList.add('hover');
                follower.classList.add('hover');
            });
            link.addEventListener('mouseleave', () => {
                cursor.classList.remove('hover');
                follower.classList.remove('hover');
            });
        });
    }
});