document.addEventListener('DOMContentLoaded', () => {
    
    const preloader = document.querySelector('.preloader');
    const fullProgressFill = document.querySelector('.full-progress-fill');
    const loadingPercent = document.querySelector('.loading-percent');
    const fpsCurrent = document.querySelector('.fps-current');
    const fpsCounter = document.querySelector('.fps-counter');
    const navRevealElements = document.querySelectorAll('.nav-reveal');
    const consoleLog = document.getElementById('consoleLog');
    const body = document.body;

    let loadProgress = 0;
    let messageIndex = 0;
    let consoleInterval;

    // Массив консольных сообщений
    const consoleMessages = [
        { text: 'инициализация...', delay: 50 },
        { text: 'загрузка...', delay: 100 },
        { text: 'проверка...', delay: 150 },
        { text: 'пьём кофу ☕', delay: 200 },
        { text: 'режем рыбу 🐟', delay: 250 },
        { text: 'свет 💡', delay: 300 },
        { text: 'тренды 📈', delay: 350 },
        { text: 'сцена...', delay: 400 },
        { text: '4K рендер...', delay: 450 },
        { text: 'цвет...', delay: 500 },
        { text: 'экспорт...', delay: 550 },
        { text: 'Ctrl+S 💾', delay: 600 },
        { text: 'звук...', delay: 650 },
        { text: 'саспенс...', delay: 700 },
        { text: 'артефакты...', delay: 750 },
        { text: 'OK 😎', delay: 800 },
        { text: 'сервер...', delay: 850 },
        { text: 'почти...', delay: 900 },
        { text: 'правка...', delay: 950 },
        { text: 'композ...', delay: 1000 },
        { text: 'рендер...', delay: 1050 },
        { text: 'кадры...', delay: 1100 },
        { text: 'битрейт...', delay: 1150 },
        { text: 'LUT...', delay: 1200 },
        { text: 'ProRes...', delay: 1250 },
        { text: 'запуск!', delay: 1300 },
        { text: 'показ 🎬', delay: 1350 },
        { text: 'превью...', delay: 1400 },
        { text: 'OK...', delay: 1450 },
        { text: 'красота ✨', delay: 1500 }
    ];

    // Добавление строки в консоль
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
        
        if (consoleLog.children.length > 12) {
            consoleLog.removeChild(consoleLog.firstChild);
        }
    }

    // Зацикленная консоль
    function startConsoleLoop() {
        addConsoleLine(consoleMessages[messageIndex]);
        messageIndex++;
        
        if (messageIndex >= consoleMessages.length) {
            messageIndex = 0;
            consoleLog.innerHTML = '';
        }
        
        consoleInterval = setTimeout(startConsoleLoop, 150);
    }

    // Показ элементов навигации
    function revealNavElements(progress) {
        navRevealElements.forEach((el) => {
            const revealAt = parseInt(el.getAttribute('data-reveal'));
            if (progress >= revealAt && !el.classList.contains('revealed')) {
                el.classList.add('revealed');
            }
        });
    }

    // === СИМУЛЯЦИЯ ЗАГРУЗКИ ===
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

            // === ХАОТИЧНЫЙ FPS (случайная смена шрифта) ===
            if (fpsCurrent && fpsCounter) {
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
                
                // МЕНЯЕМ ШРИФТ У ВСЕГО БЛОКА FPS
                fpsCounter.style.fontStyle = fontStyle;
                fpsCounter.style.fontFamily = fontFamily;
            }

        }, 40);
    }

    // Завершение загрузки
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
    // ПРОВЕРКА ВРЕМЕНИ РАБОТЫ (Томск UTC+7)
    // ============================================
    function updateWorkStatus() {
        const statusText = document.getElementById('statusText');
        const statusDivider = document.querySelector('.nav-divider');
        
        if (!statusText || !statusDivider) return;

        const now = new Date();
        const tomskTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tomsk' }));
        
        const hours = tomskTime.getHours();
        const minutes = tomskTime.getMinutes();
        
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

    updateWorkStatus();
    setInterval(updateWorkStatus, 60000);

    console.log('%c Т Е Т Т А ', 'background: #0a0a0a; color: rgba(0, 150, 255, 0.8); font-size: 20px; padding: 10px; letter-spacing: 0.5em;');
    console.log('π здатый продакшн 🚀');
});