window.scrollTo(0, 0);
if (history.scrollRestoration) history.scrollRestoration = 'manual';

import { loadTelegramFeed } from './telegram-feed.js';
import { initProjectVideos, initProjectAnimations } from './project-block.js';
import { initScrollStack } from './scroll-stack.js';
import { initPreloader } from './loading.js';
import { VideoEngine } from './bg-engine.js';
import { cursor } from './cursor.js';

// ============================================
// 1. СТАТУС РАБОТЫ
// ============================================
const updateWorkStatus = () => {
    const statusText = document.getElementById('statusText');
    if (!statusText) return;
    const tomskTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tomsk' }));
    const isOpen = tomskTime.getHours() >= 10 && tomskTime.getHours() < 21;
    statusText.textContent = isOpen ? 'ОТКРЫТО (10:00 – 21:00)' : 'ЗАКРЫТО (10:00 – 21:00)';
    statusText.style.color = isOpen ? '#00ff41' : '#ff0000';
    statusText.classList.toggle('open', isOpen);
    statusText.classList.toggle('closed', !isOpen);
};
updateWorkStatus();
setInterval(updateWorkStatus, 60000);

// ============================================
// 2. PI-SHAKE
// ============================================
// Pi shake — запускается после завершения transition появления
const piSymbol = document.querySelector('.pi-symbol');
if (piSymbol) {
    setTimeout(() => {
        // Убираем transition чтобы shake был резким
        piSymbol.style.transition = 'none';
        setInterval(() => {
            const rotate = (Math.random() - 0.5) * 16;
            const scaleX = 0.86 + Math.random() * 0.28;
            const scaleY = 0.86 + Math.random() * 0.28;
            const tx = (Math.random() - 0.5) * 4;
            const ty = (Math.random() - 0.5) * 4;
            piSymbol.style.transform =
                `translate(${tx}px, ${ty}px) rotate(${rotate}deg) scale(${scaleX}, ${scaleY})`;
        }, 180);
    }, 1600);
}

// ============================================
// 3. ПОДГОТОВКА БУКВ ТЕТТА ДЛЯ АНИМАЦИИ
// ============================================
const heroTitle = document.querySelector('.hero-title');
if (heroTitle) {
    const text = heroTitle.textContent.trim();
    heroTitle.innerHTML = text
        .split('')
        .map(ch => ch === ' '
            ? '<span class="letter" style="display:inline-block;width:0.35em"> </span>'
            : `<span class="letter">${ch}</span>`)
        .join('');
}

// ============================================
// 4. ЗАПУСК HERO-АНИМАЦИЙ ПОСЛЕ ПРЕЛОАДЕРА
// ============================================
function startHeroAnimations() {
    // Небольшая задержка после исчезновения прелоадера
    setTimeout(() => {
        // 1. ТЕТТА — буквы влетают
        if (heroTitle) heroTitle.classList.add('animate');

        // 2. Слоган — печатная машинка (с задержкой)
        setTimeout(() => {
            const slogan = document.querySelector('.hero-slogan');
            if (slogan) slogan.classList.add('animate');
        }, 300);

        // 3. Кнопки — fade up (ещё позже)
        setTimeout(() => {
            const links = document.querySelector('.hero-links');
            if (links) links.classList.add('animate');
        }, 900);
    }, 200);
}

// ============================================
// 5. ПРЕЛОАДЕР + ВИДЕО
// ============================================
const engine = new VideoEngine();
const videoPromise = engine.load();

// =============================================
// ГЛОБАЛЬНАЯ АНИМАЦИЯ ПОЯВЛЕНИЯ БЛОКОВ
// scroll-based trigger (не IntersectionObserver)
// =============================================
function initCardEntrances() {
    // Только project-block нужен card-entered (у него своя entrance анимация)
    // Остальные stack-card сами работают через sticky
    const block = document.querySelector('.project-block');
    if (!block) return;

    function check() {
        const scrollY = window.scrollY || window.pageYOffset;
        const vh = window.innerHeight;
        if (block.classList.contains('card-entered')) return;
        if (scrollY + vh > block.offsetTop - vh * 0.3) {
            block.classList.add('card-entered');
        }
    }

    window.addEventListener('scroll', check, { passive: true });
    check();
    setTimeout(check, 200);
}

initScrollStack();

// Логотип — ручной скролл наверх
const logoEl = document.querySelector('a.logo');
if (logoEl) {
    logoEl.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

initPreloader(async () => {
    loadTelegramFeed();
    console.log('%c Т Е Т Т А — СИСТЕМА ЗАПУЩЕНА ', 'background:#000;color:#00ff41;font-weight:bold');
    const ok = await videoPromise;
    if (ok) engine.start();
    startHeroAnimations();
    initProjectVideos();
    initProjectAnimations();
    initCardEntrances();
});

// ============================================
// МОБИЛЬНЫЙ БУРГЕР
// ============================================
const burger  = document.getElementById('navBurger');
const popup   = document.getElementById('navPopup');
const mobileStatus = document.getElementById('mobileStatusText');

if (burger && popup) {
    burger.addEventListener('click', () => {
        const isOpen = popup.classList.contains('open');
        if (isOpen) {
            popup.classList.remove('open');
            burger.classList.remove('open');
            document.body.style.overflow = '';
        } else {
            popup.classList.add('open');
            burger.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    });

    // Закрытие по ссылке
    popup.querySelectorAll('[data-close]').forEach(link => {
        link.addEventListener('click', () => {
            popup.classList.remove('open');
            burger.classList.remove('open');
            document.body.style.overflow = '';
        });
    });

    // Дублируем статус в мобильный попап
    const syncMobileStatus = () => {
        const main = document.getElementById('statusText');
        if (main && mobileStatus) {
            mobileStatus.textContent  = main.textContent;
            mobileStatus.style.color  = main.style.color;
        }
    };
    setTimeout(syncMobileStatus, 500);
    setInterval(syncMobileStatus, 60000);
}