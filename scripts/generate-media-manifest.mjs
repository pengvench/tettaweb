import { readdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const folders = {
  photo: 'img/photo',
  icon: 'img/icon',
  assets: 'img/assets',
  graffiti: 'img/graffiti'
};

const imageExtensions = new Set(['.avif', '.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg']);
const manifest = {};

for (const [key, folder] of Object.entries(folders)) {
  const entries = await readdir(folder, { withFileTypes: true }).catch(() => []);
  manifest[key] = entries
    .filter((entry) => entry.isFile() && imageExtensions.has(extname(entry.name).toLowerCase()))
    .map((entry) => `${folder}/${entry.name}`.replaceAll('\\', '/'))
    .sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));
}

await writeFile(join(process.cwd(), 'media.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
