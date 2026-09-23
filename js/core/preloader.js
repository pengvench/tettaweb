// js/core/preloader.js
import {
    loadSiteMediaManifest,
    preloadImageAsset,
    setImageElementSource
} from './video-cache.js?v=20260922-1';

const PRELOADER_SEEN_KEY = 'tetta:preloader-seen:v1';

function hasSeenPreloader() {
    try {
        return window.sessionStorage.getItem(PRELOADER_SEEN_KEY) === '1';
    } catch {
        return false;
    }
}

function markPreloaderSeen() {
    try {
        window.sessionStorage.setItem(PRELOADER_SEEN_KEY, '1');
    } catch {}
}

function getNavigationType() {
    const entry = performance.getEntriesByType?.('navigation')?.[0];
    if (entry?.type) return entry.type;

    const legacyType = performance.navigation?.type;
    if (legacyType === 1) return 'reload';
    if (legacyType === 2) return 'back_forward';
    return 'navigate';
}

function cameFromSameOrigin() {
    if (!document.referrer) return false;

    try {
        return new URL(document.referrer).origin === window.location.origin;
    } catch {
        return false;
    }
}

function shouldSkipPreloader() {
    if (!hasSeenPreloader()) return false;

    const navigationType = getNavigationType();
    if (navigationType === 'reload') return false;
    if (navigationType === 'back_forward') return true;

    return cameFromSameOrigin();
}

function revealNavigation() {
    document.querySelectorAll('.nav-reveal').forEach((node) => node.classList.add('revealed'));
}

export function initPreloader(onComplete) {
    console.log('[preloader] init start');

    const preloader      = document.querySelector('.preloader');
    const progressFill   = document.querySelector('.cam-progress-fill');
    const loadingPercent = document.querySelector('.cam-percent');
    const fpsCurrent     = document.querySelector('.fps-current');
    const asciiCanvas    = document.getElementById('ascii-canvas');
    const isMobilePreloader = window.matchMedia('(max-width: 768px), (hover: none), (pointer: coarse)').matches;

    console.log('[preloader] elements:', {
        preloader: !!preloader,
        progressFill: !!progressFill,
        loadingPercent: !!loadingPercent,
        fpsCurrent: !!fpsCurrent,
        asciiCanvas: !!asciiCanvas
    });

    if (!preloader || shouldSkipPreloader()) {
        revealNavigation();
        preloader?.classList.remove('visible');
        preloader?.classList.add('hidden');
        document.body.classList.remove('loading');
        document.documentElement.classList.remove('loading');

        Promise.resolve(onComplete?.())
            .catch((error) => console.warn('[preloader] onComplete error:', error))
            .finally(() => {
                document.dispatchEvent(new CustomEvent('tetta:preloader-hidden'));
            });
        return;
    }

    // Lock scroll on html as well (iOS viewport fix)
    document.documentElement.classList.add('loading');

    const fpsFonts = ['Terminus', 'Helvetica', 'Arial', 'Courier New', 'monospace',
                      'Georgia', 'Impact', 'Times New Roman', 'Verdana'];
    const revealNodes = Array.from(document.querySelectorAll('.nav-reveal'));
    let loadProgress = 0;
    let teaserTimer = 0;
    let progressTickCount = 0;

    // ---- ASCII T ----
    // Geometry is identical to desktop: a sparser point cloud (larger STEP)
    // leaves visible holes in the letter. Mobile perf is handled by the
    // frame throttle in drawFrame(), not by degrading the shape.
    const STEM_W = 6;
    const BAR_H = 9;
    const T_W = 20;
    const T_H = 30;
    const DEPTH = 10;
    const STEP = 1.1;
    let asciiW = 52, asciiH = 22;
    let animFrame;

    function calcSize() {
        const container = document.querySelector('.cam-ascii-center');
        const isMobile = window.innerWidth <= 768;
        const charW = isMobile ? 6 : 7.5;   // px per char; smaller on mobile
        const charH = isMobile ? 9 : 13;     // px per line

        if (container) {
            asciiW = Math.max(20, Math.floor(container.clientWidth  / charW));
            asciiH = Math.max(16, Math.floor(container.clientHeight / charH));
        } else {
            // fallback by window
            const frac = isMobile ? 0.88 : 0.5;
            asciiW = Math.max(20, Math.floor(window.innerWidth  * frac / charW));
            asciiH = Math.max(16, Math.floor(window.innerHeight * 0.55 / charH));
        }
    }

    function easeOutExpo(x) {
        return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    }

    function buildT() {
        const pts = [];
        const box = (x0, y0, w, h) => {
            for (let x = x0; x < x0 + w; x += STEP)
                for (let y = y0; y < y0 + h; y += STEP)
                    for (let z = -DEPTH / 2; z <= DEPTH / 2; z += STEP)
                        pts.push({ lx: x, ly: y, lz: z });
        };
        box(-T_W / 2, T_H / 2 - BAR_H, T_W, BAR_H);
        box(-STEM_W / 2, -T_H / 2, STEM_W, T_H - BAR_H);
        return pts;
    }

    const PTS = buildT();
    const T0  = Date.now();
    const DUR = 2200;
    const AX  = 20 * Math.PI / 180;
    const FINAL_ANGLE = 25 * Math.PI / 180;
    const FINAL_SCALE = 1.35;
    let finalPulseStart = 0;
    let glyphPhaseBase = 0;
    let lastAsciiDraw = 0;
    let asciiOutBuffer = [];
    let asciiZBuffer = new Float32Array(0);
    let asciiBufferSize = 0;

    function drawFrame(angleY, scale, glyphPhase = 0, shimmerAmount = 1) {
        const now = performance.now();
        const minGap = isMobilePreloader ? 42 : 48;
        if (minGap && now - lastAsciiDraw < minGap) return;

        lastAsciiDraw = now;
        draw(angleY, scale, glyphPhase, shimmerAmount);
    }

    function ensureAsciiBuffers(size) {
        if (asciiBufferSize !== size) {
            asciiBufferSize = size;
            asciiOutBuffer = new Array(size);
            asciiZBuffer = new Float32Array(size);
        }

        asciiOutBuffer.fill(' ');
        asciiZBuffer.fill(-Infinity);
    }

    function draw(angleY, scale, glyphPhase = 0, shimmerAmount = 1) {
        if (!asciiCanvas) return;
        const W = asciiW, H = asciiH;
        ensureAsciiBuffers(W * H);
        const out = asciiOutBuffer;
        const zbf = asciiZBuffer;

        for (const p of PTS) {
            const sx = p.lx * scale, sy = p.ly * scale, sz = p.lz * scale;
            const x1  =  sx * Math.cos(angleY) + sz * Math.sin(angleY);
            const z1  = -sx * Math.sin(angleY) + sz * Math.cos(angleY);
            const yF  =  sy * Math.cos(AX) - z1 * Math.sin(AX);
            const zF  =  sy * Math.sin(AX) + z1 * Math.cos(AX) + 100;
            const ooz = 1 / zF;
            const xp  = Math.floor(W / 2 + x1 * ooz * 160);
            const yp  = Math.floor(H / 2 - yF * ooz * 80);
            if (xp >= 0 && xp < W && yp >= 0 && yp < H) {
                const idx = xp + yp * W;
                if (ooz > zbf[idx]) {
                    zbf[idx] = ooz;
                    const chars = '.:!|/+=*0#%8';
                    const shade = Math.floor((z1 + (DEPTH * scale) / 2) / (DEPTH * scale) * 11);
                    const shimmer = shimmerAmount
                        ? Math.round(Math.sin(glyphPhase + xp * 0.45 + yp * 0.3 + z1 * 0.22) * 2 * shimmerAmount)
                        : 0;
                    const glyphIndex = Math.max(0, Math.min(chars.length - 1, shade + shimmer));
                    out[idx] = chars[glyphIndex];
                }
            }
        }
        const rows = [];
        for (let y = 0; y < H; y += 1) {
            rows.push(out.slice(y * W, y * W + W).join(''));
        }
        asciiCanvas.textContent = rows.join('\n');
    }

    function finalPulse(now) {
        if (!finalPulseStart) finalPulseStart = now;

        const elapsed = (now - finalPulseStart) / 1000;
        const blend = Math.min(elapsed / 0.9, 1);
        const easedBlend = easeOutExpo(blend);
        const scale = FINAL_SCALE * (1 + Math.sin(elapsed * 2.4) * 0.025 * easedBlend);
        const glyphPhase = glyphPhaseBase + elapsed * 9;

        drawFrame(FINAL_ANGLE, scale, glyphPhase, 1);
        animFrame = requestAnimationFrame(finalPulse);
    }

    function intro() {
        const elapsed = Date.now() - T0;
        const t = easeOutExpo(Math.min(elapsed / DUR, 1));
        const rawProgress = Math.min(elapsed / DUR, 1);
        const glyphPhase = rawProgress * 9;
        drawFrame(t * Math.PI * 2 + FINAL_ANGLE, 0.3 + 1.05 * t, glyphPhase, 1);
        if (t < 1) {
            animFrame = requestAnimationFrame(intro);
        } else {
            console.log('[preloader] intro done, locking final angle');
            finalPulseStart = 0;
            glyphPhaseBase = 9;
            animFrame = requestAnimationFrame(finalPulse);
        }
    }

    calcSize();
    window.addEventListener('resize', calcSize);

    console.log('[preloader] starting animation');
    requestAnimationFrame(() => requestAnimationFrame(intro));
    startPreloaderTeasers(preloader).then((timerId) => {
        teaserTimer = timerId || 0;
    });

    // ---- PROGRESS + FPS ----
    // rAF-прогресс вместо setInterval(82мс): темп детерминированный
    // (интро 2,2с + 600мс хвост), DOM трогаем только при смене целого
    // процента. Прежний интервал с Math.random() жил 3-5с и подменял
    // fontFamily каждый второй тик — принудительная компоновка на ровном
    // месте (layout thrashing из отчёта Lighthouse).
    const PROGRESS_DUR = DUR + 600;
    const PROGRESS_T0 = Date.now();
    let shownPercent = -1;
    let lastFpsUpdate = 0;

    console.log('[preloader] starting progress loop');
    const progressFrame = () => {
        const elapsed = Date.now() - PROGRESS_T0;
        const t = Math.min(elapsed / PROGRESS_DUR, 1);
        const eased = 1 - (1 - t) * (1 - t);
        loadProgress = eased * 100;

        const percent = Math.floor(loadProgress);
        if (percent !== shownPercent) {
            shownPercent = percent;
            if (progressFill) progressFill.style.height = percent + '%';
            if (loadingPercent) loadingPercent.textContent = percent + '%';

            revealNodes.forEach(el => {
                const at = parseInt(el.getAttribute('data-reveal'));
                if (loadProgress >= at && !el.classList.contains('revealed'))
                    el.classList.add('revealed');
            });
        }

        if (fpsCurrent) {
            const now = performance.now();
            if (now - lastFpsUpdate > 620) {
                lastFpsUpdate = now;
                const rFPS = loadProgress < 100
                    ? Math.floor(Math.random() * 26)
                    : Math.floor(Math.random() * 3) + 23;
                fpsCurrent.textContent = rFPS;

                // Шрифт-глитч только на десктопе: подмена fontFamily
                // триггерит пересчёт стилей, мобилке это не нужно.
                if (!isMobilePreloader) {
                    fpsCurrent.style.fontFamily = fpsFonts[Math.floor(Math.random() * fpsFonts.length)];
                }
            }
        }

        if (t < 1) {
            requestAnimationFrame(progressFrame);
            return;
        }

        console.log('[preloader] complete, hiding');
        if (teaserTimer) window.clearTimeout(teaserTimer);
        setTimeout(async () => {
            cancelAnimationFrame(animFrame);
            window.removeEventListener('resize', calcSize);

            // Прелоадер уходит детерминированно: хвост 350мс, фейд 0,6с,
            // unlock 700мс — итого ~3,8с от старта вместо прежних 5-9с.
            if (onComplete) {
                try {
                    await onComplete();
                } catch (error) {
                    console.warn('[preloader] onComplete error:', error);
                }
            }

            if (preloader) preloader.classList.add('hidden');
            markPreloaderSeen();
            document.dispatchEvent(new CustomEvent('tetta:preloader-hidden'));

            // Remove loading overflow only after transition end (0.6s).
            // This prevents viewport jumps while mobile browser UI appears.
            setTimeout(() => {
                document.body.classList.remove('loading');
                document.documentElement.classList.remove('loading');
            }, 700);

        }, 350);
    };
    requestAnimationFrame(progressFrame);

    console.log('[preloader] init done');
}

const PRELOADER_ASSET_VERSION = '20260923-3';

// Защита от «склеенных» манифестов: png+webp вперемешку → берём только webp
function preferWebp(list) {
    if (!Array.isArray(list) || !list.length) return [];
    const webpOnly = list.filter((src) => String(src).includes('.webp'));
    return webpOnly.length ? webpOnly : list;
}

async function startPreloaderTeasers(preloader) {
    if (!preloader || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;

    const manifest = await loadMediaManifest();
    const isMobile = window.innerWidth <= 768;
    const graffiti = preferWebp(Array.isArray(manifest.graffiti) ? manifest.graffiti : []);
    // Флэши на мобильных показываются максимум ~180px CSS — берем
    // 440px-варианты из img/graffiti/m/ (батч-3).
    const graffitiPool = isMobile
        ? graffiti.map((src) => src.replace('/img/graffiti/', '/img/graffiti/m/'))
        : graffiti;
    const sources = [
        ...graffitiPool,
        ...preferWebp(Array.isArray(manifest.assets) ? manifest.assets : [])
    ];

    if (!sources.length) return 0;

    const activeSources = isMobile ? sources.slice(0, 4) : sources.slice(0, 9);
    const preloadSources = isMobile ? activeSources.slice(0, 1) : activeSources.slice(0, 4);
    preloadSources.forEach((src) => preloadImageAsset(src));

    const flashes = Array.from({ length: isMobile ? 1 : 2 }, () => {
        const flash = document.createElement('img');
        flash.className = 'preloader-flash';
        flash.alt = '';
        flash.setAttribute('aria-hidden', 'true');
        preloader.insertBefore(flash, preloader.firstChild);
        return flash;
    });

    let timerId = 0;

    const showFlash = () => {
        if (!document.body.classList.contains('loading') || preloader.classList.contains('hidden')) {
            return;
        }

        const burstCount = isMobile ? 1 : 1 + Math.floor(Math.random() * 2);

        flashes.slice(0, burstCount).forEach((flash, index) => {
            flash.classList.remove('is-visible');
            setImageElementSource(flash, activeSources[Math.floor(Math.random() * activeSources.length)]);
            flash.style.setProperty('--flash-x', `${8 + Math.random() * 84}vw`);
            flash.style.setProperty('--flash-y', `${10 + Math.random() * 78}vh`);
            flash.style.setProperty('--flash-rotate', `${-18 + Math.random() * 36}deg`);
            flash.style.setProperty('--flash-scale', `${0.72 + Math.random() * 0.45}`);
            flash.style.setProperty('--flash-hue', `${Math.random() * 240}deg`);

            window.setTimeout(() => {
                requestAnimationFrame(() => {
                    flash.classList.add('is-visible');
                });
            }, index * 34);
        });

        timerId = window.setTimeout(showFlash, (isMobile ? 1180 : 740) + Math.random() * (isMobile ? 820 : 680));
    };

    timerId = window.setTimeout(showFlash, (isMobile ? 760 : 420) + Math.random() * (isMobile ? 620 : 440));
    return timerId;
}

async function loadMediaManifest() {
    try {
        const manifestUrl = new URL(`../../media.json?v=${PRELOADER_ASSET_VERSION}`, import.meta.url);
        return await loadSiteMediaManifest(manifestUrl.href, new URL('../../', import.meta.url).href, PRELOADER_ASSET_VERSION);
    } catch (error) {
        console.warn('[preloader] media manifest unavailable:', error.message);
        return {};
    }
}
