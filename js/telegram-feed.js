// js/telegram-feed.js
const CHANNEL   = 'awakeprod';
const MAX_POSTS = 8;

const PROXIES = [
    url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

const RSS_URL = `https://rsshub.app/telegram/channel/${CHANNEL}`;

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    }).replace(/\//g, '.');
}

function stripHtml(html) {
    return html.replace(/<[^>]*>/g, '')
               .replace(/&amp;/g,'&').replace(/&lt;/g,'<')
               .replace(/&gt;/g,'>').replace(/&quot;/g,'"')
               .replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
}

function guessCategory(text) {
    const t = text.toLowerCase();
    if (t.includes('видео') || t.includes('ролик') || t.includes('монтаж')) return 'ВИДЕО';
    if (t.includes('фото') || t.includes('съёмк') || t.includes('съемк'))   return 'ФОТО';
    if (t.includes('проект') || t.includes('кейс') || t.includes('работа')) return 'ПРОЕКТ';
    if (t.includes('команд') || t.includes('набор') || t.includes('вакан')) return 'КОМАНДА';
    return 'СТУДИЯ';
}

async function fetchWithProxy(url) {
    for (const makeProxy of PROXIES) {
        try {
            const res = await fetch(makeProxy(url), { signal: AbortSignal.timeout(6000) });
            if (!res.ok) continue;
            const text = await res.text();
            // corsproxy returns raw, codetabs returns raw too
            if (text && text.length > 100) return text;
        } catch (e) {
            console.warn('[telegram-feed] proxy failed:', e.message);
        }
    }
    throw new Error('all proxies failed');
}

function renderItems(items) {
    return items.map(item => {
        const title = stripHtml(item.querySelector('title')?.textContent || '');
        const desc  = stripHtml(item.querySelector('description')?.textContent || '');
        const date  = formatDate(item.querySelector('pubDate')?.textContent || '');
        const link  = item.querySelector('link')?.textContent?.trim() || '#';
        const text  = (title.length > 5 ? title : desc).slice(0, 90);
        const cat   = guessCategory(text + desc);

        return `<a href="${link}" target="_blank" rel="noopener" class="news-item news-item--link">
            <span class="news-date">${date}</span>
            <span class="news-title">${text || '(без текста)'}</span>
            <span class="news-category">${cat}</span>
        </a>`;
    }).join('');
}

export async function loadTelegramFeed() {
    const list = document.querySelector('.news-list');
    if (!list) return;

    list.innerHTML = '<div class="news-loading">● Загрузка ленты...</div>';

    try {
        const raw    = await fetchWithProxy(RSS_URL);
        const parser = new DOMParser();
        const xml    = parser.parseFromString(raw, 'text/xml');
        const items  = Array.from(xml.querySelectorAll('item')).slice(0, MAX_POSTS);

        if (!items.length) throw new Error('no items in feed');

        list.innerHTML = renderItems(items);
        console.log('[telegram-feed] loaded', items.length, 'posts');

    } catch (err) {
        console.warn('[telegram-feed] error:', err.message);
        list.innerHTML = `<div class="news-item">
            <span class="news-date">—</span>
            <span class="news-title">Не удалось загрузить ленту — проверь соединение или деплойни на хостинг</span>
            <span class="news-category">ОШИБКА</span>
        </div>`;
    }
}