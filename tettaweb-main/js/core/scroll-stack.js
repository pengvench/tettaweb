const ASCII_CHARS = ' .:-=+*#%@4RTTA[]/';

export function initScrollStack() {
    const cards = Array.from(document.querySelectorAll('.stack-wrapper > .stack-card'));
    if (cards.length < 2) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const overlay = createTransitionOverlay();

    let scrollRafId = 0;
    let overlayRafId = 0;
    let lastScrollY = window.scrollY || window.pageYOffset || 0;
    let currentState = null;

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function lerp(start, end, progress) {
        return start + (end - start) * progress;
    }

    function easeOutCubic(value) {
        return 1 - Math.pow(1 - value, 3);
    }

    function getSurface(card) {
        return card.querySelector(':scope > .stack-card__surface') || card;
    }

    function getConfig() {
        const isMobile = window.innerWidth <= 768;
        const viewportHeight = window.innerHeight;

        if (isMobile) {
            return {
                isMobile,
                start: 0.06,
                end: -0.1,
                surfaceScaleMin: 1,
                surfaceShiftYMax: 0,
                surfaceOpacityMin: 1,
                surfaceBlurMax: 0,
                surfaceBrightnessMin: 1,
                overlayCellSize: 10,
                overlayBandHeight: clamp(viewportHeight * 0.19, 108, 176),
                overlayIntensity: 1.08
            };
        }

        return {
            isMobile,
            start: 0.08,
            end: -0.14,
            surfaceScaleMin: 0.965,
            surfaceShiftYMax: 24,
            surfaceOpacityMin: 0.88,
            surfaceBlurMax: 1.2,
            surfaceBrightnessMin: 0.9,
            overlayCellSize: 14,
            overlayBandHeight: clamp(viewportHeight * 0.24, 160, 260),
            overlayIntensity: 1.12
        };
    }

    function resetCard(card) {
        const surface = getSurface(card);
        surface.style.transform = '';
        surface.style.opacity = '';
        surface.style.filter = '';
    }

    function shouldAnimateStack() {
        return !prefersReducedMotion.matches;
    }

    function findActiveTransition(viewportHeight, direction, config) {
        let bestState = null;

        cards.forEach((card, index) => {
            if (index === cards.length - 1) return;

            const nextCard = cards[index + 1];
            const nextRect = nextCard.getBoundingClientRect();
            const startTop = viewportHeight * 1.04;
            const endTop = viewportHeight * config.end;
            const progress = clamp((startTop - nextRect.top) / (startTop - endTop), 0, 1);

            if (progress <= 0 || progress >= 1) return;
            if (nextRect.top > startTop || nextRect.bottom < endTop) return;

            const centerBias = 1 - Math.min(Math.abs(nextRect.top - viewportHeight * 0.42) / viewportHeight, 1);
            const score = centerBias + progress * 0.18;

            if (!bestState || score > bestState.score) {
                bestState = {
                    score,
                    card,
                    nextCard,
                    progress,
                    direction,
                    sweepY: clamp(nextRect.top, -config.overlayBandHeight, viewportHeight + config.overlayBandHeight)
                };
            }
        });

        return bestState;
    }

    function applyCardDepth(state, config) {
        cards.forEach(resetCard);

        if (!state) return;
        if (config.isMobile) return;

        const surface = getSurface(state.card);
        const eased = easeOutCubic(state.progress);
        const scale = lerp(1, config.surfaceScaleMin, eased);
        const shiftY = lerp(0, config.surfaceShiftYMax, eased);
        const opacity = lerp(1, config.surfaceOpacityMin, eased);
        const blur = lerp(0, config.surfaceBlurMax, eased);
        const brightness = lerp(1, config.surfaceBrightnessMin, eased);

        surface.style.transform = `translate3d(0, ${shiftY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
        surface.style.opacity = opacity.toFixed(3);
        surface.style.filter = blur > 0.01
            ? `blur(${blur.toFixed(2)}px) brightness(${brightness.toFixed(3)})`
            : '';
    }

    function scheduleOverlayRender() {
        if (overlayRafId) return;

        overlayRafId = window.requestAnimationFrame((time) => {
            overlayRafId = 0;

            if (currentState) {
                overlay.render(currentState, time);
                scheduleOverlayRender();
                return;
            }

            overlay.hide();
        });
    }

    function update() {
        if (!shouldAnimateStack()) {
            cards.forEach(resetCard);
            currentState = null;
            overlay.hide();
            return;
        }

        const scrollY = window.scrollY || window.pageYOffset || 0;
        const direction = scrollY >= lastScrollY ? 1 : -1;
        lastScrollY = scrollY;

        const viewportHeight = window.innerHeight;
        const config = getConfig();
        const activeTransition = findActiveTransition(viewportHeight, direction, config);

        applyCardDepth(activeTransition, config);

        currentState = activeTransition
            ? {
                active: true,
                progress: activeTransition.progress,
                direction,
                sweepY: activeTransition.sweepY,
                bandHeight: config.overlayBandHeight,
                cellSize: config.overlayCellSize,
                intensity: config.overlayIntensity
            }
            : null;

        if (currentState) {
            scheduleOverlayRender();
        } else {
            overlay.hide();
        }
    }

    function requestUpdate() {
        if (scrollRafId) return;

        scrollRafId = window.requestAnimationFrame(() => {
            scrollRafId = 0;
            update();
        });
    }

    function handleResize() {
        overlay.resize();
        requestUpdate();
    }

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    prefersReducedMotion.addEventListener?.('change', handleResize);

    requestUpdate();
}

function createTransitionOverlay() {
    const existing = document.querySelector('.stack-transition-overlay');
    existing?.remove();

    const root = document.createElement('div');
    root.className = 'stack-transition-overlay';
    root.setAttribute('aria-hidden', 'true');

    const canvas = document.createElement('canvas');
    canvas.className = 'stack-transition-overlay__canvas';
    root.appendChild(canvas);
    document.body.appendChild(root);

    const context = canvas.getContext('2d', { alpha: true });
    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = Math.max(1, window.innerWidth);
        height = Math.max(1, window.innerHeight);

        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        if (context) {
            context.setTransform(dpr, 0, 0, dpr, 0, 0);
            context.imageSmoothingEnabled = false;
        }
    }

    function hide() {
        root.classList.remove('is-active');
        if (context) context.clearRect(0, 0, width, height);
    }

    function hashNoise(x, y, timeSeed) {
        const value = Math.sin(x * 127.1 + y * 311.7 + timeSeed * 37.3) * 43758.5453123;
        return value - Math.floor(value);
    }

    function drawSweepLine(ctx, sweepY, widthPx, bandHeight, time, intensity) {
        const segmentWidth = 32;
        const segmentCount = Math.ceil(widthPx / segmentWidth);

        ctx.fillStyle = `rgba(6, 9, 12, ${(0.24 * intensity).toFixed(3)})`;
        ctx.fillRect(0, sweepY - 20, widthPx, 40);

        for (let index = 0; index < segmentCount; index += 1) {
            const x = index * segmentWidth;
            const jitter = Math.sin(time * 0.006 + index * 0.85) * 2.4;
            const alpha = (0.12 + hashNoise(index, 9, time * 0.002) * 0.22) * intensity;

            ctx.fillStyle = `rgba(110, 220, 255, ${alpha.toFixed(3)})`;
            ctx.fillRect(x, sweepY + jitter, segmentWidth + 1, 2.4);

            if (hashNoise(index, 3, time * 0.003) > 0.78) {
                ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.75).toFixed(3)})`;
                ctx.fillRect(x, sweepY + jitter + 2.8, segmentWidth * 0.42, 1.3);
            }
        }

        const glow = ctx.createLinearGradient(0, sweepY - bandHeight * 0.18, 0, sweepY + bandHeight * 0.18);
        glow.addColorStop(0, 'rgba(0, 0, 0, 0)');
        glow.addColorStop(0.5, `rgba(110, 220, 255, ${(0.18 * intensity).toFixed(3)})`);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, sweepY - bandHeight * 0.18, widthPx, bandHeight * 0.36);
    }

    function render(state, time) {
        if (!context || !state?.active) {
            hide();
            return;
        }

        root.classList.add('is-active');
        context.clearRect(0, 0, width, height);

        const { direction, sweepY, bandHeight, cellSize, intensity } = state;
        const dir = direction >= 0 ? 1 : -1;
        const cols = Math.ceil(width / cellSize);
        const rows = Math.ceil(height / cellSize);

        context.save();

        if (dir > 0) {
            const veil = context.createLinearGradient(0, 0, 0, sweepY + bandHeight);
            veil.addColorStop(0, `rgba(3, 4, 7, ${(0.42 * intensity).toFixed(3)})`);
            veil.addColorStop(0.68, `rgba(3, 4, 7, ${(0.2 * intensity).toFixed(3)})`);
            veil.addColorStop(1, 'rgba(3, 4, 7, 0)');
            context.fillStyle = veil;
            context.fillRect(0, 0, width, Math.min(height, sweepY + bandHeight));
        } else {
            const veil = context.createLinearGradient(0, sweepY - bandHeight, 0, height);
            veil.addColorStop(0, 'rgba(3, 4, 7, 0)');
            veil.addColorStop(0.32, `rgba(3, 4, 7, ${(0.2 * intensity).toFixed(3)})`);
            veil.addColorStop(1, `rgba(3, 4, 7, ${(0.42 * intensity).toFixed(3)})`);
            context.fillStyle = veil;
            context.fillRect(0, Math.max(0, sweepY - bandHeight), width, height);
        }

        context.font = `${Math.floor(cellSize * 0.88)}px Terminus, Courier New, monospace`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        for (let column = 0; column < cols; column += 1) {
            const columnOffset =
                (Math.sin(time * 0.003 + column * 0.62) + Math.cos(time * 0.0018 + column * 0.17)) * cellSize * 0.65 +
                (hashNoise(column, 0, time * 0.0017) - 0.5) * cellSize * 2.7;
            const edgeY = sweepY + columnOffset;

            for (let row = 0; row < rows; row += 1) {
                const x = column * cellSize;
                const y = row * cellSize;
                const centerY = y + cellSize * 0.5;
                const local = dir > 0 ? edgeY - centerY : centerY - edgeY;
                const wake = clamp(local / bandHeight, 0, 1);
                const band = clamp(1 - Math.abs(local) / (bandHeight * 0.78), 0, 1);
                const scatter = clamp(1 - Math.abs(local) / (bandHeight * 1.32), 0, 1);

                const coverage = wake * 0.92 + band * 0.34 + scatter * 0.22;
                if (coverage <= 0.04) continue;

                const gate = hashNoise(column * 1.71, row * 2.31, time * 0.0015);
                if (gate > coverage) continue;

                const rectAlpha = (0.2 + wake * 0.72 + band * 0.28) * intensity;
                context.fillStyle = `rgba(5, 6, 9, ${rectAlpha.toFixed(3)})`;
                context.fillRect(x, y, cellSize + 0.75, cellSize + 0.75);

                const charGate = hashNoise(column * 7.13 + 11, row * 3.17 + 5, time * 0.0026);
                if (charGate > 0.78 && band < 0.26) continue;

                const charIndex = Math.floor(hashNoise(column * 4.3, row * 5.2, time * 0.0038) * ASCII_CHARS.length);
                const char = ASCII_CHARS[charIndex];
                const charAlpha = (0.32 + band * 0.68 + wake * 0.34) * intensity;

                context.fillStyle = charGate < 0.18
                    ? `rgba(110, 220, 255, ${Math.min(1, charAlpha + 0.14).toFixed(3)})`
                    : `rgba(255, 255, 255, ${charAlpha.toFixed(3)})`;
                context.fillText(char, x + cellSize * 0.5, y + cellSize * 0.56);

                if (band > 0.46 && hashNoise(column * 2.7, row * 6.1, time * 0.0045) > 0.84) {
                    context.fillStyle = `rgba(2, 3, 5, ${(0.72 * intensity).toFixed(3)})`;
                    context.fillRect(x - 0.5, y - 0.5, cellSize + 1.5, cellSize + 1.5);

                    context.fillStyle = hashNoise(column * 9.1, row * 1.7, time * 0.0028) > 0.5
                        ? `rgba(255, 255, 255, ${(0.78 * intensity).toFixed(3)})`
                        : `rgba(110, 220, 255, ${(0.84 * intensity).toFixed(3)})`;
                    context.fillText(char, x + cellSize * 0.5, y + cellSize * 0.56);
                }
            }
        }

        drawSweepLine(context, sweepY, width, bandHeight, time, intensity);
        context.restore();
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });

    return { resize, render, hide };
}
