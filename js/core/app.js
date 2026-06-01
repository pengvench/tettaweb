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
let initPriceCalculator = () => {};
let VideoEngine = class { async load() { return false; } start() {} };
const ASSET_VERSION = '20260601-1';

async function loadModules() {
    await Promise.allSettled([
        import(`../sections/news-feed.js?v=${ASSET_VERSION}`)
            .then((m) => {
                loadTelegramFeed = m.loadTelegramFeed;
            })
            .catch((e) => console.warn('[modules] news-feed:', e.message)),

        import(`../sections/project-showcase.js?v=${ASSET_VERSION}`)
            .then((m) => {
                initProjectVideos = m.initProjectVideos;
                initProjectAnimations = m.initProjectAnimations;
            })
            .catch((e) => console.warn('[modules] project-showcase:', e.message)),

        import(`./scroll-stack.js?v=${ASSET_VERSION}`)
            .then((m) => {
                initScrollStack = m.initScrollStack;
            })
            .catch((e) => console.warn('[modules] scroll-stack:', e.message)),

        import(`./preloader.js?v=${ASSET_VERSION}`)
            .then((m) => {
                initPreloader = m.initPreloader;
            })
            .catch((e) => console.warn('[modules] preloader:', e.message)),

        import(`./background-engine.js?v=${ASSET_VERSION}`)
            .then((m) => {
                VideoEngine = m.VideoEngine;
            })
            .catch((e) => console.warn('[modules] background-engine:', e.message)),

        import(`../sections/studio-intro.js?v=${ASSET_VERSION}`)
            .then((m) => {
                initStudioIntro = m.initStudioIntro;
            })
            .catch((e) => console.warn('[modules] studio-intro:', e.message)),

        import(`../features/snake-popup.js?v=${ASSET_VERSION}`)
            .then((m) => {
                initSnakePopup = m.initSnakePopup;
            })
            .catch((e) => console.warn('[modules] snake-popup:', e.message)),

        import(`../sections/showcase-stack.js?v=${ASSET_VERSION}`)
            .then((m) => {
                initShowcaseStack = m.initShowcaseStack;
            })
            .catch((e) => console.warn('[modules] showcase-stack:', e.message)),

        import(`../sections/price-calculator.js?v=${ASSET_VERSION}`)
            .then((m) => {
                initPriceCalculator = m.initPriceCalculator;
            })
            .catch((e) => console.warn('[modules] price-calculator:', e.message))
    ]);
}

const updateWorkStatus = () => {
    const statusText = document.getElementById('statusText');
    if (!statusText) return;

    const tomskTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tomsk' }));
    const isOpen = tomskTime.getHours() >= 10 && tomskTime.getHours() < 21;

    statusText.textContent = isOpen ? '\u041e\u0422\u041a\u0420\u042b\u0422\u041e (10:00 \u2013 21:00)' : '\u0417\u0410\u041a\u0420\u042b\u0422\u041e (10:00 \u2013 21:00)';
    statusText.style.color = isOpen ? '#bafe00' : '#ff0407';
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

const imageExtensions = /\.(avif|webp|png|jpe?g|gif|svg)$/i;
let imageManifestPromise = null;

async function getImageManifest() {
    if (!imageManifestPromise) {
        const manifestSources = [`../../media.json?v=${ASSET_VERSION}`, '../../media.php'];

        imageManifestPromise = (async () => {
            for (const source of manifestSources) {
                const manifestUrl = new URL(source, import.meta.url);

                try {
                    const response = await fetch(manifestUrl.href, { cache: 'no-store' });
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);

                    const manifest = await response.json();
                    return Object.fromEntries(
                        Object.entries(manifest || {}).map(([key, items]) => [
                            key,
                            Array.isArray(items)
                                ? items.map((src) => new URL(src, manifestUrl).href)
                                : []
                        ])
                    );
                } catch (error) {
                    console.warn(`[assets] Cannot load ${source}:`, error.message);
                }
            }

            return {};
        })();
    }

    return imageManifestPromise;
}

async function listImageFolder(relativeFolder, manifestKey = '') {
    if (manifestKey) {
        const manifest = await getImageManifest();
        const files = manifest[manifestKey];
        if (Array.isArray(files) && files.length) return files;
    }

    const folderUrl = new URL(relativeFolder, import.meta.url);

    try {
        const response = await fetch(folderUrl.href, { cache: 'no-store' });
        if (!response.ok) return [];

        const html = await response.text();
        const documentHtml = new DOMParser().parseFromString(html, 'text/html');
        const urls = Array.from(documentHtml.querySelectorAll('a[href]'))
            .map((link) => link.getAttribute('href') || '')
            .filter((href) => imageExtensions.test(href.split('?')[0]))
            .map((href) => new URL(href, folderUrl).href);

        return Array.from(new Set(urls)).sort((a, b) => a.localeCompare(b, 'ru'));
    } catch (error) {
        console.warn(`[assets] Cannot list ${relativeFolder}:`, error.message);
        return [];
    }
}

function pickImage(images, avoid = '') {
    if (!images.length) return '';
    if (images.length === 1) return images[0];

    const blocked = avoid instanceof Set
        ? avoid
        : new Set(Array.isArray(avoid) ? avoid.filter(Boolean) : [avoid].filter(Boolean));
    const available = images.filter((src) => !blocked.has(src));
    const pool = available.length ? available : images;

    return pool[Math.floor(Math.random() * pool.length)];
}

function collectVisibleSources(registry) {
    const sources = new Set();
    registry.forEach((items) => {
        items.forEach((src) => {
            if (src) sources.add(src);
        });
    });
    return sources;
}

function observeMediaGroup(nodes) {
    let isVisible = true;

    if (!('IntersectionObserver' in window) || !nodes.length) {
        return () => isVisible;
    }

    const root = nodes[0].closest('.stack-card') || nodes[0];
    const observer = new IntersectionObserver((entries) => {
        isVisible = Boolean(entries[0]?.isIntersecting);
    }, {
        rootMargin: '160px 0px',
        threshold: 0.01
    });

    observer.observe(root);
    return () => isVisible;
}

async function initGraffitiOverlay() {
    const overlay = document.getElementById('graffitiOverlay');
    if (!overlay) return;

    const frames = await listImageFolder('../../img/graffiti/', 'graffiti');
    if (!frames.length) return;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    frames.forEach((src) => {
        const image = new Image();
        image.src = src;
    });

    let currentFrame = 0;
    let rafTick = 0;
    let latestScrollY = window.scrollY || window.pageYOffset || 0;
    let scrollIdleTimer = 0;
    let motionRafId = 0;
    let isScrolling = false;

    overlay.src = frames[currentFrame];

    const render = () => {
        latestScrollY = window.scrollY || window.pageYOffset || latestScrollY;
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const progress = Math.min(1, Math.max(0, latestScrollY / maxScroll));

        overlay.style.setProperty('--graffiti-x', `${52 + Math.sin(progress * Math.PI * 4.6) * 28}vw`);
        overlay.style.setProperty('--graffiti-y', `${20 + Math.cos(progress * Math.PI * 3.2) * 18}vh`);
        overlay.style.setProperty('--graffiti-rotate', `${-16 + progress * 42}deg`);
        overlay.style.setProperty('--graffiti-scale', `${0.82 + Math.sin(progress * Math.PI * 2) * 0.18}`);
        if (!isMobile) overlay.style.setProperty('--graffiti-hue', `${progress * 280}deg`);

        rafTick += 1;
        if (rafTick % 3 === 0) {
            currentFrame = (currentFrame + 1) % frames.length;
            overlay.src = frames[currentFrame];
        }
    };

    const stopMotion = () => {
        isScrolling = false;
        overlay.classList.remove('is-visible');
    };

    const tickMotion = () => {
        if (!isScrolling) {
            motionRafId = 0;
            return;
        }

        render();
        motionRafId = requestAnimationFrame(tickMotion);
    };

    const startMotion = () => {
        if (!motionRafId) motionRafId = requestAnimationFrame(tickMotion);
    };

    const syncFromScroll = () => {
        latestScrollY = window.scrollY || window.pageYOffset || 0;
        const shouldShow = latestScrollY > window.innerHeight * 0.28;

        isScrolling = shouldShow;
        overlay.classList.toggle('is-visible', shouldShow);
        if (shouldShow) {
            startMotion();
        } else {
            render();
        }

        if (scrollIdleTimer) window.clearTimeout(scrollIdleTimer);
        scrollIdleTimer = window.setTimeout(stopMotion, 220);
    };

    window.addEventListener('scroll', syncFromScroll, { passive: true });
    window.addEventListener('resize', syncFromScroll);
    syncFromScroll();
}

async function initContactMedia() {
    const cards = Array.from(document.querySelectorAll('[data-photo-card]'));
    if (!cards.length) return;
    const isGroupVisible = observeMediaGroup(cards);

    const [photos, icons] = await Promise.all([
        listImageFolder('../../img/photo/', 'photo'),
        listImageFolder('../../img/icon/', 'icon')
    ]);

    const findIcon = (channel) => {
        const normalized = channel.toLowerCase();

        return icons.find((src) => {
            const file = decodeURIComponent(src).toLowerCase();
            if (normalized === 'telegram') return file.includes('telegram') || file.includes('tg');
            if (normalized === 'email') return file.includes('email') || file.includes('mail') || file.includes('@') || file.includes('at-');
            return file.includes(normalized);
        }) || '';
    };

    const visiblePhotos = new Map();

    cards.forEach((card, index) => {
        const channel = card.getAttribute('data-contact-channel') || '';
        const icon = card.querySelector('[data-contact-icon]');
        const photoNodes = Array.from(card.querySelectorAll('.contact-card__photo'));

        if (icon) {
            const iconSrc = findIcon(channel);
            if (iconSrc) icon.src = iconSrc;
        }

        if (!photos.length || photoNodes.length < 2) return;

        let activeIndex = 0;
        let currentSrc = pickImage(photos, collectVisibleSources(visiblePhotos));
        visiblePhotos.set(card, new Set([currentSrc]));
        photoNodes[activeIndex].src = currentSrc;
        photoNodes[activeIndex].classList.add('is-active');

        window.setInterval(() => {
            if (!isGroupVisible()) return;

            const nextIndex = activeIndex === 0 ? 1 : 0;
            const blocked = collectVisibleSources(visiblePhotos);
            const nextSrc = pickImage(photos, blocked);

            photoNodes[nextIndex].src = nextSrc;
            visiblePhotos.set(card, new Set([currentSrc, nextSrc]));
            photoNodes[nextIndex].classList.add('is-active');
            photoNodes[activeIndex].classList.remove('is-active');

            window.setTimeout(() => {
                visiblePhotos.set(card, new Set([nextSrc]));
            }, 1300);

            activeIndex = nextIndex;
            currentSrc = nextSrc;
        }, 3200 + index * 520);
    });
}

async function initCornerAssets() {
    const nodes = Array.from(document.querySelectorAll('[data-asset-sprite]'));
    if (!nodes.length) return;
    const visibleBySection = new Map();

    const assets = await listImageFolder('../../img/assets/', 'assets');
    if (!assets.length) return;

    const visibleAssets = new Map();

    nodes.forEach((node, index) => {
        const root = node.closest('.stack-card') || node;
        if (!visibleBySection.has(root)) {
            visibleBySection.set(root, observeMediaGroup([node]));
        }

        let currentSrc = pickImage(assets, collectVisibleSources(visibleAssets));
        visibleAssets.set(node, new Set([currentSrc]));
        node.src = currentSrc;

        window.setInterval(() => {
            const isSectionVisible = visibleBySection.get(root);
            if (isSectionVisible && !isSectionVisible()) return;

            const nextSrc = pickImage(assets, collectVisibleSources(visibleAssets));

            node.classList.add('is-changing');
            visibleAssets.set(node, new Set([currentSrc, nextSrc]));
            window.setTimeout(() => {
                node.src = nextSrc;
                currentSrc = nextSrc;
                visibleAssets.set(node, new Set([currentSrc]));
                node.classList.remove('is-changing');
            }, 520);
        }, 4200 + index * 780);
    });
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

function initAnchorScroll() {
    const getStackCardTop = (stackCard) => {
        const cards = Array.from(document.querySelectorAll('.stack-wrapper > .stack-card'));
        let top = 0;

        for (const card of cards) {
            if (card === stackCard) return top;
            top += card.offsetHeight;
        }

        return stackCard.offsetTop;
    };

    const getAnchorTop = (target) => {
        if (target.classList.contains('stack-card')) return getStackCardTop(target);

        const stackCard = target.closest?.('.stack-wrapper > .stack-card');
        if (stackCard) return getStackCardTop(stackCard);

        return target.offsetTop || (target.getBoundingClientRect().top + window.scrollY);
    };

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener('click', (event) => {
            const hash = link.getAttribute('href') || '';
            const target = hash === '#' ? document.getElementById('hero') : document.querySelector(hash);
            if (!target) return;

            event.preventDefault();

            window.scrollTo({
                top: getAnchorTop(target),
                behavior: 'smooth'
            });
        });
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

    console.log('%c TETTA - system started ', 'background:#000;color:#bafe00;font-weight:bold');

    initLogo();
    initAnchorScroll();
    initBurger();

    const engine = new VideoEngine();
    const videoPromise = engine.load();

    document.addEventListener('tetta:preloader-hidden', startHeroAnimations, { once: true });

    initPreloader(async () => {
        console.log('%c TETTA - system started ', 'background:#000;color:#bafe00;font-weight:bold');

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
        initPriceCalculator();
        initCardEntrances();
        initDeferredSectionLoads();
        initGraffitiOverlay();
        initContactMedia();
        initCornerAssets();
    });
})();
