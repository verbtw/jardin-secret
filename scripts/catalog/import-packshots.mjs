import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {basename, extname, join} from 'node:path';
import sharp from 'sharp';

const root = new URL('../..', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('../../src/data/legacy-packshots.json', import.meta.url), 'utf8'));
const outputDirectory = new URL('../../public/products/packshots/', import.meta.url);
await mkdir(outputDirectory, {recursive: true});

for (const [slug, entry] of Object.entries(manifest)) {
  const response = await fetch(entry.sourceImageUrl, {
    redirect: 'follow',
    headers: {'user-agent': 'Mozilla/5.0'},
  });
  if (!response.ok) throw new Error(`${slug}: image request failed with ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) throw new Error(`${slug}: expected an image, received ${contentType}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 8_000) throw new Error(`${slug}: image is unexpectedly small (${bytes.length} bytes)`);
  const filename = basename(entry.imageUrl);
  const {data: fitted, info} = await sharp(bytes)
    .flatten({background: '#ffffff'})
    .trim({background: '#ffffff', threshold: 18})
    .resize({width: 1100, height: 1200, fit: 'inside', withoutEnlargement: false})
    .toBuffer({resolveWithObject: true});
  const canvas = sharp(fitted).extend({
    top: Math.floor((1600 - info.height) / 2),
    bottom: Math.ceil((1600 - info.height) / 2),
    left: Math.floor((1600 - info.width) / 2),
    right: Math.ceil((1600 - info.width) / 2),
    background: '#ffffff',
  });
  const normalized = extname(filename).toLowerCase() === '.png'
    ? await canvas.png({compressionLevel: 9}).toBuffer()
    : await canvas.jpeg({quality: 90, mozjpeg: true}).toBuffer();
  await writeFile(new URL(filename, outputDirectory), normalized);
}

console.log(`Imported ${Object.keys(manifest).length} clean packshots into ${join(root.pathname, 'public/products/packshots')}`);
