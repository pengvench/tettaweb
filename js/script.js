// js/script.js
import { initPreloader } from './loading.js';
import { VideoEngine } from './bg-engine.js';
import { cursor } from './cursor.js';  // ← ИМПОРТ КУРСОРА

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

        const now = new Date();
        const tomskTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tomsk' }));
        const hours = tomskTime.getHours();
        
        const isOpen = hours >= 10 && hours < 21;
        
        statusText.textContent = isOpen ? 'ОТКРЫТО (10:00 – 21:00)' : 'ЗАКРЫТО (10:00 – 21:00)';
        
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
            const rotate = Math.random() * 10 - 5;
            const scale = 0.92 + Math.random() * 0.16;
            piSymbol.style.transform = `rotate(${rotate}deg) scale(${scale})`;
        }, 100);
    }

    // ============================================
    // 3. ЗАГРУЗКА И ЗАПУСК
    // ============================================
    const isVideoReady = await engine.load();

    initPreloader(() => {
        if (isVideoReady) {
            engine.start();
        }
        console.log('%c Т Е Т Т А — СИСТЕМА ЗАПУЩЕНА ', 'background: #000; color: #00ff41; font-weight: bold;');
    });

    // ============================================
    // 4. КУРСОР — ИМПОРТИРОВАН ИЗ cursor.js
    // ============================================
    // (код курсора удалён, теперь работает через импорт)
});