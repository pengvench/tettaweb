const STORE_KEY = '__tettaMediaCacheV2';
const YANDEX_STORAGE_HOST = 'storage.yandexcloud.net';
const YANDEX_PROJECT_PREFIX = '/tetta-videos/projects/';
const YANDEX_PROBE_TIMEOUT_MS = 2200;

const store = window[STORE_KEY] || {
    manifestPromises: new Map(),
    mediaManifestPromises: new Map(),
    imagePromises: new Map(),
    warmSources: new Set(),
    elementState: new WeakMap(),
    yandexAccessState: null,
    yandexAccessPromise: null
};

window[STORE_KEY] = store;

export function resolveVideoSource(src, base = document.baseURI) {
    if (!src) return '';
    try {
        return new URL(src, base).href;
    } catch (error) {
        return src;
    }
}

export function isVideoFile(src) {
    return /\.(webm|mp4|ogg)([?#].*)?$/i.test(src || '');
}

export function resolveMediaSource(src, base = document.baseURI) {
    return resolveVideoSource(src, base);
}

export function getMediaCacheKey(src, base = document.baseURI) {
    const resolved = resolveVideoSource(src, base);

    try {
        const url = new URL(resolved);
        url.search = '';
        url.hash = '';
        return url.href;
    } catch (error) {
        return resolved.split('?')[0];
    }
}

function resolveCandidate(src, base = document.baseURI) {
    const primary = resolveVideoSource(src, base);
    const key = getMediaCacheKey(primary, base);
    const fallback = getLocalVideoFallback(primary);

    return {
        primary,
        fallback,
        active: fallback && store.yandexAccessState === false ? fallback : primary,
        key,
        fallbackKey: fallback ? getMediaCacheKey(fallback) : '',
        needsYandexAccess: Boolean(fallback && isYandexProjectVideo(primary))
    };
}

function isYandexProjectVideo(src) {
    try {
        const url = new URL(resolveVideoSource(src, document.baseURI));
        return url.hostname === YANDEX_STORAGE_HOST
            && url.pathname.startsWith(YANDEX_PROJECT_PREFIX)
            && isVideoFile(url.pathname);
    } catch (error) {
        return false;
    }
}

function getLocalVideoFallback(src) {
    if (!isYandexProjectVideo(src)) return '';

    try {
        const url = new URL(resolveVideoSource(src, document.baseURI));
        const projectPath = url.pathname.slice(YANDEX_PROJECT_PREFIX.length);
        const previewPath = projectPath.startsWith('previews/')
            ? projectPath
            : `previews/${projectPath}`;
        const localPath = `/projects/${previewPath}`;
        return new URL(localPath, document.baseURI).href;
    } catch (error) {
        return '';
    }
}

function hasUsableVideoSource(video, src) {
    if (!video || !src) return false;
    const current = video.currentSrc || video.src || video.dataset.src || '';
    return current === src && video.readyState > 0;
}

function shouldWaitForYandexProbe(video, candidate) {
    if (!candidate.needsYandexAccess || store.yandexAccessState !== null) return false;
    if (store.warmSources.has(candidate.primary) || store.warmSources.has(candidate.key)) return false;
    return !hasUsableVideoSource(video, candidate.primary);
}

function ensureYandexAccess(probeSrc = '') {
    if (store.yandexAccessState !== null) {
        return Promise.resolve(store.yandexAccessState);
    }

    if (store.yandexAccessPromise) {
        return store.yandexAccessPromise;
    }

    store.yandexAccessPromise = probeYandexAccess(probeSrc)
        .then((available) => {
            if (store.yandexAccessState === false) return false;
            store.yandexAccessState = available;
            return available;
        })
        .catch(() => {
            store.yandexAccessState = false;
            return false;
        });

    return store.yandexAccessPromise;
}

async function probeYandexAccess(probeSrc = '') {
    const src = isYandexProjectVideo(probeSrc)
        ? resolveVideoSource(probeSrc, document.baseURI)
        : 'https://storage.yandexcloud.net/tetta-videos/projects/sudvesn.webm';
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), YANDEX_PROBE_TIMEOUT_MS);

    try {
        await fetch(src, {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'force-cache',
            signal: controller.signal
        });
        return true;
    } catch (error) {
        return false;
    } finally {
        window.clearTimeout(timeoutId);
    }
}

export async function loadProjectManifest(projectsUrl = './projects/backgrounds.json', projectBase = './projects/') {
    const manifestUrl = resolveVideoSource(projectsUrl, document.baseURI);
    if (!store.manifestPromises.has(manifestUrl)) {
        store.manifestPromises.set(manifestUrl, fetch(manifestUrl, { cache: 'force-cache' })
            .then((response) => {
                if (!response.ok) throw new Error('backgrounds.json not found');
                return response.json();
            })
            .then((data) => normalizeProjectManifest(data, projectBase))
        );
    }

    return store.manifestPromises.get(manifestUrl);
}

export async function loadSiteMediaManifest(manifestSource, assetBase, version = '') {
    const manifestUrl = resolveVideoSource(manifestSource, document.baseURI);
    const baseUrl = resolveVideoSource(assetBase, manifestUrl);
    const cacheKey = `${manifestUrl}::${baseUrl}::${version}`;

    if (!store.mediaManifestPromises.has(cacheKey)) {
        store.mediaManifestPromises.set(cacheKey, fetch(manifestUrl, { cache: 'force-cache' })
            .then((response) => {
                if (!response.ok) throw new Error(`media manifest not found: ${response.status}`);
                return response.json();
            })
            .then((manifest) => Object.fromEntries(
                Object.entries(manifest || {}).map(([key, items]) => [
                    key,
                    Array.isArray(items)
                        ? items.map((src) => versionAsset(resolveMediaSource(src, baseUrl), version))
                        : []
                ])
            ))
        );
    }

    return store.mediaManifestPromises.get(cacheKey);
}

export function versionAsset(src, version = '') {
    const resolved = resolveMediaSource(src, document.baseURI);
    if (!version) return resolved;

    try {
        const url = new URL(resolved);
        if (!url.searchParams.has('v')) url.searchParams.set('v', version);
        return url.href;
    } catch (error) {
        return `${resolved}${resolved.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}`;
    }
}

export function normalizeProjectManifest(data = {}, projectBase = './projects/') {
    const baseUrl = resolveVideoSource(projectBase, document.baseURI);
    const projects = Array.isArray(data.projects)
        ? data.projects.map((project) => normalizeProject(project, baseUrl))
        : [];
    const backgrounds = Array.isArray(data.backgrounds)
        ? data.backgrounds.map((src) => resolveVideoSource(src, baseUrl))
        : [];

    const allSources = new Set();
    projects.forEach((project) => {
        ['src', 'previewSrc', 'playerSrc'].forEach((key) => {
            if (project[key]) allSources.add(project[key]);
        });
    });
    backgrounds.forEach((src) => allSources.add(src));

    return {
        ...data,
        projects,
        backgrounds,
        allSources: Array.from(allSources)
    };
}

export function configureInlineVideo(video, label = '') {
    if (!video || video.tagName !== 'VIDEO') return;

    ensureVideoCacheListeners(video);
    video.controls = false;
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    // FPS-фикс: autoplay запрещён. Иначе видео, получив данные (preload='auto'),
    // запускаются браузером сами — мимо очереди play/pause из sync-функций,
    // и на странице одновременно крутятся 3-4 программных декодера VP9.
    video.autoplay = false;
    video.disablePictureInPicture = true;
    video.removeAttribute('controls');
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.removeAttribute('autoplay');
    video.setAttribute('disableremoteplayback', '');
    video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback nofullscreen');
    if (label) video.setAttribute('aria-label', label);
}

function configureModalVideo(video) {
    if (!video || video.tagName !== 'VIDEO') return;

    ensureVideoCacheListeners(video);
    video.controls = true;
    video.muted = false;
    video.defaultMuted = false;
    video.loop = false;
    video.autoplay = false;
    video.playsInline = true;
    video.disablePictureInPicture = false;
    video.setAttribute('controls', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.removeAttribute('muted');
    video.removeAttribute('loop');
    video.removeAttribute('autoplay');
    video.removeAttribute('disableremoteplayback');
    video.removeAttribute('controlslist');
}

function ensureVideoCacheListeners(video) {
    if (!video || video.tagName !== 'VIDEO') return;
    if (video.dataset.videoCacheReady === 'true') return;
    video.dataset.videoCacheReady = 'true';

    ['loadedmetadata', 'loadeddata', 'canplay'].forEach((eventName) => {
        video.addEventListener(eventName, () => markVideoWarm(video.currentSrc || video.src || video.dataset.src), { passive: true });
    });

    video.addEventListener('error', () => switchVideoToFallback(video), { passive: true });
}

export function hydrateVideoElement(video, preload = 'metadata', explicitSrc = '', options = {}) {
    if (!video) return false;

    if (video.tagName !== 'VIDEO') {
        const iframeSrc = resolveVideoSource(explicitSrc || video.dataset.src || video.getAttribute('src') || '');
        if (iframeSrc && video.getAttribute('src') !== iframeSrc) {
            video.src = iframeSrc;
        }
        return Boolean(iframeSrc);
    }

    const inline = options.inline !== false;
    if (inline) {
        configureInlineVideo(video);
    } else {
        configureModalVideo(video);
    }

    const originalSrc = explicitSrc || video.dataset.mediaOriginalSrc || video.dataset.src || video.getAttribute('src') || '';
    if (!originalSrc) return false;

    if (explicitSrc || !video.dataset.mediaOriginalSrc) video.dataset.mediaOriginalSrc = originalSrc;
    const candidate = resolveCandidate(originalSrc);

    if (shouldWaitForYandexProbe(video, candidate)) {
        video.dataset.src = candidate.primary;
        if (video.preload !== preload) video.preload = preload;
        store.elementState.set(video, {
            src: '',
            originalSrc,
            preload,
            key: candidate.key,
            primary: candidate.primary,
            fallback: candidate.fallback,
            pendingYandexProbe: true,
            inline
        });

        ensureYandexAccess(candidate.primary).then(() => {
            const state = store.elementState.get(video);
            if (!state || state.originalSrc !== originalSrc || !state.pendingYandexProbe) return;
            hydrateVideoElement(video, state.preload, state.originalSrc, { inline: state.inline !== false });
            if (state.preload === 'auto') {
                video.play().catch(() => {});
            }
        });

        return true;
    }

    const source = candidate.active;
    const previous = store.elementState.get(video) || {};
    const hasSameSource = previous.src === source && video.getAttribute('src') === source;
    const activeKey = source === candidate.fallback ? candidate.fallbackKey : candidate.key;
    const sourceIsWarm = store.warmSources.has(source) || store.warmSources.has(activeKey);
    const shouldLoad = !hasSameSource && preload !== 'none' && !sourceIsWarm;

    video.dataset.src = source;
    if (!hasSameSource) {
        video.src = source;
    }

    if (video.preload !== preload) {
        video.preload = preload;
    }

    store.elementState.set(video, {
        src: source,
        originalSrc,
        preload,
        key: candidate.key,
        activeKey,
        primary: candidate.primary,
        fallback: candidate.fallback,
        pendingYandexProbe: false,
        inline
    });

    if (shouldLoad || (preload !== 'none' && video.readyState === 0 && !sourceIsWarm)) {
        video.load();
    }

    return true;
}

function switchVideoToFallback(video) {
    if (!video || video.tagName !== 'VIDEO') return;

    const state = store.elementState.get(video);
    if (!state?.fallback || state.src === state.fallback) return;

    const currentSrc = video.currentSrc || video.src || video.dataset.src || '';
    if (currentSrc && currentSrc !== state.primary) return;

    store.yandexAccessState = false;
    video.dataset.src = state.fallback;
    video.src = state.fallback;

    store.elementState.set(video, {
        ...state,
        src: state.fallback,
        activeKey: getMediaCacheKey(state.fallback),
        pendingYandexProbe: false
    });

    if (state.preload !== 'none') {
        video.load();
        if (state.preload === 'auto') {
            video.play().catch(() => {});
        }
    }
}

// ============================================================================
// Стек-перекрытие (.stack-card)
// Карточки стека — position: sticky; top: 0. «Прилипшая» карточка остается
// внутри вьюпорта до конца страницы, поэтому IntersectionObserver считает её
// видимой (ratio ~ 1) даже когда её полностью закрыла следующая карточка.
// Из-за этого видео под закрытыми карточками продолжали декодироваться на
// каждом кадре — основной источник просадки FPS. Считаем реальную видимость
// сами: карточка закрыта, когда следующая карточка стека дошла до верха
// экрана (её верх <= 10% высоты вьюпорта).
// ============================================================================

const stackVisibility = {
    subscribers: new Map(),
    covered: new WeakMap(),
    rafId: 0,
    listening: false
};

function getNextStackCard(card) {
    let sibling = card.nextElementSibling;
    while (sibling && !sibling.classList.contains('stack-card')) {
        sibling = sibling.nextElementSibling;
    }
    return sibling;
}

function runStackVisibilityCheck() {
    stackVisibility.rafId = 0;
    const viewportHeight = window.innerHeight;

    stackVisibility.subscribers.forEach((callback, card) => {
        if (!card.isConnected) {
            stackVisibility.subscribers.delete(card);
            return;
        }

        const next = getNextStackCard(card);
        const nextTop = next ? next.getBoundingClientRect().top : Infinity;
        const isCovered = nextTop <= viewportHeight * 0.1;
        const previous = stackVisibility.covered.get(card);

        if (previous === isCovered) return;
        stackVisibility.covered.set(card, isCovered);
        callback(isCovered);
    });
}

function scheduleStackVisibilityCheck() {
    if (!stackVisibility.listening) {
        stackVisibility.listening = true;
        window.addEventListener('scroll', scheduleStackVisibilityCheck, { passive: true });
        window.addEventListener('resize', scheduleStackVisibilityCheck, { passive: true });
    }
    if (stackVisibility.rafId) return;
    stackVisibility.rafId = window.requestAnimationFrame(runStackVisibilityCheck);
}

export function watchStackCardVisibility(card, callback) {
    if (!card || typeof callback !== 'function') return () => {};
    stackVisibility.subscribers.set(card, callback);
    scheduleStackVisibilityCheck();

    return () => stackVisibility.subscribers.delete(card);
}

// Ждём, пока у видео декодирован первый кадр (readyState >= 2 —
// HAVE_CURRENT_DATA). Нужно для последовательной предзагрузки:
// «подгрузить и паузить», не устраивая конкуренцию за канал.
export function waitForVideoData(video, timeoutMs = 8000) {
    return new Promise((resolve) => {
        if (!video || video.tagName !== 'VIDEO') {
            resolve(false);
            return;
        }
        if (video.readyState >= 2) {
            resolve(true);
            return;
        }

        let settled = false;
        const settle = (ok) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timerId);
            video.removeEventListener('loadeddata', onData);
            video.removeEventListener('error', onError);
            resolve(ok);
        };

        const onData = () => settle(true);
        const onError = () => settle(false);
        const timerId = window.setTimeout(() => settle(video.readyState >= 2), timeoutMs);

        video.addEventListener('loadeddata', onData, { passive: true });
        video.addEventListener('error', onError, { passive: true });
    });
}

export function releaseVideoElement(video, options = {}) {
    if (!video) return;

    const removeSrc = Boolean(options.removeSrc);

    if (video.tagName !== 'VIDEO') {
        if (removeSrc) video.removeAttribute('src');
        return;
    }

    video.pause();
    video.preload = 'none';

    const currentSrc = video.currentSrc || video.src || video.dataset.src;
    if (currentSrc) markVideoWarm(currentSrc);

    if (removeSrc) {
        video.removeAttribute('src');
        store.elementState.delete(video);
    }
}

export function openModalVideo(video, src) {
    if (!video || !src) return false;

    hydrateVideoElement(video, 'auto', src, { inline: false });
    if (video.tagName === 'VIDEO') {
        try {
            video.currentTime = 0;
        } catch (error) {
            // Some browsers disallow seeking before metadata; playback still starts.
        }
        video.play().catch(() => {});
    }

    return true;
}

export function closeModalVideo(video) {
    releaseVideoElement(video, { removeSrc: false });
}

export function markVideoWarm(src) {
    const resolvedSrc = resolveVideoSource(src, document.baseURI);
    if (!resolvedSrc) return;

    store.warmSources.add(resolvedSrc);
    store.warmSources.add(getMediaCacheKey(resolvedSrc));
}

export function preloadImageAsset(src) {
    const resolvedSrc = resolveMediaSource(src, document.baseURI);
    if (!resolvedSrc) return Promise.resolve('');

    const key = getMediaCacheKey(resolvedSrc);
    if (!store.imagePromises.has(key)) {
        store.imagePromises.set(key, new Promise((resolve, reject) => {
            const image = new Image();
            image.decoding = 'async';
            image.onload = () => {
                store.warmSources.add(resolvedSrc);
                store.warmSources.add(key);
                resolve(resolvedSrc);
            };
            image.onerror = () => reject(new Error(`image failed: ${resolvedSrc}`));
            image.src = resolvedSrc;
        }).catch((error) => {
            console.warn('[media-cache] image preload failed:', error.message);
            return '';
        }));
    }

    return store.imagePromises.get(key);
}

export function setImageElementSource(image, src) {
    if (!image || !src) return '';

    const resolvedSrc = resolveMediaSource(src, document.baseURI);
    preloadImageAsset(resolvedSrc);
    if (image.getAttribute('src') !== resolvedSrc) image.src = resolvedSrc;
    return resolvedSrc;
}

export function setElementBackgroundImage(element, src) {
    if (!element || !src) return '';

    const resolvedSrc = resolveMediaSource(src, document.baseURI);
    preloadImageAsset(resolvedSrc);
    element.style.backgroundImage = `url("${resolvedSrc.replace(/"/g, '%22')}")`;
    return resolvedSrc;
}

function normalizeProject(project = {}, baseUrl) {
    const normalized = { ...project };
    ['src', 'previewSrc', 'playerSrc'].forEach((key) => {
        if (normalized[key]) normalized[key] = resolveVideoSource(normalized[key], baseUrl);
    });
    return normalized;
}
