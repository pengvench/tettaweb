// js/sections/news-feed.js
import { setElementBackgroundImage } from '../core/video-cache.js?v=20260610-1';

const CHANNEL = 'setkaproduction';
const FEED_URL = new URL('./news.json', document.baseURI);

function formatDate(value = '') {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).replace(/\//g, '.');
}

async function fetchLocalFeed() {
    const response = await fetch(FEED_URL.href, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`local feed unavailable: ${response.status}`);

    const data = await response.json();
    const posts = Array.isArray(data.posts) ? data.posts : [];

    return posts
        .filter((post) => post && (post.title || post.photo))
        .slice(0, 3)
        .map((post) => ({
            photo: post.photo || '',
            title: post.title || '',
            desc: post.desc || '',
            date: post.date || formatDate(post.datetime),
            link: post.link || `https://t.me/${CHANNEL}`,
            isVideo: Boolean(post.isVideo)
        }));
}

function renderPosts(posts) {
    const cards = posts.map((post) => `
        <a href="${escapeAttribute(post.link)}" target="_blank" rel="noopener" class="news-card${post.isVideo ? ' news-card--video' : ''}">
            ${post.photo ? `<div class="news-card__photo" data-news-bg="${escapeAttribute(post.photo)}">${post.isVideo ? '<span class="news-card__play">▶</span>' : ''}</div>` : ''}
            <div class="news-card__body">
                <span class="news-card__date">${escapeHtml(post.date)}</span>
                ${post.title ? `<p class="news-card__title">${escapeHtml(post.title.slice(0, 80))}</p>` : ''}
                ${post.desc ? `<p class="news-card__desc">${escapeHtml(post.desc.slice(0, 120))}</p>` : ''}
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

function renderFallback() {
    return `<a href="https://t.me/${CHANNEL}" target="_blank" rel="noopener" class="news-item news-item--link">
        <span class="news-date">—</span>
        <span class="news-title">Открыть канал @${CHANNEL} в Telegram</span>
        <span class="news-category">КАНАЛ</span>
    </a>`;
}

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttribute(value = '') {
    return escapeHtml(value);
}

function hydrateStaticBackgrounds(root = document) {
    root.querySelectorAll('[data-news-bg]').forEach((node) => {
        const src = node.getAttribute('data-news-bg') || '';
        if (src && !node.style.backgroundImage) {
            setElementBackgroundImage(node, src);
        }
    });
}

export async function loadTelegramFeed() {
    const list = document.querySelector('.news-list');
    if (!list) return;

    // SSR-контент уже в HTML (для поисковиков и до загрузки JS). Обновляем его
    // свежими данными из news.json, а при недоступности — оставляем как есть.
    hydrateStaticBackgrounds(list);

    try {
        const posts = await fetchLocalFeed();
        if (!posts.length) throw new Error('local feed has no posts');

        list.innerHTML = renderPosts(posts);
        hydrateStaticBackgrounds(list);
        console.log('[feed] loaded local feed', posts.length, 'posts');
    } catch (error) {
        console.warn('[feed] error:', error.message);
        // Сохраняем SSR-карточки, добавляя к ним ссылку на канал.
        const cards = list.querySelectorAll('.news-card');
        if (!cards.length) list.innerHTML = renderFallback();
        else hydrateStaticBackgrounds(list);
    }
}

