const STORE_KEY = '__tettaMediaCacheV2';

const store = window[STORE_KEY] || {
    manifestPromises: new Map(),
    mediaManifestPromises: new Map(),
    imagePromises: new Map(),
    warmSources: new Set(),
    elementState: new WeakMap()
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

    return {
        primary,
        active: primary,
        key
    };
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

    video.controls = false;
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.disablePictureInPicture = true;
    video.removeAttribute('controls');
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('disableremoteplayback', '');
    video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback nofullscreen');
    if (label) video.setAttribute('aria-label', label);

    if (video.dataset.videoCacheReady === 'true') return;
    video.dataset.videoCacheReady = 'true';

    ['loadedmetadata', 'loadeddata', 'canplay'].forEach((eventName) => {
        video.addEventListener(eventName, () => markVideoWarm(video.currentSrc || video.src || video.dataset.src), { passive: true });
    });

}

export function hydrateVideoElement(video, preload = 'metadata', explicitSrc = '') {
    if (!video) return false;

    if (video.tagName !== 'VIDEO') {
        const iframeSrc = resolveVideoSource(explicitSrc || video.dataset.src || video.getAttribute('src') || '');
        if (iframeSrc && video.getAttribute('src') !== iframeSrc) {
            video.src = iframeSrc;
        }
        return Boolean(iframeSrc);
    }

    configureInlineVideo(video);
    const originalSrc = explicitSrc || video.dataset.mediaOriginalSrc || video.dataset.src || video.getAttribute('src') || '';
    if (!originalSrc) return false;

    if (explicitSrc || !video.dataset.mediaOriginalSrc) video.dataset.mediaOriginalSrc = originalSrc;
    const candidate = resolveCandidate(originalSrc);
    const source = candidate.active;
    const previous = store.elementState.get(video) || {};
    const hasSameSource = previous.src === source && video.getAttribute('src') === source;
    const sourceIsWarm = store.warmSources.has(source) || store.warmSources.has(candidate.key);
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
        key: candidate.key
    });

    if (shouldLoad || (preload !== 'none' && video.readyState === 0 && !sourceIsWarm)) {
        video.load();
    }

    return true;
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

    hydrateVideoElement(video, 'auto', src);
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
