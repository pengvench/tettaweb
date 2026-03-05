document.addEventListener('DOMContentLoaded', () => {
    
    const preloader = document.querySelector('.preloader');
    const fullProgressFill = document.querySelector('.full-progress-fill');
    const loadingPercent = document.querySelector('.loading-percent');
    const fpsCurrent = document.querySelector('.fps-current');
    const navRevealElements = document.querySelectorAll('.nav-reveal');
    const consoleLog = document.getElementById('consoleLog');
    const body = document.body;

    let loadProgress = 0;
    let messageIndex = 0;
    let consoleInterval;

    // ============================================
    // МАССИВ КОНСОЛЬНЫХ СООБЩЕНИЙ (10 штук, развёрнутые)
    // ============================================
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

    // ============================================
    // ДОБАВЛЕНИЕ СТРОКИ В КОНСОЛЬ
    // ============================================
    function addConsoleLine(message) {
        const line = document.createElement('div');
        line.className = 'console-line';
        
        const timestamp = new Date().toLocaleTimeString('ru-RU', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        
        line.innerHTML = `
            <span class="timestamp">[${timestamp}]</span>
            <span class="prefix">></span>
            <span class="text">${message.text}</span>
        `;
        
        consoleLog.appendChild(line);
        consoleLog.scrollTop = consoleLog.scrollHeight;
    }

    // ============================================
    // ЗАЦИКЛЕННАЯ КОНСОЛЬ (10 строк за загрузку)
    // ============================================
    function startConsoleLoop() {
        // Показываем сообщение
        addConsoleLine(consoleMessages[messageIndex]);
        messageIndex++;
        
        // Если показали все 10 сообщений — останавливаемся
        if (messageIndex >= consoleMessages.length) {
            clearTimeout(consoleInterval);
            return;
        }
        
        // Следующее сообщение через 150ms
        consoleInterval = setTimeout(startConsoleLoop, 150);
    }

    // ============================================
    // ПОКАЗ ЭЛЕМЕНТОВ НАВИГАЦИИ
    // ============================================
    function revealNavElements(progress) {
        navRevealElements.forEach((el) => {
            const revealAt = parseInt(el.getAttribute('data-reveal'));
            if (progress >= revealAt && !el.classList.contains('revealed')) {
                el.classList.add('revealed');
            }
        });
    }

    // ============================================
    // СИМУЛЯЦИЯ ЗАГРУЗКИ
    // ============================================
    function simulateLoading() {
        startConsoleLoop();

        const interval = setInterval(() => {
            loadProgress += Math.random() * 5;
            
            if (loadProgress >= 100) {
                loadProgress = 100;
                clearInterval(interval);
                clearTimeout(consoleInterval);
                
                setTimeout(() => {
                    completeLoading();
                }, 300);
            }

            fullProgressFill.style.width = loadProgress + '%';
            loadingPercent.textContent = Math.floor(loadProgress) + '%';

            revealNavElements(loadProgress);

            // ============================================
            // ХАОТИЧНЫЙ FPS (смена шрифта ТОЛЬКО у цифры)
            // ============================================
            if (fpsCurrent) {
                let randomFPS, fontStyle, fontFamily;
                
                // Генерируем случайное число для выбора стиля (0, 1, или 2)
                const styleRandom = Math.floor(Math.random() * 3);
                
                if (loadProgress < 100) {
                    // Во время загрузки — хаотичная смена
                    randomFPS = Math.floor(Math.random() * 26); // 0-25 FPS
                    
                    if (styleRandom === 0) {
                        // Terminus Italic
                        fontStyle = 'italic';
                        fontFamily = "'Terminus', monospace";
                    } else if (styleRandom === 1) {
                        // Terminus Normal
                        fontStyle = 'normal';
                        fontFamily = "'Terminus', monospace";
                    } else {
                        // Helvetica Neue
                        fontStyle = 'normal';
                        fontFamily = "'Helvetica Neue', Arial, sans-serif";
                    }
                } else {
                    // Загрузка завершена — лагает 23-25 FPS, Helvetica
                    randomFPS = Math.floor(Math.random() * 3) + 23;
                    fontStyle = 'normal';
                    fontFamily = "'Helvetica Neue', Arial, sans-serif";
                }
                
                fpsCurrent.textContent = randomFPS;
                
                // МЕНЯЕМ ШРИФТ ТОЛЬКО У ЦИФРЫ (fps-current)
                fpsCurrent.style.fontStyle = fontStyle;
                fpsCurrent.style.fontFamily = fontFamily;
            }

        }, 40);
    }

    // ============================================
    // ЗАВЕРШЕНИЕ ЗАГРУЗКИ
    // ============================================
    function completeLoading() {
        preloader.classList.remove('visible');
        preloader.classList.add('hidden');
        
        body.classList.remove('loading');
        document.body.style.overflow = 'auto';

        setTimeout(() => {
            preloader.style.display = 'none';
        }, 1200);
    }

    preloader.classList.add('visible');
    simulateLoading();

    // ============================================
    // КАСТОМНЫЙ КУРСОР
    // ============================================
    const cursor = document.querySelector('.cursor');
    const cursorFollower = document.querySelector('.cursor-follower');
    const hoverElements = document.querySelectorAll('a, .btn, .project-frame, .hero-link, .view-project, .studio-link, .tag, .nav-link');

    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    let followerX = 0, followerY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animateCursor() {
        cursorX += (mouseX - cursorX) * 0.5;
        cursorY += (mouseY - cursorY) * 0.5;
        followerX += (mouseX - followerX) * 0.1;
        followerY += (mouseY - followerY) * 0.1;

        cursor.style.left = cursorX + 'px';
        cursor.style.top = cursorY + 'px';
        cursorFollower.style.left = followerX + 'px';
        cursorFollower.style.top = followerY + 'px';

        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.classList.add('hover');
            cursorFollower.classList.add('hover');
        });
        el.addEventListener('mouseleave', () => {
            cursor.classList.remove('hover');
            cursorFollower.classList.remove('hover');
        });
    });

    // ============================================
    // ПЛАВНЫЙ СКРОЛЛ
    // ============================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ============================================
    // HOVER ЭФФЕКТЫ ДЛЯ ПРОЕКТОВ
    // ============================================
    const projectFrames = document.querySelectorAll('.project-frame');

    projectFrames.forEach(frame => {
        frame.addEventListener('mousemove', (e) => {
            const rect = frame.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            
            const img = frame.querySelector('img');
            if (img) {
                img.style.transform = `scale(1.02) translate(${(x - 0.5) * 10}px, ${(y - 0.5) * 10}px)`;
            }
        });

        frame.addEventListener('mouseleave', () => {
            const img = frame.querySelector('img');
            if (img) {
                img.style.transform = 'scale(1) translate(0, 0)';
            }
        });
    });

    // ============================================
    // МАГНИТ-ЭФФЕКТ ДЛЯ КНОПОК
    // ============================================
    const buttons = document.querySelectorAll('.hero-link, .view-project, .studio-link');

    buttons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.05}px, ${y * 0.05}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0, 0)';
        });
    });

    // ============================================
    // АНИМАЦИЯ PI СИМВОЛА
    // ============================================
    const piSymbol = document.querySelector('.pi-symbol');
    
    if (piSymbol) {
        setInterval(() => {
            piSymbol.style.transform = `rotate(${Math.random() * 10 - 5}deg) scale(${0.95 + Math.random() * 0.1})`;
        }, 2000);
    }

    // ============================================
    // ПРОВЕРКА ВРЕМЕНИ РАБОТЫ (WorldTimeAPI + Томск UTC+7)
    // ============================================
    let serverTimeOffset = 0;
    let lastTimeSync = 0;

    async function syncServerTime() {
        try {
            const response = await fetch('https://worldtimeapi.org/api/timezone/Asia/Tomsk');
            const data = await response.json();
            
            const serverTime = new Date(data.datetime).getTime();
            const localTime = Date.now();
            
            serverTimeOffset = serverTime - localTime;
            lastTimeSync = Date.now();
            
            console.log('✅ Время синхронизировано с WorldTimeAPI');
            updateWorkStatus();
        } catch (error) {
            console.log('⚠️ Не удалось синхронизировать время, используем локальное');
            updateWorkStatus();
        }
    }

    function getAccurateTime() {
        if (Date.now() - lastTimeSync > 300000) {
            syncServerTime();
        }
        return new Date(Date.now() + serverTimeOffset);
    }

    function updateWorkStatus() {
        const statusText = document.getElementById('statusText');
        const statusDivider = document.querySelector('.nav-divider');
        
        if (!statusText || !statusDivider) return;

        const accurateTime = getAccurateTime();
        
        const hours = accurateTime.getHours();
        const minutes = accurateTime.getMinutes();
        
        const openHour = 10;
        const closeHour = 22;
        
        const currentTime = hours + minutes / 60;
        const isOpen = currentTime >= openHour && currentTime < closeHour;
        
        if (isOpen) {
            statusText.textContent = 'ОТКРЫТО (10–22)';
            statusText.className = 'nav-info nav-reveal open';
            statusDivider.className = 'nav-divider open';
        } else {
            if (currentTime < openHour) {
                statusText.textContent = `ЗАКРЫТО (откроется в ${openHour}:00)`;
            } else {
                statusText.textContent = 'ЗАКРЫТО (до 10:00)';
            }
            statusText.className = 'nav-info nav-reveal closed';
            statusDivider.className = 'nav-divider closed';
        }
    }

    syncServerTime();
    setInterval(syncServerTime, 300000);

    console.log('%c Т Е Т Т А ', 'background: #0a0a0a; color: rgba(0, 150, 255, 0.8); font-size: 20px; padding: 10px; letter-spacing: 0.5em;');
    console.log('π здатый продакшн 🚀');
});