// js/core/preloader.js
export function initPreloader(onComplete) {
    console.log('[preloader] init start');

    // Lock scroll on html as well (iOS viewport fix)
    document.documentElement.classList.add('loading');
    const preloader      = document.querySelector('.preloader');
    const progressFill   = document.querySelector('.cam-progress-fill');
    const loadingPercent = document.querySelector('.cam-percent');
    const fpsCurrent     = document.querySelector('.fps-current');
    const asciiCanvas    = document.getElementById('ascii-canvas');

    console.log('[preloader] elements:', {
        preloader: !!preloader,
        progressFill: !!progressFill,
        loadingPercent: !!loadingPercent,
        fpsCurrent: !!fpsCurrent,
        asciiCanvas: !!asciiCanvas
    });

    const fpsFonts = ['Terminus', 'Helvetica', 'Arial', 'Courier New', 'monospace',
                      'Georgia', 'Impact', 'Times New Roman', 'Verdana'];
    const revealNodes = Array.from(document.querySelectorAll('.nav-reveal'));
    let loadProgress = 0;

    // ---- ASCII T ----
    const STEM_W = 6, BAR_H = 9, T_W = 20, T_H = 30, DEPTH = 10, STEP = 1.1;
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

    function draw(angleY, scale) {
        if (!asciiCanvas) return;
        const W = asciiW, H = asciiH;
        const out = new Array(W * H).fill(' ');
        const zbf = new Array(W * H).fill(-Infinity);

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
                    out[idx] = chars[Math.max(0, Math.min(11, shade))];
                }
            }
        }
        asciiCanvas.textContent = out.map((c, i) => c + ((i + 1) % W === 0 ? '\n' : '')).join('');
    }

    function intro() {
        const elapsed = Date.now() - T0;
        const t = easeOutExpo(Math.min(elapsed / DUR, 1));
        draw(t * Math.PI * 2 + FINAL_ANGLE, 0.3 + 1.05 * t);
        if (t < 1) {
            animFrame = requestAnimationFrame(intro);
        } else {
            console.log('[preloader] intro done, locking final angle');
            draw(FINAL_ANGLE, FINAL_SCALE);
        }
    }

    calcSize();
    window.addEventListener('resize', calcSize);

    console.log('[preloader] starting animation');
    requestAnimationFrame(() => requestAnimationFrame(intro));

    // ---- PROGRESS + FPS ----
    console.log('[preloader] starting interval');
    const tick = setInterval(() => {
        loadProgress = Math.min(loadProgress + Math.random() * 4, 100);

        if (progressFill)   progressFill.style.height = loadProgress + '%';
        if (loadingPercent) loadingPercent.textContent = Math.floor(loadProgress) + '%';

        if (fpsCurrent) {
            const rFPS = loadProgress < 100
                ? Math.floor(Math.random() * 26)
                : Math.floor(Math.random() * 3) + 23;
            fpsCurrent.textContent      = rFPS;
            fpsCurrent.style.fontFamily = fpsFonts[Math.floor(Math.random() * fpsFonts.length)];
        }

        revealNodes.forEach(el => {
            const at = parseInt(el.getAttribute('data-reveal'));
            if (loadProgress >= at && !el.classList.contains('revealed'))
                el.classList.add('revealed');
        });

        if (loadProgress >= 100) {
            clearInterval(tick);
            console.log('[preloader] complete, hiding');
            setTimeout(async () => {
                cancelAnimationFrame(animFrame);

                // Fade out preloader only after onComplete resolves
                if (onComplete) {
                    try {
                        await onComplete();
                    } catch (error) {
                        console.warn('[preloader] onComplete error:', error);
                    }
                }

                if (preloader) preloader.classList.add('hidden');
                document.dispatchEvent(new CustomEvent('tetta:preloader-hidden'));

                // Remove loading overflow only after transition end (1.2s).
                // This prevents viewport jumps while mobile browser UI appears.
                setTimeout(() => {
                    document.body.classList.remove('loading');
                    document.documentElement.classList.remove('loading');
                }, 1300);

            }, 600);
        }
    }, 60);

    console.log('[preloader] init done');
}
