import { mkdir, readFile, writeFile } from 'node:fs/promises';
import https from 'node:https';
import { extname, join } from 'node:path';

const CHANNEL = process.env.TELEGRAM_CHANNEL || 'setkaproduction';
const MAX_POSTS = Number(process.env.TELEGRAM_MAX_POSTS || 3);
const UPDATE_INTERVAL_DAYS = 3;
const OUT_FILE = 'news.json';
const IMAGE_DIR = 'img/news';
const SOURCE_URL = `https://t.me/s/${CHANNEL}`;
const FALLBACK_RESOLVE_IPS = (process.env.TELEGRAM_RESOLVE_IPS || process.env.TELEGRAM_RESOLVE_IP || '149.154.167.220')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const USER_AGENT = 'Mozilla/5.0 (compatible; TETTA-NewsUpdater/1.0; +https://tetta-prod.ru/)';

function requestBuffer(urlString, options = {}) {
    const sourceUrl = new URL(urlString);
    const resolveIp = options.resolveIp || '';
    const requestOptions = {
        protocol: sourceUrl.protocol,
        hostname: resolveIp || sourceUrl.hostname,
        port: sourceUrl.port || 443,
        path: `${sourceUrl.pathname}${sourceUrl.search}`,
        servername: sourceUrl.hostname,
        timeout: options.timeout || 25000,
        headers: {
            Accept: options.accept || '*/*',
            'User-Agent': USER_AGENT,
            ...(resolveIp ? { Host: sourceUrl.host } : {})
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(requestOptions, (res) => {
            const status = res.statusCode || 0;

            if (status >= 300 && status < 400 && res.headers.location) {
                res.resume();
                const nextUrl = new URL(res.headers.location, sourceUrl).href;
                requestBuffer(nextUrl, options).then(resolve, reject);
                return;
            }

            if (status < 200 || status >= 300) {
                res.resume();
                reject(new Error(`HTTP ${status} for ${urlString}`));
                return;
            }

            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve({
                buffer: Buffer.concat(chunks),
                headers: res.headers,
                url: urlString
            }));
        });

        req.on('timeout', () => {
            req.destroy(new Error(`timeout for ${urlString}`));
        });
        req.on('error', reject);
        req.end();
    });
}

async function fetchTelegramHtml() {
    const attempts = ['', ...FALLBACK_RESOLVE_IPS];
    let lastError = null;

    for (const resolveIp of attempts) {
        try {
            const response = await requestBuffer(SOURCE_URL, {
                resolveIp,
                accept: 'text/html,application/xhtml+xml'
            });
            const html = response.buffer.toString('utf8');
            if (html.includes('tgme_widget_message')) return html;
            lastError = new Error('Telegram page returned no widget messages');
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('Telegram page unavailable');
}

function decodeEntities(value = '') {
    const named = {
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
        nbsp: ' '
    };

    return String(value)
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] || match);
}

function htmlToLines(html = '') {
    const text = decodeEntities(html)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>|<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\r/g, '');

    return text
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
}

function normalizeUrl(value = '') {
    const clean = decodeEntities(value).trim();
    if (!clean) return '';
    if (clean.startsWith('//')) return `https:${clean}`;
    return clean;
}

function firstMatch(source, patterns) {
    for (const pattern of patterns) {
        const match = source.match(pattern);
        if (match?.[1]) return match[1];
        if (match?.[2]) return match[2];
    }
    return '';
}

function extractMessages(html) {
    return html.match(/<div class="tgme_widget_message_wrap[\s\S]*?(?=<div class="tgme_widget_message_wrap|<\/main>)/g) || [];
}

function parsePosts(html) {
    return extractMessages(html)
        .map((wrap) => {
            const id = Number(firstMatch(wrap, [
                new RegExp(`data-post="${CHANNEL}/(\\d+)"`),
                /href="https:\/\/t\.me\/[^/]+\/(\d+)"/
            ]));
            const textHtml = firstMatch(wrap, [
                /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i
            ]);
            const lines = htmlToLines(textHtml);
            const datetime = firstMatch(wrap, [
                /<time[^>]+datetime="([^"]+)"/i
            ]);
            const link = normalizeUrl(firstMatch(wrap, [
                /<a class="tgme_widget_message_date" href="([^"]+)"/i,
                /href="(https:\/\/t\.me\/[^/]+\/\d+)"/i
            ])) || `https://t.me/${CHANNEL}`;
            const photo = normalizeUrl(firstMatch(wrap, [
                /tgme_widget_message_photo_wrap[^>]*style="[^"]*background-image:url\(['"]?([^'")]+)['"]?\)/i,
                /tgme_widget_message_video_thumb[^>]*style="[^"]*background-image:url\(['"]?([^'")]+)['"]?\)/i,
                /<video[^>]+poster="([^"]+)"/i,
                /tgme_widget_message_photo[^>]*>\s*<img[^>]+src="([^"]+)"/i
            ]));

            return {
                id,
                link,
                photo,
                title: lines[0] || '',
                desc: lines[1] || '',
                date: formatDate(datetime),
                datetime,
                isVideo: /tgme_widget_message_video|message_video/.test(wrap)
            };
        })
        .filter((post) => post.id && (post.title || post.photo))
        .sort((a, b) => b.id - a.id)
        .slice(0, MAX_POSTS);
}

function formatDate(value = '') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Europe/Moscow'
    }).format(date).replace(/\//g, '.');
}

function extensionFromType(contentType = '') {
    if (contentType.includes('png')) return '.png';
    if (contentType.includes('webp')) return '.webp';
    if (contentType.includes('gif')) return '.gif';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) return '.jpg';
    return '';
}

async function cachePostImage(post, previousPost = null) {
    if (!post.photo) return post;

    try {
        const response = await requestBuffer(post.photo, {
            accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*',
            timeout: 25000
        });
        const contentType = String(response.headers['content-type'] || '').toLowerCase();
        const fromType = extensionFromType(contentType);
        const fromUrl = extname(new URL(post.photo).pathname).toLowerCase();
        const extension = fromType || (fromUrl && fromUrl.length <= 6 ? fromUrl : '.jpg');
        const filename = `${CHANNEL}-${post.id}${extension}`;
        const publicPath = `${IMAGE_DIR}/${filename}`.replaceAll('\\', '/');

        await mkdir(IMAGE_DIR, { recursive: true });
        await writeFile(join(process.cwd(), publicPath), response.buffer);

        return {
            ...post,
            remotePhoto: post.photo,
            photo: publicPath
        };
    } catch (error) {
        console.warn(`[news] image cache failed for post ${post.id}: ${error.message}`);
        if (previousPost?.photo && !/^https?:\/\//i.test(previousPost.photo)) {
            return {
                ...post,
                remotePhoto: post.photo,
                photo: previousPost.photo
            };
        }
        return post;
    }
}

async function readExistingFeed() {
    try {
        return JSON.parse(await readFile(OUT_FILE, 'utf8'));
    } catch (error) {
        return null;
    }
}

async function writeFeed(posts) {
    const updatedAt = new Date();
    const nextCheckAt = new Date(updatedAt.getTime() + UPDATE_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

    const feed = {
        channel: CHANNEL,
        source: SOURCE_URL,
        updatedAt: updatedAt.toISOString(),
        nextCheckAt: nextCheckAt.toISOString(),
        ttlDays: UPDATE_INTERVAL_DAYS,
        posts
    };

    await writeFile(OUT_FILE, `${JSON.stringify(feed, null, 2)}\n`, 'utf8');
    console.log(`[news] wrote ${OUT_FILE}: ${posts.length} posts`);
}

async function main() {
    const existing = await readExistingFeed();

    try {
        const html = await fetchTelegramHtml();
        const parsed = parsePosts(html);
        if (!parsed.length) throw new Error('no posts parsed');

        const previousById = new Map((existing?.posts || []).map((post) => [post.id, post]));
        const posts = [];
        for (const post of parsed) {
            posts.push(await cachePostImage(post, previousById.get(post.id)));
        }

        await writeFeed(posts);
    } catch (error) {
        if (existing?.posts?.length) {
            console.warn(`[news] Telegram update failed, keeping existing ${OUT_FILE}: ${error.message}`);
            return;
        }

        console.warn(`[news] Telegram update failed and no existing feed found: ${error.message}`);
        await writeFeed([]);
    }
}

main().catch((error) => {
    console.warn('[news] update failed:', error.message);
    process.exitCode = 0;
});
