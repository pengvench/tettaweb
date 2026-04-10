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
    await Promise.allSettled([
        import('../sections/news-feed.js')
            .then((m) => {
                loadTelegramFeed = m.loadTelegramFeed;
            })
            .catch((e) => console.warn('[modules] news-feed:', e.message)),

        import('../sections/project-showcase.js')
            .then((m) => {
                initProjectVideos = m.initProjectVideos;
                initProjectAnimations = m.initProjectAnimations;
            })
            .catch((e) => console.warn('[modules] project-showcase:', e.message)),

        import('./scroll-stack.js')
            .then((m) => {
                initScrollStack = m.initScrollStack;
            })
            .catch((e) => console.warn('[modules] scroll-stack:', e.message)),

        import('./preloader.js')
            .then((m) => {
                initPreloader = m.initPreloader;
            })
            .catch((e) => console.warn('[modules] preloader:', e.message)),

        import('./background-engine.js')
            .then((m) => {
                VideoEngine = m.VideoEngine;
            })
            .catch((e) => console.warn('[modules] background-engine:', e.message)),

        import('../sections/studio-intro.js')
            .then((m) => {
                initStudioIntro = m.initStudioIntro;
            })
            .catch((e) => console.warn('[modules] studio-intro:', e.message)),

        import('../features/snake-popup.js')
            .then((m) => {
                initSnakePopup = m.initSnakePopup;
            })
            .catch((e) => console.warn('[modules] snake-popup:', e.message)),

        import('../sections/showcase-stack.js')
            .then((m) => {
                initShowcaseStack = m.initShowcaseStack;
            })
            .catch((e) => console.warn('[modules] showcase-stack:', e.message))
    ]);
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

let projectVideosPromise = null;
let telegramFeedPromise = null;
let showcaseStackInitialized = false;

function ensureProjectVideos() {
    if (!projectVideosPromise) {
        projectVideosPromise = initProjectVideos().catch((error) => {
            console.warn('[project]', error);
            return null;
        });
    }

    return projectVideosPromise;
}

function ensureTelegramFeed() {
    if (!telegramFeedPromise) {
        telegramFeedPromise = loadTelegramFeed().catch((error) => {
            console.warn('[feed]', error);
            return null;
        });
    }

    return telegramFeedPromise;
}

function ensureShowcaseStack() {
    if (showcaseStackInitialized) return;
    showcaseStackInitialized = true;

    try {
        initShowcaseStack();
    } catch (error) {
        console.warn('[showcase]', error);
    }
}

function initDeferredSectionLoads() {
    const observeOnce = (selector, callback, rootMargin = '150% 0px') => {
        const element = document.querySelector(selector);
        if (!element) return;

        let done = false;
        let observer = null;

        const run = () => {
            if (done) return;
            done = true;
            observer?.disconnect();
            callback();
        };

        if (!('IntersectionObserver' in window)) {
            run();
            return;
        }

        observer = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting) run();
        }, {
            rootMargin,
            threshold: 0
        });

        observer.observe(element);
    };

    observeOnce('#work', () => {
        ensureProjectVideos();
    }, '80% 0px');

    observeOnce('#more-projects', () => {
        ensureShowcaseStack();
    }, '140% 0px');

    observeOnce('#request', () => {
        ensureShowcaseStack();
    }, '160% 0px');

    observeOnce('#news', () => {
        ensureTelegramFeed();
    }, '120% 0px');
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

        await withTimeout((async () => {
            try {
                const ok = await videoPromise;
                if (ok) engine.start();
            } catch (e) {
                console.warn('[engine]', e);
            }
        })(), 2200, 'background-engine');

        initScrollStack();
        initStudioIntro();
        initProjectAnimations();
        initSnakePopup();
        initCardEntrances();
        initDeferredSectionLoads();
    });
})();
