import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Отправка ключевых URL в IndexNow (https://www.indexnow.org) после деплоя.
 * Интегрировано в `npm run build` — вызывается на Vercel при каждой сборке.
 * Не должен ронять сборку: все ошибки логируются и гасятся.
 */

const SITE = (process.env.INDEXNOW_HOST || 'tetta-prod.ru').replace(/^https?:\/\//, '').replace(/\/$/, '');
const KEY_FILE = (process.env.INDEXNOW_KEY_FILE || '9ce10e2c3c7f45a2a146c0baf70e76d57f75230963a4459a80200ed95ced7254.txt').replace(/^\//, '');
const ENDPOINT = process.env.INDEXNOW_ENDPOINT || 'https://api.indexnow.org/indexnow';

const URLS = [
    `https://${SITE}/`,
    `https://${SITE}/filming/`,
    `https://${SITE}/contacts/`,
    `https://${SITE}/privacy/`
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readKey() {
    const raw = await readFile(join(process.cwd(), KEY_FILE), 'utf8');
    return raw.trim().split(/\s+/)[0];
}

async function main() {
    let key;
    try {
        key = await readKey();
    } catch (error) {
        console.warn(`[indexnow] key file "${KEY_FILE}" not found, skip: ${error.message}`);
        return;
    }

    if (!/^[a-f0-9]{32,}$/i.test(key)) {
        console.warn(`[indexnow] invalid key in "${KEY_FILE}", skip`);
        return;
    }

    const payload = {
        host: SITE,
        key,
        keyLocation: `https://${SITE}/${KEY_FILE}`,
        urlList: URLS
    };

    // Сборка на Vercel идёт до публикации деплоя: даём краулеру застать свежие страницы
    const delayMs = Number(process.env.INDEXNOW_DELAY_MS || 10000);
    if (delayMs > 0) {
        await sleep(delayMs);
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.ok) {
            console.log(`[indexnow] submitted ${URLS.length} URLs to ${ENDPOINT} (${response.status})`);
        } else {
            const body = await response.text().catch(() => '');
            console.warn(`[indexnow] endpoint returned ${response.status}: ${body.slice(0, 300)}`);
        }
    } catch (error) {
        console.warn(`[indexnow] submission failed, build continues: ${error.message}`);
    }
}

main().catch((error) => {
    console.warn(`[indexnow] unexpected error, build continues: ${error.message}`);
});
