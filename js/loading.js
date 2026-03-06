// loading.js
export function initPreloader(onComplete) {
    const preloader = document.querySelector('.preloader');
    const fullProgressFill = document.querySelector('.full-progress-fill');
    const loadingPercent = document.querySelector('.loading-percent');
    const fpsCurrent = document.querySelector('.fps-current');
    const consoleLog = document.getElementById('consoleLog');
    
    const fpsFonts = ['Terminus', 'Helvetica', 'Arial', 'Courier New', 'monospace'];
    let loadProgress = 0;
    let messageIndex = 0;

    // ТОТ САМЫЙ МАССИВ
    const consoleMessages = [
        { text: 'инициализация системных модулей...' },
        { text: 'загрузка медиа-ассетов и библиотек...' },
        { text: 'проверка видео-кодеков и контейнеров...' },
        { text: 'бариста готовит свежий кофе ☕' },
        { text: 'монтажёр режет рыбу на сцене 🐟' },
        { text: 'осветитель выставляет трёхточечный свет 💡' },
        { text: 'SMM-специалист мониторит тренды 📈' },
        { text: 'режиссёр настраивает композицию кадра...' },
        { text: 'рендеринг финального проекта в 4K...' },
        { text: 'колорист правит цвет и контраст...' }
    ];

    // Функция спама в консоль прелоадера
    function addConsoleLine() {
        if (messageIndex >= consoleMessages.length || !consoleLog) return;
        
        const line = document.createElement('div');
        line.className = 'console-line';
        const timestamp = new Date().toLocaleTimeString('ru-RU', { 
            hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });
        
        line.innerHTML = `<span class="timestamp">[${timestamp}]</span><span class="prefix">></span><span class="text">${consoleMessages[messageIndex].text}</span>`;
        consoleLog.appendChild(line);
        consoleLog.scrollTop = consoleLog.scrollHeight;
        
        messageIndex++;
        // Скорость появления строк (150мс)
        setTimeout(addConsoleLine, 150);
    }

    // Запускаем логи сразу
    addConsoleLine();

    const interval = setInterval(() => {
        loadProgress += Math.random() * 4;
        
        if (loadProgress >= 100) {
            loadProgress = 100;
            clearInterval(interval);
            setTimeout(() => {
                if (preloader) preloader.classList.add('hidden');
                document.body.classList.remove('loading');
                if (onComplete) onComplete();
            }, 500);
        }

        if (fullProgressFill) fullProgressFill.style.width = loadProgress + '%';
        if (loadingPercent) loadingPercent.textContent = Math.floor(loadProgress) + '%';
        
        // FPS ГЛИТЧ (Возвращен полностью)
        if (fpsCurrent) {
            let randomFPS = loadProgress < 100 ? Math.floor(Math.random() * 26) : Math.floor(Math.random() * 3) + 23;
            fpsCurrent.textContent = randomFPS;
            fpsCurrent.style.fontFamily = fpsFonts[Math.floor(Math.random() * fpsFonts.length)];
        }

        // Раскрытие навигации
        document.querySelectorAll('.nav-reveal').forEach(el => {
            const revealAt = parseInt(el.getAttribute('data-reveal'));
            if (loadProgress >= revealAt && !el.classList.contains('revealed')) {
                el.classList.add('revealed');
            }
        });
    }, 40);
}