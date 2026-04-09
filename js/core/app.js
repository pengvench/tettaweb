window.scrollTo(0, 0);
if (history.scrollRestoration) history.scrollRestoration = 'manual';

let loadTelegramFeed = async () => {};
let initProjectVideos = async () => {};
let initProjectAnimations = () => {};
let initScrollStack = () => {};
let initPreloader = (cb) => { cb && cb(); };
let initStudioIntro = () => {};
let initSnakePopup = () => {};
let initShowcaseStack = () => {};
let VideoEngine = class { async load() { return false; } start() {} };

async function loadModules() {
    try {
        const m = await import('../sections/news-feed.js');
        loadTelegramFeed = m.loadTelegramFeed;
    } catch (e) { console.warn('[modules] news-feed:', e.message); }

    try {
        const m = await import('../sections/project-showcase.js');
        initProjectVideos = m.initProjectVideos;
        initProjectAnimations = m.initProjectAnimations;
    } catch (e) { console.warn('[modules] project-showcase:', e.message); }

    try {
        const m = await import('./scroll-stack.js');
        initScrollStack = m.initScrollStack;
    } catch (e) { console.warn('[modules] scroll-stack:', e.message); }

    try {
        const m = await import('./preloader.js');
        initPreloader = m.initPreloader;
    } catch (e) { console.warn('[modules] preloader:', e.message); }

    try {
        const m = await import('./background-engine.js');
        VideoEngine = m.VideoEngine;
    } catch (e) { console.warn('[modules] background-engine:', e.message); }

    try {
        const m = await import('../sections/studio-intro.js');
        initStudioIntro = m.initStudioIntro;
    } catch (e) { console.warn('[modules] studio-intro:', e.message); }

    try {
        const m = await import('../features/snake-popup.js');
        initSnakePopup = m.initSnakePopup;
    } catch (e) { console.warn('[modules] snake-popup:', e.message); }

    try {
        const m = await import('../sections/showcase-stack.js');
        initShowcaseStack = m.initShowcaseStack;
    } catch (e) { console.warn('[modules] showcase-stack:', e.message); }
}

const updateWorkStatus = () => {
    const statusText = document.getElementById('statusText');
    if (!statusText) return;

    const tomskTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tomsk' }));
    const isOpen = tomskTime.getHours() >= 10 && tomskTime.getHours() < 21;

    statusText.textContent = isOpen ? '\u041e\u0422\u041a\u0420\u042b\u0422\u041e (10:00 \u2013 21:00)' : '\u0417\u0410\u041a\u0420\u042b\u0422\u041e (10:00 \u2013 21:00)';
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
    if (heroTitle) heroTitle.classList.add('animate');

    setTimeout(() => {
        const slogan = document.querySelector('.hero-slogan');
        if (slogan) slogan.classList.add('animate');
    }, 140);

    setTimeout(() => {
        const links = document.querySelector('.hero-links');
        if (links) links.classList.add('animate');
    }, 420);
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

async function withTimeout(promise, timeoutMs, label) {
    let timeoutId = 0;

    const timeoutPromise = new Promise((resolve) => {
        timeoutId = window.setTimeout(() => {
            console.warn(`[boot] ${label} timeout after ${timeoutMs}ms`);
            resolve(null);
        }, timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeoutId) window.clearTimeout(timeoutId);
    }
}

(async () => {
    await loadModules();

    console.log('%c TETTA - system started ', 'background:#000;color:#00ff41;font-weight:bold');

    initLogo();
    initBurger();

    const engine = new VideoEngine();
    const videoPromise = engine.load();

    document.addEventListener('tetta:preloader-hidden', startHeroAnimations, { once: true });

    initPreloader(async () => {
        console.log('%c TETTA - system started ', 'background:#000;color:#00ff41;font-weight:bold');

        const bootTasks = [
            withTimeout((async () => {
                try {
                    const ok = await videoPromise;
                    if (ok) engine.start();
                } catch (e) {
                    console.warn('[engine]', e);
                }
            })(), 4500, 'background-engine'),
            withTimeout((async () => {
                try {
                    await initProjectVideos();
                } catch (e) {
                    console.warn('[project]', e);
                }
            })(), 5000, 'project-videos'),
            withTimeout((async () => {
                try {
                    await loadTelegramFeed();
                } catch (e) {
                    console.warn('[feed]', e);
                }
            })(), 3500, 'telegram-feed')
        ];

        await Promise.allSettled(bootTasks);

        initScrollStack();
        initStudioIntro();
        initProjectAnimations();
        initShowcaseStack();
        initSnakePopup();
        initCardEntrances();
    });
})();
