// js/project-block.js

// ---- Загрузка видео из backgrounds.json ----
export async function initProjectVideos() {
    try {
        const res  = await fetch('./projects/backgrounds.json');
        const data = await res.json();
        const srcs = data.backgrounds || [];

        document.querySelectorAll('.project-video').forEach((video, i) => {
            const src = srcs[i % srcs.length];
            if (src) {
                video.src = `./projects/${src}`;
                video.load();
                video.play().catch(() => {});
            }
        });
    } catch(e) {
        console.warn('[project-block] backgrounds.json not found');
    }
}

// ---- Анимации появления блока ----
export function initProjectAnimations() {
    const block = document.querySelector('.project-block');
    if (!block) return;

    const title = block.querySelector('.project-label__title');
    const desc  = block.querySelector('.project-info__desc');
    const media = block.querySelector('.project-media');

    // Задержки букв заголовка
    if (title) {
        title.querySelectorAll('.p-letter').forEach((l, i) => {
            l.style.animationDelay = `${0.04 + i * 0.045}s`;
        });
    }

    // Ждём card-entered → запускаем анимации по цепочке
    const mo = new MutationObserver(() => {
        if (!block.classList.contains('card-entered')) return;
        mo.disconnect();

        if (title) title.classList.add('p-animate');
        setTimeout(() => { if (desc)  desc.classList.add('p-animate');  }, 200);
        setTimeout(() => { if (media) media.classList.add('p-animate'); }, 800);
    });

    mo.observe(block, { attributes: true, attributeFilter: ['class'] });
}