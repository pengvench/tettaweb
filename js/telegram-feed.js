// js/telegram-feed.js
// Парсит t.me/s/awakeprod напрямую — фото + первая строка + вторая строка

const CHANNEL   = 'awakeprod';
const TG_URL    = `https://t.me/s/${CHANNEL}`;
const MAX_POSTS = 3;

// CORS прокси — пробуем по очереди
const PROXIES = [
    u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

async function fetchHtml(url) {
    for (const proxy of PROXIES) {
        try {
            const res = await fetch(proxy(url), { signal: AbortSignal.timeout(8000) });
            if (!res.ok) continue;
            const text = await res.text();
            if (text.length > 500) return text;
        } catch(e) {
            console.warn('[feed] proxy failed:', e.message);
        }
    }
    throw new Error('all proxies failed');
}

function formatDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    }).replace(/\//g, '.');
}

function parsePosts(html) {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(html, 'text/html');
    const msgs   = Array.from(doc.querySelectorAll('.tgme_widget_message_wrap'));

    return msgs.reverse().slice(0, MAX_POSTS).map(wrap => {
        // Фото / превью видео — несколько вариантов
        let photo = null;

        // 1. Обычное фото
        const photoEl = wrap.querySelector('.tgme_widget_message_photo_wrap');
        if (photoEl) {
            const bg = photoEl.style.backgroundImage;
            photo = bg ? bg.replace(/url\(['"]?(.*?)['"]?\)/, '$1') : null;
        }

        // 2. Превью видео — <i class="tgme_widget_message_video_thumb">
        if (!photo) {
            const videoThumb = wrap.querySelector('.tgme_widget_message_video_thumb');
            if (videoThumb) {
                const bg = videoThumb.style.backgroundImage;
                photo = bg ? bg.replace(/url\(['"]?(.*?)['"]?\)/, '$1') : null;
            }
        }

        // 3. Превью через <video poster="...">
        if (!photo) {
            const video = wrap.querySelector('video[poster]');
            photo = video?.getAttribute('poster') || null;
        }

        // 4. Любой img внутри медиа-блока
        if (!photo) {
            const img = wrap.querySelector('.tgme_widget_message_photo img, .tgme_widget_message_video_player img');
            photo = img?.src || null;
        }

        // Пометим карточку если это видео
        const isVideo = !!wrap.querySelector('.tgme_widget_message_video_thumb, video, .tgme_widget_message_video_player');

        // Текст — берём .tgme_widget_message_text
        const textEl = wrap.querySelector('.tgme_widget_message_text');
        let lines = [];
        if (textEl) {
            // Разбиваем по <br> и переносам
            const raw = textEl.innerHTML
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<[^>]+>/g, '')
                .replace(/&amp;/g,'&').replace(/&lt;/g,'<')
                .replace(/&gt;/g,'>').replace(/&quot;/g,'"');
            lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
        }

        const title = lines[0] || '';
        const desc  = lines[1] || '';

        // Дата
        const dateEl = wrap.querySelector('time');
        const date   = formatDate(dateEl?.getAttribute('datetime'));

        // Ссылка на пост
        const linkEl = wrap.querySelector('a.tgme_widget_message_date');
        const link   = linkEl?.href || `https://t.me/${CHANNEL}`;

        return { photo, title, desc, date, link, isVideo };
    }).filter(p => p.title || p.photo); // пропускаем пустые
}

function renderPosts(posts) {
    const cards = posts.map(p => `
        <a href="${p.link}" target="_blank" rel="noopener" class="news-card${p.isVideo ? ' news-card--video' : ''}">
            ${p.photo ? `<div class="news-card__photo" style="background-image:url('${p.photo}')">${p.isVideo ? '<span class="news-card__play">▶</span>' : ''}</div>` : ''}
            <div class="news-card__body">
                <span class="news-card__date">${p.date}</span>
                ${p.title ? `<p class="news-card__title">${p.title.slice(0, 80)}</p>` : ''}
                ${p.desc  ? `<p class="news-card__desc">${p.desc.slice(0, 120)}</p>`  : ''}
            </div>
        </a>
    `).join('');

    const channelCard = `
        <a href="https://t.me/${CHANNEL}" target="_blank" rel="noopener" class="news-card news-card--channel">
            <div class="news-card__channel-inner">
                <span class="news-card__channel-icon">→</span>
                <p class="news-card__channel-label">Все посты</p>
                <p class="news-card__channel-name">@${CHANNEL}</p>
            </div>
        </a>`;

    return cards + channelCard;
}

export async function loadTelegramFeed() {
    const list = document.querySelector('.news-list');
    if (!list) return;

    list.innerHTML = '<div class="news-loading">● Загрузка ленты...</div>';

    try {
        const html  = await fetchHtml(TG_URL);
        const posts = parsePosts(html);

        if (!posts.length) throw new Error('no posts parsed');

        list.innerHTML = renderPosts(posts);
        console.log('[feed] loaded', posts.length, 'posts');

    } catch (err) {
        console.warn('[feed] error:', err.message);
        list.innerHTML = `<a href="https://t.me/${CHANNEL}" target="_blank" rel="noopener" class="news-item news-item--link">
            <span class="news-date">—</span>
            <span class="news-title">Открыть канал @${CHANNEL} в Telegram</span>
            <span class="news-category">КАНАЛ</span>
        </a>`;
    }
}