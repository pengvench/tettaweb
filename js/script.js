window.scrollTo(0, 0);
if (history.scrollRestoration) history.scrollRestoration = 'manual';

let loadTelegramFeed = async () => {};
let initProjectVideos = async () => {};
let initProjectAnimations = () => {};
let initScrollStack = () => {};
let initPreloader = (cb) => { cb && cb(); };
let initStudioIntro = () => {};
let initSnakePopup = () => {};
let VideoEngine = class { async load() { return false; } start() {} };

async function loadModules() {
    try {
        const m = await import('./telegram-feed.js');
        loadTelegramFeed = m.loadTelegramFeed;
    } catch (e) { console.warn('[modules] telegram-feed:', e.message); }

    try {
        const m = await import('./project-block.js');
        initProjectVideos = m.initProjectVideos;
        initProjectAnimations = m.initProjectAnimations;
    } catch (e) { console.warn('[modules] project-block:', e.message); }

    try {
        const m = await import('./scroll-stack.js');
        initScrollStack = m.initScrollStack;
    } catch (e) { console.warn('[modules] scroll-stack:', e.message); }

    try {
        const m = await import('./loading.js');
        initPreloader = m.initPreloader;
    } catch (e) { console.warn('[modules] loading:', e.message); }

    try {
        const m = await import('./bg-engine.js');
        VideoEngine = m.VideoEngine;
    } catch (e) { console.warn('[modules] bg-engine:', e.message); }

    try {
        const m = await import('./studio-intro.js');
        initStudioIntro = m.initStudioIntro;
    } catch (e) { console.warn('[modules] studio-intro:', e.message); }

    try {
        const m = await import('./snake-popup.js');
        initSnakePopup = m.initSnakePopup;
    } catch (e) { console.warn('[modules] snake-popup:', e.message); }
}

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

const piSymbol = document.querySelector('.pi-symbol');
if (piSymbol) {
    setTimeout(() => {
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

function startHeroAnimations() {
    setTimeout(() => {
        if (heroTitle) heroTitle.classList.add('animate');

        setTimeout(() => {
            const slogan = document.querySelector('.hero-slogan');
            if (slogan) slogan.classList.add('animate');
        }, 300);

        setTimeout(() => {
            const links = document.querySelector('.hero-links');
            if (links) links.classList.add('animate');
        }, 900);
    }, 200);
}

function initCardEntrances() {
    const block = document.querySelector('.project-block');
    if (!block) return;

    function check() {
        if (block.classList.contains('card-entered')) return;

        const scrollY = window.scrollY || window.pageYOffset;
        const vh = window.innerHeight;

        if (scrollY + vh > block.offsetTop - vh * 0.3) {
            block.classList.add('card-entered');
        }
    }

    window.addEventListener('scroll', check, { passive: true });
    check();
    setTimeout(check, 200);
}

function initBurger() {
    const burger = document.getElementById('navBurger');
    const popup = document.getElementById('navPopup');
    const mobileStatus = document.getElementById('mobileStatusText');

    if (!burger || !popup) return;

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

    popup.querySelectorAll('[data-close]').forEach(link => {
        link.addEventListener('click', () => {
            popup.classList.remove('open');
            burger.classList.remove('open');
            document.body.style.overflow = '';
        });
    });

    const syncMobileStatus = () => {
        const main = document.getElementById('statusText');
        if (main && mobileStatus) {
            mobileStatus.textContent = main.textContent;
            mobileStatus.style.color = main.style.color;
        }
    };

    setTimeout(syncMobileStatus, 500);
    setInterval(syncMobileStatus, 60000);
}

function initLogo() {
    const logoEl = document.querySelector('a.logo');
    if (!logoEl) return;

    logoEl.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

(async () => {
    await loadModules();

    console.log('%c Т Е Т Т А — модули загружены ', 'background:#000;color:#00ff41;font-weight:bold');

    initScrollStack();
    initLogo();
    initBurger();
    initStudioIntro();

    const engine = new VideoEngine();
    const videoPromise = engine.load();

    initPreloader(async () => {
        console.log('%c Т Е Т Т А — СИСТЕМА ЗАПУЩЕНА ', 'background:#000;color:#00ff41;font-weight:bold');

        loadTelegramFeed().catch(e => console.warn('[feed]', e));

        try {
            const ok = await videoPromise;
            if (ok) engine.start();
        } catch (e) { console.warn('[engine]', e); }

        startHeroAnimations();
        initSnakePopup();

        try { await initProjectVideos(); } catch (e) { console.warn('[project]', e); }
        initProjectAnimations();
        initCardEntrances();
    });
})();
